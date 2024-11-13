use std::fmt;
use serde::{Deserialize, Serialize};
use crate::crypto::EncryptedNote;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: Option<i64>,
    pub title: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncRequest {
    pub public_key: String,
    pub notes: Vec<EncryptedNote>,
    pub client_version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResponse {
    pub notes: Vec<EncryptedNote>,
    pub updated: Vec<String>,
    pub conflicts: Vec<String>,
}
#[derive(Debug)]
pub enum SyncError {
    NetworkError(String),
    ServerError(String),
    CryptoError(String),
    Unknown,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SyncSettings {
    pub auto_sync: bool,
    pub sync_interval: i32,
    pub server_url: String,
    pub custom_servers: Option<Vec<String>>,
    pub seed_phrase: Option<String>,
}

impl Default for SyncSettings {
    fn default() -> Self {
        Self {
            auto_sync: false,
            sync_interval: 5,
            server_url: "https://notes-sync.0xgingi.com".to_string(),
            custom_servers: Some(Vec::new()),
            seed_phrase: None,
        }
    }
}

impl fmt::Display for SyncError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SyncError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            SyncError::ServerError(msg) => write!(f, "Server error: {}", msg),
            SyncError::CryptoError(msg) => write!(f, "Crypto error: {}", msg),
            SyncError::Unknown => write!(f, "Unknown error"),
        }
    }
}