import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { eq, sql, and, isNotNull } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function logAll() {
  console.log(`LOGGING ALL OT DATA FEB 2026...`);
  
  const records = await db.select().from(schema.attendance).where(
    and(
      sql`date like '2026-02-%'`,
      isNotNull(schema.attendance.overtime_in)
    )
  );

  for (const r of records) {
    const [emp] = await db.select().from(schema.employees).where(eq(schema.employees.employee_id, r.employee_id));
    console.log(`[${r.date}] ID: ${r.employee_id} (${emp?.full_name} / FSS: ${emp?.fss_no})`);
    console.log(`   OT In: ${r.overtime_in} (${r.overtime_in_date})`);
    console.log(`   OT Out: ${r.overtime_out} (${r.overtime_out_date})`);
    console.log(`   Mins in DB: ${r.overtime_minutes}`);
  }

  process.exit(0);
}

logAll().catch(console.error);
