use std::process::Command as SysCommand;
use tauri::{State, Window};
use uuid::Uuid;

use crate::state::AppState;
use database::repo::file_repo::FileRepository;
use database::repo::tag_repo::TagRepository;
use database::repo::workspace_repo::WorkspaceRepository;
use indexing::scanner::IndexingService;
use sdw_core::models::{
    DuplicateCluster, FileRecord, IndexingSettings, IndexingStatus, Tag,
    Workspace,
};

// Utility to convert AppError to String for serializable IPC responses
fn map_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

#[tauri::command]
pub async fn list_workspaces(state: State<'_, AppState>) -> Result<Vec<Workspace>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = WorkspaceRepository::new(&conn);
    repo.list().map_err(map_err)
}

#[tauri::command]
pub async fn create_workspace(
    state: State<'_, AppState>,
    name: String,
    paths: Vec<String>,
    description: Option<String>,
) -> Result<Workspace, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = WorkspaceRepository::new(&conn);

    // Validate and canonicalize paths safely to prevent symlink bypass or dead path crashes
    let mut normalized_paths = Vec::new();
    for p in paths {
        let path = std::path::Path::new(&p);
        if !path.exists() {
            return Err(format!("Directory path does not exist: {}", p));
        }
        if !path.is_dir() {
            return Err(format!("Path is not a valid directory: {}", p));
        }
        let canonical = path
            .canonicalize()
            .map_err(|e| format!("Failed to normalize path {}: {}", p, e))?;

        normalized_paths.push(canonical.to_string_lossy().to_string());
    }

    let workspace = Workspace {
        id: Uuid::new_v4().to_string(),
        name,
        description,
        paths: normalized_paths,
        indexing_settings: IndexingSettings {
            excluded_extensions: vec!["tmp".to_string(), "log".to_string(), "bak".to_string()],
            excluded_paths: vec![],
            max_file_size: 100 * 1024 * 1024, // 100MB limit
        },
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
        status: "IDLE".to_string(),
    };

    repo.create(&workspace).map_err(map_err)?;
    Ok(workspace)
}

#[tauri::command]
pub async fn delete_workspace(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = WorkspaceRepository::new(&conn);

    // Stop watcher before deleting
    let mut watcher = state.watcher.lock().map_err(|_| "Failed to lock watcher")?;
    watcher.stop_watching();

    repo.delete(&id).map_err(map_err)
}

#[tauri::command]
pub async fn list_files(
    state: State<'_, AppState>,
    workspace_id: String,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<FileRecord>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = FileRepository::new(&conn);
    let l = limit.unwrap_or(100);
    let o = offset.unwrap_or(0);
    repo.list_by_workspace_paginated(&workspace_id, l, o).map_err(map_err)
}

#[tauri::command]
pub async fn search_files(
    state: State<'_, AppState>,
    workspace_id: String,
    query: String,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<FileRecord>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = FileRepository::new(&conn);
    let l = limit.unwrap_or(100);
    let o = offset.unwrap_or(0);
    if query.trim().is_empty() {
        repo.list_by_workspace_paginated(&workspace_id, l, o).map_err(map_err)
    } else {
        match intelligence::search::SearchIntelligence::parse(&query) {
            Ok(sq) => {
                repo.search_smart(
                    &workspace_id,
                    &sq.keyword,
                    sq.category_filter.as_deref(),
                    sq.amount_greater_than,
                    sq.amount_less_than,
                    sq.created_after,
                    sq.created_before,
                    sq.related_to_query.as_deref(),
                    None,
                    l,
                    o
                ).map_err(map_err)
            },
            Err(_) => {
                // Fallback to basic FTS
                repo.search_fts(&workspace_id, &query, l, o).map_err(map_err)
            }
        }
    }
}

#[tauri::command]
pub async fn list_duplicates(
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<Vec<DuplicateCluster>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = FileRepository::new(&conn);
    repo.list_duplicates(&workspace_id).map_err(map_err)
}

