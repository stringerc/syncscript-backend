import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import db from '../utils/database';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createDependencySchema = z.object({
  dependsOnTaskId: z.string().uuid(),
  type: z.enum(['blocks', 'requires', 'suggests']).default('requires')
});

/**
 * POST /api/tasks/:taskId/dependencies
 * Add a dependency to a task
 */
router.post('/:taskId/dependencies', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    const taskId = req.params.taskId;
    const validatedData = createDependencySchema.parse(req.body);

    // Check if user owns the task
    const task = await db.oneOrNone(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
      [taskId, userId]
    );

    if (!task) {
      res.status(404).json({ error: 'Task not found or access denied' });
      return;
    }

    // Check if dependency task exists and user has access
    const dependencyTask = await db.oneOrNone(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
      [validatedData.dependsOnTaskId, userId]
    );

    if (!dependencyTask) {
      res.status(404).json({ error: 'Dependency task not found or access denied' });
      return;
    }

    // Check for circular dependencies
    const circularCheck = await checkCircularDependency(taskId, validatedData.dependsOnTaskId);
    if (circularCheck) {
      res.status(400).json({ 
        error: 'Circular dependency detected',
        message: 'Adding this dependency would create a circular reference'
      });
      return;
    }

    // Create dependency
    const dependency = await db.one(
      `INSERT INTO task_dependencies (task_id, depends_on_task_id, type, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [taskId, validatedData.dependsOnTaskId, validatedData.type]
    );

    res.status(201).json({
      success: true,
      data: dependency
    });
  } catch (error) {
    console.error('Error creating dependency:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    // Check for unique constraint violation
    if ((error as any).code === '23505') {
      res.status(409).json({ error: 'Dependency already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create dependency' });
  }
});

/**
 * GET /api/tasks/:taskId/dependencies
 * Get all dependencies for a task
 */
router.get('/:taskId/dependencies', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    const taskId = req.params.taskId;

    // Check if user owns the task
    const task = await db.oneOrNone(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
      [taskId, userId]
    );

    if (!task) {
      res.status(404).json({ error: 'Task not found or access denied' });
      return;
    }

    // Get all dependencies
    const dependencies = await db.any(
      `SELECT 
         td.*,
         t.title as depends_on_title,
         t.completed as depends_on_completed,
         t.priority as depends_on_priority
       FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id
       WHERE td.task_id = $1
       ORDER BY td.created_at DESC`,
      [taskId]
    );

    // Get tasks that depend on this task
    const dependents = await db.any(
      `SELECT 
         td.*,
         t.title as task_title,
         t.completed as task_completed
       FROM task_dependencies td
       JOIN tasks t ON td.task_id = t.id
       WHERE td.depends_on_task_id = $1
       ORDER BY td.created_at DESC`,
      [taskId]
    );

    res.json({
      success: true,
      data: {
        dependencies,
        dependents,
        canComplete: dependencies.filter(d => d.type === 'blocks' || d.type === 'requires')
          .every((d: any) => d.depends_on_completed)
      }
    });
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    res.status(500).json({ error: 'Failed to fetch dependencies' });
  }
});

/**
 * DELETE /api/tasks/:taskId/dependencies/:dependencyId
 * Remove a dependency
 */
router.delete('/:taskId/dependencies/:dependencyId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    const { taskId, dependencyId } = req.params;

    // Check if user owns the task
    const task = await db.oneOrNone(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
      [taskId, userId]
    );

    if (!task) {
      res.status(404).json({ error: 'Task not found or access denied' });
      return;
    }

    // Delete dependency
    const result = await db.result(
      `DELETE FROM task_dependencies WHERE id = $1 AND task_id = $2`,
      [dependencyId, taskId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Dependency not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Dependency removed successfully'
    });
  } catch (error) {
    console.error('Error deleting dependency:', error);
    res.status(500).json({ error: 'Failed to delete dependency' });
  }
});

/**
 * Helper function to check for circular dependencies
 */
async function checkCircularDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
  const visited = new Set<string>();
  const queue = [dependsOnTaskId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    
    if (currentId === taskId) {
      return true; // Circular dependency found
    }

    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    // Get all tasks that currentId depends on
    const dependencies = await db.any(
      `SELECT depends_on_task_id FROM task_dependencies WHERE task_id = $1`,
      [currentId]
    );

    queue.push(...dependencies.map((d: any) => d.depends_on_task_id));
  }

  return false; // No circular dependency
}

export default router;
