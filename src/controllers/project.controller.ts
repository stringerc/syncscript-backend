import { Request, Response } from 'express';
import { ProjectModel, CreateProjectData } from '../models/Project';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  energy_requirement: z.number().int().min(1).max(5).optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

const updateProjectSchema = createProjectSchema.partial();

export class ProjectController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = createProjectSchema.parse(req.body);
      const project = await ProjectModel.create({ user_id: userId, ...validatedData } as CreateProjectData);

      res.status(201).json({ message: 'Project created successfully', project });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  static async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const projects = await ProjectModel.getUserProjects(userId, status, limit, offset);

      res.json({ projects, count: projects.length });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const project = await ProjectModel.getProjectWithStats(id, userId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json({ project });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = updateProjectSchema.parse(req.body);
      const project = await ProjectModel.update(id, userId, validatedData);

      res.json({ message: 'Project updated successfully', project });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  static async archive(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const project = await ProjectModel.archive(id, userId);
      res.json({ message: 'Project archived successfully', project });
    } catch (error) {
      console.error('Error archiving project:', error);
      res.status(500).json({ error: 'Failed to archive project' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const deleted = await ProjectModel.delete(id, userId);
      if (!deleted) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
}
