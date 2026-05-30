-- 1. Create document_content table to store OCR / PDF extraction results
CREATE TABLE IF NOT EXISTS document_content (
    file_id TEXT PRIMARY KEY,
    extracted_text TEXT,
    extraction_status TEXT,
    extraction_confidence REAL,
    extracted_at INTEGER NOT NULL,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 2. Drop the old FTS5 search index and triggers
DROP TRIGGER IF EXISTS after_file_insert;
DROP TRIGGER IF EXISTS after_file_delete;
DROP TRIGGER IF EXISTS after_file_update;
DROP TABLE IF EXISTS files_fts;

-- 3. Recreate the FTS5 search index with the extracted_text column
CREATE VIRTUAL TABLE files_fts USING fts5(
    file_id UNINDEXED,
    filename,
    content,
    extracted_text,
    tokenize='porter ascii'
);

-- 4. Repopulate existing files into the new FTS index
INSERT INTO files_fts(file_id, filename, content, extracted_text)
SELECT id, filename, filename || ' ' || category || ' ' || extension, ''
FROM files;

-- 5. Create new triggers for the files table
CREATE TRIGGER after_file_insert AFTER INSERT ON files BEGIN
    INSERT INTO files_fts(file_id, filename, content, extracted_text)
    VALUES (new.id, new.filename, new.filename || ' ' || new.category || ' ' || new.extension, '');
END;

CREATE TRIGGER after_file_delete AFTER DELETE ON files BEGIN
    DELETE FROM files_fts WHERE file_id = old.id;
END;

CREATE TRIGGER after_file_update AFTER UPDATE ON files BEGIN
    DELETE FROM files_fts WHERE file_id = old.id;
    INSERT INTO files_fts(file_id, filename, content, extracted_text)
    VALUES (
        new.id, 
        new.filename, 
        new.filename || ' ' || new.category || ' ' || new.extension,
        COALESCE((SELECT extracted_text FROM document_content WHERE file_id = new.id), '')
    );
END;

-- 6. Create trigger for when OCR text is extracted and inserted
CREATE TRIGGER after_document_content_insert AFTER INSERT ON document_content BEGIN
    UPDATE files_fts 
    SET extracted_text = new.extracted_text 
    WHERE file_id = new.file_id;
END;

-- 7. Create trigger for when OCR text is updated
CREATE TRIGGER after_document_content_update AFTER UPDATE ON document_content BEGIN
    UPDATE files_fts 
    SET extracted_text = new.extracted_text 
    WHERE file_id = new.file_id;
END;
