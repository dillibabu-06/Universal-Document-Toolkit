-- V9: Document Relationships Schema

CREATE TABLE IF NOT EXISTS document_relationships (
    id TEXT PRIMARY KEY,
    source_file_id TEXT NOT NULL,
    target_file_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL, -- e.g. "Invoice", "Receipt", "Contract", "Supporting"
    created_at INTEGER NOT NULL,
    FOREIGN KEY (source_file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (target_file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE (source_file_id, target_file_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_relationships_source ON document_relationships(source_file_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON document_relationships(target_file_id);
