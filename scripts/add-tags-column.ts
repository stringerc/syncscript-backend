import db from '../src/utils/database';
import * as fs from 'fs';
import * as path from 'path';

async function addTagsColumn() {
  try {
    console.log('🔄 Adding tags column to tasks table...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/003_add_tags_to_tasks.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.none(sql);
    
    console.log('✅ Tags column added successfully!');
    console.log('✅ Index created for faster tag queries!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding tags column:', error);
    process.exit(1);
  }
}

addTagsColumn();

