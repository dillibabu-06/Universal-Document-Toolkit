use std::path::Path;
use std::time::Duration;
use tokio::time::sleep;

use database::repo::file_repo::FileRepository;
use database::DbPool;
use intelligence::{ocr, pdf};
use sdw_core::models::{DocumentContent, FileRecord};

/// Starts the background OCR worker thread.
/// It continuously polls the database for files lacking a `document_content` entry,
/// attempts to extract text (via PDF parsing or Tesseract), and upserts the result.
#[tracing::instrument(skip(pool))]
pub async fn start_ocr_worker(pool: DbPool) {
    tracing::info!("Starting background OCR worker");

    loop {
        let files = {
            if let Ok(conn) = pool.get() {
                let repo = FileRepository::new(&conn);
                // Fetch up to 10 unprocessed files at a time to process in batches
                repo.get_unprocessed_ocr_files(10).unwrap_or_default()
            } else {
                Vec::new()
            }
        };

        if files.is_empty() {
            // Idle when no files need processing
            sleep(Duration::from_secs(5)).await;
            continue;
        }

        for file in files {
            process_file(&pool, &file).await;
            // Brief yield to avoid starving the thread pool and keep CPU cool
            sleep(Duration::from_millis(50)).await;
        }
    }
}

async fn process_file(pool: &DbPool, file: &FileRecord) {
    let path = Path::new(&file.path);
    let mut extracted_text = String::new();
    let status: String;
    let mut confidence = 0.0;

    let ext = file.extension.to_lowercase();

    // 1. Determine extraction strategy based on file type
    if ext == "pdf" {
        match pdf::extract_text(path) {
            Ok(text) => {
                if text.len() > 50 {
                    extracted_text = text;
                    status = "NATIVE_PDF".to_string();
                    confidence = 1.0;
                } else {
                    // Fallback to OCR if PDF contains images but no embedded text
                    tracing::debug!("PDF {:?} has < 50 chars, falling back to OCR", path);
                    match ocr::extract_text_from_image(path) {
                        Ok(ocr_text) => {
                            extracted_text = ocr_text;
                            status = "OCR_PDF".to_string();
                            confidence = 0.8;
                        }
                        Err(_) => {
                            status = "FAILED".to_string();
                        }
                    }
                }
            }
            Err(_) => {
                status = "FAILED".to_string();
            }
        }
    } else if ["png", "jpg", "jpeg", "webp", "tiff"].contains(&ext.as_str()) {
        match ocr::extract_text_from_image(path) {
            Ok(text) => {
                extracted_text = text;
                status = "OCR_IMAGE".to_string();
                confidence = 0.8;
            }
            Err(_) => {
                status = "FAILED".to_string();
            }
        }
    } else {
        // Skip unknown extensions or text files (text files should be natively read but we skip for now)
        status = "UNSUPPORTED".to_string();
    }

    // 2. Extract structured metadata if text is available
    let structured_metadata = if !extracted_text.is_empty() {
        Some(intelligence::extractor::extract_metadata(&file.category, &extracted_text))
    } else {
        None
    };

    // 3. Persist the result to prevent infinite retries
    let doc_content = DocumentContent {
        file_id: file.id.clone(),
        extracted_text,
        extraction_status: status,
        extraction_confidence: confidence,
        extracted_at: chrono::Utc::now().timestamp(),
        structured_metadata,
    };

    if let Ok(conn) = pool.get() {
        let repo = FileRepository::new(&conn);
        if let Err(e) = repo.upsert_document_content(&doc_content) {
            tracing::error!("Failed to save OCR result for {:?}: {}", file.path, e);
        } else {
            tracing::debug!("Successfully processed OCR for {:?}", file.path);
        }
    }
}
