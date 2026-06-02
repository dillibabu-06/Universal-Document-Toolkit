-- SQLite Schema Migration V11: Document Timeline
CREATE TABLE IF NOT EXISTS document_timeline (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'Created', 'OcrScan', 'WorkflowRun', 'VaultMove', 'LinkCreated', 'LinkDeleted'
    title TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_timeline_file ON document_timeline(file_id);

-- Trigger 1: Automatically log 'Created' event when a new file record is inserted
CREATE TRIGGER IF NOT EXISTS trg_files_inserted_timeline
AFTER INSERT ON files
FOR EACH ROW
BEGIN
    INSERT OR REPLACE INTO document_timeline (id, file_id, event_type, title, description, created_at)
    VALUES (
        lower(hex(randomblob(16))),
        NEW.id,
        'Created',
        'Document Discovered',
        'File discovered and registered in workspace.',
        strftime('%s', 'now')
    );
END;


