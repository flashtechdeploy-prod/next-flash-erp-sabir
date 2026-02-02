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

  console.log('Checking first 10 employees:');
  const emps = await db.select({
    id: schema.employees.id,
    employee_id: schema.employees.employee_id,
    full_name: schema.employees.full_name
  }).from(schema.employees).limit(10);

  emps.forEach(e => {
    console.log(`- DB ID: ${e.id}, Emp ID: [${e.employee_id}], Name: ${e.full_name}`);
  });

  await pool.end();
}

debug().catch(console.error);
