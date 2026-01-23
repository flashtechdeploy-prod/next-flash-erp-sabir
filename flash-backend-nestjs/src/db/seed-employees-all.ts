// import 'dotenv/config';
// import fs from 'fs/promises';
// import path from 'path';
// import { parse } from 'csv-parse/sync';
// import { drizzle } from 'drizzle-orm/node-postgres';
// import { InferInsertModel } from 'drizzle-orm';
// import { Pool } from 'pg';
// import * as schema from './schema';

// // Type describing allowed insert payload for employees
// type EmployeeInsert = InferInsertModel<typeof schema.employees>;

// const ALLOWED_FIELDS: Array<keyof EmployeeInsert> = [
//   'employee_id',
//   'full_name',
//   'first_name',
//   'last_name',
//   'father_name',
//   'profile_photo',
//   'cnic',
//   'cnic_expiry_date',
//   'domicile',
//   'languages_spoken',
//   'languages_proficiency',
//   'height_cm',
//   'phone',
//   'mobile_number',
//   'personal_phone_number',
//   'emergency_contact_name',
//   'emergency_contact_number',
//   'previous_employment',
//   'next_of_kin_name',
//   'next_of_kin_cnic',
//   'next_of_kin_mobile_number',
//   'address',
//   'address_line1',
//   'address_line2',
//   'city',
//   'state',
//   'postal_code',
//   'department',
//   'designation',
//   'employment_type',
//   'shift_type',
//   'reporting_manager',
//   'base_location',
//   'status',
//   'gender',
//   'email',
//   'dob',
//   'government_id',
//   'fss_no',
//   'fss_number',
//   'rank',
//   'unit',
//   'serial_no',
//   'enrolled_as',
//   'date_of_enrolment',
// ];

// const BOOLEAN_FIELDS: Array<keyof EmployeeInsert> = [];
// const INTEGER_FIELDS: Array<keyof EmployeeInsert> = [];
// const FLOAT_FIELDS: Array<keyof EmployeeInsert> = ['height_cm'];
// const DATE_FIELDS: Array<keyof EmployeeInsert> = [];

// function cleanValue(value: unknown): string | undefined {
//   if (value === undefined || value === null) return undefined;
//   const str = String(value).trim();
//   if (!str) return undefined;
//   const lower = str.toLowerCase();
//   if (lower === 'null' || lower === 'n/a' || lower === 'na') return undefined;
//   return str;
// }

// function toBoolean(value: string): boolean | undefined {
//   const lower = value.toLowerCase();
//   if (['true', '1', 'yes'].includes(lower)) return true;
//   if (['false', '0', 'no'].includes(lower)) return false;
//   return undefined;
// }

// // Generate SEC- prefixed employee ID
// function generateEmployeeId(): string {
//   const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
//   let id = 'SEC-';
//   for (let i = 0; i < 12; i++) {
//     id += chars.charAt(Math.floor(Math.random() * chars.length));
//   }
//   return id;
// }

// function normalizeRow(row: Record<string, string>): EmployeeInsert | null {
//   const normalized: any = {};

//   for (const key of ALLOWED_FIELDS) {
//     const value = row[key];
//     if (!value) continue;

//     const cleaned = cleanValue(value);
//     if (!cleaned) continue;

//     if (BOOLEAN_FIELDS.includes(key)) {
//       const boolVal = toBoolean(cleaned);
//       if (boolVal !== undefined) {
//         normalized[key] = boolVal;
//       }
//       continue;
//     }

//     if (INTEGER_FIELDS.includes(key)) {
//       const intVal = parseInt(cleaned, 10);
//       if (!Number.isNaN(intVal)) {
//         normalized[key] = intVal;
//       }
//       continue;
//     }

//     if (FLOAT_FIELDS.includes(key)) {
//       const floatVal = parseFloat(cleaned);
//       if (!Number.isNaN(floatVal)) {
//         normalized[key] = floatVal;
//       }
//       continue;
//     }

//     if (DATE_FIELDS.includes(key)) {
//       const dateVal = new Date(cleaned);
//       if (!Number.isNaN(dateVal.getTime())) {
//         normalized[key] = dateVal;
//       }
//       continue;
//     }

//     normalized[key] = cleaned;
//   }

//   // If no employee_id, generate one
//   if (!normalized.employee_id) {
//     normalized.employee_id = generateEmployeeId();
//   }

//   // Prefer explicit fss_number; if missing, copy from fss_no when available
//   if (!normalized.fss_number && normalized.fss_no) {
//     normalized.fss_number = normalized.fss_no;
//   }

//   // Generate full_name if missing but first_name or last_name exists
//   if (!normalized.full_name) {
//     const parts = [normalized.first_name, normalized.last_name].filter(Boolean);
//     if (parts.length > 0) {
//       normalized.full_name = parts.join(' ');
//     } else {
//       // If no name at all, skip this record
//       return null;
//     }
//   }

//   if (!normalized.status) {
//     normalized.status = 'Active';
//   }

