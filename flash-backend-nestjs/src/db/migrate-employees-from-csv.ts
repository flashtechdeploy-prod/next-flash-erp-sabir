import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { employees } from './schema';

async function main() {
  // Load CSV
  const csvPath = path.resolve(__dirname, '../../../data - Sheet1.csv');
  console.log(`[INFO] Reading CSV from: ${csvPath}`);
  const csvContent = await fs.readFile(csvPath, 'utf8');
  console.log(`[INFO] CSV file loaded, parsing...`);
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  console.log(`[INFO] Parsed ${records.length} records from CSV.`);

  // Setup DB
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  let totalInserted = 0;
  let totalSkipped = 0;

  console.log(`[INFO] Starting migration of employees...`);

  const getOrNull = (val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  };

  let rowNum = 0;
  for (const row of records) {
    rowNum++;
    // Use employee_id from CSV if present, otherwise generate sequential FSE-xxxx
    let employee_id = getOrNull(row['employee_id']);
    if (!employee_id) {
      if (!globalThis.__employeeIdCounter) {
        globalThis.__employeeIdCounter = 1;
      }
      employee_id = `FSE-${String(globalThis.__employeeIdCounter).padStart(4, '0')}`;
      globalThis.__employeeIdCounter++;
    }
    // Insert only fields that exist in the employees schema
    const allowedFields = [
      'employee_id','full_name','first_name','last_name','father_name','profile_photo','cnic','cnic_no','cnic_expiry_date','cnic_expiry','government_id','dob','date_of_birth','gender','blood_group','height','height_cm','education','bio_data','domicile','languages_spoken','languages_proficiency','email','phone','mobile_number','mobile_no','personal_phone_number','personal_mobile_no','home_contact','emergency_contact_name','emergency_contact_number','address','address_line1','address_line2','permanent_address','temporary_address','city','state','postal_code','village','post_office','thana','tehsil','district','permanent_village','permanent_post_office','permanent_thana','permanent_tehsil','permanent_district','present_village','present_post_office','present_thana','present_tehsil','present_district','department','designation','enrolled_as','employment_type','shift_type','reporting_manager','base_location','duty_location','deployed_at','last_site_assigned','interviewed_by','introduced_by','fss_no','fss_number','rank','rank2','service_rank','unit','unit2','serial_no','vol_no','category','enrolled','re_enrolled','date_of_enrolment','date_of_re_enrolment','served_in','experience_in_security','cause_of_discharge','medical_category','previous_employment','status','status2','employment_status','allocation_status','left_reason','remarks','basic_salary','allowances','total_salary','salary','pay_rs','payments','bank_name','account_number','ifsc_code','account_type','tax_id','eobi_no','insurance','social_security','bdm','security_clearance','basic_security_training','fire_safety_training','first_aid_certification','guard_card','police_trg_ltr_date','vaccination_cert','agreement','police_clearance','fingerprint_check','background_screening','reference_verification','verified_by_sho','verified_by_khidmat_markaz','verified_by_ssp','sho_verification_date','ssp_verification_date','documents_held','documents_handed_over_to','photo_on_doc','original_document_held','agreement_date','other_documents','next_of_kin_name','next_of_kin_cnic','next_of_kin_mobile_number','nok_name','nok_cnic_no','nok_mobile_no','sons','daughters','brothers','sisters','signature_recording_officer','signature_individual','thumb_impression','index_impression','middle_impression','ring_impression','little_impression','final_signature','biometric_data','created_at','updated_at'
    ];
    const employee: typeof employees._.inferInsert = Object.fromEntries(
      allowedFields.map((key) => [
        key,
        key === 'employee_id' ? employee_id : getOrNull(row[key])
      ])
    ) as any;

    // Required fields check (employee_id, full_name, cnic)
    if (!employee.fss_no) {
      totalSkipped++;
      console.log(
        `[SKIP] Row ${rowNum}: Missing required fields (employee_id, full_name, cnic). Skipping.`,
      );
      continue;
    }

    if (rowNum <= 5) {
      console.log('[EMPLOYEE FIELDS]', JSON.stringify(employee, null, 2));
    }

    // Insert the employee into the database
    try {
      await db.insert(employees).values(employee).onConflictDoNothing();
      totalInserted++;
      console.log(
        `[INSERTED] Row ${rowNum}: ${employee.employee_id} - ${employee.full_name}`,
      );
    } catch (err) {
      totalSkipped++;
      console.log(
        `[ERROR] Row ${rowNum}: Failed to insert ${employee.employee_id} - ${employee.full_name}: ${err.message}`,
      );
    }
  }

  console.log(`[SUMMARY] Inserted: ${totalInserted}, Skipped: ${totalSkipped}`);
  await pool.end();
}

main().catch(console.error);
