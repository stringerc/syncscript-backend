import db from '../src/utils/database';
import * as fs from 'fs';
import * as path from 'path';

async function addSubtasksColumn() {
  try {
    console.log('🔄 Adding subtasks column to tasks table...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/004_add_subtasks_to_tasks.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.none(sql);
    
    console.log('✅ Subtasks column added successfully!');
    console.log('✅ Index created for faster subtask queries!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding subtasks column:', error);
    process.exit(1);
  }
}

addSubtasksColumn();

