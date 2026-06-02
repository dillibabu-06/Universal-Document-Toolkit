use rusqlite::{params, Connection};
use sdw_core::error::{AppError, Result as SdwResult};
use sdw_core::models::{DocumentRelationship, FileRecord};

pub struct RelationshipRepository<'a> {
    conn: &'a Connection,
}

impl<'a> RelationshipRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    /// Add a graph link relationship between two files
    pub fn add_relationship(&self, rel: &DocumentRelationship) -> SdwResult<()> {
        self.conn.execute(
            "INSERT OR IGNORE INTO document_relationships (id, source_file_id, target_file_id, relationship_type, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                rel.id,
                rel.source_file_id,
                rel.target_file_id,
                rel.relationship_type,
                rel.created_at,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to create relationship: {}", e)))?;
        Ok(())
    }

    /// Delete a relationship by ID
    pub fn delete_relationship(&self, id: &str) -> SdwResult<()> {
        self.conn
            .execute("DELETE FROM document_relationships WHERE id = ?1", params![id])
            .map_err(|e| AppError::Database(format!("Failed to delete relationship: {}", e)))?;
        Ok(())
    }

    /// List all relationships in a workspace for visual graph modeling
    pub fn list_relationships(&self, workspace_id: &str) -> SdwResult<Vec<DocumentRelationship>> {
        let mut stmt = self.conn.prepare(
            "SELECT r.id, r.source_file_id, r.target_file_id, r.relationship_type, r.created_at
             FROM document_relationships r
             JOIN files f ON f.id = r.source_file_id
             WHERE f.workspace_id = ?1",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt.query_map(params![workspace_id], |row| {
            Ok(DocumentRelationship {
                id: row.get(0)?,
                source_file_id: row.get(1)?,
                target_file_id: row.get(2)?,
                relationship_type: row.get(3)?,
                created_at: row.get(4)?,
            })
        }).map_err(|e| AppError::Database(e.to_string()))?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(list)
    }

    /// Fetch immediate neighbors (inbound & outbound) for the side explorer panel
    pub fn get_related_documents(&self, file_id: &str) -> SdwResult<Vec<(DocumentRelationship, FileRecord)>> {
        let mut stmt = self.conn.prepare(
            "SELECT r.id, r.source_file_id, r.target_file_id, r.relationship_type, r.created_at,
                    f.id, f.workspace_id, f.filename, f.extension, f.path, f.size, f.hash, f.created_at, f.modified_at, f.indexed_at, f.category
             FROM document_relationships r
             JOIN files f ON f.id = r.target_file_id
             WHERE r.source_file_id = ?1
             UNION ALL
             SELECT r.id, r.source_file_id, r.target_file_id, r.relationship_type, r.created_at,
                    f.id, f.workspace_id, f.filename, f.extension, f.path, f.size, f.hash, f.created_at, f.modified_at, f.indexed_at, f.category
             FROM document_relationships r
             JOIN files f ON f.id = r.source_file_id
             WHERE r.target_file_id = ?1",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt.query_map(params![file_id], |row| {
            let rel = DocumentRelationship {
                id: row.get(0)?,
                source_file_id: row.get(1)?,
                target_file_id: row.get(2)?,
                relationship_type: row.get(3)?,
                created_at: row.get(4)?,
            };
            let size: i64 = row.get(10)?;
            let file = FileRecord {
                id: row.get(5)?,
                workspace_id: row.get(6)?,
                filename: row.get(7)?,
                extension: row.get(8)?,
                path: row.get(9)?,
                size: size as u64,
                hash: row.get(11)?,
                created_at: row.get(12)?,
                modified_at: row.get(13)?,
                indexed_at: row.get(14)?,
                category: row.get(15)?,
                snippet: None,
            };
            Ok((rel, file))
        }).map_err(|e| AppError::Database(e.to_string()))?;

        let mut list = Vec::new();
        for item in rows {
            list.push(item.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(list)
    }

    /// Pure Rust recommendation heuristics mapping metadata, entities, and time ranges
    pub fn get_recommendations(&self, file_id: &str) -> SdwResult<Vec<FileRecord>> {
        // 1. Load target file to get workspace and details
        let mut target_stmt = self.conn.prepare(
            "SELECT id, workspace_id, filename, extension, path, size, hash, created_at, modified_at, indexed_at, category
             FROM files WHERE id = ?1",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let target: FileRecord = target_stmt.query_row(params![file_id], |row| {
            let size: i64 = row.get(5)?;
            Ok(FileRecord {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                filename: row.get(2)?,
                extension: row.get(3)?,
                path: row.get(4)?,
                size: size as u64,
                hash: row.get(6)?,
                created_at: row.get(7)?,
                modified_at: row.get(8)?,
                indexed_at: row.get(9)?,
                category: row.get(10)?,
                snippet: None,
            })
        }).map_err(|e| AppError::Database(format!("Target file not found: {}", e)))?;

        // 2. Recommendation logic 1: Match files with identical extracted entities
        let mut recommend_entities_stmt = self.conn.prepare(
            "SELECT DISTINCT f.id, f.workspace_id, f.filename, f.extension, f.path, f.size, f.hash, f.created_at, f.modified_at, f.indexed_at, f.category
             FROM files f
             JOIN document_entities e ON e.file_id = f.id
             WHERE f.id != ?1 AND f.workspace_id = ?2
               AND EXISTS (
                   SELECT 1 FROM document_entities target_e
                   WHERE target_e.file_id = ?1
                     AND target_e.key = e.key
                     AND target_e.value = e.value
                     AND e.value != ''
               )
             LIMIT 5",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let rows = recommend_entities_stmt.query_map(params![target.id, target.workspace_id], |row| {
            let size: i64 = row.get(5)?;
            Ok(FileRecord {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                filename: row.get(2)?,
                extension: row.get(3)?,
                path: row.get(4)?,
                size: size as u64,
                hash: row.get(6)?,
                created_at: row.get(7)?,
                modified_at: row.get(8)?,
                indexed_at: row.get(9)?,
                category: row.get(10)?,
                snippet: None,
            })
        }).map_err(|e| AppError::Database(e.to_string()))?;

        let mut recommendations = Vec::new();
        for item in rows {
            recommendations.push(item.map_err(|e| AppError::Database(e.to_string()))?);
        }

        // 3. Recommendation logic 2: Match files with 48h temporal proximity in the same workspace
        if recommendations.len() < 5 {
            let mut recommend_time_stmt = self.conn.prepare(
                "SELECT id, workspace_id, filename, extension, path, size, hash, created_at, modified_at, indexed_at, category
                 FROM files
                 WHERE id != ?1 AND workspace_id = ?2
                   AND created_at >= ?3 AND created_at <= ?4
                 LIMIT ?5",
            ).map_err(|e| AppError::Database(e.to_string()))?;

            let min_time = target.created_at - 172800; // 48h before
            let max_time = target.created_at + 172800; // 48h after
            let needed = 5 - recommendations.len();

            let time_rows = recommend_time_stmt.query_map(
                params![target.id, target.workspace_id, min_time, max_time, needed as i64],
                |row| {
                    let size: i64 = row.get(5)?;
                    Ok(FileRecord {
                        id: row.get(0)?,
                        workspace_id: row.get(1)?,
                        filename: row.get(2)?,
                        extension: row.get(3)?,
                        path: row.get(4)?,
                        size: size as u64,
                        hash: row.get(6)?,
                        created_at: row.get(7)?,
                        modified_at: row.get(8)?,
                        indexed_at: row.get(9)?,
                        category: row.get(10)?,
                        snippet: None,
                    })
                },
            ).map_err(|e| AppError::Database(e.to_string()))?;

            for item in time_rows {
                let rec = item.map_err(|e| AppError::Database(e.to_string()))?;
                if !recommendations.iter().any(|r| r.id == rec.id) {
                    recommendations.push(rec);
                }
            }
        }

        Ok(recommendations)
    }
}
