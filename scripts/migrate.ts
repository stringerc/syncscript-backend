import { testConnection, runMigrations } from '../src/utils/database';

async function migrate() {
  console.log('🗄️  SyncScript Database Migration');
  console.log('================================\n');
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to database. Please check your DATABASE_URL.');
    process.exit(1);
  }
  
  // Run migrations
  try {
    await runMigrations();
    console.log('\n✅ Database is ready!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
