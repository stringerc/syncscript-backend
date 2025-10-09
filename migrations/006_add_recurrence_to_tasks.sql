-- Add recurrence column to tasks table
-- Recurrence config stored as JSONB

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence JSONB DEFAULT NULL;

-- Create index for faster recurrence queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks USING gin(recurrence);

-- Example recurrence structure: {"frequency": "daily", "interval": 1, "is_active": true}

