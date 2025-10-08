import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const pgp = pgPromise();

// Database connection
const db = pgp({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 30,
  connectionTimeoutMillis: 10000,
});

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    await db.one('SELECT 1 as test');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Run migrations
export async function runMigrations(): Promise<void> {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const migrationPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running database migrations...');
    await db.none(sql);
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export default db;
