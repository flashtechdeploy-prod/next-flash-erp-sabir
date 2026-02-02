import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { and, eq } from 'drizzle-orm';

dotenv.config();

async function debug() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle(pool, { schema });

  const date = '2026-02-02'; // Today's date in the dashboard
  console.log(`Checking attendance for date: ${date}`);

  const records = await db
    .select()
    .from(schema.attendance)
    .where(eq(schema.attendance.date, date));

  console.log(`Found ${records.length} records in attendance table:`);
  records.forEach(r => {
    console.log(`- Employee: ${r.employee_id}, Status: ${r.status}, Check-In: ${r.check_in}, Check-Out: ${r.check_out}`);
  });

  await pool.end();
}

debug().catch(console.error);
