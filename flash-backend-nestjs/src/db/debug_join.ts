import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { eq, and } from 'drizzle-orm';

dotenv.config();

async function debug() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle(pool, { schema });

  const date = '2026-02-02';
  console.log(`Checking join for date: ${date}`);

  const sampleEmpId = 'FSE-10815'; // From latest attendance records
  
  const emp = await db.select().from(schema.employees).where(eq(schema.employees.employee_id, sampleEmpId));
  console.log(`Employee ${sampleEmpId} found in employees table: ${emp.length > 0 ? 'YES' : 'NO'}`);
  
  if (emp.length > 0) {
    console.log(`Employee ID in DB: [${emp[0].employee_id}] (length: ${emp[0].employee_id?.length})`);
  }

  const att = await db.select().from(schema.attendance).where(and(eq(schema.attendance.employee_id, sampleEmpId), eq(schema.attendance.date, date)));
  console.log(`Attendance for ${sampleEmpId} on ${date} found: ${att.length > 0 ? 'YES' : 'NO'}`);

  if (att.length > 0) {
    console.log(`Employee ID in Attendance DB: [${att[0].employee_id}] (length: ${att[0].employee_id?.length})`);
  }

  await pool.end();
}

debug().catch(console.error);
