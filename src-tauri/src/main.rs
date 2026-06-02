#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod state;

use commands::*;
use state::AppState;
use tauri::Manager;

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter("info,smart_document_workflow=debug")
        .init();

    tauri::Builder::default()
        .setup(|app| {
            // Retrieve system application storage directory for localized DB persistence
            let app_dir = app
                .path_resolver()
                .app_data_dir()
                .unwrap_or_else(|| std::env::current_dir().unwrap().join("data"));

            let db_path = app_dir.join("smart_workflow.db");
            tracing::info!(
                "Initializing Smart Document SQLite connection pool at: {:?}",
                db_path
            );

            let pool =
                database::init_db(&db_path).expect("Failed to initialize database and run schemas");

            // Spawn background OCR worker
            let pool_clone = pool.clone();
            tauri::async_runtime::spawn(async move {
                automation::ocr_worker::start_ocr_worker(pool_clone).await;
            });

            let plugin_dir = app_dir.join("plugins");
            let app_state = AppState::new(pool, db_path, plugin_dir);
            app.manage(app_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_workspaces,
            create_workspace,
            delete_workspace,
            list_files,
            search_files,
            list_duplicates,
            get_file_entities,
            list_installed_plugins,
            execute_plugin,
            trigger_indexing,
            create_vault,
            list_vaults,
            lock_vault,
            unlock_vault,
            check_vault_unlocked,
            list_vault_documents,
            add_to_vault,
            view_vault_document,
            list_tags,
            create_tag,
            select_folder,
            trash_file,
            open_file_location,
            get_workspace_stats,
            get_system_health,
            export_database,
            export_workspace,
            import_workspace,
            list_marketplace_plugins,
            install_plugin_from_marketplace,
            add_relationship,
            delete_relationship,
            list_relationships,
            get_related_documents,
            get_recommendations,
            get_document_timeline,
            list_document_versions,
            create_document_version,
            restore_document_version,
            get_reporting_stats,
            export_report
])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
