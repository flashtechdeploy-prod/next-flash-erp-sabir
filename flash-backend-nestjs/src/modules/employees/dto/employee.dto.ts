import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';

/**
 * CREATE EMPLOYEE DTO
 * Matches existing database structure - all fields optional
 */
export class CreateEmployeeDto {
  // Basic Identification
  @ApiPropertyOptional() @IsString() @IsOptional() profile_photo?: string;
  @ApiPropertyOptional() @IsOptional() _profilePhotoFile?: any;
  @ApiPropertyOptional() @IsString() @IsOptional() full_name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() first_name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() last_name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() father_name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cnic?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cnic_no?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() government_id?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cnic_expiry_date?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cnic_expiry?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() date_of_birth?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() dob?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() gender?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() blood_group?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() height?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() height_cm?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() education?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() bio_data?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() domicile?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() languages_spoken?: string;

  // Contact Information
  @ApiPropertyOptional() @IsString() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() mobile_number?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() mobile_no?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() personal_mobile_no?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() home_contact?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergency_contact_name?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergency_contact_number?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() main_number?: string;

  // Address
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() city?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() state?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() postal_code?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() village?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() post_office?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() thana?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() tehsil?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() district?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() permanent_village?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  permanent_post_office?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() permanent_thana?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() permanent_tehsil?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() permanent_district?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() present_village?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() present_post_office?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() present_thana?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() present_tehsil?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() present_district?: string;

  // Employment Details
  @ApiPropertyOptional() @IsString() @IsOptional() department?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() designation?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() enrolled_as?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() employment_type?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() shift_type?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() reporting_manager?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() base_location?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() duty_location?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() deployed_at?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() interviewed_by?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() introduced_by?: string;

  // Service Details
  @ApiPropertyOptional() @IsString() @IsOptional() fss_no?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() rank?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() unit?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() category?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() date_of_enrolment?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  date_of_re_enrolment?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() served_in?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  experience_in_security?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cause_of_discharge?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() medical_category?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() previous_employment?: string;

  // Status
  @ApiPropertyOptional() @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() employment_status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() remarks?: string;

  // Salary & Banking
  @ApiPropertyOptional() @IsString() @IsOptional() basic_salary?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() allowances?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() total_salary?: string;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() pay_rs?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() bdm?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() bank_name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() account_number?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() eobi_no?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() insurance?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() social_security?: string;

  // Training & Verification
  @ApiPropertyOptional() @IsString() @IsOptional() security_clearance?: string;
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  basic_security_training?: boolean;
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  fire_safety_training?: boolean;
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  first_aid_certification?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() agreement?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() police_clearance?: boolean;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sho_verification_date?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ssp_verification_date?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  verified_by_khidmat_markaz?: string;

  // Documents
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  original_document_held?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() agreement_date?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() other_documents?: string;

  // Next of Kin
  @ApiPropertyOptional() @IsString() @IsOptional() nok_name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() nok_cnic_no?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() nok_mobile_no?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() next_of_kin_name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() next_of_kin_cnic?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  next_of_kin_mobile_number?: string;

  // Family
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() sons?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() daughters?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() brothers?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() sisters?: number;

  // Signatures & Biometrics
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  signature_recording_officer?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  signature_individual?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() thumb_impression?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() index_impression?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() middle_impression?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ring_impression?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() little_impression?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() final_signature?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() biometric_data?: string;
}

/**
 * UPDATE EMPLOYEE DTO
 */
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

/**
 * EMPLOYEE QUERY DTO
 */
export class EmployeeQueryDto {
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() skip?: number;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() unit?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() rank?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() served_in?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() deployed_at?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fss_no?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() full_name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cnic?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() father_name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() date_of_birth?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() mobile_number?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() department?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() designation?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() enrolled_as?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() date_of_enrolment?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() sort_by?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() sort_order?: 'asc' | 'desc';
  @ApiPropertyOptional() @IsOptional() with_total?: boolean;
}

/**
 * FILE UPLOAD DTO
 */
export class UploadFileDto {
  @ApiPropertyOptional() @IsString() category: string;
  @ApiPropertyOptional() @IsString() @IsOptional() sub_category?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
}

/**
 * CREATE WARNING DTO
 */
export class CreateWarningDto {
  @ApiPropertyOptional() @IsString() @IsOptional() warning_number?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() date?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() subject?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notice_text?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() issued_by?: string;
}
