import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { InferInsertModel } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema';

// Type describing allowed insert payload for employees
type EmployeeInsert = InferInsertModel<typeof schema.employees>;

const ALLOWED_FIELDS: Array<keyof EmployeeInsert> = [
  'employee_id',
  'full_name',
  'first_name',
  'last_name',
  'father_name',
  'profile_photo',
  'cnic',
  'cnic_expiry_date',
  'domicile',
  'languages_spoken',
  'languages_proficiency',
  'height_cm',
  'phone',
  'mobile_number',
  'personal_phone_number',
  'emergency_contact_name',
  'emergency_contact_number',
  'previous_employment',
  'next_of_kin_name',
  'next_of_kin_cnic',
  'next_of_kin_mobile_number',
  'address',
  'address_line1',
  'address_line2',
  'city',
  'state',
  'postal_code',
  'department',
  'designation',
  'employment_type',
  'shift_type',
  'reporting_manager',
  'base_location',
  'status',
  'gender',
  'email',
  'dob',
  'government_id',
  'fss_no',
  'fss_number',
  'rank',
  'unit',
  'serial_no',
  'enrolled_as',
  'date_of_enrolment',
];

const BOOLEAN_FIELDS: Array<keyof EmployeeInsert> = [];
const INTEGER_FIELDS: Array<keyof EmployeeInsert> = [];
const FLOAT_FIELDS: Array<keyof EmployeeInsert> = ['height_cm'];
const DATE_FIELDS: Array<keyof EmployeeInsert> = [];

function cleanValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  if (!str) return undefined;
  const lower = str.toLowerCase();
  if (lower === 'null' || lower === 'n/a' || lower === 'na') return undefined;
  return str;
}

function toBoolean(value: string): boolean | undefined {
  const lower = value.toLowerCase();
  if (['true', '1', 'yes'].includes(lower)) return true;
  if (['false', '0', 'no'].includes(lower)) return false;
  return undefined;
}

// Generate SEC- prefixed employee ID
function generateEmployeeId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'SEC-';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function normalizeRow(row: Record<string, string>): EmployeeInsert | null {
  const normalized: any = {};

  for (const key of ALLOWED_FIELDS) {
    const value = row[key];
    if (!value) continue;

    const cleaned = cleanValue(value);
    if (!cleaned) continue;

    if (BOOLEAN_FIELDS.includes(key)) {
      const boolVal = toBoolean(cleaned);
      if (boolVal !== undefined) {
        normalized[key] = boolVal;
      }
      continue;
    }

    if (INTEGER_FIELDS.includes(key)) {
      const intVal = parseInt(cleaned, 10);
      if (!Number.isNaN(intVal)) {
        normalized[key] = intVal;
      }
      continue;
    }

    if (FLOAT_FIELDS.includes(key)) {
      const floatVal = parseFloat(cleaned);
      if (!Number.isNaN(floatVal)) {
        normalized[key] = floatVal;
      }
      continue;
    }

    if (DATE_FIELDS.includes(key)) {
      const dateVal = new Date(cleaned);
      if (!Number.isNaN(dateVal.getTime())) {
        normalized[key] = dateVal;
      }
      continue;
    }

    normalized[key] = cleaned;
  }

  // If no employee_id, generate one
  if (!normalized.employee_id) {
    normalized.employee_id = generateEmployeeId();
  }

  // Prefer explicit fss_number; if missing, copy from fss_no when available
  if (!normalized.fss_number && normalized.fss_no) {
    normalized.fss_number = normalized.fss_no;
  }

  // Generate full_name if missing but first_name or last_name exists
  if (!normalized.full_name) {
    const parts = [normalized.first_name, normalized.last_name].filter(Boolean);
    if (parts.length > 0) {
      normalized.full_name = parts.join(' ');
    } else {
      // If no name at all, skip this record
      return null;
    }
  }

  if (!normalized.status) {
    normalized.status = 'Active';
  }

  return normalized as EmployeeInsert;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Starting employee CSV import with ID generation...\n');

  const csvPath =
    process.env.EMPLOYEES_CSV_PATH ||
    'c:\\Users\\HomePC\\Downloads\\erp-fls\\employees.csv';
  const absolutePath = path.resolve(csvPath);

  if (!(await fs.stat(absolutePath).catch(() => null))) {
    throw new Error(`CSV file not found at ${absolutePath}`);
  }

  // Read and parse the CSV file synchronously
  const csvContent = await fs.readFile(absolutePath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });

  console.log(`Processing ${records.length} CSV rows...\n`);

  const validRecords: EmployeeInsert[] = [];
  let totalProcessed = 0;

  for (const record of records) {
    totalProcessed++;
    const normalized = normalizeRow(record);
    if (normalized) {
      validRecords.push(normalized);
    }
  }

  console.log(`Total rows processed: ${totalProcessed}`);
  console.log(`Valid records to insert: ${validRecords.length}\n`);

  const BATCH_SIZE = 50;
  const batches = chunk(validRecords, BATCH_SIZE);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(
      `Processing batch ${i + 1}/${batches.length} (${batch.length} records)...`,
    );

    let batchInserted = 0;
    let batchSkipped = 0;

    for (const record of batch) {
      try {
        await db
          .insert(schema.employees)
          .values(record)
          .onConflictDoNothing();
        batchInserted++;
      } catch (error) {
        console.error(
          `Failed to insert employee ${record.employee_id}:`,
          (error as Error).message,
        );
        batchSkipped++;
      }
    }

    totalInserted += batchInserted;
    totalSkipped += batchSkipped;

    console.log(`  Inserted: ${batchInserted}, Skipped: ${batchSkipped}\n`);
  }

  console.log('\n========== Import Summary ==========');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log(`===================================\n`);

  await pool.end();
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
