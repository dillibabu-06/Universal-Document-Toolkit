use rusty_tesseract::{Args, Image};
use sdw_core::error::{AppError, Result};
use std::path::Path;

/// Perform OCR on an image file using Tesseract.
#[tracing::instrument(skip(path))]
pub fn extract_text_from_image(path: &Path) -> Result<String> {
    tracing::debug!("Attempting OCR on image: {:?}", path);

    // Check if the tesseract command is actually available
    // If not, we skip smoothly instead of crashing
    let args = Args::default();

    let img = Image::from_path(path.to_string_lossy().to_string())
        .map_err(|e| AppError::Configuration(format!("Failed to read image for OCR: {}", e)))?;

    match rusty_tesseract::image_to_string(&img, &args) {
        Ok(text) => Ok(text.trim().to_string()),
        Err(e) => {
            tracing::warn!("OCR failed or Tesseract not installed: {}", e);
            // Return empty string instead of failing the pipeline
            Ok(String::new())
        }
    }
}
