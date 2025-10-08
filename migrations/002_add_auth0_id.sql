-- Add auth0_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth0_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);
