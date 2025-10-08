import { Request, Response } from 'express';
import { TaskModel, CreateTaskData } from '../models/Task';
import { z } from 'zod';

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  energy_requirement: z.number().int().min(1).max(5).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  project_id: z.string().uuid().optional(),
  due_date: z.string().datetime().optional(),
  estimated_duration: z.number().int().positive().optional(),
});

const updateTaskSchema = createTaskSchema.partial();

const completeTaskSchema = z.object({
  actual_duration: z.number().int().positive().optional(),
  current_energy_level: z.number().int().min(1).max(5).optional(),
});

export class TaskController {
  // Create task
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = createTaskSchema.parse(req.body);
      
      const task = await TaskModel.create({
        user_id: userId,
        ...validatedData,
        due_date: validatedData.due_date ? new Date(validatedData.due_date) : undefined
      } as CreateTaskData);

      res.status(201).json({
        message: 'Task created successfully',
        task
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  }

  // Get tasks (with optional energy matching)
  static async getTasks(req: Request, res: Response): Promise<void> {
    try {
      console.log('[getTasks] Starting request');
      const userId = (req as any).userId;
      console.log('[getTasks] UserId:', userId);
      console.log('[getTasks] Auth object:', req.auth);
      
      if (!userId) {
        console.log('[getTasks] No userId found, returning 401');
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const energyLevel = req.query.energy_level ? parseInt(req.query.energy_level as string) : null;
      const status = req.query.status as string;
      const projectId = req.query.project_id as string;
      const priority = req.query.priority ? parseInt(req.query.priority as string) : undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      console.log('[getTasks] Fetching tasks with filters:', { energyLevel, status, projectId, priority });

      let tasks;

      if (energyLevel) {
        // Get tasks with energy matching
        console.log('[getTasks] Using energy matching');
        tasks = await TaskModel.getTasksWithEnergyMatch(userId, energyLevel, {
          status,
          project_id: projectId,
          priority
        });
      } else {
        // Get regular tasks
        console.log('[getTasks] Using regular task fetch');
        tasks = await TaskModel.getUserTasks(userId, {
          status,
          project_id: projectId,
          priority
        }, limit, offset);
      }

      console.log('[getTasks] Tasks fetched successfully, count:', tasks.length);

      res.json({
        tasks,
        count: tasks.length,
        energy_matched: !!energyLevel,
        filters: { status, project_id: projectId, priority, energy_level: energyLevel }
      });
    } catch (error) {
      console.error('[getTasks] Error fetching tasks:', error);
      console.error('[getTasks] Error stack:', (error as Error).stack);
      res.status(500).json({ 
        error: 'Failed to fetch tasks',
        message: (error as Error).message
      });
    }
  }

  // Get task by ID
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const task = await TaskModel.findById(id, userId);

      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.json({ task });
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  }

  // Update task
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = updateTaskSchema.parse(req.body);

      const task = await TaskModel.update(id, userId, {
        ...validatedData,
        due_date: validatedData.due_date ? new Date(validatedData.due_date) : undefined
      });

      res.json({
        message: 'Task updated successfully',
        task
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  }

  // Complete task
  static async complete(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = completeTaskSchema.parse(req.body);

      const result = await TaskModel.complete(
        id,
        userId,
        validatedData.actual_duration,
        validatedData.current_energy_level
      );

      res.json({
        message: 'Task completed successfully',
        task: result.task,
        points_earned: result.points_earned,
        bonus_points: result.bonus_points,
        energy_match_bonus: result.bonus_points > 0
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Error completing task:', error);
      res.status(500).json({ error: 'Failed to complete task' });
    }
  }

  // Delete task
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const deleted = await TaskModel.delete(id, userId);

      if (!deleted) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }

  // Get task statistics
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const stats = await TaskModel.getTaskStats(userId);

      res.json({ stats });
    } catch (error) {
      console.error('Error fetching task stats:', error);
      res.status(500).json({ error: 'Failed to fetch task statistics' });
    }
  }
}