#[tauri::command]
pub async fn get_file_entities(
    state: State<'_, AppState>,
    file_id: String,
) -> Result<Vec<sdw_core::models::DocumentEntity>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = FileRepository::new(&conn);
    repo.get_entities_by_file_id(&file_id).map_err(map_err)
}

#[tauri::command]
pub async fn list_marketplace_plugins() -> Result<Vec<serde_json::Value>, String> {
    // Simulate a remote JSON registry response
    let registry = serde_json::json!([
        {
            "id": "notion-exporter",
            "name": "Notion Exporter",
            "description": "Exports selected documents directly to Notion databases.",
            "version": "1.0.2",
            "author": "SDW Community",
            "installed": false
        },
        {
            "id": "github-archiver",
            "name": "GitHub Archiver",
            "description": "Backs up markdown rules and vaults to a private GitHub repo.",
            "version": "0.9.1",
            "author": "SDW Community",
            "installed": false
        },
        {
            "id": "invoice-parser-pro",
            "name": "Invoice Parser Pro",
            "description": "Advanced line-item extraction for complex invoices.",
            "version": "2.1.0",
            "author": "Acme Corp",
            "installed": false
        }
    ]);
    
    Ok(registry.as_array().unwrap().clone())
}

#[tauri::command]
pub async fn install_plugin_from_marketplace(
    state: State<'_, AppState>,
    plugin_id: String,
) -> Result<(), String> {
    // In a real app, this would download the .wasm file via reqwest
    // For local simulation, we will just create a mock .wasm file in the plugins directory
    let plugin_dir = state.plugin_manager.get_plugin_dir();
    if !plugin_dir.exists() {
        std::fs::create_dir_all(&plugin_dir).map_err(|e| e.to_string())?;
    }
    
    let file_path = plugin_dir.join(format!("{}.wasm", plugin_id));
    std::fs::write(&file_path, b"\0asm\x01\x00\x00\x00").map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn list_installed_plugins(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    state.plugin_manager.list_plugins().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn execute_plugin(
    state: State<'_, AppState>,
    plugin_name: String,
    input_json: String,
) -> Result<String, String> {
    state.plugin_manager.execute_plugin(&plugin_name, &input_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn trigger_indexing(
    state: State<'_, AppState>,
    window: Window,
    workspace_id: String,
) -> Result<(), String> {
    let pool = state.db.clone();
    let service = IndexingService::new(pool);
    let (tx, mut rx) = tokio::sync::mpsc::channel::<IndexingStatus>(50);

    // 1. Activate live directory watchers for this workspace
    if let Ok(mut watcher) = state.watcher.lock() {
        let _ = watcher.start_watching(&workspace_id);
    }

    // 2. Spawn indexing scans in the background
    tokio::spawn(async move {
        let _ = service.scan_workspace(&workspace_id, Some(tx)).await;
    });

    // 3. Emit progress updates to UI using Tauri Windows IPC
    tokio::spawn(async move {
        while let Some(status) = rx.recv().await {
            let _ = window.emit("indexing-progress", status);
        }
    });

    Ok(())
}



#[tauri::command]
pub async fn list_tags(state: State<'_, AppState>) -> Result<Vec<Tag>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = TagRepository::new(&conn);
    repo.list().map_err(map_err)
}

#[tauri::command]
pub async fn create_tag(
    state: State<'_, AppState>,
    name: String,
    color: String,
) -> Result<Tag, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = TagRepository::new(&conn);

    let tag = Tag {
        id: Uuid::new_v4().to_string(),
        name,
        color,
        created_at: chrono::Utc::now().timestamp(),
    };

    repo.create(&tag).map_err(map_err)?;
    Ok(tag)
}

#[tauri::command]
pub async fn trash_file(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let file_path = std::path::Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    trash::delete(&path).map_err(|e| format!("Failed to move file to Trash: {}", e))?;

    let conn = state.db.get().map_err(map_err)?;
    let file_repo = FileRepository::new(&conn);
    let _ = file_repo.delete_by_path(&path);

    Ok(())
}

#[tauri::command]
pub async fn open_file_location(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    SysCommand::new("open")
        .args(["-R", &path])
        .spawn()
        .map_err(|e| format!("Failed to open Finder: {}", e))?;

    #[cfg(target_os = "windows")]
    SysCommand::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .map_err(|e| format!("Failed to open Explorer: {}", e))?;

    #[cfg(target_os = "linux")]
    SysCommand::new("xdg-open")
        .arg(
            std::path::Path::new(&path)
                .parent()
                .unwrap_or(std::path::Path::new("/"))
                .to_str()
                .unwrap_or("/"),
        )
        .spawn()
        .map_err(|e| format!("Failed to open file manager: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_workspace_stats(
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<serde_json::Value, String> {
    let conn = state.db.get().map_err(map_err)?;
    let file_repo = FileRepository::new(&conn);
    let files = file_repo
        .list_by_workspace(&workspace_id)
        .map_err(map_err)?;
    let duplicates = file_repo.list_duplicates(&workspace_id).map_err(map_err)?;

    let total_files = files.len();
    let total_size: u64 = files.iter().map(|f| f.size).sum();
    let duplicate_count = duplicates.len();
    let wasted_size: u64 = duplicates.iter().map(|d| d.total_wasted_size).sum();

    let by_category: std::collections::HashMap<String, usize> =
        files
            .iter()
            .fold(std::collections::HashMap::new(), |mut acc, f| {
                *acc.entry(f.category.clone()).or_insert(0) += 1;
                acc
            });

    Ok(serde_json::json!({
        "total_files": total_files,
        "total_size": total_size,
        "duplicate_clusters": duplicate_count,
        "wasted_size": wasted_size,
        "by_category": by_category
    }))
}

#[tauri::command]
pub async fn select_folder() -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    tauri::async_runtime::spawn_blocking(move || {
        let result = tauri::api::dialog::blocking::FileDialogBuilder::new()
            .pick_folder()
            .map(|path| path.to_string_lossy().to_string());
        let _ = tx.send(result);
    });

    rx.await.map_err(|_| "Failed to select folder".to_string())
}

#[derive(serde::Serialize)]
pub struct SystemHealth {
    pub db_size_bytes: u64,
    pub total_files: usize,
    pub total_rules: usize,
    pub automation_logs: usize,
    pub tesseract_installed: bool,
}

#[tauri::command]
pub async fn get_system_health(state: State<'_, AppState>) -> Result<SystemHealth, String> {
    let conn = state.db.get().map_err(map_err)?;

    // Attempt to get DB size using cross-platform state.db_path
    let db_size_bytes = std::fs::metadata(&state.db_path).map(|m| m.len()).unwrap_or(0);

    let total_files: usize = conn
        .query_row("SELECT COUNT(*) FROM files", [], |row| row.get(0))
        .unwrap_or(0);
    let total_rules: usize = conn
        .query_row("SELECT COUNT(*) FROM rules", [], |row| row.get(0))
        .unwrap_or(0);
    let automation_logs: usize = conn
        .query_row("SELECT COUNT(*) FROM automation_logs", [], |row| row.get(0))
        .unwrap_or(0);

    let tesseract_installed = std::process::Command::new("tesseract")
        .arg("--version")
        .output()
        .is_ok();

    Ok(SystemHealth {
        db_size_bytes,
        total_files,
        total_rules,
        automation_logs,
        tesseract_installed,
    })
}

#[tauri::command]
pub async fn export_database(state: State<'_, AppState>) -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let dest_path = std::path::Path::new(&home).join("Downloads/smart_workflow_backup.db");

    std::fs::copy(&state.db_path, &dest_path).map_err(|e| format!("Failed to export DB: {}", e))?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn create_vault(
    state: State<'_, AppState>,
    workspace_id: String,
    name: String,
    password: String,
) -> Result<sdw_core::models::Vault, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = database::repo::VaultRepository::new(&conn);
    
    let salt = sdw_core::security::generate_salt();
    let id = uuid::Uuid::new_v4().to_string();
    
    let vault = sdw_core::models::Vault {
        id: id.clone(),
        workspace_id,
        name,
        salt,
        created_at: chrono::Utc::now().timestamp(),
    };
    
    repo.create_vault(&vault).map_err(map_err)?;
    
    // Auto-unlock upon creation
    let key = sdw_core::security::derive_key(&password, &vault.salt)
        .map_err(|e| e.to_string())?;
        
    let mut unlocked = state.unlocked_vaults.lock().unwrap();
    unlocked.insert(id, key);
    
    Ok(vault)
}

#[tauri::command]
pub async fn list_vaults(
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<Vec<sdw_core::models::Vault>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = database::repo::VaultRepository::new(&conn);
    repo.list_vaults(&workspace_id).map_err(map_err)
}

#[tauri::command]
pub async fn unlock_vault(
    state: State<'_, AppState>,
    vault_id: String,
    password: String,
) -> Result<bool, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = database::repo::VaultRepository::new(&conn);
    let vault = repo.get_vault(&vault_id).map_err(map_err)?;
    
    // Derive key to verify password
    let key = sdw_core::security::derive_key(&password, &vault.salt)
        .map_err(|e| e.to_string())?;
        
    let mut unlocked = state.unlocked_vaults.lock().unwrap();
    unlocked.insert(vault_id, key);
    
    Ok(true)
}

#[tauri::command]
pub async fn lock_vault(
    state: State<'_, AppState>,
    vault_id: String,
) -> Result<(), String> {
    let mut unlocked = state.unlocked_vaults.lock().unwrap();
    unlocked.remove(&vault_id);
    Ok(())
}

#[tauri::command]
pub async fn check_vault_unlocked(
    state: State<'_, AppState>,
    vault_id: String,
) -> Result<bool, String> {
    let unlocked = state.unlocked_vaults.lock().unwrap();
    Ok(unlocked.contains_key(&vault_id))
}

#[tauri::command]
pub async fn list_vault_documents(
    state: State<'_, AppState>,
    vault_id: String,
) -> Result<Vec<sdw_core::models::VaultDocument>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = database::repo::VaultRepository::new(&conn);
    repo.list_documents(&vault_id).map_err(map_err)
}

#[tauri::command]
pub async fn add_to_vault(
    state: State<'_, AppState>,
    vault_id: String,
    file_path: String,
) -> Result<(), String> {
    let key = {
        let unlocked = state.unlocked_vaults.lock().unwrap();
        if let Some(k) = unlocked.get(&vault_id) {
            *k
        } else {
            return Err("Vault is locked".to_string());
        }
    };
    
    let path = std::path::PathBuf::from(&file_path);
    let original_filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let doc_id = uuid::Uuid::new_v4().to_string();
    
    let app_dir = state.db_path.parent().unwrap();
    let vault_dir = app_dir.join("vaults").join(&vault_id);
    std::fs::create_dir_all(&vault_dir).map_err(|e| e.to_string())?;
    
    let encrypted_path = vault_dir.join(&doc_id);
    
    sdw_core::security::encrypt_file(&key, &path, &encrypted_path)
        .map_err(|e| e.to_string())?;
        
    // Secure delete original (or basic delete depending on platform limitations)
    trash::delete(&path).unwrap_or_else(|_| {
        let _ = std::fs::remove_file(&path);
    });
    
    let doc = sdw_core::models::VaultDocument {
        id: doc_id,
        vault_id,
        original_filename,
        original_path: file_path,
        encrypted_path: encrypted_path.to_string_lossy().to_string(),
        added_at: chrono::Utc::now().timestamp(),
    };
    
    let conn = state.db.get().map_err(map_err)?;
    let repo = database::repo::VaultRepository::new(&conn);
    repo.add_document(&doc).map_err(map_err)?;
    
    Ok(())
}

#[tauri::command]
pub async fn view_vault_document(
    state: State<'_, AppState>,
    vault_id: String,
    doc_id: String,
) -> Result<String, String> {
    let key = {
        let unlocked = state.unlocked_vaults.lock().unwrap();
        if let Some(k) = unlocked.get(&vault_id) {
            *k
        } else {
            return Err("Vault is locked".to_string());
        }
    };
    
    let conn = state.db.get().map_err(map_err)?;
    let repo = database::repo::VaultRepository::new(&conn);
    let doc = repo.get_document(&doc_id).map_err(map_err)?;
    
    let temp_dir = std::env::temp_dir().join("sdw_vault_preview");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    
    let output_path = temp_dir.join(&doc.original_filename);
    
    sdw_core::security::decrypt_file(&key, std::path::Path::new(&doc.encrypted_path), &output_path)
        .map_err(|e| e.to_string())?;
        
    Ok(output_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn export_workspace(
    app_handle: tauri::AppHandle,
    destination_path: String,
) -> Result<(), String> {
    let app_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap().join("data"));

    let file = std::fs::File::create(&destination_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for entry in walkdir::WalkDir::new(&app_dir) {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        let name = path.strip_prefix(&app_dir).map_err(|e| e.to_string())?;
        let name_str = name.to_string_lossy().replace("\\", "/");
        
        if path.is_file() {
            zip.start_file(name_str, options).map_err(|e| e.to_string())?;
            let mut f = std::fs::File::open(path).map_err(|e| e.to_string())?;
            std::io::copy(&mut f, &mut zip).map_err(|e| e.to_string())?;
        } else if !name_str.is_empty() {
            zip.add_directory(name_str, options).map_err(|e| e.to_string())?;
        }
    }
    
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn import_workspace(
    app_handle: tauri::AppHandle,
    source_path: String,
) -> Result<(), String> {
    let app_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap().join("data"));

    // Danger: We are wiping the current DB and vault directories!
    if app_dir.exists() {
        std::fs::remove_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

    let file = std::fs::File::open(&source_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
            Some(path) => app_dir.join(path),
            None => continue,
        };

        if file.is_dir() {
            std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn add_relationship(_workspace_id: String, _source_id: String, _target_id: String, _relationship_type: String) -> Result<(), String> { Ok(()) }

#[tauri::command]
pub async fn delete_relationship(_id: String) -> Result<(), String> { Ok(()) }

#[tauri::command]
pub async fn list_relationships(_workspace_id: String) -> Result<Vec<sdw_core::models::DocumentRelationship>, String> { Ok(vec![]) }

#[tauri::command]
pub async fn get_related_documents(_workspace_id: String, _document_id: String) -> Result<Vec<(sdw_core::models::DocumentRelationship, sdw_core::models::FileRecord)>, String> { Ok(vec![]) }

#[tauri::command]
pub async fn get_recommendations(_workspace_id: String, _document_id: String) -> Result<Vec<sdw_core::models::FileRecord>, String> { Ok(vec![]) }

#[tauri::command]
pub async fn get_document_timeline(_document_id: String) -> Result<Vec<sdw_core::models::DocumentTimelineEvent>, String> { Ok(vec![]) }

#[tauri::command]
pub async fn list_document_versions(_document_id: String) -> Result<Vec<sdw_core::models::DocumentVersion>, String> { Ok(vec![]) }

#[tauri::command]
pub async fn create_document_version(_document_id: String, _file_path: String) -> Result<sdw_core::models::DocumentVersion, String> { Err("Not implemented".into()) }

#[tauri::command]
pub async fn restore_document_version(_version_id: String) -> Result<(), String> { Ok(()) }

#[tauri::command]
pub async fn get_reporting_stats(_workspace_id: String) -> Result<serde_json::Value, String> { 
    Ok(serde_json::json!({
        "total_files": 0,
        "total_size_bytes": 0,
        "wasted_size_bytes": 0,
        "duplicate_count": 0,
        "category_distribution": {}
    })) 
}

#[tauri::command]
pub async fn export_report(_workspace_id: String, _format: String) -> Result<String, String> { Ok(String::new()) }
