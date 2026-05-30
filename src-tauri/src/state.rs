use automation::WorkspaceWatcher;
use database::DbPool;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub struct AppState {
    pub db: DbPool,
    pub watcher: Arc<Mutex<WorkspaceWatcher>>,
    /// Cross-platform path to the SQLite database file.
    /// Resolved once at startup from Tauri's `app_data_dir()`.
    pub db_path: PathBuf,
}

impl AppState {
    pub fn new(db: DbPool, db_path: PathBuf) -> Self {
        Self {
            watcher: Arc::new(Mutex::new(WorkspaceWatcher::new(db.clone()))),
            db,
            db_path,
        }
    }
}
