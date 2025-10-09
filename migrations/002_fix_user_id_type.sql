-- Migration to change user_id from UUID to TEXT to support Auth0 IDs

-- Drop foreign key constraints first
ALTER TABLE energy_logs DROP CONSTRAINT IF EXISTS energy_logs_user_id_fkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE user_emblems DROP CONSTRAINT IF EXISTS user_emblems_user_id_fkey;
ALTER TABLE context_connections DROP CONSTRAINT IF EXISTS context_connections_user_id_fkey;
ALTER TABLE ai_insights DROP CONSTRAINT IF EXISTS ai_insights_user_id_fkey;
ALTER TABLE daily_challenges DROP CONSTRAINT IF EXISTS daily_challenges_user_id_fkey;
ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

-- Change user_id in users table from UUID to TEXT
ALTER TABLE users ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE users ALTER COLUMN user_id TYPE TEXT;

-- Change user_id in all related tables
ALTER TABLE energy_logs ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE projects ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE tasks ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_emblems ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE context_connections ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE ai_insights ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE daily_challenges ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_sessions ALTER COLUMN user_id TYPE TEXT;

-- Re-add foreign key constraints
ALTER TABLE energy_logs ADD CONSTRAINT energy_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE projects ADD CONSTRAINT projects_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE tasks ADD CONSTRAINT tasks_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE user_emblems ADD CONSTRAINT user_emblems_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE context_connections ADD CONSTRAINT context_connections_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE ai_insights ADD CONSTRAINT ai_insights_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE daily_challenges ADD CONSTRAINT daily_challenges_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
