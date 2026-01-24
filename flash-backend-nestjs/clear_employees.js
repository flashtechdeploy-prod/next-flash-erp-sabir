import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { employees } from './src/db/schema';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  console.log('[INFO] Clearing employees table...');
  await db.delete(employees);
  console.log('[INFO] Employees table cleared.');
  await pool.end();
}

main().catch(console.error);
