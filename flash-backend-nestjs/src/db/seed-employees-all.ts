import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { employees } from './schema';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Helper functions
const getOrNull = (val: any) => {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'nil' || s === '-' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'na') return null;
  return s;
};

const isDate = (val: any) => {
  if (!val) return false;
  // Patterns: 1-Jan-1951, 16/Jan/2016, 2/Feb/2023, 29-Dec-16
  return /^\d{1,2}[-/]([a-zA-Z]{3}|\d{1,2})[-/]\d{2,4}/.test(String(val).trim());
};

function formatDateDDMMYYYY(value: string): string | undefined {
  const cleaned = getOrNull(value);
  if (!cleaned) return undefined;

  let date = new Date(cleaned);

  // Try DD-MMM-YYYY like "1-Jan-1951"
  if (isNaN(date.getTime())) {
    const dmyRegex = /^(\d{1,2})-([a-zA-Z]{3})-(\d{4})$/;
    const match = cleaned.match(dmyRegex);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();
      const year = parseInt(match[3], 10);
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const month = months[monthStr];
      if (month !== undefined) date = new Date(year, month, day);
    }
  }

  // Try D/M/YYYY or D/Mon/YYYY
  if (isNaN(date.getTime())) {
    const parts = cleaned.split(/[\/-]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);

      if (isNaN(month)) {
        const mon = parts[1].slice(0, 3).toLowerCase();
        const months: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        };
        month = months[mon];
      }

      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        date = new Date(year, month, day);
      }
    }
  }

  if (isNaN(date.getTime())) return undefined;

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

async function main() {
  // Load CSV
  const csvPath = path.resolve(__dirname, '../../../daa.csv');
  console.log(`[INFO] Reading CSV from: ${csvPath}`);
  const csvContent = await fs.readFile(csvPath, 'utf8');
  console.log(`[INFO] CSV file loaded, parsing...`);
  
  // Parse as raw arrays (columns: false)
  const records: string[][] = parse(csvContent, { columns: false, skip_empty_lines: true });
  console.log(`[INFO] Parsed ${records.length} records from CSV.`);

  // Setup DB
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  console.log(`[INFO] Starting migration of employees...`);

  const validRecords: any[] = [];

  // Data starts at Row 3 (index 2)
  for (let i = 2; i < records.length; i++) {
    const row = records[i];
    
    const fss_no = getOrNull(row[1]);
    if (!fss_no) {
      continue;
    }

    const employee_id = `FSE-${String(fss_no).padStart(4, '0')}`;
    
    // Combine permanent address fields (30-34)
    const permVillage = getOrNull(row[30]);
    const permPO = getOrNull(row[31]);
    const permThana = getOrNull(row[32]);
    const permTehsil = getOrNull(row[33]);
    const permDistrict = getOrNull(row[34]);

    const combinedPermanentAddress = [permVillage, permPO, permThana, permTehsil, permDistrict]
      .filter(Boolean)
      .join(', ');

    // Robust Date finding for SHO/SSP (looking in 24-29)
    let sho_date = [row[25], row[24], row[26]].find(isDate) || null;
    let ssp_date = [row[28], row[27], row[29]].find(isDate) || null;

    // Format dates to DD/MM/YYYY
    const dobFormatted = formatDateDDMMYYYY(row[13]);
    const cnicExpiryFormatted = formatDateDDMMYYYY(row[14]);
    const shoDateFormatted = sho_date ? formatDateDDMMYYYY(sho_date) : null;
    const sspDateFormatted = ssp_date ? formatDateDDMMYYYY(ssp_date) : null;

    // Social Security (SSN) - usually in 21, 22
    const social_security = getOrNull(row[22]) || getOrNull(row[21]);

    // Build complete employee object with ALL fields
    const employee: any = {
      employee_id,
      fss_no: String(fss_no),
      rank: getOrNull(row[2]),
      full_name: getOrNull(row[3]),
      father_name: getOrNull(row[4]),
      cnic: getOrNull(row[12]),
      dob: dobFormatted,
      cnic_expiry_date: cnicExpiryFormatted,
      documents_held: getOrNull(row[15]),
      photo_on_doc: getOrNull(row[17]),
      eobi_no: getOrNull(row[18]),
      insurance: getOrNull(row[21]),
      social_security: social_security,
      mobile_number: getOrNull(row[23]),
      sho_verification_date: shoDateFormatted,
      ssp_verification_date: sspDateFormatted,
      permanent_address: combinedPermanentAddress || getOrNull(row[30]) || getOrNull(row[31]),
      duty_location: getOrNull(row[35]),
      status: 'Active',
    };

    // Clean up nulls
    const cleanedEmployee: any = {};
    for (const key in employee) {
      if (employee[key] !== null && employee[key] !== undefined) {
        cleanedEmployee[key] = employee[key];
      }
    }

    validRecords.push(cleanedEmployee);
  }

  console.log(`[INFO] Total valid records to insert: ${validRecords.length}`);

  // Preview first 5 mapped records before inserting
  const previewCount = Math.min(5, validRecords.length);
  console.log('\n[PREVIEW] First ' + previewCount + ' mapped employee records:');
  for (let i = 0; i < previewCount; i++) {
    console.log(`Record #${i + 1}:`, validRecords[i]);
  }
  // No pause, proceed directly to insert

  // Batch insert for efficiency
  const BATCH_SIZE = 50;
  const batches = chunk(validRecords, BATCH_SIZE);
  let totalInserted = 0;
  let totalFailed = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`[PROGRESS] Inserting batch ${i + 1}/${batches.length} (${batch.length} records)...`);

    try {
      await db
        .insert(employees)
        .values(batch)
        .onConflictDoNothing();
      totalInserted += batch.length;
    } catch (err: any) {
      totalFailed += batch.length;
      console.error(`[ERROR] Batch ${i + 1} failed:`, err.message);
    }
  }

  console.log(`[SUMMARY] Successfully inserted: ${totalInserted}, Failed: ${totalFailed}`);
  await pool.end();

  // Manual insert for missing FSS No 1 (Aamir Saleem Jan)
  // This is a fallback in case the main import skips this row
  const manualEmployee = {
    employee_id: 'FSE-0001',
    fss_no: '1',
    full_name: 'Aamir Saleem Jan',
    cnic: '61101-9946439-5',
    status: 'Active',
  };
  try {
    await drizzle(new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }))
      .insert(employees)
      .values(manualEmployee)
      .onConflictDoNothing();
    console.log('[INFO] Manually inserted FSS No 1 (Aamir Saleem Jan) if not already present.');
  } catch (err: any) {
    console.error('[ERROR] Manual insert for FSS No 1 failed:', err.message);
  }
}

main().catch(err => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});