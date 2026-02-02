import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { desc } from 'drizzle-orm';

dotenv.config();

async function debug() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle(pool, { schema });

  const last = await db.select().from(schema.attendance).orderBy(desc(schema.attendance.id)).limit(10);
  console.log('Latest 10 records:');
  last.forEach(r => {
    console.log(`- ID: ${r.id}, Emp: ${r.employee_id}, Date: ${r.date}, Status: ${r.status}, CreatedAt: ${r.created_at}`);
  });

  await pool.end();
}

debug().catch(console.error);
