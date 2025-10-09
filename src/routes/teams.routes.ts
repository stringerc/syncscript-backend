import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import db from '../utils/database';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  settings: z.object({
    allowMemberInvites: z.boolean().default(true),
    defaultMemberRole: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
    requireApprovalForTasks: z.boolean().default(false),
    energyInsightsVisible: z.boolean().default(true),
    maxMembers: z.number().int().min(1).max(100).default(50),
    timezone: z.string().default('UTC')
  }).optional()
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).default('member')
});

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    const validatedData = createTeamSchema.parse(req.body);
    
    const defaultSettings = {
      allowMemberInvites: true,
      defaultMemberRole: 'member',
      requireApprovalForTasks: false,
      energyInsightsVisible: true,
      maxMembers: 50,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    const settings = { ...defaultSettings, ...validatedData.settings };

    // Create team
    const team = await db.one(
      `INSERT INTO teams (name, description, owner_id, settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [validatedData.name, validatedData.description || null, userId, JSON.stringify(settings)]
    );

    // Add creator as owner member
    await db.none(
      `INSERT INTO team_members (team_id, user_id, role, joined_at, status)
       VALUES ($1, $2, 'owner', NOW(), 'active')`,
      [team.id, userId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...team,
        settings: JSON.parse(team.settings),
        memberCount: 1
      }
    });
  } catch (error) {
    console.error('Error creating team:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create team' });
  }
});

/**
 * GET /api/teams/:id
 * Get team details
 */
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    const teamId = req.params.id;

    // Check if user is a member
    const membership = await db.oneOrNone(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (!membership) {
      res.status(403).json({ error: 'Not a member of this team' });
      return;
    }

    // Get team details
    const team = await db.one(
      `SELECT t.*, COUNT(tm.id) as member_count
       FROM teams t
       LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.status = 'active'
       WHERE t.id = $1
       GROUP BY t.id`,
      [teamId]
    );

    res.json({
      success: true,
      data: {
        ...team,
        settings: JSON.parse(team.settings),
        memberCount: parseInt(team.member_count)
      }
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

/**
 * GET /api/teams/:id/members
 * Get team members
 */
router.get('/:id/members', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    const teamId = req.params.id;

    // Check if user is a member
    const membership = await db.oneOrNone(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (!membership) {
      res.status(403).json({ error: 'Not a member of this team' });
      return;
    }

    // Get all team members
    const members = await db.any(
      `SELECT tm.*, u.email, u.name, u.avatar
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at DESC`,
      [teamId]
    );

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

/**
 * POST /api/teams/:id/invite
 * Send team invitation
 */
router.post('/:id/invite', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    const teamId = req.params.id;
    const validatedData = inviteMemberSchema.parse(req.body);

    // Check if user has permission to invite
    const membership = await db.oneOrNone(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (!membership) {
      res.status(403).json({ error: 'Not a member of this team' });
      return;
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      res.status(403).json({ error: 'Insufficient permissions to invite members' });
      return;
    }

    // Generate invite token
    const token = Array.from({ length: 32 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        .charAt(Math.floor(Math.random() * 62))
    ).join('');

    // Create invitation
    const invitation = await db.one(
      `INSERT INTO team_invites (team_id, email, invited_by, role, token, expires_at, created_at, status)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days', NOW(), 'pending')
       RETURNING *`,
      [teamId, validatedData.email, userId, validatedData.role, token]
    );

    // TODO: Send email with invitation link
    // const inviteLink = `${process.env.FRONTEND_URL}/join-team?token=${token}`;

    res.status(201).json({
      success: true,
      data: invitation,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

/**
 * GET /api/teams/:id/analytics
 * Get team analytics
 */
router.get('/:id/analytics', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    const teamId = req.params.id;
    const period = req.query.period || 'week';

    // Check if user is a member
    const membership = await db.oneOrNone(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (!membership) {
      res.status(403).json({ error: 'Not a member of this team' });
      return;
    }

    // Calculate date range based on period
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = "AND t.created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND t.created_at >= NOW() - INTERVAL '30 days'";
    } else if (period === 'quarter') {
      dateFilter = "AND t.created_at >= NOW() - INTERVAL '90 days'";
    }

    // Get task statistics
    const taskStats = await db.one(
      `SELECT 
         COUNT(*) as total_tasks,
         COUNT(*) FILTER (WHERE completed = true) as completed_tasks
       FROM tasks t
       JOIN team_members tm ON t.user_id = tm.user_id
       WHERE tm.team_id = $1 ${dateFilter}`,
      [teamId]
    );

    // Get average energy
    const energyStats = await db.one(
      `SELECT AVG(energy_level) as average_energy
       FROM energy_logs e
       JOIN team_members tm ON e.user_id = tm.user_id
       WHERE tm.team_id = $1 ${dateFilter}`,
      [teamId]
    );

    // Get top performers
    const topPerformers = await db.any(
      `SELECT 
         u.id as user_id,
         u.name,
         COUNT(*) FILTER (WHERE t.completed = true) as completed_tasks,
         COALESCE(AVG(e.energy_level), 0) as energy_level
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       LEFT JOIN tasks t ON t.user_id = u.id ${dateFilter.replace('t.created_at', 't.created_at')}
       LEFT JOIN energy_logs e ON e.user_id = u.id ${dateFilter.replace('t.created_at', 'e.created_at')}
       WHERE tm.team_id = $1 AND tm.status = 'active'
       GROUP BY u.id, u.name
       ORDER BY completed_tasks DESC, energy_level DESC
       LIMIT 10`,
      [teamId]
    );

    // Get energy patterns by hour
    const energyPatterns = await db.any(
      `SELECT 
         EXTRACT(HOUR FROM e.created_at)::integer as hour,
         AVG(e.energy_level) as average_energy,
         COUNT(DISTINCT t.id) as task_count
       FROM energy_logs e
       JOIN team_members tm ON e.user_id = tm.user_id
       LEFT JOIN tasks t ON t.user_id = tm.user_id 
         AND DATE_TRUNC('hour', t.created_at) = DATE_TRUNC('hour', e.created_at)
       WHERE tm.team_id = $1 ${dateFilter.replace('t.created_at', 'e.created_at')}
       GROUP BY hour
       ORDER BY hour`,
      [teamId]
    );

    // Calculate productivity score
    const totalTasks = parseInt(taskStats.total_tasks);
    const completedTasks = parseInt(taskStats.completed_tasks);
    const averageEnergy = parseFloat(energyStats.average_energy) || 0;
    
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const productivityScore = Math.round(
      (completionRate * 0.5) + (averageEnergy * 0.3) + (Math.min((completedTasks / topPerformers.length) * 10, 100) * 0.2)
    );

    res.json({
      success: true,
      data: {
        teamId,
        period,
        totalTasks,
        completedTasks,
        averageEnergy: Math.round(averageEnergy),
        productivityScore,
        topPerformers: topPerformers.map(p => ({
          userId: p.user_id,
          name: p.name,
          completedTasks: parseInt(p.completed_tasks),
          energyLevel: Math.round(p.energy_level)
        })),
        energyPatterns: energyPatterns.map(p => ({
          hour: p.hour,
          averageEnergy: Math.round(p.average_energy),
          taskCount: parseInt(p.task_count)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching team analytics:', error);
    res.status(500).json({ error: 'Failed to fetch team analytics' });
  }
});

export default router;
