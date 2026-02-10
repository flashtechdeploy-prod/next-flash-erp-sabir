import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { eq, or } from 'drizzle-orm';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool, { schema });

  console.log('[INFO] Starting data correction for daa.csv...');

  const csvPath = path.resolve(__dirname, '../../../daa.csv');
  console.log(`[INFO] Reading CSV from: ${csvPath}`);
  const csvContent = await fs.readFile(csvPath, 'utf8');
  
  const records = parse(csvContent, { 
    columns: true, 
    skip_empty_lines: true,
    trim: true
  }) as any[];

  console.log(`[INFO] Parsed ${records.length} records from CSV.`);

  let processed = 0;
  let updated = 0;

  for (const row of records) {
    const fss_no = String(row['fss_no']);
    const employee_id = `FSE-${fss_no.padStart(4, '0')}`;
    
    try {
      const result = await db.insert(schema.employees)
        .values({
          employee_id,
          fss_no: fss_no,
          full_name: row['full_name'],
          cnic: row['cnic'],
          mobile_number: row['mobile_number'],
          status: 'Active',
        })
        .onConflictDoUpdate({
          target: schema.employees.employee_id,
          set: {
            fss_no: fss_no,
            full_name: row['full_name'],
            cnic: row['cnic'],
            mobile_number: row['mobile_number'],
          }
        })
        .returning({ id: schema.employees.id });

      if (result.length > 0) {
        updated++;
      }
      processed++;
    } catch (err: any) {
      console.error(`[ERROR] Failed to upsert ${employee_id}:`, err.message);
    }
  }

  console.log(`[SUMMARY] Finished processing ${processed} records. Upserted ${updated} records.`);

  // 4. Verification
  console.log('\n[VERIFICATION] Checking a few records:');
  const samples = await db.select()
    .from(schema.employees)
    .where(or(
        eq(schema.employees.fss_no, '11223'),
        eq(schema.employees.fss_no, '11189'),
        eq(schema.employees.fss_no, '1')
    ));

  samples.forEach(s => {
    console.log(`- FSS: ${s.fss_no}, Name: ${s.full_name}, CNIC: ${s.cnic}, Mobile: ${s.mobile_number}`);
  });

  await pool.end();
}

main().catch(err => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
