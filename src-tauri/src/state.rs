use automation::WorkspaceWatcher;
use database::DbPool;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use plugins::PluginManager;

pub struct AppState {
    pub db: DbPool,
    pub watcher: Arc<Mutex<WorkspaceWatcher>>,
    pub plugin_manager: Arc<PluginManager>,
    /// Cross-platform path to the SQLite database file.
    /// Resolved once at startup from Tauri's `app_data_dir()`.
    pub db_path: PathBuf,
    pub unlocked_vaults: Arc<Mutex<std::collections::HashMap<String, [u8; 32]>>>,
}

impl AppState {
    pub fn new(db: DbPool, db_path: PathBuf, plugin_dir: PathBuf) -> Self {
        Self {
            watcher: Arc::new(Mutex::new(WorkspaceWatcher::new(db.clone()))),
            db,
            db_path,
            plugin_manager: Arc::new(PluginManager::new(plugin_dir).unwrap_or_else(|e| {
                tracing::error!("Failed to initialize plugin manager: {}", e);
                // Fallback to a dummy dir if it fails
                PluginManager::new(PathBuf::from(".")).unwrap()
            })),

            unlocked_vaults: Arc::new(Mutex::new(std::collections::HashMap::new())),
        }
    }
}
