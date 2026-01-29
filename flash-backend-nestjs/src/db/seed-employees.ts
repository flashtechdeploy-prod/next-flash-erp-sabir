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
  'cnic_no',
  'cnic_expiry_date',
  'cnic_expiry',
  'government_id',
  'dob',
  'date_of_birth',
  'gender',
  'blood_group',
  'height',
  'height_cm',
  'education',
  'bio_data',
  'domicile',
  'languages_spoken',
  'languages_proficiency',
  'employee_id',
  'full_name',
  'first_name',
  'last_name',
  'father_name',
  'profile_photo',
  'cnic',
  'cnic_no',
  'cnic_expiry_date',
  'cnic_expiry',
  'government_id',
  'dob',
  'date_of_birth',
  'gender',
  'blood_group',
  'height',
  'height_cm',
  'education',
  'bio_data',
  'domicile',
  'languages_spoken',
  'languages_proficiency',
  'mobile_number',
  'permanent_district',
  'present_village',
  'present_post_office',
  'present_thana',
  'present_tehsil',
  'present_district',
  'department',
  'designation',
  'enrolled_as',
  'employment_type',
  'shift_type',
  'reporting_manager',
  'base_location',
  'duty_location',
  'deployed_at',
  'last_site_assigned',
  'interviewed_by',
  'introduced_by',
  'fss_no',
  'rank',
  'rank2',
  'service_rank',
  'unit',
  'unit2',
  'serial_no',
  'vol_no',
  'category',
  'enrolled',
  're_enrolled',
  'date_of_enrolment',
  'date_of_re_enrolment',
  'served_in',
  'experience_in_security',
  'cause_of_discharge',
  'medical_category',
  'previous_employment',
  'status',
  'status2',
  'employment_status',
  'allocation_status',
  'left_reason',
  'remarks',
  'basic_salary',
  'allowances',
  'total_salary',
  'salary',
  'pay_rs',
  'payments',
  'bank_name',
  'account_number',
  'ifsc_code',
  'account_type',
  'tax_id',
  'eobi_no',
  'insurance',
  'social_security',
  'bdm',
  'security_clearance',
  'basic_security_training',
  'fire_safety_training',
  'first_aid_certification',
  'guard_card',
  'police_trg_ltr_date',
  'vaccination_cert',
  'agreement',
  'police_clearance',
  'fingerprint_check',
  'background_screening',
  'reference_verification',
  'verified_by_sho',
  'verified_by_khidmat_markaz',
  'verified_by_ssp',
  'sho_verification_date',
  'ssp_verification_date',
  'documents_held',
  'documents_handed_over_to',
  'photo_on_doc',
  'original_document_held',
  'agreement_date',
  'other_documents',
  'next_of_kin_name',
  'next_of_kin_cnic',
  'next_of_kin_mobile_number',
  'nok_name',
  'nok_cnic_no',
  'nok_mobile_no',
  'sons',
  'daughters',
  'brothers',
  'sisters',
  'signature_recording_officer',
  'signature_individual',
  'thumb_impression',
  'index_impression',
  'middle_impression',
  'ring_impression',
  'little_impression',
  'final_signature',
  'biometric_data',
  'created_at',
  'updated_at',
];

const BOOLEAN_FIELDS: Array<keyof EmployeeInsert> = [
  'basic_security_training',
  'fire_safety_training',
  'first_aid_certification',
  'guard_card',
  'agreement',
  'police_clearance',
  'fingerprint_check',
  'background_screening',
  'reference_verification',
];

const INTEGER_FIELDS: Array<keyof EmployeeInsert> = [
  'pay_rs',
  'sons',
  'daughters',
  'brothers',
  'sisters',
];

const FLOAT_FIELDS: Array<keyof EmployeeInsert> = ['height_cm', 'salary'];
const DATE_FIELDS: Array<keyof EmployeeInsert> = ['created_at', 'updated_at'];

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

function normalizeRow(row: Record<string, unknown>): EmployeeInsert | null {
  const normalized: Partial<EmployeeInsert> = {};

  for (const key of ALLOWED_FIELDS) {
    const raw = row[key as string];
    const cleaned = cleanValue(raw);

    if (cleaned === undefined) continue;

    if (BOOLEAN_FIELDS.includes(key)) {
      const boolVal = toBoolean(cleaned);
      if (boolVal !== undefined) {
        (normalized as any)[key] = boolVal;
      }
      continue;
    }

    if (INTEGER_FIELDS.includes(key)) {
      const intVal = parseInt(cleaned, 10);
      if (!Number.isNaN(intVal)) {
        (normalized as any)[key] = intVal;
      }
      continue;
    }

    if (FLOAT_FIELDS.includes(key)) {
      const floatVal = parseFloat(cleaned);
      if (!Number.isNaN(floatVal)) {
        (normalized as any)[key] = floatVal;
      }
      continue;
    }

    if (DATE_FIELDS.includes(key)) {
      const dateVal = new Date(cleaned);
      if (!Number.isNaN(dateVal.getTime())) {
        (normalized as any)[key] = dateVal;
      }
      continue;
    }

    (normalized as any)[key] = cleaned;
  }

  if (!normalized.employee_id) {
    return null;
  }

  // Generate full_name if missing but first_name or last_name exists
  if (!normalized.full_name) {
    const parts = [normalized.first_name, normalized.last_name].filter(Boolean);
    if (parts.length > 0) {
      normalized.full_name = parts.join(' ');
    } else {
      // If no name parts at all, skip this record
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
    throw new Error('DATABASE_URL is not set in the environment');
  }

  const cleanConnectionString = connectionString
    .replace('?sslmode=require', '')
    .replace('&sslmode=require', '');

  const csvPath = process.env.EMPLOYEES_CSV_PATH
    ? path.resolve(process.env.EMPLOYEES_CSV_PATH)
    : path.resolve(__dirname, '../../../employees.csv');

  const csvContent = await fs.readFile(csvPath, 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, unknown>[];

  const employeesToInsert = records
    .map((row) => normalizeRow(row))
    .filter((row): row is EmployeeInsert => row !== null);

  if (employeesToInsert.length === 0) {
    console.log('No valid employee rows found in CSV');
    return;
  }

  const pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });

  let inserted = 0;
  const batches = chunk(employeesToInsert, 200);

  for (const batch of batches) {
    const result = await db
      .insert(schema.employees)
      .values(batch)
      .onConflictDoNothing({ target: schema.employees.employee_id })
      .returning({ employee_id: schema.employees.employee_id });

    inserted += result.length;
    console.log(`Inserted ${result.length} of ${batch.length} rows in this batch`);
  }

  await pool.end();
  console.log(`Finished: ${employeesToInsert.length} rows processed, ${inserted} inserted (skipped duplicates and invalid rows).`);
}

main().catch((err) => {
  console.error('Error seeding employees:', err);
  process.exit(1);
});
