use std::error::Error as StdError;
use std::time::Duration;
use tokio::time::sleep;
use crate::types::{Note, SyncRequest, SyncResponse, SyncError};
use crate::crypto::{CryptoManager, EncryptedNote};
use serde::Serialize;
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};

pub struct SyncManager {
    crypto: CryptoManager,
    client: reqwest::Client,
    server_url: String,
}

#[derive(Debug, Serialize)]
pub struct SyncProgress {
    pub total_notes: usize,
    pub processed_notes: usize,
    pub current_operation: String,
    pub errors: Vec<String>,
}

impl SyncManager {
    pub fn new(seed_phrase: &str, server_url: &str) -> Result<Self, Box<dyn StdError>> {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .default_headers(headers)
            .build()?;

        Ok(Self {
            crypto: CryptoManager::new(seed_phrase)?,
            client,
            server_url: format!("{}/api/sync", server_url),
        })
    }

    pub async fn sync_with_progress<F>(
        &self,
        local_notes: Vec<Note>,
        progress_callback: F
    ) -> Result<Vec<Note>, SyncError>
    where
        F: Fn(&SyncProgress) + Send + 'static,
    {
        let total_notes = local_notes.len();
        let mut progress = SyncProgress {
            total_notes,
            processed_notes: 0,
            current_operation: "Starting sync".to_string(),
            errors: Vec::new(),
        };

        progress_callback(&progress);

        // Encrypt notes
        progress.current_operation = "Encrypting notes".to_string();
        progress_callback(&progress);

        let mut encrypted_notes = Vec::with_capacity(local_notes.len());
        for note in &local_notes {
            match self.crypto.encrypt_note(note) {
                Ok(encrypted) => {
                    encrypted_notes.push(encrypted);
                    progress.processed_notes += 1;
                    progress_callback(&progress);
                }
                Err(e) => {
                    progress.errors.push(format!("Failed to encrypt note: {}", e));
                    progress_callback(&progress);
                    return Err(SyncError::CryptoError(e.to_string()));
                }
            }
        }

        // Server sync with retries
        const MAX_RETRIES: u32 = 3;
        const INITIAL_RETRY_DELAY: u64 = 1000;

        let mut retry_count = 0;
        let mut last_error = None;

        while retry_count < MAX_RETRIES {
            progress.current_operation = format!(
                "Syncing with server (attempt {}/{})",
                retry_count + 1,
                MAX_RETRIES
            );
            progress_callback(&progress);

            match self.sync_with_server(&encrypted_notes).await {
                Ok(synced_notes) => {
                    progress.current_operation = "Sync complete".to_string();
                    progress_callback(&progress);
                    return Ok(synced_notes);
                }
                Err(e) => {
                    last_error = Some(e);
                    retry_count += 1;
                    if retry_count < MAX_RETRIES {
                        let delay = INITIAL_RETRY_DELAY * (2_u64.pow(retry_count - 1));
                        progress.current_operation = format!(
                            "Sync failed, retrying in {} seconds",
                            delay / 1000
                        );
                        progress.errors.push(format!("Attempt {} failed", retry_count));
                        progress_callback(&progress);
                        sleep(Duration::from_millis(delay)).await;
                    }
                }
            }
        }

        Err(last_error.unwrap_or(SyncError::Unknown))
    }

    async fn sync_with_server(
        &self,
        encrypted_notes: &[EncryptedNote],
    ) -> Result<Vec<Note>, SyncError> {
        println!("Sending request to: {}", self.server_url);
        
        let request = SyncRequest {
            public_key: self.crypto.public_key_base64(),
            notes: encrypted_notes.to_vec(),
            client_version: env!("CARGO_PKG_VERSION").to_string(),
        };
        
        println!("Request payload: {:?}", request);
    
        let response = self.client
            .post(&self.server_url)
            .json(&request)
            .send()
            .await
            .map_err(|e| {
                println!("Network error: {:?}", e);
                SyncError::NetworkError(e.to_string())
            })?;
    
        let sync_response: SyncResponse = response.json().await
            .map_err(|e| {
                println!("Failed to parse response: {:?}", e);
                SyncError::NetworkError(format!("Failed to parse server response: {}", e))
            })?;
    
        println!("Sync response: {:?}", sync_response);
    
        let mut synced_notes = Vec::new();
        let mut decryption_errors = Vec::new();
    
        // Process server notes
        for encrypted_note in sync_response.notes {
            match self.crypto.decrypt_note(&encrypted_note) {
                Ok(note) => {
                    println!("Successfully decrypted note {}", encrypted_note.id);
                    // Only add notes that aren't in conflict
                    if !sync_response.conflicts.contains(&encrypted_note.id) {
                        synced_notes.push(note);
                    } else {
                        println!("Note {} is in conflict, skipping", encrypted_note.id);
                    }
                }
                Err(e) => {
                    println!("Failed to decrypt note {}: {:?}", encrypted_note.id, e);
                    decryption_errors.push(format!("Failed to decrypt note {}: {}", encrypted_note.id, e));
                }
            }
        }
    
        // Add local notes that weren't updated or in conflict
        for encrypted_note in encrypted_notes {
            if !sync_response.updated.contains(&encrypted_note.id) && 
               !sync_response.conflicts.contains(&encrypted_note.id) {
                match self.crypto.decrypt_note(encrypted_note) {
                    Ok(note) => {
                        if !synced_notes.iter().any(|n| n.id == note.id) {
                            println!("Adding local note {}", encrypted_note.id);
                            synced_notes.push(note);
                        }
                    }
                    Err(e) => {
                        println!("Failed to decrypt local note {}: {:?}", encrypted_note.id, e);
                        decryption_errors.push(format!("Failed to decrypt local note {}: {}", encrypted_note.id, e));
                    }
                }
            }
        }
    
        if !decryption_errors.is_empty() {
            println!("Decryption errors occurred: {:?}", decryption_errors);
        }
    
        println!("Returning {} synced notes", synced_notes.len());
        Ok(synced_notes)
    }
        
    pub async fn sync_notes(&self, local_notes: Vec<Note>) -> Result<Vec<Note>, SyncError> {
        let encrypted_notes: Result<Vec<_>, _> = local_notes.iter()
            .map(|note| self.crypto.encrypt_note(note))
            .collect();
        
        let encrypted_notes = encrypted_notes
            .map_err(|e| SyncError::CryptoError(e.to_string()))?;

        self.sync_with_server(&encrypted_notes).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Note;

    #[tokio::test]
    async fn test_sync_manager_creation() {
        let manager = SyncManager::new(
            "test seed phrase",
            "https://test-server.com"
        );
        assert!(manager.is_ok());
    }

    #[tokio::test]
    async fn test_sync_progress() {
        let manager = SyncManager::new(
            "test seed phrase",
            "https://test-server.com"
        ).unwrap();

        let test_notes = vec![
            Note {
                id: Some(1),
                title: "Test Note".to_string(),
                content: "Test Content".to_string(),
                created_at: 0,
                updated_at: 0,
            }
        ];

        let result = manager.sync_with_progress(
            test_notes,
            |progress| {
                println!("Progress: {:?}", progress);
            }
        ).await;

        // This will fail since we're not actually connecting to a server
        assert!(result.is_err());
    }
}