//   return normalized as EmployeeInsert;
// }

// function chunk<T>(items: T[], size: number): T[][] {
//   const batches: T[][] = [];
//   for (let i = 0; i < items.length; i += size) {
//     batches.push(items.slice(i, i + size));
//   }
//   return batches;
// }

// async function main() {
//   const connectionString = process.env.DATABASE_URL;

//   if (!connectionString) {
//     throw new Error('DATABASE_URL environment variable is not set');
//   }

//   console.log('Starting employee CSV import with ID generation...\n');

//   const csvPath =
//     process.env.EMPLOYEES_CSV_PATH ||
//     'c:\\Users\\HomePC\\Downloads\\erp-fls\\data - Sheet1.csv';
//   const absolutePath = path.resolve(csvPath);

//   if (!(await fs.stat(absolutePath).catch(() => null))) {
//     throw new Error(`CSV file not found at ${absolutePath}`);
//   }

//   // Read and parse the CSV file synchronously
//   const csvContent = await fs.readFile(absolutePath, 'utf-8');
//   const records = parse(csvContent, {
//     columns: true,
//     skip_empty_lines: true,
//   });

//   const pool = new Pool({
//     connectionString,
//     ssl: { rejectUnauthorized: false },
//   });

//   const db = drizzle(pool, { schema });

//   console.log(`Processing ${records.length} CSV rows...\n`);

//   const validRecords: EmployeeInsert[] = [];
//   let totalProcessed = 0;

//   for (const record of records) {
//     totalProcessed++;
//     const normalized = normalizeRow(record);
//     if (normalized) {
//       validRecords.push(normalized);
//     }
//   }

//   console.log(`Total rows processed: ${totalProcessed}`);
//   console.log(`Valid records to insert: ${validRecords.length}\n`);

//   const BATCH_SIZE = 50;
//   const batches = chunk(validRecords, BATCH_SIZE);

//   let totalInserted = 0;
//   let totalSkipped = 0;

//   for (let i = 0; i < batches.length; i++) {
//     const batch = batches[i];
//     console.log(
//       `Processing batch ${i + 1}/${batches.length} (${batch.length} records)...`,
//     );

//     let batchInserted = 0;
//     let batchSkipped = 0;

//     for (const record of batch) {
//       try {
//         await db
//           .insert(schema.employees)
//           .values(record)
//           .onConflictDoNothing();
//         batchInserted++;
//       } catch (error) {
//         console.error(`❌ Failed to insert employee ${record.employee_id}`);
//   console.error('Message:', error.message);
//   console.error('Code:', error.code);
//         console.error('Detail:', error.detail);
//   console.error('Hint:', error.hint);
//   console.error('Constraint:', error.constraint);
//   console.error('Column:', error.column);
//   console.error('Table:', error.table);
//   console.error('Full error:', error);
//   batchSkipped++;
//       }
//     }

//     totalInserted += batchInserted;
//     totalSkipped += batchSkipped;

//     console.log(`  Inserted: ${batchInserted}, Skipped: ${batchSkipped}\n`);
//   }

//   console.log('\n========== Import Summary ==========');
//   console.log(`Total processed: ${totalProcessed}`);
//   console.log(`Total inserted: ${totalInserted}`);
//   console.log(`Total skipped: ${totalSkipped}`);
//   console.log(`===================================\n`);

//   await pool.end();
//   process.exit(0);
// }

// main().catch((error) => {
//   console.error('Fatal error:', error);
//   process.exit(1);
// });




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

// List of all CSV fields (matches your CSV headers)
const ALL_FIELDS: Array<keyof EmployeeInsert> = [
  'employee_id','full_name','first_name','last_name','father_name','profile_photo',
  'cnic','cnic_expiry_date','domicile','languages_spoken','languages_proficiency',
  'height_cm','phone','mobile_number','personal_phone_number','emergency_contact_name',
  'emergency_contact_number','previous_employment','next_of_kin_name','next_of_kin_cnic',
  'next_of_kin_mobile_number','address','address_line1','address_line2','city','state',
  'postal_code','department','designation','employment_type','shift_type','reporting_manager',
  'base_location','status','gender','email','dob','government_id','fss_no','fss_number',
  'rank','unit','serial_no','enrolled_as','date_of_enrolment','date_of_re_enrolment',
  'date_of_birth','blood_group','height','education','bio_data','home_contact','personal_mobile_no',
  'temporary_address','permanent_address','duty_location','deployed_at','last_site_assigned',
  'interviewed_by','introduced_by','rank2','service_rank','unit2','vol_no','category','enrolled',
  're_enrolled','served_in','experience_in_security','cause_of_discharge','medical_category',
  'status2','employment_status','allocation_status','left_reason','remarks','basic_salary','allowances',
  'total_salary','salary','pay_rs','payments','bank_name','account_number','ifsc_code','account_type',
  'tax_id','eobi_no','insurance','social_security','bdm','security_clearance','basic_security_training',
  'fire_safety_training','first_aid_certification','guard_card','police_trg_ltr_date','vaccination_cert',
  'agreement','police_clearance','fingerprint_check','background_screening','reference_verification',
  'verified_by_sho','verified_by_khidmat_markaz','verified_by_ssp','sho_verification_date','ssp_verification_date',
  'documents_held','documents_handed_over_to','photo_on_doc','original_document_held','agreement_date',
  'other_documents','nok_name','nok_cnic_no','nok_mobile_no','sons','daughters','brothers','sisters',
  'signature_recording_officer','signature_individual','thumb_impression','index_impression','middle_impression',
  'ring_impression','little_impression','final_signature','biometric_data','created_at','updated_at'
];

