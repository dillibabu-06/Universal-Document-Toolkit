use chrono::Utc;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use walkdir::WalkDir;

use database::repo::file_repo::FileRepository;
use database::repo::workspace_repo::WorkspaceRepository;
use database::DbPool;
use sdw_core::error::{AppError, Result};
use sdw_core::models::{FileRecord, IndexingStatus};

pub struct IndexingService {
    pool: DbPool,
}

impl IndexingService {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    /// Recursively scan all root paths of a workspace, indexing new or modified files.
    pub async fn scan_workspace(
        &self,
        workspace_id: &str,
        progress_tx: Option<tokio::sync::mpsc::Sender<IndexingStatus>>,
    ) -> Result<()> {
        let mut workspace = {
            let conn = self
                .pool
                .get()
                .map_err(|e| AppError::Database(format!("Checkout failed: {}", e)))?;
            let workspace_repo = WorkspaceRepository::new(&conn);
            workspace_repo.get(workspace_id)?.ok_or_else(|| {
                AppError::Workspace(format!("Workspace {} not found", workspace_id))
            })?
        };

        // Mark as SYNCING
        {
            let conn = self
                .pool
                .get()
                .map_err(|e| AppError::Database(e.to_string()))?;
            let workspace_repo = WorkspaceRepository::new(&conn);
            workspace.status = "SYNCING".to_string();
            let _ = workspace_repo.update(&workspace);
        }

        // 1. Collect all valid paths to scan
        let mut target_files = Vec::new();
        let excluded_exts: Vec<String> = workspace
            .indexing_settings
            .excluded_extensions
            .iter()
            .map(|e| e.to_lowercase())
            .collect();
        let excluded_paths: Vec<PathBuf> = workspace
            .indexing_settings
            .excluded_paths
            .iter()
            .map(PathBuf::from)
            .collect();

        if let Some(tx) = &progress_tx {
            let _ = tx
                .send(IndexingStatus::Scanning {
                    current: 0,
                    total: 0,
                    current_file: "Collecting files...".to_string(),
                })
                .await;
        }

        for path_str in &workspace.paths {
            let root_path = Path::new(path_str);
            if !root_path.exists() {
                continue;
            }

            for entry in WalkDir::new(root_path).into_iter().filter_map(|e| e.ok()) {
                let file_path = entry.path();

                // Skip hidden folders and files (starting with dot) and node_modules
                let is_hidden_or_ignored = file_path.components().any(|comp| {
                    let s = comp.as_os_str().to_string_lossy();
                    (s.starts_with('.') && s != "." && s != "..") || s == "node_modules"
                });
                if is_hidden_or_ignored {
                    continue;
                }

                if file_path.is_file() {
                    // Check size limit
                    if let Ok(metadata) = file_path.metadata() {
                        if metadata.len() > workspace.indexing_settings.max_file_size {
                            continue; // Skip files exceeding max size limit
                        }
                    }

                    // Check excluded paths
                    let mut should_skip = false;
                    for ex_path in &excluded_paths {
                        if file_path.starts_with(ex_path) {
                            should_skip = true;
                            break;
                        }
                    }
                    if should_skip {
                        continue;
                    }

                    // Check excluded extensions
                    if let Some(ext) = file_path.extension().and_then(|e| e.to_str()) {
                        if excluded_exts.contains(&ext.to_lowercase()) {
                            continue;
                        }
                    } else {
                        // Skip files with no extensions
                        continue;
                    }

                    target_files.push(file_path.to_path_buf());
                }
            }
        }

        let total_files = target_files.len();

        for (idx, path) in target_files.iter().enumerate() {
            if let Some(tx) = &progress_tx {
                let _ = tx
                    .send(IndexingStatus::Scanning {
                        current: idx + 1,
                        total: total_files,
                        current_file: path
                            .file_name()
                            .and_then(|f| f.to_str())
                            .unwrap_or("")
                            .to_string(),
                    })
                    .await;
            }

            let file_metadata = match path.metadata() {
                Ok(m) => m,
                Err(_) => continue, // Unreadable file or symlink mismatch
            };

            let modified_time = file_metadata
                .modified()
                .unwrap_or(SystemTime::now())
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            let file_path_str = path.to_string_lossy().to_string();

            // 2. Check if file is already indexed and unmodified
            let already_indexed_and_unmodified = {
                if let Ok(conn) = self.pool.get() {
                    let file_repo = FileRepository::new(&conn);
                    if let Ok(Some(existing_record)) = file_repo.get_by_path(&file_path_str) {
                        existing_record.modified_at == modified_time
                    } else {
                        false
                    }
                } else {
                    false
                }
            };

            if already_indexed_and_unmodified {
                continue;
            }

            // 3. File is new or changed - read, hash, and classify
            let hash = match hash_file(path) {
                Ok(h) => h,
                Err(_) => continue, // Lock or file open error
            };

            let filename = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Unknown")
                .to_string();

            let extension = path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();

            let created_time = file_metadata
                .created()
                .unwrap_or(SystemTime::now())
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            // Extract text contents using intelligence crate based on file types
            let mut text_content = String::new();
            if extension == "pdf" {
                if let Ok(extracted) = intelligence::pdf::extract_text(path) {
                    text_content = extracted;
                }
            } else if extension == "png" || extension == "jpg" || extension == "jpeg" {
                if let Ok(extracted) = intelligence::ocr::extract_text_from_image(path) {
                    text_content = extracted;
                }
            }

            // Run deep text classification, fallback to filename matches
            let category = if !text_content.is_empty() {
                if let Some(classified) = intelligence::classifier::classify_content(&text_content) {
                    classified
                } else {
                    classify_file(&filename, &file_path_str)
                }
            } else {
                classify_file(&filename, &file_path_str)
            };

            let record = FileRecord {
                id: Uuid::new_v4().to_string(),
                workspace_id: workspace.id.clone(),
                filename,
                extension,
                path: file_path_str,
                size: file_metadata.len(),
                hash,
                created_at: created_time,
                modified_at: modified_time,
                indexed_at: Utc::now().timestamp(),
                category,
                snippet: None,
            };

            // Checkout connection for upsert, then drop it!
            let conn = self
                .pool
                .get()
                .map_err(|e| AppError::Database(format!("Checkout failed: {}", e)))?;
            let file_repo = FileRepository::new(&conn);
            file_repo.upsert(&record)?;
        }

        if let Some(tx) = &progress_tx {
            let _ = tx
                .send(IndexingStatus::Finished {
                    files_indexed: total_files,
                })
                .await;
        }

        // Mark as IDLE
        {
            if let Ok(conn) = self.pool.get() {
                let workspace_repo = WorkspaceRepository::new(&conn);
                workspace.status = "IDLE".to_string();
                let _ = workspace_repo.update(&workspace);
            }
        }

        Ok(())
    }
}

