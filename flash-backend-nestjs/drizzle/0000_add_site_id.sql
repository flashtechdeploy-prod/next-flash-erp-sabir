CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "roles_to_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "roles_to_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text,
	"is_admin" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users_to_roles" (
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "users_to_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "employee_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"category" text NOT NULL,
	"sub_category" text,
	"filename" text NOT NULL,
	"file_path" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"description" text,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_warnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"warning_number" text,
	"warning_date" text,
	"subject" text,
	"description" text,
	"issued_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"full_name" text,
	"first_name" text,
	"last_name" text,
	"father_name" text,
	"profile_photo" text,
	"cnic" text,
	"cnic_no" text,
	"cnic_expiry_date" text,
	"cnic_expiry" text,
	"government_id" text,
	"dob" text,
	"date_of_birth" text,
	"gender" text,
	"blood_group" text,
	"height" text,
	"height_cm" real,
	"education" text,
	"bio_data" text,
	"domicile" text,
	"languages_spoken" text,
	"languages_proficiency" text,
	"email" text,
	"phone" text,
	"mobile_number" text,
	"mobile_no" text,
	"personal_phone_number" text,
	"personal_mobile_no" text,
	"home_contact" text,
	"emergency_contact_name" text,
	"emergency_contact_number" text,
	"address" text,
	"address_line1" text,
	"address_line2" text,
	"permanent_address" text,
	"temporary_address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"village" text,
	"post_office" text,
	"thana" text,
	"tehsil" text,
	"district" text,
	"permanent_village" text,
	"permanent_post_office" text,
	"permanent_thana" text,
	"permanent_tehsil" text,
	"permanent_district" text,
	"present_village" text,
	"present_post_office" text,
	"present_thana" text,
	"present_tehsil" text,
	"present_district" text,
	"department" text,
	"designation" text,
	"enrolled_as" text,
	"employment_type" text,
	"shift_type" text,
	"reporting_manager" text,
	"base_location" text,
	"duty_location" text,
	"deployed_at" text,
	"last_site_assigned" text,
	"interviewed_by" text,
	"introduced_by" text,
	"fss_no" text,
	"fss_number" text,
	"rank" text,
	"rank2" text,
	"service_rank" text,
	"unit" text,
	"unit2" text,
	"serial_no" text,
	"vol_no" text,
	"category" text,
	"enrolled" text,
	"re_enrolled" text,
	"date_of_enrolment" text,
	"date_of_re_enrolment" text,
	"served_in" text,
	"experience_in_security" text,
	"cause_of_discharge" text,
	"medical_category" text,
	"previous_employment" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"status2" text,
	"employment_status" text,
	"allocation_status" text,
	"left_reason" text,
	"remarks" text,
	"basic_salary" text,
	"allowances" text,
	"total_salary" text,
	"salary" real,
	"pay_rs" integer,
	"payments" text,
	"bank_name" text,
	"account_number" text,
	"ifsc_code" text,
	"account_type" text,
	"tax_id" text,
	"eobi_no" text,
	"insurance" text,
	"social_security" text,
	"bdm" text,
	"security_clearance" text,
	"basic_security_training" boolean,
	"fire_safety_training" boolean,
	"first_aid_certification" boolean,
	"guard_card" boolean,
	"police_trg_ltr_date" text,
	"vaccination_cert" text,
	"agreement" boolean,
	"police_clearance" boolean,
	"fingerprint_check" boolean,
	"background_screening" boolean,
	"reference_verification" boolean,
	"verified_by_sho" text,
	"verified_by_khidmat_markaz" text,
	"verified_by_ssp" text,
	"sho_verification_date" text,
	"ssp_verification_date" text,
	"documents_held" text,
	"documents_handed_over_to" text,
	"photo_on_doc" text,
	"original_document_held" text,
	"agreement_date" text,
	"other_documents" text,
	"next_of_kin_name" text,
	"next_of_kin_cnic" text,
	"next_of_kin_mobile_number" text,
	"nok_name" text,
	"nok_cnic_no" text,
	"nok_mobile_no" text,
	"sons" integer DEFAULT 0,
	"daughters" integer DEFAULT 0,
	"brothers" integer DEFAULT 0,
	"sisters" integer DEFAULT 0,
	"signature_recording_officer" text,
	"signature_individual" text,
	"thumb_impression" text,
	"index_impression" text,
	"middle_impression" text,
	"ring_impression" text,
	"little_impression" text,
	"final_signature" text,
	"biometric_data" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "fuel_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"entry_date" text NOT NULL,
	"fuel_type" text,
	"liters" real NOT NULL,
	"price_per_liter" real,
	"total_cost" real NOT NULL,
	"odometer_km" integer,
	"vendor" text,
	"location" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"employee_id" text,
	"from_date" text,
	"to_date" text,
	"assignment_date" text,
	"route" text,
	"location" text,
	"purpose" text,
	"distance_km" real,
	"cost" real,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"filename" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"filename" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_maintenance" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"maintenance_date" text NOT NULL,
	"maintenance_type" text,
	"description" text NOT NULL,
	"cost" real,
	"vendor" text,
	"odometer_reading" integer,
	"status" text DEFAULT 'completed',
	"notes" text,
	"next_maintenance_date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"vehicle_type" text NOT NULL,
	"category" text NOT NULL,
	"make_model" text NOT NULL,
	"license_plate" text NOT NULL,
	"chassis_number" text,
	"asset_tag" text,
	"year" integer,
	"status" text DEFAULT 'active',
	"compliance" text DEFAULT 'compliant',
	"government_permit" text DEFAULT 'valid',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicles_vehicle_id_unique" UNIQUE("vehicle_id")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"date" text NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"overtime_minutes" integer,
	"overtime_rate" real,
	"late_minutes" integer,
	"late_deduction" real,
	"leave_type" text,
	"fine_amount" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"from_date" text NOT NULL,
	"to_date" text NOT NULL,
	"leave_type" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'approved',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_payment_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"month" text NOT NULL,
	"status" text DEFAULT 'unpaid',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_sheet_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_db_id" integer NOT NULL,
	"from_date" text NOT NULL,
	"to_date" text NOT NULL,
	"pre_days_override" integer,
	"cur_days_override" integer,
	"leave_encashment_days" integer,
	"allow_other" real,
	"eobi" real,
	"tax" real,
	"fine_adv_extra" real,
	"ot_rate_override" real,
	"remarks" text,
	"bank_cash" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "advances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"amount" real NOT NULL,
	"repayment_amount" real NOT NULL,
	"balance" real NOT NULL,
	"status" text DEFAULT 'active',
	"request_date" text NOT NULL,
	"approved_date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"invoice_id" text,
	"amount" real NOT NULL,
	"payment_date" text NOT NULL,
	"payment_method" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_advance_deductions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_db_id" integer NOT NULL,
	"month" text NOT NULL,
	"amount" real NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_advances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_db_id" integer NOT NULL,
	"amount" real NOT NULL,
	"note" text,
	"advance_date" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"category" text NOT NULL,
	"amount" real NOT NULL,
	"description" text NOT NULL,
	"expense_date" text NOT NULL,
	"status" text DEFAULT 'pending',
	"reference" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "expenses_expense_id_unique" UNIQUE("expense_id")
);
--> statement-breakpoint
CREATE TABLE "finance_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"account_type" text NOT NULL,
	"parent_id" integer,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "finance_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "finance_journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_no" text NOT NULL,
	"entry_date" text NOT NULL,
	"memo" text,
	"entry_type" text DEFAULT 'journal',
	"amount" real DEFAULT 0,
	"reference" text,
	"category" text,
	"status" text DEFAULT 'draft',
	"posted_at" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "finance_journal_entries_entry_no_unique" UNIQUE("entry_no")
);
--> statement-breakpoint
CREATE TABLE "finance_journal_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"description" text,
	"debit" real DEFAULT 0,
	"credit" real DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"client_id" integer NOT NULL,
	"amount" real NOT NULL,
	"due_date" text NOT NULL,
	"status" text DEFAULT 'unpaid',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_id_unique" UNIQUE("invoice_id")
);
--> statement-breakpoint
CREATE TABLE "client_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"address_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_contract_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"filename" text NOT NULL,
	"file_path" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"contract_number" text,
	"start_date" text,
	"end_date" text,
	"value" real,
	"status" text DEFAULT 'active',
	"terms" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text,
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"guards_required" integer DEFAULT 0,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "client_sites_site_id_unique" UNIQUE("site_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" text,
	"name" text NOT NULL,
	"company_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"industry" text,
	"status" text DEFAULT 'active',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "clients_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "site_guard_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"employee_id" text NOT NULL,
	"assignment_date" text NOT NULL,
	"end_date" text,
	"shift" text,
	"status" text DEFAULT 'active',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "general_inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_code" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit_name" text NOT NULL,
	"quantity_on_hand" integer DEFAULT 0,
	"min_quantity" integer,
	"image_url" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "general_inventory_items_item_code_unique" UNIQUE("item_code")
);
--> statement-breakpoint
CREATE TABLE "general_inventory_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_code" text NOT NULL,
	"employee_id" text,
	"action" text NOT NULL,
	"quantity" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "restricted_inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_code" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_serial_tracked" boolean DEFAULT false,
	"unit_name" text NOT NULL,
	"quantity_on_hand" integer DEFAULT 0,
	"min_quantity" integer,
	"serial_total" integer,
	"serial_in_stock" integer,
	"make_model" text,
	"caliber" text,
	"storage_location" text,
	"requires_maintenance" boolean DEFAULT false,
	"requires_cleaning" boolean DEFAULT false,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "restricted_inventory_items_item_code_unique" UNIQUE("item_code")
);
--> statement-breakpoint
CREATE TABLE "restricted_serial_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_code" text NOT NULL,
	"serial_number" text NOT NULL,
	"status" text DEFAULT 'in_stock',
	"issued_to_employee_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "restricted_serial_units_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "restricted_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_code" text NOT NULL,
	"employee_id" text,
	"serial_unit_id" integer,
	"action" text NOT NULL,
	"quantity" integer,
	"condition_note" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Flash Security Services' NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"website" text,
	"logo_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "roles_to_permissions" ADD CONSTRAINT "roles_to_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_to_permissions" ADD CONSTRAINT "roles_to_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_roles" ADD CONSTRAINT "users_to_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_roles" ADD CONSTRAINT "users_to_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_files" ADD CONSTRAINT "employee_files_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_warnings" ADD CONSTRAINT "employee_warnings_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_maintenance" ADD CONSTRAINT "vehicle_maintenance_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_periods" ADD CONSTRAINT "leave_periods_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_payment_status" ADD CONSTRAINT "payroll_payment_status_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_sheet_entries" ADD CONSTRAINT "payroll_sheet_entries_employee_db_id_employees_id_fk" FOREIGN KEY ("employee_db_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advances" ADD CONSTRAINT "advances_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_invoice_id_invoices_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("invoice_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_advance_deductions" ADD CONSTRAINT "employee_advance_deductions_employee_db_id_employees_id_fk" FOREIGN KEY ("employee_db_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_advances" ADD CONSTRAINT "employee_advances_employee_db_id_employees_id_fk" FOREIGN KEY ("employee_db_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_entry_id_finance_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."finance_journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_account_id_finance_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_addresses" ADD CONSTRAINT "client_addresses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contract_documents" ADD CONSTRAINT "client_contract_documents_contract_id_client_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."client_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contracts" ADD CONSTRAINT "client_contracts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_sites" ADD CONSTRAINT "client_sites_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_guard_assignments" ADD CONSTRAINT "site_guard_assignments_site_id_client_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."client_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_inventory_transactions" ADD CONSTRAINT "general_inventory_transactions_item_code_general_inventory_items_item_code_fk" FOREIGN KEY ("item_code") REFERENCES "public"."general_inventory_items"("item_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted_serial_units" ADD CONSTRAINT "restricted_serial_units_item_code_restricted_inventory_items_item_code_fk" FOREIGN KEY ("item_code") REFERENCES "public"."restricted_inventory_items"("item_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted_transactions" ADD CONSTRAINT "restricted_transactions_item_code_restricted_inventory_items_item_code_fk" FOREIGN KEY ("item_code") REFERENCES "public"."restricted_inventory_items"("item_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted_transactions" ADD CONSTRAINT "restricted_transactions_serial_unit_id_restricted_serial_units_id_fk" FOREIGN KEY ("serial_unit_id") REFERENCES "public"."restricted_serial_units"("id") ON DELETE no action ON UPDATE no action;