use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use sdw_core::error::{AppError, Result};
use std::path::Path;

pub mod repo;

pub type DbPool = Pool<SqliteConnectionManager>;

pub fn init_db<P: AsRef<Path>>(db_path: P) -> Result<DbPool> {
    // Ensure parent directory exists
    if let Some(parent) = db_path.as_ref().parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Io(format!("Failed to create database directory: {}", e)))?;
    }

    let manager = SqliteConnectionManager::file(db_path);
    let pool = Pool::builder()
        .max_size(10) // Limit connection pool size for desktop stability
        .build(manager)
        .map_err(|e| AppError::Database(format!("Failed to create SQLite pool: {}", e)))?;

    // Bootstrap schema using refinery migrations
    let mut conn = pool
        .get()
        .map_err(|e| AppError::Database(format!("Failed to checkout DB connection: {}", e)))?;

    refinery::embed_migrations!("src/migrations");
    migrations::runner()
        .run(&mut *conn)
        .map_err(|e| AppError::Database(format!("Failed to run database migrations: {}", e)))?;

    // Crash Recovery: Reset any workspaces that were interrupted during a sync
    conn.execute(
        "UPDATE workspaces SET status = 'IDLE' WHERE status = 'SYNCING'",
        [],
    )
    .map_err(|e| AppError::Database(format!("Failed to run crash recovery: {}", e)))?;

    Ok(pool)
}
