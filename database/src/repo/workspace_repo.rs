use r2d2::PooledConnection;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;
use sdw_core::error::{AppError, Result};
use sdw_core::models::{IndexingSettings, Workspace};

pub struct WorkspaceRepository<'a> {
    conn: &'a PooledConnection<SqliteConnectionManager>,
}

impl<'a> WorkspaceRepository<'a> {
    pub fn new(conn: &'a PooledConnection<SqliteConnectionManager>) -> Self {
        Self { conn }
    }

    pub fn create(&self, workspace: &Workspace) -> Result<()> {
        let paths_json = serde_json::to_string(&workspace.paths)
            .map_err(|e| AppError::Configuration(format!("Failed to serialize paths: {}", e)))?;
        let settings_json = serde_json::to_string(&workspace.indexing_settings)
            .map_err(|e| AppError::Configuration(format!("Failed to serialize settings: {}", e)))?;

        self.conn.execute(
            "INSERT INTO workspaces (id, name, description, paths, indexing_settings, created_at, updated_at, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                workspace.id,
                workspace.name,
                workspace.description,
                paths_json,
                settings_json,
                workspace.created_at,
                workspace.updated_at,
                &workspace.status,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to insert workspace: {}", e)))?;

        Ok(())
    }

    pub fn get(&self, id: &str) -> Result<Option<Workspace>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, paths, indexing_settings, created_at, updated_at, status FROM workspaces WHERE id = ?1"
        ).map_err(|e| AppError::Database(format!("Failed to prepare get query: {}", e)))?;

        let mut rows = stmt
            .query(params![id])
            .map_err(|e| AppError::Database(format!("Failed to execute query: {}", e)))?;

        if let Some(row) = rows
            .next()
            .map_err(|e| AppError::Database(format!("Error parsing row: {}", e)))?
        {
            let paths_str: String = row.get(3).map_err(|e| AppError::Database(e.to_string()))?;
            let settings_str: String = row.get(4).map_err(|e| AppError::Database(e.to_string()))?;

            let paths: Vec<String> = serde_json::from_str(&paths_str).map_err(|e| {
                AppError::Configuration(format!("Failed to deserialize paths: {}", e))
            })?;
            let indexing_settings: IndexingSettings =
                serde_json::from_str(&settings_str).map_err(|e| {
                    AppError::Configuration(format!("Failed to deserialize settings: {}", e))
                })?;

            Ok(Some(Workspace {
                id: row.get(0).map_err(|e| AppError::Database(e.to_string()))?,
                name: row.get(1).map_err(|e| AppError::Database(e.to_string()))?,
                description: row.get(2).map_err(|e| AppError::Database(e.to_string()))?,
                paths,
                indexing_settings,
                created_at: row.get(5).map_err(|e| AppError::Database(e.to_string()))?,
                updated_at: row.get(6).map_err(|e| AppError::Database(e.to_string()))?,
                status: row.get(7).map_err(|e| AppError::Database(e.to_string()))?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn list(&self) -> Result<Vec<Workspace>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, paths, indexing_settings, created_at, updated_at, status FROM workspaces"
        ).map_err(|e| AppError::Database(format!("Failed to prepare list query: {}", e)))?;

        let workspace_iter = stmt
            .query_map([], |row| {
                let paths_str: String = row.get(3)?;
                let settings_str: String = row.get(4)?;

                let paths: Vec<String> = serde_json::from_str(&paths_str).map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(
                        0,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                })?;

                Ok(Workspace {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    paths,
                    indexing_settings: serde_json::from_str(&settings_str)
                        .unwrap_or_else(|_| IndexingSettings::default()),
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                    status: row.get(7)?,
                })
            })
            .map_err(|e| AppError::Database(format!("Query execution failed: {}", e)))?;

        let mut workspaces = Vec::new();
        for w in workspace_iter {
            workspaces
                .push(w.map_err(|e| AppError::Database(format!("Row conversion error: {}", e)))?);
        }

        Ok(workspaces)
    }

    pub fn update(&self, workspace: &Workspace) -> Result<()> {
        let paths_json = serde_json::to_string(&workspace.paths)
            .map_err(|e| AppError::Configuration(format!("Failed to serialize paths: {}", e)))?;
        let settings_json = serde_json::to_string(&workspace.indexing_settings)
            .map_err(|e| AppError::Configuration(format!("Failed to serialize settings: {}", e)))?;

        self.conn.execute(
            "UPDATE workspaces SET name = ?1, description = ?2, paths = ?3, indexing_settings = ?4, updated_at = ?5, status = ?6 WHERE id = ?7",
            params![
                workspace.name,
                workspace.description,
                paths_json,
                settings_json,
                workspace.updated_at,
                &workspace.status,
                workspace.id,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to update workspace: {}", e)))?;

        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM workspaces WHERE id = ?1", params![id])
            .map_err(|e| AppError::Database(format!("Failed to delete workspace: {}", e)))?;

        Ok(())
    }
}
