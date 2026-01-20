const { Pool } = require('pg');
require('dotenv').config();

// Disable SSL certificate verification globally for this connection
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration: Adding status column to leave_periods...');
    await client.query(`
      ALTER TABLE leave_periods 
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved'
    `);
    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
