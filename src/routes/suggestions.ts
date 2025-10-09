import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import db from '../config/database';
import { z } from 'zod';

const router = Router();

// Types
interface EnergyPattern {
  hour: number;
  avgEnergy: number;
  count: number;
}

interface TaskSuggestion {
  task: any;
  reason: string;
  confidence: number;
  energyMatch: number;
}

/**
 * GET /api/suggestions
 * Get smart task suggestions based on energy patterns
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const currentHour = new Date().getHours();

    // 1. Get user's energy patterns by hour of day
    const energyPatterns = await db.any<EnergyPattern>(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        AVG(level) as avg_energy,
        COUNT(*) as count
      FROM energy_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `, [userId]);

    // 2. Get current expected energy level
    const currentPattern = energyPatterns.find(p => p.hour === currentHour);
    const expectedEnergy = currentPattern ? Math.round(currentPattern.avgenergy) : 50;

    // 3. Get today's most recent energy log
    const recentEnergy = await db.oneOrNone(`
      SELECT level 
      FROM energy_logs 
      WHERE user_id = $1 
        AND created_at::date = CURRENT_DATE
      ORDER BY created_at DESC 
      LIMIT 1
    `, [userId]);

    const currentEnergy = recentEnergy ? recentEnergy.level : expectedEnergy;

    // 4. Get incomplete tasks
    const incompleteTasks = await db.any(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = $1 
        AND t.completed = false
      ORDER BY t.due_date ASC NULLS LAST, t.priority DESC
    `, [userId]);

    // 5. Generate suggestions based on energy matching
    const suggestions: TaskSuggestion[] = incompleteTasks
      .map(task => {
        const energyDiff = Math.abs(task.energy_level - currentEnergy);
        const energyMatch = 100 - (energyDiff * 2); // 0-100 score

        let reason = '';
        let confidence = 0;

        // High energy match
        if (energyMatch >= 80) {
          reason = `Perfect energy match! This ${task.energy_level}-energy task aligns with your current ${currentEnergy} energy level.`;
          confidence = 95;
        }
        // Due soon
        else if (task.due_date && new Date(task.due_date) < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
          reason = `Due soon! Knock this out while you have ${currentEnergy} energy.`;
          confidence = 85;
        }
        // High priority
        else if (task.priority === 'high') {
          reason = `High priority task. Your ${currentEnergy} energy level can handle this.`;
          confidence = 75;
        }
        // Based on typical patterns
        else if (currentPattern && currentPattern.count > 5) {
          const patternMatch = task.energy_level <= currentPattern.avgenergy + 10;
          if (patternMatch) {
            reason = `You typically have ${Math.round(currentPattern.avgenergy)} energy at this hour - good time for this task!`;
            confidence = 70;
          } else {
            reason = `Consider this task - it matches your current capacity.`;
            confidence = 50;
          }
        }
        // General suggestion
        else {
          reason = `This task fits your current ${currentEnergy} energy level.`;
          confidence = 60;
        }

        return {
          task,
          reason,
          confidence,
          energyMatch
        };
      })
      .filter(s => s.confidence >= 60) // Only show confident suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 suggestions

    // 6. Get energy insights
    const insights = {
      currentEnergy,
      expectedEnergy,
      trend: currentEnergy > expectedEnergy ? 'above' : currentEnergy < expectedEnergy ? 'below' : 'normal',
      peakHours: energyPatterns
        .filter(p => p.count >= 3)
        .sort((a, b) => b.avgenergy - a.avgenergy)
        .slice(0, 3)
        .map(p => ({
          hour: p.hour,
          energy: Math.round(p.avgenergy)
        }))
    };

    res.json({
      success: true,
      data: {
        suggestions,
        insights,
        patternsCount: energyPatterns.length
      }
    });

  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ 
      error: 'Failed to get suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/suggestions/accept
 * Accept a suggestion and optionally schedule it
 */
router.post('/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const schema = z.object({
      taskId: z.string().uuid(),
      scheduleTime: z.string().datetime().optional()
    });

    const { taskId, scheduleTime } = schema.parse(req.body);

    // Update task if schedule time provided
    if (scheduleTime) {
      await db.none(`
        UPDATE tasks 
        SET due_date = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
      `, [scheduleTime, taskId, userId]);
    }

    res.json({
      success: true,
      message: 'Suggestion accepted'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error accepting suggestion:', error);
    res.status(500).json({ 
      error: 'Failed to accept suggestion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

