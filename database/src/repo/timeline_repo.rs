use rusqlite::{params, Connection};
use sdw_core::error::{AppError, Result as SdwResult};
use sdw_core::models::DocumentTimelineEvent;

pub struct TimelineRepository<'a> {
    conn: &'a Connection,
}

impl<'a> TimelineRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    /// Save a new timeline event manually
    pub fn add_timeline_event(&self, event: &DocumentTimelineEvent) -> SdwResult<()> {
        self.conn.execute(
            "INSERT INTO document_timeline (id, file_id, event_type, title, description, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                event.id,
                event.file_id,
                event.event_type,
                event.title,
                event.description,
                event.created_at,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to create timeline event: {}", e)))?;
        Ok(())
    }

    /// Get all timeline events for a file, sorted chronologically (newest first)
    pub fn get_timeline(&self, file_id: &str) -> SdwResult<Vec<DocumentTimelineEvent>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, file_id, event_type, title, description, created_at
             FROM document_timeline WHERE file_id = ?1 ORDER BY created_at DESC",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt.query_map(params![file_id], |row| {
            Ok(DocumentTimelineEvent {
                id: row.get(0)?,
                file_id: row.get(1)?,
                event_type: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                created_at: row.get(5)?,
            })
        }).map_err(|e| AppError::Database(e.to_string()))?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(list)
    }
}
