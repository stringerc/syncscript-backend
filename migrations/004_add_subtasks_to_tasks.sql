-- Add subtasks column to tasks table
-- Subtasks will be stored as JSONB array

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;

-- Create index for faster subtask queries
CREATE INDEX IF NOT EXISTS idx_tasks_subtasks ON tasks USING gin(subtasks);

-- Example subtask structure: [{"id": "subtask-123", "text": "Do this", "completed": false, "created_at": "2025-10-09T..."}]

