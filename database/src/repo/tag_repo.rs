use r2d2::PooledConnection;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;
use sdw_core::error::{AppError, Result};
use sdw_core::models::Tag;

pub struct TagRepository<'a> {
    conn: &'a PooledConnection<SqliteConnectionManager>,
}

impl<'a> TagRepository<'a> {
    pub fn new(conn: &'a PooledConnection<SqliteConnectionManager>) -> Self {
        Self { conn }
    }

    pub fn create(&self, tag: &Tag) -> Result<()> {
        self.conn
            .execute(
                "INSERT INTO tags (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
                params![tag.id, tag.name, tag.color, tag.created_at],
            )
            .map_err(|e| AppError::Database(format!("Failed to create tag: {}", e)))?;

        Ok(())
    }

    pub fn list(&self) -> Result<Vec<Tag>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, color, created_at FROM tags")
            .map_err(|e| AppError::Database(format!("Failed to prepare tag list: {}", e)))?;

        let tag_iter = stmt
            .query_map([], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut tags = Vec::new();
        for t in tag_iter {
            tags.push(t.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(tags)
    }

    pub fn delete(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM tags WHERE id = ?1", params![id])
            .map_err(|e| AppError::Database(format!("Failed to delete tag: {}", e)))?;

        Ok(())
    }

    pub fn tag_file(&self, file_id: &str, tag_id: &str) -> Result<()> {
        self.conn
            .execute(
                "INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?1, ?2)",
                params![file_id, tag_id],
            )
            .map_err(|e| AppError::Database(format!("Failed to link tag to file: {}", e)))?;

        Ok(())
    }

    pub fn untag_file(&self, file_id: &str, tag_id: &str) -> Result<()> {
        self.conn
            .execute(
                "DELETE FROM file_tags WHERE file_id = ?1 AND tag_id = ?2",
                params![file_id, tag_id],
            )
            .map_err(|e| AppError::Database(format!("Failed to untag file: {}", e)))?;

        Ok(())
    }

    pub fn get_file_tags(&self, file_id: &str) -> Result<Vec<Tag>> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT t.id, t.name, t.color, t.created_at
             FROM tags t
             JOIN file_tags ft ON ft.tag_id = t.id
             WHERE ft.file_id = ?1",
            )
            .map_err(|e| AppError::Database(format!("Failed to prepare file tag read: {}", e)))?;

        let tag_iter = stmt
            .query_map(params![file_id], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut tags = Vec::new();
        for t in tag_iter {
            tags.push(t.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(tags)
    }
}
