-- SQLite Schema Migration V12: Document Versioning
CREATE TABLE IF NOT EXISTS document_versions (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    filename TEXT NOT NULL,
    comment TEXT,
    backup_path TEXT NOT NULL,
    hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_versions_file ON document_versions(file_id);
