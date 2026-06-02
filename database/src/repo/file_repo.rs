use r2d2::PooledConnection;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;

use sdw_core::error::{AppError, Result};
use sdw_core::models::{DuplicateCluster, FileRecord, DocumentEntity};

pub struct FileRepository<'a> {
    conn: &'a PooledConnection<SqliteConnectionManager>,
}

impl<'a> FileRepository<'a> {
    pub fn new(conn: &'a PooledConnection<SqliteConnectionManager>) -> Self {
        Self { conn }
    }

    pub fn upsert(&self, file: &FileRecord) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO files (id, workspace_id, filename, extension, path, size, hash, created_at, modified_at, indexed_at, category)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                file.id,
                file.workspace_id,
                file.filename,
                file.extension,
                file.path,
                file.size as i64,
                file.hash,
                file.created_at,
                file.modified_at,
                file.indexed_at,
                file.category,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to upsert file record: {}", e)))?;

        Ok(())
    }

    pub fn upsert_batch(&self, files: &[FileRecord]) -> Result<()> {
        let tx = self.conn.unchecked_transaction().map_err(|e| AppError::Database(format!("Failed to start transaction: {}", e)))?;
        {
            let mut stmt = tx.prepare(
                "INSERT OR REPLACE INTO files (id, workspace_id, filename, extension, path, size, hash, created_at, modified_at, indexed_at, category)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"
            ).map_err(|e| AppError::Database(format!("Failed to prepare batch upsert: {}", e)))?;

            for file in files {
                stmt.execute(params![
                    file.id,
                    file.workspace_id,
                    file.filename,
                    file.extension,
                    file.path,
                    file.size as i64,
                    file.hash,
                    file.created_at,
                    file.modified_at,
                    file.indexed_at,
                    file.category,
                ]).map_err(|e| AppError::Database(format!("Batch execute failed: {}", e)))?;
            }
        }
        tx.commit().map_err(|e| AppError::Database(format!("Transaction commit failed: {}", e)))?;
        Ok(())
    }

    pub fn delete_by_path(&self, path: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM files WHERE path = ?1", params![path])
            .map_err(|e| {
                AppError::Database(format!("Failed to delete file record by path: {}", e))
            })?;

        Ok(())
    }

    /// Retrieve up to `limit` files that haven't been OCR processed yet
    pub fn get_unprocessed_ocr_files(&self, limit: u32) -> Result<Vec<FileRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT f.id, f.workspace_id, f.filename, f.extension, f.path, f.size, f.hash, f.created_at, f.modified_at, f.indexed_at, f.category 
             FROM files f
             LEFT JOIN document_content dc ON dc.file_id = f.id
             WHERE dc.file_id IS NULL
             ORDER BY f.created_at DESC
             LIMIT ?1"
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let file_iter = stmt
            .query_map(params![limit], Self::row_to_record)
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut files = Vec::new();
        for f in file_iter {
            files.push(f.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(files)
    }

    pub fn get_by_path(&self, path: &str) -> Result<Option<FileRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, filename, extension, path, size, hash, created_at, modified_at, indexed_at, category FROM files WHERE path = ?1"
        ).map_err(|e| AppError::Database(format!("Failed to prepare select by path: {}", e)))?;

        let mut rows = stmt
            .query(params![path])
            .map_err(|e| AppError::Database(format!("Failed to query select by path: {}", e)))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Database(e.to_string()))? {
            Ok(Some(
                Self::row_to_record(row).map_err(|e| AppError::Database(e.to_string()))?,
            ))
        } else {
            Ok(None)
        }
    }

    pub fn get_by_id(&self, id: &str) -> Result<Option<FileRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, filename, extension, path, size, hash, created_at, modified_at, indexed_at, category FROM files WHERE id = ?1"
        ).map_err(|e| AppError::Database(format!("Failed to prepare select by id: {}", e)))?;

        let mut rows = stmt
            .query(params![id])
            .map_err(|e| AppError::Database(format!("Failed to query select by id: {}", e)))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Database(e.to_string()))? {
            Ok(Some(
                Self::row_to_record(row).map_err(|e| AppError::Database(e.to_string()))?,
            ))
        } else {
            Ok(None)
        }
    }

    pub fn list_by_workspace(&self, workspace_id: &str) -> Result<Vec<FileRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, filename, extension, path, size, hash, created_at, modified_at, indexed_at, category FROM files WHERE workspace_id = ?1"
        ).map_err(|e| AppError::Database(format!("Failed to list files: {}", e)))?;

        let file_iter = stmt
            .query_map(params![workspace_id], Self::row_to_record)
            .map_err(|e| AppError::Database(format!("Query failed: {}", e)))?;

        let mut files = Vec::new();
        for f in file_iter {
            files.push(f.map_err(|e| AppError::Database(format!("Row parsing failed: {}", e)))?);
        }

        Ok(files)
    }

    pub fn list_by_workspace_paginated(
        &self,
        workspace_id: &str,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<FileRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, filename, extension, path, size, hash, created_at, modified_at, indexed_at, category 
             FROM files 
             WHERE workspace_id = ?1 
             ORDER BY filename ASC 
             LIMIT ?2 OFFSET ?3"
        ).map_err(|e| AppError::Database(format!("Failed to prepare paginated files: {}", e)))?;

        let file_iter = stmt
            .query_map(params![workspace_id, limit as i64, offset as i64], |row| {
                Self::row_to_record(row)
            })
            .map_err(|e| AppError::Database(format!("Query failed: {}", e)))?;

        let mut files = Vec::new();
        for f in file_iter {
            files.push(f.map_err(|e| AppError::Database(format!("Row parsing failed: {}", e)))?);
        }

        Ok(files)
    }

    #[tracing::instrument(skip(self))]
    pub fn search_fts(&self, workspace_id: &str, query_str: &str, limit: usize, offset: usize) -> Result<Vec<FileRecord>> {
        let sanitized = query_str
            .replace("\"", "\"\"")
            .replace(['*', '^', '(', ')'], "");
        let clean_query = format!("\"{}\"*", sanitized);

        let mut stmt = self.conn.prepare(
            "SELECT f.id, f.workspace_id, f.filename, f.extension, f.path, f.size, f.hash, f.created_at, f.modified_at, f.indexed_at, f.category,
             snippet(files_fts, -1, '<b>', '</b>', '...', 10) as match_snippet
             FROM files f
             JOIN files_fts fts ON fts.file_id = f.id
             WHERE f.workspace_id = ?1 AND files_fts MATCH ?2
             ORDER BY rank
             LIMIT ?3 OFFSET ?4"
        ).map_err(|e| AppError::Database(format!("Failed to prepare search: {}", e)))?;

        let file_iter = stmt
            .query_map(params![workspace_id, clean_query, limit as i64, offset as i64], |row| {
                let mut record = Self::row_to_record(row)?;
                let snippet_str: Option<String> = row.get(11).ok();
                record.snippet = snippet_str;
                Ok(record)
            })
            .map_err(|e| AppError::Database(format!("FTS Query execution failed: {}", e)))?;

        let mut results = Vec::new();
        for res in file_iter {
            results.push(res.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(results)
    }

    #[tracing::instrument(skip(self))]
    #[allow(clippy::too_many_arguments)]
    pub fn search_smart(
        &self,
        workspace_id: &str,
        keyword: &str,
        category: Option<&str>,
        amount_gt: Option<f64>,
        amount_lt: Option<f64>,
        created_after: Option<i64>,
        created_before: Option<i64>,
        target_keyword: Option<&str>,
        target_category: Option<&str>,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<FileRecord>> {
        let sanitized = keyword
            .replace("\"", "\"\"")
            .replace(['*', '^', '(', ')'], "");
        let clean_query = format!("\"{}\"*", sanitized);

        let mut query = String::from(
            "SELECT f.id, f.workspace_id, f.filename, f.extension, f.path, f.size, f.hash, f.created_at, f.modified_at, f.indexed_at, f.category,
             snippet(files_fts, -1, '<b>', '</b>', '...', 10) as match_snippet
             FROM files f
             JOIN files_fts fts ON fts.file_id = f.id
             WHERE f.workspace_id = ?1 "
        );

        if !sanitized.trim().is_empty() {
            query.push_str(" AND files_fts MATCH ?2 ");
        }

        if let Some(c) = category {
            query.push_str(&format!(" AND f.category = '{}' ", c));
        }

        if amount_gt.is_some() || amount_lt.is_some() {
            query.push_str(" AND EXISTS (SELECT 1 FROM document_entities e WHERE e.file_id = f.id AND e.key = 'TotalAmount' ");
            if let Some(gt) = amount_gt {
                query.push_str(&format!(" AND CAST(e.value AS REAL) > {} ", gt));
            }
            if let Some(lt) = amount_lt {
                query.push_str(&format!(" AND CAST(e.value AS REAL) < {} ", lt));
            }
            query.push_str(") ");
        }

        if let Some(after) = created_after {
            query.push_str(&format!(" AND f.created_at >= {} ", after));
        }

        if let Some(before) = created_before {
            query.push_str(&format!(" AND f.created_at <= {} ", before));
        }

        // Relational Graph Traversal query join conditions
        if target_keyword.is_some() || target_category.is_some() {
            query.push_str(" AND EXISTS (
                SELECT 1 FROM document_relationships rel
                JOIN files target_f ON (
                    (rel.source_file_id = f.id AND rel.target_file_id = target_f.id) OR
                    (rel.target_file_id = f.id AND rel.source_file_id = target_f.id)
                )
                WHERE target_f.workspace_id = f.workspace_id
            ");

            if let Some(target_cat) = target_category {
                query.push_str(&format!(" AND target_f.category = '{}' ", target_cat));
            }

            if let Some(target_kw) = target_keyword {
                if !target_kw.trim().is_empty() {
                    let sanitized_target = target_kw.replace("\"", "\"\"").replace(['*', '^', '(', ')'], "");
                    query.push_str(&format!(" AND target_f.id IN (
                        SELECT file_id FROM files_fts 
                        WHERE files_fts MATCH '\"{}\"*'
                    ) ", sanitized_target));
                }
            }

            query.push_str(") ");
        }

        query.push_str(" ORDER BY rank LIMIT ?3 OFFSET ?4");

        let mut stmt = self.conn.prepare(&query)
            .map_err(|e| AppError::Database(format!("Failed to prepare smart search: {}", e)))?;

        let params: &[&dyn rusqlite::ToSql] = if !sanitized.trim().is_empty() {
            &[&workspace_id, &clean_query, &(limit as i64), &(offset as i64)]
        } else {
            &[&workspace_id, &"", &(limit as i64), &(offset as i64)]
        };

        let file_iter = stmt.query_map(params, |row| {
            let mut record = Self::row_to_record(row)?;
            let snippet_str: Option<String> = row.get(11).ok();
            record.snippet = snippet_str;
            Ok(record)
        }).map_err(|e| AppError::Database(format!("Smart query execution failed: {}", e)))?;

        let mut results = Vec::new();
        for res in file_iter {
            results.push(res.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(results)
    }

    pub fn list_duplicates(&self, workspace_id: &str) -> Result<Vec<DuplicateCluster>> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT hash, COUNT(*) as c, SUM(size) as total_size
             FROM files
             WHERE workspace_id = ?1
             GROUP BY hash
             HAVING c > 1
             ORDER BY total_size DESC",
            )
            .map_err(|e| AppError::Database(format!("Failed to prepare dupe hash query: {}", e)))?;

        let hash_iter = stmt
            .query_map(params![workspace_id], |row| {
                let hash: String = row.get(0)?;
                let file_count: i64 = row.get(1)?;
                let total_size: i64 = row.get(2)?;
                Ok((hash, file_count, total_size))
            })
            .map_err(|e| AppError::Database(format!("Dupe query failed: {}", e)))?;

        let mut clusters = Vec::new();
        for hash_row in hash_iter {
            let (hash, file_count, total_size) =
                hash_row.map_err(|e| AppError::Database(e.to_string()))?;

            // Fetch the actual files for this hash
            let mut file_stmt = self.conn.prepare(
                "SELECT id, workspace_id, filename, extension, path, size, hash, created_at, modified_at, indexed_at, category 
                 FROM files WHERE workspace_id = ?1 AND hash = ?2"
            ).map_err(|e| AppError::Database(e.to_string()))?;

            let files_iter = file_stmt
                .query_map(params![workspace_id, hash], Self::row_to_record)
                .map_err(|e| AppError::Database(e.to_string()))?;

            let mut files = Vec::new();
            for f in files_iter {
                files.push(f.map_err(|e| AppError::Database(e.to_string()))?);
            }

            let wasted_size = if !files.is_empty() {
                total_size - files[0].size as i64
            } else {
                0
            };

            clusters.push(DuplicateCluster {
                hash,
                file_count: file_count as u32,
                total_wasted_size: wasted_size as u64,
                files,
            });
        }

        clusters.sort_by_key(|b| std::cmp::Reverse(b.total_wasted_size));

        Ok(clusters)
    }

    pub fn upsert_document_content(
        &self,
        content: &sdw_core::models::DocumentContent,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO document_content (file_id, extracted_text, extraction_status, extraction_confidence, extracted_at, structured_metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(file_id) DO UPDATE SET
                extracted_text = excluded.extracted_text,
                extraction_status = excluded.extraction_status,
                extraction_confidence = excluded.extraction_confidence,
                extracted_at = excluded.extracted_at,
                structured_metadata = excluded.structured_metadata",
            params![
                content.file_id,
                content.extracted_text,
                content.extraction_status,
                content.extraction_confidence,
                content.extracted_at,
                content.structured_metadata,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to upsert document content: {}", e)))?;
        Ok(())
    }

    pub fn get_document_content(
        &self,
        file_id: &str,
    ) -> Result<Option<sdw_core::models::DocumentContent>> {
        let mut stmt = self.conn.prepare(
            "SELECT file_id, extracted_text, extraction_status, extraction_confidence, extracted_at, structured_metadata
             FROM document_content WHERE file_id = ?1"
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let mut iter = stmt
            .query_map(params![file_id], |row| {
                Ok(sdw_core::models::DocumentContent {
                    file_id: row.get(0)?,
                    extracted_text: row.get(1)?,
                    extraction_status: row.get(2)?,
                    extraction_confidence: row.get(3)?,
                    extracted_at: row.get(4)?,
                    structured_metadata: row.get(5)?,
                })
            })
            .map_err(|e| AppError::Database(e.to_string()))?;

        if let Some(result) = iter.next() {
            Ok(Some(result.map_err(|e| AppError::Database(e.to_string()))?))
        } else {
            Ok(None)
        }
    }

    fn row_to_record(row: &rusqlite::Row) -> rusqlite::Result<FileRecord> {
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
    }

    pub fn insert_entities(&self, entities: &[DocumentEntity]) -> Result<()> {
        let tx = self.conn.unchecked_transaction().map_err(|e| AppError::Database(format!("Failed to start transaction: {}", e)))?;
        {
            let mut stmt = tx.prepare(
                "INSERT INTO document_entities (id, file_id, key, value, confidence)
                 VALUES (?1, ?2, ?3, ?4, ?5)"
            ).map_err(|e| AppError::Database(format!("Failed to prepare entities insert: {}", e)))?;

            for entity in entities {
                stmt.execute(params![
                    entity.id,
                    entity.file_id,
                    entity.key,
                    entity.value,
                    entity.confidence as f64,
                ]).map_err(|e| AppError::Database(format!("Entity execute failed: {}", e)))?;
            }
        }
        tx.commit().map_err(|e| AppError::Database(format!("Failed to commit entities: {}", e)))?;
        Ok(())
    }

    pub fn get_entities_by_file_id(&self, file_id: &str) -> Result<Vec<DocumentEntity>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, file_id, key, value, confidence FROM document_entities WHERE file_id = ?1"
        ).map_err(|e| AppError::Database(format!("Failed to prepare get entities: {}", e)))?;
        
        let iter = stmt.query_map(params![file_id], |row| {
            Ok(DocumentEntity {
                id: row.get(0)?,
                file_id: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
                confidence: row.get::<_, f64>(4)? as f32,
            })
        }).map_err(|e| AppError::Database(format!("Failed to query entities: {}", e)))?;

        let mut entities = Vec::new();
        for item in iter {
            entities.push(item.map_err(|e| AppError::Database(format!("Row error: {}", e)))?);
        }
        
        Ok(entities)
    }

    /// Update file size, modified_at, and hash metadata in SQLite files table
    pub fn update_metadata(&self, id: &str, size: u64, modified_at: i64, hash: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE files SET size = ?1, modified_at = ?2, hash = ?3 WHERE id = ?4",
            params![size as i64, modified_at, hash, id],
        ).map_err(|e| AppError::Database(format!("Failed to update file metadata: {}", e)))?;
        Ok(())
    }
}
