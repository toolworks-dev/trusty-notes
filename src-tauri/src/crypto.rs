use std::error::Error as StdError;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use bip39::{Mnemonic, Language};
use ed25519_dalek::{SigningKey, VerifyingKey, Signer};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use serde::{Deserialize, Serialize};
use crate::types::Note;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EncryptedNote {
    pub id: String,
    pub data: String,
    pub nonce: String,
    pub timestamp: i64,
    pub signature: String,
}

pub struct CryptoManager {
    encryption_key: [u8; 32],
    signing_key: SigningKey,
    verifying_key: VerifyingKey,
}

impl CryptoManager {
    pub fn new(seed_phrase: &str) -> Result<Self, Box<dyn StdError>> {
        let mnemonic = Mnemonic::parse_in_normalized(Language::English, seed_phrase)?;
        let seed = mnemonic.to_seed("");
        
        let mut encryption_key = [0u8; 32];
        encryption_key.copy_from_slice(&seed[0..32]);
        
        let signing_key = SigningKey::from_bytes(&seed[32..64].try_into()?);
        let verifying_key = VerifyingKey::from(&signing_key);

        Ok(Self {
            encryption_key,
            signing_key,
            verifying_key,
        })
    }

    pub fn public_key_base64(&self) -> String {
        BASE64.encode(self.verifying_key.to_bytes())
    }

    pub fn encrypt_note(&self, note: &Note) -> Result<EncryptedNote, Box<dyn StdError>> {
        let nonce_bytes = rand::random::<[u8; 12]>();
        let nonce = Nonce::from_slice(&nonce_bytes);

        let note_json = serde_json::to_string(note)?;
        
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&self.encryption_key));
        let encrypted_data = cipher.encrypt(nonce, note_json.as_bytes())
            .map_err(|e| format!("Encryption error: {}", e))?;

        let signature = self.signing_key.sign(&encrypted_data);

        Ok(EncryptedNote {
            id: BASE64.encode(note.id.unwrap_or(0).to_be_bytes()),
            data: BASE64.encode(encrypted_data),
            nonce: BASE64.encode(nonce_bytes),
            timestamp: note.updated_at,
            signature: BASE64.encode(signature.to_bytes()),
        })
    }

    pub fn decrypt_note(&self, encrypted: &EncryptedNote) -> Result<Note, Box<dyn StdError>> {
        let encrypted_data = BASE64.decode(&encrypted.data)?;
        let nonce_bytes = BASE64.decode(&encrypted.nonce)?;
        let nonce = Nonce::from_slice(&nonce_bytes);

        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&self.encryption_key));
        let decrypted_data = cipher.decrypt(nonce, encrypted_data.as_slice())
            .map_err(|e| format!("Decryption error: {}", e))?;
        
        let note: Note = serde_json::from_slice(&decrypted_data)?;
        
        // Verify the note ID matches
        let note_id_bytes = BASE64.decode(&encrypted.id)?;
        let mut id_buffer = [0u8; 8];
        id_buffer.copy_from_slice(&note_id_bytes);
        let expected_id = i64::from_be_bytes(id_buffer);
        
        if note.id != Some(expected_id) {
            return Err("Note ID mismatch".into());
        }
        
        Ok(note)
    }
}