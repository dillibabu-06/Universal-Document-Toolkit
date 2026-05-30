use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::time::Duration;

use crate::engine::AutomationEngine;
use database::repo::file_repo::FileRepository;
use database::repo::workspace_repo::WorkspaceRepository;
use database::DbPool;
use sdw_core::error::{AppError, Result};
use sdw_core::models::FileRecord;

pub struct WorkspaceWatcher {
    pool: DbPool,
    watcher: Option<RecommendedWatcher>,
    active_paths: Vec<PathBuf>,
}

impl WorkspaceWatcher {
    pub fn new(pool: DbPool) -> Self {
        Self {
            pool,
            watcher: None,
            active_paths: Vec::new(),
        }
    }

    /// Recursively start watching all monitored root folders inside a workspace
    pub fn start_watching(&mut self, workspace_id: &str) -> Result<()> {
        self.stop_watching();

        let conn = self
            .pool
            .get()
            .map_err(|e| AppError::Database(format!("Checkout failed: {}", e)))?;
        let workspace_repo = WorkspaceRepository::new(&conn);

        let workspace = workspace_repo
            .get(workspace_id)?
            .ok_or_else(|| AppError::Workspace(format!("Workspace {} not found", workspace_id)))?;

        let workspace_id_str = workspace_id.to_string();

        // 1. Setup channel to receive filesystem events across threads
        let (tx, mut rx) = tokio::sync::mpsc::channel::<Event>(100);
        let rt = tokio::runtime::Handle::current();

        let mut watcher = RecommendedWatcher::new(
            move |res: notify::Result<Event>| {
                if let Ok(event) = res {
                    let tx_clone = tx.clone();
                    rt.spawn(async move {
                        let _ = tx_clone.send(event).await;
                    });
                }
            },
            notify::Config::default().with_compare_contents(true),
        )
        .map_err(|e| AppError::Automation(format!("Failed to create watcher: {}", e)))?;

        // 2. Watch active directory roots recursively
        for path_str in &workspace.paths {
            let path = Path::new(path_str);
            if path.exists() {
                watcher.watch(path, RecursiveMode::Recursive).map_err(|e| {
                    AppError::Automation(format!("Failed to watch {}: {}", path_str, e))
                })?;
                self.active_paths.push(path.to_path_buf());
            }
        }

        self.watcher = Some(watcher);

        // 3. Spawn asynchronous Toko loop processing events
        let pool_engine = self.pool.clone();
        tokio::spawn(async move {
            let engine = AutomationEngine::new(pool_engine.clone());

            while let Some(event) = rx.recv().await {
                match event.kind {
                    EventKind::Create(_) | EventKind::Modify(_) => {
                        for path in event.paths {
                            if path.is_file() {
                                // Pause briefly to let the OS release file locks (avoid sharing locks)
                                tokio::time::sleep(Duration::from_millis(500)).await;

                                // Run incremental scan update on file
                                let mut record_opt = None;
                                if let Ok(conn) = pool_engine.get() {
                                    let file_repo = FileRepository::new(&conn);
                                    let path_str = path.to_string_lossy().to_string();

                                    // Trigger index scan for single file
                                    if let Ok(metadata) = path.metadata() {
                                        let size = metadata.len();
                                        let extension = path
                                            .extension()
                                            .and_then(|e| e.to_str())
                                            .unwrap_or("")
                                            .to_lowercase();
                                        let filename = path
                                            .file_name()
                                            .and_then(|f| f.to_str())
                                            .unwrap_or("Unknown")
                                            .to_string();

                                        let record = FileRecord {
                                            id: uuid::Uuid::new_v4().to_string(),
                                            workspace_id: workspace_id_str.clone(),
                                            filename,
                                            extension,
                                            path: path_str.clone(),
                                            size,
                                            hash: "pending".to_string(), // Hashed concurrently inside engine/indexer later
                                            created_at: chrono::Utc::now().timestamp(),
                                            modified_at: chrono::Utc::now().timestamp(),
                                            indexed_at: chrono::Utc::now().timestamp(),
                                            category: "Other".to_string(),
                                            snippet: None,
                                        };

                                        if file_repo.upsert(&record).is_ok() {
                                            record_opt = Some(record);
                                        }
                                    }
                                }

                                if let Some(record) = record_opt {
                                    // Trigger automation matching (safe across await)
                                    let _ = engine
                                        .handle_file_created(&workspace_id_str, &record)
                                        .await;
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }

    /// Stops folder watchers and clears active paths
    pub fn stop_watching(&mut self) {
        if let Some(mut watcher) = self.watcher.take() {
            for path in &self.active_paths {
                let _ = watcher.unwatch(path);
            }
        }
        self.active_paths.clear();
    }
}
