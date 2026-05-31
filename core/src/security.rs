use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use argon2::{
    password_hash::{rand_core::OsRng as ArgonOsRng, SaltString},
    Argon2,
};
use std::fs;
use std::path::Path;

#[derive(Debug, thiserror::Error)]
pub enum SecurityError {
    #[error("Encryption failed")]
    EncryptionError,
    #[error("Decryption failed")]
    DecryptionError,
    #[error("IO Error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Key derivation failed: {0}")]
    KeyDerivationError(String),
}

/// Derives a 32-byte key from a password and a salt string.
pub fn derive_key(password: &str, salt: &str) -> Result<[u8; 32], SecurityError> {
    let argon2 = Argon2::default();
    
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt.as_bytes(), &mut key)
        .map_err(|e| SecurityError::KeyDerivationError(e.to_string()))?;
    
    Ok(key)
}

/// Generates a random 16-byte salt (encoded as base64/hex usually, we'll just return hex).
pub fn generate_salt() -> String {
    let salt = SaltString::generate(&mut ArgonOsRng);
    salt.to_string()
}

/// Encrypts a file using AES-256-GCM.
/// Writes [Nonce (12 bytes) | Ciphertext] to the output path.
pub fn encrypt_file(key: &[u8; 32], input_path: &Path, output_path: &Path) -> Result<(), SecurityError> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng); // 96-bits; unique per message

    let plaintext = fs::read(input_path)?;
    
    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_ref())
        .map_err(|_| SecurityError::EncryptionError)?;

    let mut out_data = nonce.to_vec();
    out_data.extend_from_slice(&ciphertext);

    fs::write(output_path, out_data)?;
    Ok(())
}

/// Decrypts a file using AES-256-GCM.
/// Expects [Nonce (12 bytes) | Ciphertext] in the input file.
pub fn decrypt_file(key: &[u8; 32], input_path: &Path, output_path: &Path) -> Result<(), SecurityError> {
    let data = fs::read(input_path)?;
    if data.len() < 12 {
        return Err(SecurityError::DecryptionError);
    }

    let (nonce_bytes, ciphertext) = data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| SecurityError::DecryptionError)?;

    fs::write(output_path, plaintext)?;
    Ok(())
}
