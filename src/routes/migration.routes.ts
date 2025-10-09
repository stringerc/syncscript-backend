import { Router, Request, Response } from 'express';
import db from '../utils/database';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Run migrations endpoint (temporary - remove after use)
router.post('/run-tags-migration', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔄 Running tags migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../migrations/003_add_tags_to_tasks.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.none(sql);
    
    console.log('✅ Tags migration completed successfully!');
    
    res.status(200).json({
      success: true,
      message: 'Tags column added successfully! 🎉',
      details: 'The tasks table now has a tags column (JSONB type) with a GIN index for fast queries.'
    });
    return;
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    
    // If column already exists, that's okay
    if (error.message && error.message.includes('already exists')) {
      res.status(200).json({
        success: true,
        message: 'Tags column already exists! ✅',
        details: 'Migration was already run previously.'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to run migration',
      message: error.message
    });
    return;
  }
});

// Run subtasks migration endpoint
router.post('/run-subtasks-migration', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔄 Running subtasks migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../migrations/004_add_subtasks_to_tasks.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.none(sql);
    
    console.log('✅ Subtasks migration completed successfully!');
    
    res.status(200).json({
      success: true,
      message: 'Subtasks column added successfully! 🎉',
      details: 'The tasks table now has a subtasks column (JSONB type) with a GIN index for fast queries.'
    });
    return;
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    
    // If column already exists, that's okay
    if (error.message && error.message.includes('already exists')) {
      res.status(200).json({
        success: true,
        message: 'Subtasks column already exists! ✅',
        details: 'Migration was already run previously.'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to run migration',
      message: error.message
    });
    return;
  }
});

export default router;

