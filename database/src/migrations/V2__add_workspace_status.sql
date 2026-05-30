-- Add status column to track crash recovery and indexing states
ALTER TABLE workspaces ADD COLUMN status TEXT NOT NULL DEFAULT 'IDLE';
