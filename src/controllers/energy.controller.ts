import { Request, Response } from 'express';
import { EnergyModel, CreateEnergyLog } from '../models/Energy';
import { z } from 'zod';

// Validation schemas
const logEnergySchema = z.object({
  energy_level: z.number().int().min(1).max(5),
  mood_tags: z.array(z.string()).optional(),
  notes: z.string().max(500).optional(),
});

const dateRangeSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
});

export class EnergyController {
  // Log energy
  static async logEnergy(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = logEnergySchema.parse(req.body);
      
      const energyLog = await EnergyModel.logEnergy({
        user_id: userId,
        ...validatedData
      });

      res.status(201).json({
        message: 'Energy logged successfully',
        energy_log: energyLog
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Error logging energy:', error);
      res.status(500).json({ error: 'Failed to log energy' });
    }
  }

  // Get user's energy logs
  static async getEnergyLogs(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const logs = await EnergyModel.getUserEnergyLogs(userId, limit, offset);

      res.json({
        energy_logs: logs,
        count: logs.length,
        limit,
        offset
      });
    } catch (error) {
      console.error('Error fetching energy logs:', error);
      res.status(500).json({ error: 'Failed to fetch energy logs' });
    }
  }

  // Get latest energy
  static async getLatestEnergy(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const latest = await EnergyModel.getLatestEnergy(userId);

      if (!latest) {
        res.status(404).json({ error: 'No energy logs found' });
        return;
      }

      res.json({ energy_log: latest });
    } catch (error) {
      console.error('Error fetching latest energy:', error);
      res.status(500).json({ error: 'Failed to fetch latest energy' });
    }
  }

  // Get energy by date range
  static async getEnergyByDateRange(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { start_date, end_date } = dateRangeSchema.parse(req.query);

      const logs = await EnergyModel.getEnergyByDateRange(
        userId,
        new Date(start_date),
        new Date(end_date)
      );

      res.json({
        energy_logs: logs,
        count: logs.length,
        date_range: { start_date, end_date }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Error fetching energy by date range:', error);
      res.status(500).json({ error: 'Failed to fetch energy logs' });
    }
  }

  // Get energy pattern
  static async getEnergyPattern(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const pattern = await EnergyModel.calculateEnergyPattern(userId);

      res.json({ pattern });
    } catch (error) {
      console.error('Error calculating energy pattern:', error);
      res.status(500).json({ error: 'Failed to calculate energy pattern' });
    }
  }

  // Get energy insights
  static async getEnergyInsights(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const insights = await EnergyModel.getEnergyInsights(userId);

      res.json(insights);
    } catch (error) {
      console.error('Error getting energy insights:', error);
      res.status(500).json({ error: 'Failed to get energy insights' });
    }
  }
}
