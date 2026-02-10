import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

async function debug() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });

  const fssNos = ['11223', '11222', '11221'];
  
  console.log('Inspecting records for FSS NOs:', fssNos);

  for (const fssNo of fssNos) {
    const records = await db.select().from(schema.employees).where(eq(schema.employees.fss_no, fssNo));
    if (records.length === 0) {
        // Try searching by employee_id as well
        const recordsById = await db.select().from(schema.employees).where(eq(schema.employees.employee_id, fssNo));
        if (recordsById.length > 0) {
            console.log(`\nFound by employee_id [${fssNo}]:`);
            console.log(JSON.stringify(recordsById[0], null, 2));
        } else {
            console.log(`\nNo record found for [${fssNo}]`);
        }
    } else {
        console.log(`\nFound by fss_no [${fssNo}]:`);
        console.log(JSON.stringify(records[0], null, 2));
    }
  }

  await pool.end();
}

debug().catch(console.error);
