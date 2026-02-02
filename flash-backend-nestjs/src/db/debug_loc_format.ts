import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { desc, isNotNull } from 'drizzle-orm';

dotenv.config();

async function debug() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle(pool, { schema });

  console.log('Checking records with location data:');
  const records = await db.select({
    id: schema.attendance.id,
    emp: schema.attendance.employee_id,
    initial: schema.attendance.initial_location,
    checkout: schema.attendance.check_out_location,
    loc: schema.attendance.location
  })
  .from(schema.attendance)
  .orderBy(desc(schema.attendance.id))
  .limit(20);

  records.forEach(r => {
    console.log(`ID: ${r.id}, Emp: ${r.emp}`);
    console.log(`  Initial: ${r.initial}`);
    console.log(`  Checkout: ${r.checkout}`);
    console.log(`  Loc: ${r.loc}`);
  });

  await pool.end();
}

debug().catch(console.error);
