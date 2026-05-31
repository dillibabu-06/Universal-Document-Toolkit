-- V6__document_entities.sql
CREATE TABLE IF NOT EXISTS document_entities (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    confidence REAL,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entities_file_id ON document_entities(file_id);
CREATE INDEX IF NOT EXISTS idx_entities_key_value ON document_entities(key, value);
