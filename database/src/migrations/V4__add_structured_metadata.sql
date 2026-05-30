-- Migration: Add structured_metadata column to document_content table
ALTER TABLE document_content ADD COLUMN structured_metadata TEXT;
