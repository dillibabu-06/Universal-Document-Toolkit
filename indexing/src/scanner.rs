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

        let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(4));
        let (record_tx, mut record_rx) = tokio::sync::mpsc::channel::<(FileRecord, Vec<sdw_core::models::DocumentEntity>)>(1000);
        
        let pool_for_writer = self.pool.clone();
        let writer_handle = tokio::task::spawn_blocking(move || {
            let mut file_batch = Vec::with_capacity(1000);
            let mut entity_batch = Vec::new();

            while let Some((record, entities)) = record_rx.blocking_recv() {
                file_batch.push(record);
                entity_batch.extend(entities);

                if file_batch.len() >= 1000 {
                    if let Ok(conn) = pool_for_writer.get() {
                        let repo = FileRepository::new(&conn);
                        let _ = repo.upsert_batch(&file_batch);
                        let _ = repo.insert_entities(&entity_batch);
                    }
                    file_batch.clear();
                    entity_batch.clear();
                }
            }
            if !file_batch.is_empty() {
                if let Ok(conn) = pool_for_writer.get() {
                    let repo = FileRepository::new(&conn);
                    let _ = repo.upsert_batch(&file_batch);
                    let _ = repo.insert_entities(&entity_batch);
                }
            }
        });

        let mut handles = Vec::new();

        for (idx, path) in target_files.into_iter().enumerate() {
            let permit = semaphore.clone().acquire_owned().await.unwrap();
            let p_tx = progress_tx.clone();
            let w_id = workspace.id.clone();
            let pool = self.pool.clone();
            let r_tx = record_tx.clone();

            handles.push(tokio::spawn(async move {
                let _permit = permit; // holds the concurrency limit

                if let Some(tx) = &p_tx {
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

                let record_opt = tokio::task::spawn_blocking(move || {
                    let file_metadata = match path.metadata() {
                        Ok(m) => m,
                        Err(_) => return None,
                    };
        
                    let modified_time = file_metadata
                        .modified()
                        .unwrap_or(SystemTime::now())
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs() as i64;
        
                    let file_path_str = path.to_string_lossy().to_string();
        
                    let already_indexed_and_unmodified = {
                        if let Ok(conn) = pool.get() {
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
                        return None;
                    }
        
                    let hash = match hash_file(&path) {
                        Ok(h) => h,
                        Err(_) => return None,
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
        
                    let mut text_content = String::new();
                    if extension == "pdf" {
                        if let Ok(extracted) = intelligence::pdf::extract_text(&path) {
                            text_content = extracted;
                        }
                    } else if extension == "png" || extension == "jpg" || extension == "jpeg" {
                        if let Ok(extracted) = intelligence::ocr::extract_text_from_image(&path) {
                            text_content = extracted;
                        }
                    }
        
                    let category = if !text_content.is_empty() {
                        if let Some(classified) = intelligence::classifier::classify_content(&text_content) {
                            classified
                        } else {
                            classify_file(&filename, &file_path_str)
                        }
                    } else {
                        classify_file(&filename, &file_path_str)
                    };
        
                    let mut entities = Vec::new();
                    if !text_content.is_empty() {
                        let extracted = intelligence::extractor::extract_entities_offline(&category, &text_content);
                        let file_id_for_entities = Uuid::new_v4().to_string(); // we'll use this same UUID for the FileRecord below
                        for (key, val, conf) in extracted {
                            entities.push(sdw_core::models::DocumentEntity {
                                id: Uuid::new_v4().to_string(),
                                file_id: file_id_for_entities.clone(),
                                key,
                                value: val,
                                confidence: conf,
                            });
                        }
                        
                        Some((FileRecord {
                            id: file_id_for_entities,
                            workspace_id: w_id,
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
                        }, entities))
                    } else {
                        Some((FileRecord {
                            id: Uuid::new_v4().to_string(),
                            workspace_id: w_id,
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
                        }, vec![]))
                    }
                }).await.unwrap_or(None);

                if let Some(record_tuple) = record_opt {
                    let _ = r_tx.send(record_tuple).await;
                }
            }));
        }

        // Drop our sender so writer knows we are done
        drop(record_tx);

        for handle in handles {
            let _ = handle.await;
        }

        let _ = writer_handle.await;

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
