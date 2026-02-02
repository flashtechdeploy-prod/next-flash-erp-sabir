import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  real,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * EMPLOYEE SCHEMA - Matches existing database structure
 */
export const employees = pgTable('employees', {
  // Primary Keys
  id: serial('id').primaryKey(),
  employee_id: text('employee_id').unique().notNull(),
  // Login fields
  password: text('password'),

  // Basic Identification
  full_name: text('full_name'),
  first_name: text('first_name'),
  last_name: text('last_name'),
  father_name: text('father_name'),
  profile_photo: text('profile_photo'),

  // CNIC & ID
  cnic: text('cnic'),
  cnic_no: text('cnic_no'),
  cnic_expiry_date: text('cnic_expiry_date'),
  cnic_expiry: text('cnic_expiry'),
  government_id: text('government_id'),

  // Personal Details
  dob: text('dob'),
  date_of_birth: text('date_of_birth'),
  gender: text('gender'),
  blood_group: text('blood_group'),
  height: text('height'),
  height_cm: real('height_cm'),
  education: text('education'),
  bio_data: text('bio_data'),
  domicile: text('domicile'),
  languages_spoken: text('languages_spoken'),
  languages_proficiency: text('languages_proficiency'),

  // Added missing fields from database
  email: text('email'),
  phone: text('phone'),

  // Contact Information
  mobile_number: text('mobile_number'),
  mobile_no: text('mobile_no'),
  personal_phone_number: text('personal_phone_number'),
  personal_mobile_no: text('personal_mobile_no'),
  home_contact: text('home_contact'),
  emergency_contact_name: text('emergency_contact_name'),
  emergency_contact_number: text('emergency_contact_number'),
  main_number: text('main_number'),

  // Address
  address: text('address'),
  address_line1: text('address_line1'),
  address_line2: text('address_line2'),
  permanent_address: text('permanent_address'),
  temporary_address: text('temporary_address'),
  city: text('city'),
  state: text('state'),
  postal_code: text('postal_code'),
  village: text('village'),
  post_office: text('post_office'),
  thana: text('thana'),
  tehsil: text('tehsil'),
  district: text('district'),
  permanent_village: text('permanent_village'),
  permanent_post_office: text('permanent_post_office'),
  permanent_thana: text('permanent_thana'),
  permanent_tehsil: text('permanent_tehsil'),
  permanent_district: text('permanent_district'),
  present_village: text('present_village'),
  present_post_office: text('present_post_office'),
  present_thana: text('present_thana'),
  present_tehsil: text('present_tehsil'),
  present_district: text('present_district'),

  // Employment Details
  department: text('department'),
  designation: text('designation'),
  enrolled_as: text('enrolled_as'),
  employment_type: text('employment_type'),
  shift_type: text('shift_type'),
  reporting_manager: text('reporting_manager'),
  base_location: text('base_location'),
  duty_location: text('duty_location'),
  deployed_at: text('deployed_at'),
  last_site_assigned: text('last_site_assigned'),
  interviewed_by: text('interviewed_by'),
  introduced_by: text('introduced_by'),

  // Service Details
  fss_no: text('fss_no'),
  rank: text('rank'),
  rank2: text('rank2'),
  service_rank: text('service_rank'),
  unit: text('unit'),
  unit2: text('unit2'),
  serial_no: text('serial_no'),
  vol_no: text('vol_no'),
  category: text('category'),
  enrolled: text('enrolled'),
  re_enrolled: text('re_enrolled'),
  date_of_enrolment: text('date_of_enrolment'),
  date_of_re_enrolment: text('date_of_re_enrolment'),
  served_in: text('served_in'),
  experience_in_security: text('experience_in_security'),
  cause_of_discharge: text('cause_of_discharge'),
  medical_category: text('medical_category'),
  previous_employment: text('previous_employment'),

  // Status
  status: text('status').notNull().default('Active'),
  status2: text('status2'),
  employment_status: text('employment_status'),
  allocation_status: text('allocation_status'),
  left_reason: text('left_reason'),
  remarks: text('remarks'),

  // Salary & Banking
  basic_salary: text('basic_salary'),
  allowances: text('allowances'),
  total_salary: text('total_salary'),
  salary: real('salary'),
  pay_rs: integer('pay_rs'),
  payments: text('payments'),
  bank_name: text('bank_name'),
  account_number: text('account_number'),
  ifsc_code: text('ifsc_code'),
  account_type: text('account_type'),
  tax_id: text('tax_id'),
  eobi_no: text('eobi_no'),
  insurance: text('insurance'),
  social_security: text('social_security'),
  bdm: text('bdm'),

  // Training & Certifications
  security_clearance: text('security_clearance'),
  basic_security_training: boolean('basic_security_training'),
  fire_safety_training: boolean('fire_safety_training'),
  first_aid_certification: boolean('first_aid_certification'),
  guard_card: boolean('guard_card'),
  police_trg_ltr_date: text('police_trg_ltr_date'),
  vaccination_cert: text('vaccination_cert'),

  // Verification
  agreement: boolean('agreement'),
  police_clearance: boolean('police_clearance'),
  fingerprint_check: boolean('fingerprint_check'),
  background_screening: boolean('background_screening'),
  reference_verification: boolean('reference_verification'),
  verified_by_sho: text('verified_by_sho'),
  verified_by_khidmat_markaz: text('verified_by_khidmat_markaz'),
  verified_by_ssp: text('verified_by_ssp'),
  sho_verification_date: text('sho_verification_date'),
  ssp_verification_date: text('ssp_verification_date'),

  // Documents
  documents_held: text('documents_held'),
  documents_handed_over_to: text('documents_handed_over_to'),
  photo_on_doc: text('photo_on_doc'),
  original_document_held: text('original_document_held'),
  agreement_date: text('agreement_date'),
  other_documents: text('other_documents'),

  // Next of Kin
  next_of_kin_name: text('next_of_kin_name'),
  next_of_kin_cnic: text('next_of_kin_cnic'),
  next_of_kin_mobile_number: text('next_of_kin_mobile_number'),
  nok_name: text('nok_name'),
  nok_cnic_no: text('nok_cnic_no'),
  nok_mobile_no: text('nok_mobile_no'),

  // Family
  sons: integer('sons').default(0),
  daughters: integer('daughters').default(0),
  brothers: integer('brothers').default(0),
  sisters: integer('sisters').default(0),

  // Signatures & Biometrics
  signature_recording_officer: text('signature_recording_officer'),
  signature_individual: text('signature_individual'),
  thumb_impression: text('thumb_impression'),
  index_impression: text('index_impression'),
  middle_impression: text('middle_impression'),
  ring_impression: text('ring_impression'),
  little_impression: text('little_impression'),
  final_signature: text('final_signature'),
  biometric_data: text('biometric_data'),

  // Metadata
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  photo: text('photo'),
});

/**
 * EMPLOYEE FILE ATTACHMENTS
 * Supports multiple files per field with categories
 */
export const employeeFiles = pgTable('employee_files', {
  id: serial('id').primaryKey(),
  employee_id: text('employee_id')
    .notNull()
    .references(() => employees.employee_id, { onDelete: 'cascade', onUpdate: 'cascade' }),

  category: text('category').notNull(),
  sub_category: text('sub_category'),

  filename: text('filename').notNull(),
  file_path: text('file_path').notNull(),
  file_type: text('file_type'),
  file_size: integer('file_size'),

  description: text('description'),
  uploaded_by: text('uploaded_by'),
  created_at: timestamp('created_at').defaultNow(),
});

/**
 * EMPLOYEE WARNINGS
 */
export const employeeWarnings = pgTable('employee_warnings', {
  id: serial('id').primaryKey(),
  employee_id: text('employee_id')
    .notNull()
    .references(() => employees.employee_id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  warning_number: text('warning_number'),
  warning_date: text('warning_date'),
  subject: text('subject'),
  description: text('description'),
  issued_by: text('issued_by'),
  created_at: timestamp('created_at').defaultNow(),
});
