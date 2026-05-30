-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- 1. Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    paths TEXT NOT NULL, -- JSON array of root directories
    indexing_settings TEXT NOT NULL, -- JSON settings
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 2. Files Table
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    extension TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    size INTEGER NOT NULL,
    hash TEXT NOT NULL, -- SHA-256 for duplicate matching
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    indexed_at INTEGER NOT NULL,
    category TEXT NOT NULL, -- "Invoice", "Receipt", "Resume", "Notes", "Contract", "Other"
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_files_workspace ON files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension);

-- 3. Tags Table
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- 4. File-Tags Mapping Table
CREATE TABLE IF NOT EXISTS file_tags (
    file_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (file_id, tag_id),
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 5. Automation Rules Table
CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    trigger_event TEXT NOT NULL, -- "on_create", "on_modify", "on_schedule"
    conditions TEXT NOT NULL, -- JSON rule filters
    actions TEXT NOT NULL, -- JSON list of actions
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- 6. Automation Logs Table
CREATE TABLE IF NOT EXISTS automation_logs (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    success INTEGER NOT NULL,
    error_msg TEXT,
    FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);

-- 7. FTS5 Virtual Table for Instant Search
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
    file_id UNINDEXED,
    filename,
    content,
    tokenize='porter ascii'
);

-- Triggers to sync files and files_fts automatically
CREATE TRIGGER IF NOT EXISTS after_file_insert AFTER INSERT ON files BEGIN
    INSERT INTO files_fts(file_id, filename, content)
    VALUES (new.id, new.filename, new.filename || ' ' || new.category || ' ' || new.extension);
END;

CREATE TRIGGER IF NOT EXISTS after_file_delete AFTER DELETE ON files BEGIN
    DELETE FROM files_fts WHERE file_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS after_file_update AFTER UPDATE ON files BEGIN
    DELETE FROM files_fts WHERE file_id = old.id;
    INSERT INTO files_fts(file_id, filename, content)
    VALUES (new.id, new.filename, new.filename || ' ' || new.category || ' ' || new.extension);
END;
