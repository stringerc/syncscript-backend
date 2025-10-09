-- Add notes column to tasks table
-- Notes will be stored as JSONB array

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;

-- Create index for faster note queries
CREATE INDEX IF NOT EXISTS idx_tasks_notes ON tasks USING gin(notes);

-- Example note structure: [{"id": "note-123", "text": "Progress update", "created_at": "2025-10-09T..."}]

