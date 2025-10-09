-- Migration: Create Teams and Team Members tables
-- Description: Add support for team collaboration features

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{
    "allowMemberInvites": true,
    "defaultMemberRole": "member",
    "requireApprovalForTasks": false,
    "energyInsightsVisible": true,
    "maxMembers": 50,
    "timezone": "UTC"
  }'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT teams_name_not_empty CHECK (char_length(name) > 0)
);

-- Team Members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
  UNIQUE(team_id, user_id)
);

-- Team Invitations table
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  CONSTRAINT team_invites_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Shared Projects table (extends existing projects)
CREATE TABLE IF NOT EXISTS shared_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{
    "allowMemberTaskCreation": true,
    "allowMemberTaskAssignment": true,
    "requireApprovalForTasks": false,
    "showEnergyLevels": true,
    "autoAssignByEnergy": false
  }'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, team_id)
);

-- Task Dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('blocks', 'requires', 'suggests')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON team_invites(status);
CREATE INDEX IF NOT EXISTS idx_shared_projects_team_id ON shared_projects(team_id);
CREATE INDEX IF NOT EXISTS idx_shared_projects_project_id ON shared_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- Comments for documentation
COMMENT ON TABLE teams IS 'Teams for collaborative productivity';
COMMENT ON TABLE team_members IS 'Team membership with roles and permissions';
COMMENT ON TABLE team_invites IS 'Pending team invitations';
COMMENT ON TABLE shared_projects IS 'Projects shared within a team';
COMMENT ON TABLE task_dependencies IS 'Dependencies between tasks for workflow management';
