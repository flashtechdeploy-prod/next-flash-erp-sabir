require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query('ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "fuel_limit_monthly" real;');
    console.log('✓ fuel_limit_monthly column added (or already exists)');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
