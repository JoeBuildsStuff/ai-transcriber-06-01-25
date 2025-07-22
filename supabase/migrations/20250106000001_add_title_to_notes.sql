-- Migration: Add title field to notes table
-- Purpose: Add a title field to notes for better organization
-- Date: 2025-01-06

-- Add title column to notes table
ALTER TABLE ai_transcriber.notes 
ADD COLUMN title text;

-- Add index on title for better search performance
CREATE INDEX IF NOT EXISTS idx_notes_title ON ai_transcriber.notes(title);

-- Update the updated_at trigger to include title changes
DROP TRIGGER IF EXISTS update_notes_updated_at ON ai_transcriber.notes;
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON ai_transcriber.notes
    FOR EACH ROW
    EXECUTE FUNCTION ai_transcriber.update_updated_at_column(); 