use rusqlite::{params, Connection};
use sdw_core::error::{AppError, Result as SdwResult};
use sdw_core::models::DocumentVersion;

pub struct VersionRepository<'a> {
    conn: &'a Connection,
}

impl<'a> VersionRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    /// Save a new document version metadata row
    pub fn create_version(&self, ver: &DocumentVersion) -> SdwResult<()> {
        self.conn.execute(
            "INSERT INTO document_versions (id, file_id, version_number, filename, comment, backup_path, hash, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                ver.id,
                ver.file_id,
                ver.version_number,
                ver.filename,
                ver.comment,
                ver.backup_path,
                ver.hash,
                ver.created_at,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to create document version: {}", e)))?;
        Ok(())
    }

    /// List all versions of a document, ordered newest first (version_number DESC)
    pub fn list_versions(&self, file_id: &str) -> SdwResult<Vec<DocumentVersion>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, file_id, version_number, filename, comment, backup_path, hash, created_at
             FROM document_versions WHERE file_id = ?1 ORDER BY version_number DESC",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt.query_map(params![file_id], |row| {
            Ok(DocumentVersion {
                id: row.get(0)?,
                file_id: row.get(1)?,
                version_number: row.get(2)?,
                filename: row.get(3)?,
                comment: row.get(4)?,
                backup_path: row.get(5)?,
                hash: row.get(6)?,
                created_at: row.get(7)?,
            })
        }).map_err(|e| AppError::Database(e.to_string()))?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(list)
    }

    /// Get a single version's details
    pub fn get_version(&self, id: &str) -> SdwResult<DocumentVersion> {
        self.conn.query_row(
            "SELECT id, file_id, version_number, filename, comment, backup_path, hash, created_at
             FROM document_versions WHERE id = ?1",
            params![id],
            |row| {
                Ok(DocumentVersion {
                    id: row.get(0)?,
                    file_id: row.get(1)?,
                    version_number: row.get(2)?,
                    filename: row.get(3)?,
                    comment: row.get(4)?,
                    backup_path: row.get(5)?,
                    hash: row.get(6)?,
                    created_at: row.get(7)?,
                })
            },
        ).map_err(|e| AppError::Database(format!("Document version not found: {}", e)))
    }

    /// Get the next logical version number for a file (increment of MAX)
    pub fn get_next_version_number(&self, file_id: &str) -> SdwResult<i32> {
        let val: Option<i32> = self.conn.query_row(
            "SELECT MAX(version_number) FROM document_versions WHERE file_id = ?1",
            params![file_id],
            |row| row.get(0)
        ).map_err(|e| AppError::Database(e.to_string()))?;
        
        Ok(val.unwrap_or(0) + 1)
    }
}
