-- Add tags column to tasks table
-- Tags will be stored as JSONB array for flexibility and querying

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Create index for faster tag queries
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING gin(tags);

-- Example tag structure: [{"id": "work-123", "label": "work", "color": "#4A90E2"}]