const BOOLEAN_FIELDS: Array<keyof EmployeeInsert> = [];
const INTEGER_FIELDS: Array<keyof EmployeeInsert> = [];
const FLOAT_FIELDS: Array<keyof EmployeeInsert> = ['height_cm','height'];
const DATE_FIELDS: Array<keyof EmployeeInsert> = ['dob', 'date_of_enrolment', 'cnic_expiry_date'];

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

function generateEmployeeId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'SEC-';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
function parseDate(value: string): Date | undefined {
  const cleaned = cleanValue(value);
  if (!cleaned) return undefined;

  // Try ISO or numeric date
  let date = new Date(cleaned);
  if (!isNaN(date.getTime())) return date;

  // Try DD-MMM-YYYY, e.g., 1-Jan-1951
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
    if (month !== undefined) return new Date(year, month, day);
  }

  // Try D/M/YYYY or D/Mon/YYYY
  const parts = cleaned.split(/[\/-]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);

    // If month is not a number, try month name
    if (isNaN(month)) {
      const mon = parts[1].slice(0, 3).toLowerCase();
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      month = months[mon];
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  return undefined; // cannot parse
}
    function formatDateDDMMYYYY(value: string): string | undefined {
  const cleaned = cleanValue(value);
  if (!cleaned) return undefined;

  // Try to parse common date formats
  let date = new Date(cleaned);

  // If parsing failed, try DD-MMM-YYYY like "1-Jan-1951"
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

  if (isNaN(date.getTime())) return undefined;

  // Format as DD/MM/YYYY
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}


function normalizeRow(row: Record<string, string>): EmployeeInsert | null {
  const normalized: any = {};

  for (const key of ALL_FIELDS) {
    const raw = row[key];
    if (raw === undefined) continue;

    const cleaned = cleanValue(raw);
    if (!cleaned) continue;

    if (BOOLEAN_FIELDS.includes(key)) {
      const boolVal = toBoolean(cleaned);
      if (boolVal !== undefined) normalized[key] = boolVal;
      continue;
    }

    if (INTEGER_FIELDS.includes(key)) {
      const intVal = parseInt(cleaned, 10);
      if (!isNaN(intVal)) normalized[key] = intVal;
      continue;
    }

    if (FLOAT_FIELDS.includes(key)) {
      const floatVal = parseFloat(cleaned);
      if (!isNaN(floatVal)) normalized[key] = floatVal;
      continue;
    }




if (DATE_FIELDS.includes(key)) {
  const value = cleaned;
  const formattedDate = formatDateDDMMYYYY(value);
  if (formattedDate) normalized[key] = formattedDate;
  continue;
}


    normalized[key] = cleaned;
  }

  // Generate employee_id if missing
  if (!normalized.employee_id) normalized.employee_id = generateEmployeeId();

  // Generate full_name if missing
  if (!normalized.full_name) {
    const parts = [normalized.first_name, normalized.last_name].filter(Boolean);
    if (parts.length > 0) normalized.full_name = parts.join(' ');
    else return null;
  }

  if (!normalized.status) normalized.status = 'Active';

  return normalized as EmployeeInsert;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const csvPath =
    process.env.EMPLOYEES_CSV_PATH ||
    'c:\\Users\\HomePC\\Downloads\\erp-fls\\data - Sheet1.csv';
  const absolutePath = path.resolve(csvPath);
  if (!(await fs.stat(absolutePath).catch(() => null))) throw new Error(`CSV not found at ${absolutePath}`);

  const csvContent = await fs.readFile(absolutePath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const db = drizzle(pool, { schema });

  const validRecords: EmployeeInsert[] = [];
  for (const record of records) {
    const normalized = normalizeRow(record);
    if (normalized) validRecords.push(normalized);
  }

  console.log(`Total rows: ${records.length}, Valid to insert: ${validRecords.length}`);

  const BATCH_SIZE = 50;
  const batches = chunk(validRecords, BATCH_SIZE);

  for (let i = 0; i <1; i++) {
    const batch = batches[i];
    console.log(`Inserting batch ${i + 1}/${batches.length} (${batch.length} records)...`);
    for (const record of batch) {
      try {
        await db.insert(schema.employees).values(record).onConflictDoNothing();
      } catch (error) {
        console.error(`Failed to insert ${record.employee_id}:`, error);
      }
    }
  }

  console.log('✅ Import finished');
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
