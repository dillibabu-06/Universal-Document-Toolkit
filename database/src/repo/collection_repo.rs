use rusqlite::{params, Connection};
use sdw_core::error::{AppError, Result as SdwResult};
use sdw_core::models::SmartCollection;

pub struct CollectionRepository<'a> {
    conn: &'a Connection,
}

impl<'a> CollectionRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    /// Save a new smart collection in the database
    pub fn create_smart_collection(&self, col: &SmartCollection) -> SdwResult<()> {
        self.conn.execute(
            "INSERT INTO smart_collections (id, workspace_id, name, query, icon, color, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                col.id,
                col.workspace_id,
                col.name,
                col.query,
                col.icon,
                col.color,
                col.created_at,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to create smart collection: {}", e)))?;
        Ok(())
    }

    /// Delete a smart collection by ID
    pub fn delete_smart_collection(&self, id: &str) -> SdwResult<()> {
        self.conn.execute(
            "DELETE FROM smart_collections WHERE id = ?1",
            params![id],
        ).map_err(|e| AppError::Database(format!("Failed to delete smart collection: {}", e)))?;
        Ok(())
    }

    /// List all smart collections matching a workspace ID
    pub fn list_smart_collections(&self, workspace_id: &str) -> SdwResult<Vec<SmartCollection>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, name, query, icon, color, created_at
             FROM smart_collections WHERE workspace_id = ?1 ORDER BY name ASC",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt.query_map(params![workspace_id], |row| {
            Ok(SmartCollection {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                query: row.get(3)?,
                icon: row.get(4)?,
                color: row.get(5)?,
                created_at: row.get(6)?,
            })
        }).map_err(|e| AppError::Database(e.to_string()))?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(list)
    }

    /// Load a single smart collection details
    pub fn get_smart_collection(&self, id: &str) -> SdwResult<SmartCollection> {
        self.conn.query_row(
            "SELECT id, workspace_id, name, query, icon, color, created_at
             FROM smart_collections WHERE id = ?1",
            params![id],
            |row| {
                Ok(SmartCollection {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    query: row.get(3)?,
                    icon: row.get(4)?,
                    color: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        ).map_err(|e| AppError::Database(format!("Smart collection not found: {}", e)))
    }
}
