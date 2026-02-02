import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

async function debug() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle(pool, { schema });

  const count = await db.select({ count: schema.attendance.id }).from(schema.attendance);
  console.log(`Total records in attendance table: ${count.length}`);

  if (count.length > 0) {
    const last = await db.select().from(schema.attendance).orderBy(schema.attendance.id).limit(5);
    console.log('Last 5 records:');
    last.forEach(r => {
      console.log(`- ID: ${r.id}, Emp: ${r.employee_id}, Date: ${r.date}, Status: ${r.status}`);
    });
  }

  await pool.end();
}

debug().catch(console.error);