/// Compute high-performance SHA-256 hash of a file's contents for deduplication matching
#[tracing::instrument(skip(path))]
pub fn hash_file(path: &Path) -> std::io::Result<String> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0; 65536]; // 64KB chunk sizes for optimal memory-disk read matching

    loop {
        let count = file.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

/// Simple heuristic classifier mapping files based on standard commercial naming conventions
fn classify_file(filename: &str, filepath: &str) -> String {
    let name_lower = filename.to_lowercase();
    let path_lower = filepath.to_lowercase();

    if name_lower.contains("invoice") || name_lower.contains("bill") {
        "Invoice".to_string()
    } else if name_lower.contains("receipt") || name_lower.contains("payment") {
        "Receipt".to_string()
    } else if name_lower.contains("resume")
        || name_lower.contains("cv")
        || name_lower.contains("bio")
    {
        "Resume".to_string()
    } else if name_lower.contains("tax")
        || name_lower.contains("itr")
        || name_lower.contains("gst")
        || name_lower.contains("form-16")
    {
        "Tax Document".to_string()
    } else if name_lower.contains("statement")
        || name_lower.contains("bank")
        || name_lower.contains("ledger")
    {
        "Bank Statement".to_string()
    } else if name_lower.contains("contract")
        || name_lower.contains("agreement")
        || name_lower.contains("nda")
        || name_lower.contains("mou")
    {
        "Contract".to_string()
    } else if name_lower.contains("note")
        || name_lower.contains("lecture")
        || name_lower.contains("assignment")
        || name_lower.contains("exam")
        || path_lower.contains("college")
        || path_lower.contains("university")
    {
        "College Notes".to_string()
    } else {
        "Other".to_string()
    }
}
