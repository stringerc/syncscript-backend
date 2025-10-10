import { Request, Response } from 'express';
import { z } from 'zod';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// Validation schemas
const preferencesSchema = z.object({
  email_due_date_reminders: z.boolean().optional(),
  email_daily_summary: z.boolean().optional(),
  email_streak_alerts: z.boolean().optional(),
  email_weekly_report: z.boolean().optional(),
  email_task_suggestions: z.boolean().optional(),
  reminder_hours_before: z.number().int().min(1).max(72).optional()
});

export class NotificationController {
  // Update notification preferences
  static async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = preferencesSchema.parse(req.body);

      // Store preferences in database (for now, just return success)
      // TODO: Add to users table or create notification_preferences table
      
      res.status(200).json({
        message: 'Notification preferences updated successfully',
        preferences: validatedData
      });

    } catch (error) {
      console.error('Update preferences error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
        return;
      }

      res.status(500).json({ 
        error: 'Failed to update notification preferences',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get notification preferences
  static async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // TODO: Fetch from database
      const defaultPreferences = {
        email_due_date_reminders: true,
        email_daily_summary: true,
        email_streak_alerts: true,
        email_weekly_report: true,
        email_task_suggestions: true,
        reminder_hours_before: 24
      };

      res.status(200).json({
        data: {
          preferences: defaultPreferences
        }
      });

    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ 
        error: 'Failed to get notification preferences',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Send test email
  static async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const userEmail = (req as any).userEmail || 'user@example.com';
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const msg = {
        to: userEmail,
        from: 'notifications@syncscript.app',
        subject: '✅ SyncScript Email Notifications Are Working!',
        text: 'This is a test email from SyncScript. Your email notifications are configured correctly!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4A90E2; text-align: center;">✅ Success!</h1>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Your SyncScript email notifications are working perfectly!
            </p>
            <p style="font-size: 14px; color: #666;">
              You'll now receive:
            </p>
            <ul style="font-size: 14px; color: #666;">
              <li>Due date reminders</li>
              <li>Daily productivity summaries</li>
              <li>Streak maintenance alerts</li>
              <li>Weekly productivity reports</li>
              <li>Smart task suggestions</li>
            </ul>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://www.syncscript.app/dashboard" 
                 style="background: linear-gradient(135deg, #667eea, #764ba2); 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold;">
                Go to Dashboard
              </a>
            </div>
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
              SyncScript - Energy-Based Productivity Platform
            </p>
          </div>
        `
      };

      await sgMail.send(msg);

      res.status(200).json({
        message: 'Test email sent successfully!',
        sentTo: userEmail
      });

    } catch (error) {
      console.error('Send test email error:', error);
      res.status(500).json({ 
        error: 'Failed to send test email',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Send due date reminder (called by cron job or scheduled task)
  static async sendDueDateReminder(userEmail: string, task: any): Promise<void> {
    try {
      const dueDate = new Date(task.due_date);
      const msg = {
        to: userEmail,
        from: 'notifications@syncscript.app',
        subject: `⏰ Reminder: "${task.title}" is due soon`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4A90E2;">⏰ Task Reminder</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">${task.title}</h3>
              <p style="color: #666; margin: 0 0 10px 0;">${task.description || ''}</p>
              <p style="color: #E53E3E; font-weight: bold; margin: 0;">
                Due: ${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString()}
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://www.syncscript.app/dashboard" 
                 style="background: linear-gradient(135deg, #667eea, #764ba2); 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold;">
                Complete Task
              </a>
            </div>
          </div>
        `
      };

      await sgMail.send(msg);
    } catch (error) {
      console.error('Send due date reminder error:', error);
    }
  }

  // Send daily summary (called by cron job)
  static async sendDailySummary(userEmail: string, stats: any): Promise<void> {
    try {
      const msg = {
        to: userEmail,
        from: 'notifications@syncscript.app',
        subject: `📊 Your Daily Productivity Summary`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4A90E2;">📊 Daily Summary</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #48BB78;">${stats.completed}</div>
                <div style="color: #666;">Tasks Completed</div>
              </div>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #667eea;">${stats.points}</div>
                <div style="color: #666;">Points Earned</div>
              </div>
            </div>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0;">⚡ Average Energy: ${stats.avgEnergy}/5</h4>
              <h4 style="margin: 0;">🔥 Current Streak: ${stats.streak} days</h4>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://www.syncscript.app/dashboard" 
                 style="background: linear-gradient(135deg, #667eea, #764ba2); 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold;">
                View Full Report
              </a>
            </div>
          </div>
        `
      };

      await sgMail.send(msg);
    } catch (error) {
      console.error('Send daily summary error:', error);
    }
  }
}
