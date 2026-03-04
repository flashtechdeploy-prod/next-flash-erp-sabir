import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { employees } from './schema';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ─── Helpers ──────────────────────────────────────────────────────────
const getOrNull = (val: any): string | null => {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (
    s === '' ||
    s.toLowerCase() === 'null' ||
    s.toLowerCase() === 'nil' ||
    s === '-' ||
    s.toLowerCase() === 'n/a' ||
    s.toLowerCase() === 'na' ||
    s === 'N'
  )
    return null;
  return s;
};

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = getOrNull(value);
  if (!cleaned) return null;

  let date = new Date(cleaned);

  // Try DD-Mon-YYYY   e.g. 31-Jan-21 or 31-Jan-2021
  if (isNaN(date.getTime())) {
    const dmyRegex = /^(\d{1,2})-([a-zA-Z]{3})-(\d{2,4})$/;
    const match = cleaned.match(dmyRegex);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const month = months[monthStr];
      if (month !== undefined) date = new Date(year, month, day);
    }
  }

  // Try D-Mon-YYYY or other slash/dash separated
  if (isNaN(date.getTime())) {
    const parts = cleaned.split(/[\/-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      let month: number;
      const monthParsed = parseInt(parts[1], 10);
      if (isNaN(monthParsed)) {
        const months: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        };
        month = months[parts[1].slice(0, 3).toLowerCase()];
      } else {
        month = monthParsed - 1;
      }
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        date = new Date(year, month, day);
      }
    }
  }

  if (isNaN(date.getTime())) return null;

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

// ─── CSV Column Mapping (0-indexed) ───────────────────────────────────
// Based on the CSV header:
// 0: FSS #
// 1: Name
// 2: Father's Name
// 3: Status (Army / Civil / FC etc – this is military background, NOT employment status)
// 4: CNIC #
// 5: EOBI Number
// 6: EOBI Date of In
// 7: EOBI Date of Out
// 8: EOBI Card held
// 9: Mob #
// 10: Distt
// 11: DOE  (Date of Enrolment)
// 12: DOD  (Date of Discharge)
// 13: Cause of Disch
// 14: Police Verification
// 15: Notice Fine
// 16: Uniform Fine
// 17: Police Trg
// 18: Clo Fine
// 19: Vol
// ──────────────────────────────────────────────────────────────────────

async function main() {
  // CSV is located at the workspace root (sibling of this project folder)
  const csvPath = path.resolve(__dirname, '../../../../In Active Guards.csv');
  console.log(`[INFO] Reading CSV from: ${csvPath}`);

  const csvContent = await fs.readFile(csvPath, 'utf8');
  console.log(`[INFO] CSV file loaded, parsing...`);

  // Parse without column headers – the CSV has two header rows
  const records: string[][] = parse(csvContent, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
  });
  console.log(`[INFO] Parsed ${records.length} total rows from CSV (including headers).`);

  // Skip first 2 header rows
  const dataRows = records.slice(2);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  console.log(`[INFO] Building employee records from ${dataRows.length} data rows...`);

  const validRecords: any[] = [];
  const skipped: number[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];

    const fssNo = getOrNull(row[0]);
    if (!fssNo) {
      skipped.push(i + 3); // +3 because 2 header rows + 1-indexed
      continue;
    }

    const fullName = getOrNull(row[1]);
    if (!fullName) {
      skipped.push(i + 3);
      continue;
    }

    const employeeId = `FSE-${String(fssNo).padStart(4, '0')}`;

    const employee: Record<string, any> = {
      employee_id: employeeId,
      fss_no: String(fssNo),
      full_name: fullName,
      father_name: getOrNull(row[2]),
      rank: getOrNull(row[3]),               // Army / Civil / FC
      cnic: getOrNull(row[4]),
      eobi_no: getOrNull(row[5]),
      mobile_number: getOrNull(row[9]),
      district: getOrNull(row[10]),
      date_of_enrolment: formatDate(row[11]),
      cause_of_discharge: getOrNull(row[13]),
      vol_no: getOrNull(row[19]),

      // *** Force status to inactive ***
      status: 'inactive',
      employment_status: 'inactive',
    };

    // Police verification
    const policeVerif = getOrNull(row[14]);
    if (policeVerif) {
      employee.verified_by_sho = policeVerif;
    }

    // Clean out null fields so we don't override existing data with nulls
    const cleanedEmployee: Record<string, any> = {};
    for (const key of Object.keys(employee)) {
      if (employee[key] !== null && employee[key] !== undefined) {
        cleanedEmployee[key] = employee[key];
      }
    }

    validRecords.push(cleanedEmployee);
  }

  console.log(`[INFO] Valid records to insert: ${validRecords.length}`);
  console.log(`[INFO] Skipped rows (no FSS# or Name): ${skipped.length}`);

  // Preview first 5 records
  const previewCount = Math.min(5, validRecords.length);
  console.log(`\n[PREVIEW] First ${previewCount} mapped employee records:`);
  for (let i = 0; i < previewCount; i++) {
    console.log(`  Record #${i + 1}:`, validRecords[i]);
  }

  // Insert in batches
  const BATCH_SIZE = 50;
  const batches = chunk(validRecords, BATCH_SIZE);
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(
      `[PROGRESS] Inserting batch ${i + 1}/${batches.length} (${batch.length} records)...`,
    );

    try {
      const result = await db
        .insert(employees)
        .values(batch)
        .onConflictDoNothing({ target: employees.employee_id })
        .returning({ employee_id: employees.employee_id });

      totalInserted += result.length;
      totalSkipped += batch.length - result.length;
      console.log(
        `  -> Inserted: ${result.length}, Skipped (duplicate): ${batch.length - result.length}`,
      );
    } catch (err: any) {
      totalFailed += batch.length;
      console.error(`[ERROR] Batch ${i + 1} failed:`, err.message);
    }
  }

  console.log(`\n[SUMMARY]`);
  console.log(`  Total CSV data rows:   ${dataRows.length}`);
  console.log(`  Valid records:         ${validRecords.length}`);
  console.log(`  Inserted (new):       ${totalInserted}`);
  console.log(`  Skipped (duplicate):  ${totalSkipped}`);
  console.log(`  Failed:               ${totalFailed}`);

  await pool.end();
  console.log('[DONE] Inactive guards import complete.');
}

main().catch((err) => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
