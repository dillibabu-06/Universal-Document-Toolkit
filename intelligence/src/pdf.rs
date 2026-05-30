use sdw_core::error::Result;
use std::path::Path;

/// Extract embedded text from a PDF file.
#[tracing::instrument(skip(path))]
pub fn extract_text(path: &Path) -> Result<String> {
    match pdf_extract::extract_text(path) {
        Ok(text) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                Ok(String::new())
            } else {
                Ok(trimmed.to_string())
            }
        }
        Err(e) => {
            tracing::warn!("Failed to natively extract PDF text: {:?}", e);
            // We do not throw an error here, because a fallback to OCR could be triggered by the caller
            // But for now, we just return empty string if it fails (e.g. scanned image PDF without OCR)
            Ok(String::new())
        }
    }
}
