use std::process::Command as SysCommand;
use tauri::{State, Window};
use uuid::Uuid;

use crate::state::AppState;
use database::repo::file_repo::FileRepository;
use database::repo::rule_repo::RuleRepository;
use database::repo::tag_repo::TagRepository;
use database::repo::workspace_repo::WorkspaceRepository;
use indexing::scanner::IndexingService;
use sdw_core::models::{
    AutomationLog, DuplicateCluster, FileRecord, IndexingSettings, IndexingStatus, Rule, Tag,
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
) -> Result<Vec<FileRecord>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = FileRepository::new(&conn);
    repo.list_by_workspace(&workspace_id).map_err(map_err)
}

#[tauri::command]
pub async fn search_files(
    state: State<'_, AppState>,
    workspace_id: String,
    query: String,
) -> Result<Vec<FileRecord>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = FileRepository::new(&conn);
    if query.trim().is_empty() {
        repo.list_by_workspace(&workspace_id).map_err(map_err)
    } else {
        repo.search_fts(&workspace_id, &query).map_err(map_err)
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
pub async fn list_rules(
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<Vec<Rule>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = RuleRepository::new(&conn);
    repo.list(&workspace_id).map_err(map_err)
}

#[tauri::command]
pub async fn create_rule(state: State<'_, AppState>, rule: Rule) -> Result<(), String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = RuleRepository::new(&conn);
    repo.create(&rule).map_err(map_err)
}

#[tauri::command]
pub async fn delete_rule(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = RuleRepository::new(&conn);
    repo.delete(&id).map_err(map_err)
}

#[tauri::command]
pub async fn list_automation_logs(
    state: State<'_, AppState>,
    limit: usize,
) -> Result<Vec<AutomationLog>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = RuleRepository::new(&conn);
    repo.list_automation_logs(limit).map_err(map_err)
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
pub async fn export_rules(state: State<'_, AppState>) -> Result<String, String> {
    let conn = state.db.get().map_err(map_err)?;
    let rule_repo = RuleRepository::new(&conn);
    let rules = rule_repo.list("all").map_err(map_err)?;

    let json_data =
        serde_json::to_string_pretty(&rules).map_err(|e| format!("Serialization failed: {}", e))?;

    let home = std::env::var("HOME").unwrap_or_default();
    let dest_path = std::path::Path::new(&home).join("Downloads/smart_workflow_rules.json");

    std::fs::write(&dest_path, json_data).map_err(|e| format!("Failed to write rules: {}", e))?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_document_metadata(
    state: State<'_, AppState>,
    file_id: String,
) -> Result<Option<sdw_core::models::DocumentContent>, String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = FileRepository::new(&conn);
    repo.get_document_content(&file_id).map_err(map_err)
}

#[tauri::command]
pub async fn save_document_metadata(
    state: State<'_, AppState>,
    file_id: String,
    metadata_json: String,
) -> Result<(), String> {
    let conn = state.db.get().map_err(map_err)?;
    let repo = FileRepository::new(&conn);
    
    let mut doc_content = match repo.get_document_content(&file_id).map_err(map_err)? {
        Some(content) => content,
        None => sdw_core::models::DocumentContent {
            file_id: file_id.clone(),
            extracted_text: "".to_string(),
            extraction_status: "MANUAL".to_string(),
            extraction_confidence: 1.0,
            extracted_at: chrono::Utc::now().timestamp(),
            structured_metadata: None,
        },
    };
    
    doc_content.structured_metadata = Some(metadata_json);
    repo.upsert_document_content(&doc_content).map_err(map_err)?;
    Ok(())
}

