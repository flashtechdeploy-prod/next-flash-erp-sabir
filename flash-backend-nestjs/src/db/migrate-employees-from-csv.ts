import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { employees } from './schema';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
  const csvPath = path.resolve(__dirname, '../../../data - Sheet1.csv');
  console.log(`[INFO] Reading CSV from: ${csvPath}`);
  const csvContent = await fs.readFile(csvPath, 'utf8');
  const records: string[][] = parse(csvContent, { columns: false, skip_empty_lines: true });
  console.log(`[INFO] Parsed ${records.length} records from CSV.`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  let totalInserted = 0;
  let totalSkipped = 0;

  console.log(`[INFO] Starting migration...`);

  const getOrNull = (val: any) => {
    if (val === undefined || val === null) return null;
    const s = String(val).trim();
    if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'nil' || s === '-') return null;
    return s;
  };

  const isDate = (val: any) => {
    if (!val) return false;
    return /^\d{1,2}[-/]([a-zA-Z]{3}|\d{1,2})[-/]\d{2,4}/.test(String(val).trim());
  };

  for (let i = 2; i < records.length; i++) {
    const row = records[i];
    const fss_no = getOrNull(row[1]);
    if (!fss_no) {
       totalSkipped++;
       continue;
    }

    const employee_id = `FSE-${String(fss_no).padStart(4, '0')}`;
    
    // Combined Address (30-34)
    const permPieces = [row[30], row[31], row[32], row[33], row[34]].map(getOrNull).filter(Boolean);
    const combinedPermanentAddress = permPieces.join(', ');

    // Verification mapping (flexible)
    const sho_date = [row[25], row[24], row[26]].find(isDate) || null;
    const ssp_date = [row[28], row[27], row[29]].find(isDate) || null;
    const social_security = getOrNull(row[22]) || getOrNull(row[21]);

    const employee: any = {
      employee_id,
      fss_no: String(fss_no),
      rank: getOrNull(row[2]),
      full_name: getOrNull(row[3]),
      father_name: getOrNull(row[4]),
      cnic: getOrNull(row[12]),
      dob: getOrNull(row[13]),
      cnic_expiry_date: getOrNull(row[14]),
      documents_held: getOrNull(row[15]),
      photo_on_doc: getOrNull(row[17]),
      eobi_no: getOrNull(row[18]),
      insurance: getOrNull(row[21]),
      social_security: social_security,
      mobile_number: getOrNull(row[23]),
      sho_verification_date: sho_date,
      ssp_verification_date: ssp_date,
      permanent_address: combinedPermanentAddress || getOrNull(row[30]) || getOrNull(row[31]),
      duty_location: getOrNull(row[35]),
      status: 'Active',
    };

    const cleanedEmployee: any = {};
    for (const key in employee) {
      if (employee[key] !== null) cleanedEmployee[key] = employee[key];
    }

    try {
      await db.insert(employees).values(cleanedEmployee).onConflictDoNothing();
      totalInserted++;
      if (totalInserted % 100 === 0) console.log(`[PROGRESS] Inserted ${totalInserted}...`);
    } catch (err) {
      totalSkipped++;
      if (totalSkipped < 5) console.log(`[ERROR] Row ${i+1}: ${err.message}`);
    }
  }

  console.log(`[SUMMARY] Inserted: ${totalInserted}, Skipped: ${totalSkipped}`);
  await pool.end();
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
