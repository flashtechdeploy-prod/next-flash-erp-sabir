import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { employees } from './schema/employees';
import { sql } from 'drizzle-orm';

// Allow self-signed certs for some DB providers
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const getOrNull = (val: any) => {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'nil' || s === '-' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'na') return null;
  return s;
};

async function main() {
  const csvPath = path.resolve(__dirname, '../../../Serving Record - Sheet1.csv');
  console.log(`[INFO] Reading CSV from: ${csvPath}`);
  
  if (!(await fs.stat(csvPath).catch(() => false))) {
    console.error(`[ERROR] CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  const csvContent = await fs.readFile(csvPath, 'utf8');
  console.log(`[INFO] CSV file loaded, parsing...`);
  
  // Parse CSV. Data starts after the two header lines.
  const records: string[][] = parse(csvContent, { 
    columns: false, 
    skip_empty_lines: true,
    relax_column_count: true 
  });
  
  console.log(`[INFO] Parsed ${records.length} records from CSV.`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  try {
    console.log(`[INFO] Deleting all existing employees and related data...`);
    // Delete from dependent tables first if they don't have CASCADE
    // Based on schema analysis, some might need manual deletion if not CASCADE
    await db.execute(sql`TRUNCATE TABLE employees RESTART IDENTITY CASCADE`);
    console.log(`[INFO] Successfully truncated employees table.`);

    const uniqueRecordsMap = new Map<string, any>();
    let duplicatesFound = 0;

    // Skip the first two rows (headers)
    for (let i = 2; i < records.length; i++) {
        const row = records[i];
        
        const fss_no = getOrNull(row[1]);
        if (!fss_no) continue;

        const employee_id = `FSE-${String(fss_no).padStart(4, '0')}`;

        const employee: any = {
            employee_id,
            serial_no: getOrNull(row[0]),
            fss_no: String(fss_no),
            designation: getOrNull(row[2]),
            full_name: getOrNull(row[3]),
            father_name: getOrNull(row[4]),
            person_status: getOrNull(row[5]),
            unit: getOrNull(row[6]),
            unit2: getOrNull(row[6]),
            rank: getOrNull(row[7]),
            rank2: getOrNull(row[7]),
            blood_group: getOrNull(row[8]),
            cnic: getOrNull(row[9]),
            cnic_no: getOrNull(row[9]),
            dob: getOrNull(row[10]),
            date_of_birth: getOrNull(row[10]),
            cnic_expiry_date: getOrNull(row[11]),
            cnic_expiry: getOrNull(row[11]),
            documents_held: getOrNull(row[12]),
            eobi_no: getOrNull(row[13]),
            insurance: getOrNull(row[14]),
            social_security: getOrNull(row[15]),
            mobile_number: getOrNull(row[16]),
            mobile_no: getOrNull(row[16]),
            phone: getOrNull(row[16]),
            personal_mobile_no: getOrNull(row[16]),
            main_number: getOrNull(row[16]),
            home_contact: getOrNull(row[17]),
            personal_phone_number: getOrNull(row[17]),
            verified_by_sho: getOrNull(row[18]),
            sho_verification_date: getOrNull(row[18]),
            verified_by_khidmat_markaz: getOrNull(row[19]),
            domicile: getOrNull(row[20]),
            verified_by_ssp: getOrNull(row[21]),
            ssp_verification_date: getOrNull(row[21]),
            enrolled: getOrNull(row[22]),
            date_of_enrolment: getOrNull(row[22]),
            re_enrolled: getOrNull(row[23]),
            date_of_re_enrolment: getOrNull(row[23]),
            village: getOrNull(row[24]),
            permanent_village: getOrNull(row[24]),
            present_village: getOrNull(row[24]),
            post_office: getOrNull(row[25]),
            permanent_post_office: getOrNull(row[25]),
            present_post_office: getOrNull(row[25]),
            thana: getOrNull(row[26]),
            permanent_thana: getOrNull(row[26]),
            present_thana: getOrNull(row[26]),
            tehsil: getOrNull(row[27]),
            permanent_tehsil: getOrNull(row[27]),
            present_tehsil: getOrNull(row[27]),
            district: getOrNull(row[28]),
            permanent_district: getOrNull(row[28]),
            present_district: getOrNull(row[28]),
            duty_location: getOrNull(row[29]),
            deployed_at: getOrNull(row[29]),
            status: 'Active',
        };

        // Remove null/undefined fields
        const cleanedEmployee: any = {};
        for (const key in employee) {
            if (employee[key] !== null && employee[key] !== undefined) {
                cleanedEmployee[key] = employee[key];
            }
        }

        // Deduplicate using Map (latest record wins)
        if (uniqueRecordsMap.has(employee_id)) {
            duplicatesFound++;
        }
        uniqueRecordsMap.set(employee_id, cleanedEmployee);
    }

    const validRecords = Array.from(uniqueRecordsMap.values());
    console.log(`\n[IMPORT SUMMARY]`);
    console.log(`- Total rows in CSV: ${records.length}`);
    console.log(`- Number of duplicates merged: ${duplicatesFound}`);
    console.log(`- Total unique records to insert: ${validRecords.length}`);

    // Batch insert
    const BATCH_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
        const batch = validRecords.slice(i, i + BATCH_SIZE);
        console.log(`[PROGRESS] Inserting records ${i + 1} to ${Math.min(i + BATCH_SIZE, validRecords.length)}...`);
        await db.insert(employees).values(batch).onConflictDoNothing();
        totalInserted += batch.length;
    }

    console.log(`[SUMMARY] Successfully inserted ${totalInserted} employees.`);

  } catch (err) {
    console.error(`[ERROR] Migration failed:`, err);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
