import { pgTable, unique, serial, text, boolean, timestamp, foreignKey, real, integer, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	fullName: text("full_name"),
	isAdmin: boolean("is_admin").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const permissions = pgTable("permissions", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
}, (table) => [
	unique("permissions_name_unique").on(table.name),
]);

export const roles = pgTable("roles", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
}, (table) => [
	unique("roles_name_unique").on(table.name),
]);

export const employeeWarnings = pgTable("employee_warnings", {
	id: serial().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	warningNumber: text("warning_number"),
	warningDate: text("warning_date"),
	subject: text(),
	description: text(),
	foundWith: text("found_with"),
	supervisorSignature: text("supervisor_signature"),
	supervisorSignatureDate: text("supervisor_signature_date"),
	issuedBy: text("issued_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const vehicleAssignments = pgTable("vehicle_assignments", {
	id: serial().primaryKey().notNull(),
	vehicleId: text("vehicle_id").notNull(),
	employeeId: text("employee_id"),
	route: text(),
	assignmentDate: text("assignment_date"),
	distanceKm: real("distance_km"),
	cost: real(),
	status: text().default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	fromDate: text("from_date"),
	toDate: text("to_date"),
	location: text(),
	purpose: text(),
}, (table) => [
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicles.vehicleId],
			name: "vehicle_assignments_vehicle_id_vehicles_vehicle_id_fk"
		}),
]);

export const vehicleDocuments = pgTable("vehicle_documents", {
	id: serial().primaryKey().notNull(),
	vehicleId: text("vehicle_id").notNull(),
	filename: text().notNull(),
	url: text().notNull(),
	mimeType: text("mime_type"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicles.vehicleId],
			name: "vehicle_documents_vehicle_id_vehicles_vehicle_id_fk"
		}).onDelete("cascade"),
]);

export const vehicleImages = pgTable("vehicle_images", {
	id: serial().primaryKey().notNull(),
	vehicleId: text("vehicle_id").notNull(),
	filename: text().notNull(),
	url: text().notNull(),
	mimeType: text("mime_type"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicles.vehicleId],
			name: "vehicle_images_vehicle_id_vehicles_vehicle_id_fk"
		}).onDelete("cascade"),
]);

export const vehicleMaintenance = pgTable("vehicle_maintenance", {
	id: serial().primaryKey().notNull(),
	vehicleId: text("vehicle_id").notNull(),
	maintenanceDate: text("maintenance_date").notNull(),
	description: text().notNull(),
	cost: real(),
	vendor: text(),
	nextMaintenanceDate: text("next_maintenance_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	maintenanceType: text("maintenance_type"),
	odometerReading: integer("odometer_reading"),
	status: text().default('completed'),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicles.vehicleId],
			name: "vehicle_maintenance_vehicle_id_vehicles_vehicle_id_fk"
		}),
]);

export const attendance = pgTable("attendance", {
	id: serial().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	date: text().notNull(),
	status: text().notNull(),
	note: text(),
	overtimeMinutes: integer("overtime_minutes"),
	overtimeRate: real("overtime_rate"),
	lateMinutes: integer("late_minutes"),
	lateDeduction: real("late_deduction"),
	leaveType: text("leave_type"),
	fineAmount: real("fine_amount"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	location: text(),
	picture: text(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	initialLocation: text("initial_location"),
});

export const vehicles = pgTable("vehicles", {
	id: serial().primaryKey().notNull(),
	vehicleId: text("vehicle_id").notNull(),
	vehicleType: text("vehicle_type").notNull(),
	category: text().notNull(),
	makeModel: text("make_model").notNull(),
	licensePlate: text("license_plate").notNull(),
	chassisNumber: text("chassis_number"),
	assetTag: text("asset_tag"),
	year: integer(),
	status: text().default('active'),
	compliance: text().default('compliant'),
	governmentPermit: text("government_permit").default('valid'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	fuelLimitMonthly: real("fuel_limit_monthly"),
	registrationDate: text("registration_date"),
}, (table) => [
	unique("vehicles_vehicle_id_unique").on(table.vehicleId),
]);

export const clientPayments = pgTable("client_payments", {
	id: serial().primaryKey().notNull(),
	clientId: text("client_id").notNull(),
	invoiceId: text("invoice_id"),
	amount: real().notNull(),
	paymentDate: text("payment_date").notNull(),
	paymentMethod: text("payment_method"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.invoiceId],
			name: "client_payments_invoice_id_invoices_invoice_id_fk"
		}),
]);

export const advances = pgTable("advances", {
	id: serial().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	amount: real().notNull(),
	repaymentAmount: real("repayment_amount").notNull(),
	balance: real().notNull(),
	status: text().default('active'),
	requestDate: text("request_date").notNull(),
	approvedDate: text("approved_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "advances_employee_id_employees_employee_id_fk"
		}),
]);

export const financeAccounts = pgTable("finance_accounts", {
	id: serial().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	accountType: text("account_type").notNull(),
	parentId: integer("parent_id"),
	isSystem: boolean("is_system").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("finance_accounts_code_unique").on(table.code),
]);

export const expenses = pgTable("expenses", {
	id: serial().primaryKey().notNull(),
	expenseId: text("expense_id").notNull(),
	category: text().notNull(),
	amount: real().notNull(),
	description: text().notNull(),
	expenseDate: text("expense_date").notNull(),
	status: text().default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	reference: text(),
}, (table) => [
	unique("expenses_expense_id_unique").on(table.expenseId),
]);

export const financeJournalEntries = pgTable("finance_journal_entries", {
	id: serial().primaryKey().notNull(),
	entryNo: text("entry_no").notNull(),
	entryDate: text("entry_date").notNull(),
	memo: text(),
	status: text().default('draft'),
	postedAt: text("posted_at"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	entryType: text("entry_type").default('journal'),
	amount: real().default(0),
	reference: text(),
	category: text(),
}, (table) => [
	unique("finance_journal_entries_entry_no_unique").on(table.entryNo),
]);

export const clientContacts = pgTable("client_contacts", {
	id: serial().primaryKey().notNull(),
	clientId: integer("client_id").notNull(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	role: text(),
	isPrimary: boolean("is_primary").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "client_contacts_client_id_clients_id_fk"
		}).onDelete("cascade"),
]);

export const clientContracts = pgTable("client_contracts", {
	id: serial().primaryKey().notNull(),
	clientId: integer("client_id").notNull(),
	contractNumber: text("contract_number"),
	startDate: text("start_date"),
	endDate: text("end_date"),
	value: real(),
	status: text().default('active'),
	terms: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "client_contracts_client_id_clients_id_fk"
		}).onDelete("cascade"),
]);

export const clientSites = pgTable("client_sites", {
	id: serial().primaryKey().notNull(),
	clientId: integer("client_id").notNull(),
	name: text().notNull(),
	address: text(),
	city: text(),
	guardsRequired: integer("guards_required").default(0),
	status: text().default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "client_sites_client_id_clients_id_fk"
		}).onDelete("cascade"),
]);

export const generalInventoryItems = pgTable("general_inventory_items", {
	id: serial().primaryKey().notNull(),
	itemCode: text("item_code").notNull(),
	category: text().notNull(),
	name: text().notNull(),
	description: text(),
	unitName: text("unit_name").notNull(),
	quantityOnHand: integer("quantity_on_hand").default(0),
	minQuantity: integer("min_quantity"),
	imageUrl: text("image_url"),
	status: text().default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("general_inventory_items_item_code_unique").on(table.itemCode),
]);

export const invoices = pgTable("invoices", {
	id: serial().primaryKey().notNull(),
	invoiceId: text("invoice_id").notNull(),
	clientId: text("client_id").notNull(),
	amount: real().notNull(),
	dueDate: text("due_date").notNull(),
	status: text().default('unpaid'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("invoices_invoice_id_unique").on(table.invoiceId),
]);

export const clients = pgTable("clients", {
	id: serial().primaryKey().notNull(),
	clientId: text("client_id"),
	name: text().notNull(),
	companyName: text("company_name"),
	email: text(),
	phone: text(),
	address: text(),
	industry: text(),
	status: text().default('active'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	industryId: integer("industry_id"),
}, (table) => [
	unique("clients_client_id_unique").on(table.clientId),
]);

export const restrictedInventoryItems = pgTable("restricted_inventory_items", {
	id: serial().primaryKey().notNull(),
	itemCode: text("item_code").notNull(),
	category: text().notNull(),
	name: text().notNull(),
	description: text(),
	isSerialTracked: boolean("is_serial_tracked").default(false),
	unitName: text("unit_name").notNull(),
	quantityOnHand: integer("quantity_on_hand").default(0),
	minQuantity: integer("min_quantity"),
	serialTotal: integer("serial_total"),
	serialInStock: integer("serial_in_stock"),
	makeModel: text("make_model"),
	caliber: text(),
	storageLocation: text("storage_location"),
	requiresMaintenance: boolean("requires_maintenance").default(false),
	requiresCleaning: boolean("requires_cleaning").default(false),
	status: text().default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	licenseNumber: text("license_number"),
	weaponRegion: text("weapon_region"),
}, (table) => [
	unique("restricted_inventory_items_item_code_unique").on(table.itemCode),
]);

export const clientAddresses = pgTable("client_addresses", {
	id: serial().primaryKey().notNull(),
	clientId: integer("client_id").notNull(),
	addressLine1: text("address_line1").notNull(),
	addressLine2: text("address_line2"),
	city: text(),
	state: text(),
	postalCode: text("postal_code"),
	addressType: text("address_type"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "client_addresses_client_id_clients_id_fk"
		}).onDelete("cascade"),
]);

export const fuelEntries = pgTable("fuel_entries", {
	id: serial().primaryKey().notNull(),
	vehicleId: text("vehicle_id").notNull(),
	entryDate: text("entry_date").notNull(),
	fuelType: text("fuel_type"),
	liters: real().notNull(),
	pricePerLiter: real("price_per_liter"),
	totalCost: real("total_cost").notNull(),
	odometerKm: integer("odometer_km"),
	vendor: text(),
	location: text(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicles.vehicleId],
			name: "fuel_entries_vehicle_id_vehicles_vehicle_id_fk"
		}),
]);

export const financeJournalLines = pgTable("finance_journal_lines", {
	id: serial().primaryKey().notNull(),
	entryId: integer("entry_id").notNull(),
	accountId: integer("account_id").notNull(),
	description: text(),
	debit: real().default(0),
	credit: real().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.entryId],
			foreignColumns: [financeJournalEntries.id],
			name: "finance_journal_lines_entry_id_finance_journal_entries_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [financeAccounts.id],
			name: "finance_journal_lines_account_id_finance_accounts_id_fk"
		}),
]);

export const generalInventoryTransactions = pgTable("general_inventory_transactions", {
	id: serial().primaryKey().notNull(),
	itemCode: text("item_code").notNull(),
	employeeId: text("employee_id"),
	action: text().notNull(),
	quantity: integer().notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const restrictedSerialUnits = pgTable("restricted_serial_units", {
	id: serial().primaryKey().notNull(),
	itemCode: text("item_code").notNull(),
	serialNumber: text("serial_number").notNull(),
	status: text().default('in_stock'),
	issuedToEmployeeId: text("issued_to_employee_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("restricted_serial_units_serial_number_unique").on(table.serialNumber),
]);

export const restrictedTransactions = pgTable("restricted_transactions", {
	id: serial().primaryKey().notNull(),
	itemCode: text("item_code").notNull(),
	employeeId: text("employee_id"),
	serialUnitId: integer("serial_unit_id"),
	action: text().notNull(),
	quantity: integer(),
	conditionNote: text("condition_note"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const companySettings = pgTable("company_settings", {
	id: serial().primaryKey().notNull(),
	name: text().default('Flash Security Services').notNull(),
	address: text(),
	phone: text(),
	email: text(),
	website: text(),
	logoUrl: text("logo_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const employeeFiles = pgTable("employee_files", {
	id: serial().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	category: text().notNull(),
	subCategory: text("sub_category"),
	filename: text().notNull(),
	filePath: text("file_path").notNull(),
	fileType: text("file_type"),
	fileSize: integer("file_size"),
	description: text(),
	uploadedBy: text("uploaded_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const clientContractDocuments = pgTable("client_contract_documents", {
	id: serial().primaryKey().notNull(),
	contractId: integer("contract_id").notNull(),
	filename: text().notNull(),
	filePath: text("file_path").notNull(),
	fileType: text("file_type"),
	fileSize: integer("file_size"),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
});

export const siteGuardAssignments = pgTable("site_guard_assignments", {
	id: serial().primaryKey().notNull(),
	siteId: integer("site_id").notNull(),
	employeeId: text("employee_id").notNull(),
	assignmentDate: text("assignment_date").notNull(),
	endDate: text("end_date"),
	shift: text(),
	status: text().default('active'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const employees = pgTable("employees", {
	id: serial().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	fullName: text("full_name").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text(),
	gender: text(),
	dob: text(),
	dateOfBirth: text("date_of_birth"),
	profilePhoto: text("profile_photo"),
	governmentId: text("government_id"),
	cnic: text(),
	cnicExpiryDate: text("cnic_expiry_date"),
	domicile: text(),
	languagesSpoken: text("languages_spoken"),
	languagesProficiency: text("languages_proficiency"),
	heightCm: real("height_cm"),
	phone: text(),
	mobileNumber: text("mobile_number"),
	personalPhoneNumber: text("personal_phone_number"),
	emergencyContactName: text("emergency_contact_name"),
	emergencyContactNumber: text("emergency_contact_number"),
	fatherName: text("father_name"),
	previousEmployment: text("previous_employment"),
	nextOfKinName: text("next_of_kin_name"),
	nextOfKinCnic: text("next_of_kin_cnic"),
	nextOfKinMobileNumber: text("next_of_kin_mobile_number"),
	address: text(),
	addressLine1: text("address_line1"),
	addressLine2: text("address_line2"),
	permanentAddress: text("permanent_address"),
	temporaryAddress: text("temporary_address"),
	city: text(),
	state: text(),
	postalCode: text("postal_code"),
	department: text(),
	designation: text(),
	enrolledAs: text("enrolled_as"),
	employmentType: text("employment_type"),
	shiftType: text("shift_type"),
	reportingManager: text("reporting_manager"),
	baseLocation: text("base_location"),
	interviewedBy: text("interviewed_by"),
	introducedBy: text("introduced_by"),
	securityClearance: text("security_clearance"),
	basicSecurityTraining: boolean("basic_security_training").default(false),
	fireSafetyTraining: boolean("fire_safety_training").default(false),
	firstAidCertification: boolean("first_aid_certification").default(false),
	agreement: boolean().default(false),
	policeClearance: boolean("police_clearance").default(false),
	fingerprintCheck: boolean("fingerprint_check").default(false),
	backgroundScreening: boolean("background_screening").default(false),
	referenceVerification: boolean("reference_verification").default(false),
	guardCard: boolean("guard_card").default(false),
	basicSalary: text("basic_salary"),
	allowances: text(),
	totalSalary: text("total_salary"),
	salary: real(),
	bankName: text("bank_name"),
	accountNumber: text("account_number"),
	ifscCode: text("ifsc_code"),
	accountType: text("account_type"),
	taxId: text("tax_id"),
	employmentStatus: text("employment_status").default('active'),
	status: text().default('active'),
	lastSiteAssigned: text("last_site_assigned"),
	remarks: text(),
	leftReason: text("left_reason"),
	serialNo: text("serial_no"),
	fssNo: text("fss_no"),
	rank: text(),
	unit: text(),
	serviceRank: text("service_rank"),
	status2: text(),
	unit2: text(),
	rank2: text(),
	cnicExpiry: text("cnic_expiry"),
	documentsHeld: text("documents_held"),
	documentsHandedOverTo: text("documents_handed_over_to"),
	photoOnDoc: text("photo_on_doc"),
	eobiNo: text("eobi_no"),
	insurance: text(),
	socialSecurity: text("social_security"),
	mobileNo: text("mobile_no"),
	homeContact: text("home_contact"),
	verifiedBySho: text("verified_by_sho"),
	verifiedByKhidmatMarkaz: text("verified_by_khidmat_markaz"),
	verifiedBySsp: text("verified_by_ssp"),
	enrolled: text(),
	reEnrolled: text("re_enrolled"),
	village: text(),
	postOffice: text("post_office"),
	thana: text(),
	tehsil: text(),
	district: text(),
	dutyLocation: text("duty_location"),
	policeTrgLtrDate: text("police_trg_ltr_date"),
	vaccinationCert: text("vaccination_cert"),
	volNo: text("vol_no"),
	payments: text(),
	category: text(),
	allocationStatus: text("allocation_status"),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	photo: text(),
	cnicNo: text("cnic_no"),
	bloodGroup: text("blood_group"),
	height: text(),
	education: text(),
	bioData: text("bio_data"),
	dateOfEnrolment: text("date_of_enrolment"),
	dateOfReEnrolment: text("date_of_re_enrolment"),
	servedIn: text("served_in"),
	experienceInSecurity: text("experience_in_security"),
	causeOfDischarge: text("cause_of_discharge"),
	medicalCategory: text("medical_category"),
	deployedAt: text("deployed_at"),
	payRs: integer("pay_rs"),
	bdm: text(),
	originalDocumentHeld: text("original_document_held"),
	agreementDate: text("agreement_date"),
	otherDocuments: text("other_documents"),
	personalMobileNo: text("personal_mobile_no"),
	permanentVillage: text("permanent_village"),
	permanentPostOffice: text("permanent_post_office"),
	permanentThana: text("permanent_thana"),
	permanentTehsil: text("permanent_tehsil"),
	permanentDistrict: text("permanent_district"),
	presentVillage: text("present_village"),
	presentPostOffice: text("present_post_office"),
	presentThana: text("present_thana"),
	presentTehsil: text("present_tehsil"),
	presentDistrict: text("present_district"),
	sons: integer().default(0),
	daughters: integer().default(0),
	brothers: integer().default(0),
	sisters: integer().default(0),
	nokName: text("nok_name"),
	nokCnicNo: text("nok_cnic_no"),
	nokMobileNo: text("nok_mobile_no"),
	shoVerificationDate: text("sho_verification_date"),
	sspVerificationDate: text("ssp_verification_date"),
	signatureRecordingOfficer: text("signature_recording_officer"),
	signatureIndividual: text("signature_individual"),
	thumbImpression: text("thumb_impression"),
	indexImpression: text("index_impression"),
	middleImpression: text("middle_impression"),
	ringImpression: text("ring_impression"),
	littleImpression: text("little_impression"),
	finalSignature: text("final_signature"),
	biometricData: text("biometric_data"),
	password: text(),
	mainNumber: text("main_number"),
}, (table) => [
	unique("employees_employee_id_unique").on(table.employeeId),
]);

export const leavePeriods = pgTable("leave_periods", {
	id: serial().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	fromDate: text("from_date").notNull(),
	toDate: text("to_date").notNull(),
	leaveType: text("leave_type").notNull(),
	reason: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	status: text().default('approved'),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "leave_periods_employee_id_employees_employee_id_fk"
		}),
]);

export const payrollPaymentStatus = pgTable("payroll_payment_status", {
	id: serial().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	month: text().notNull(),
	status: text().default('unpaid'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "payroll_payment_status_employee_id_employees_employee_id_fk"
		}),
]);

export const payrollSheetEntries = pgTable("payroll_sheet_entries", {
	id: serial().primaryKey().notNull(),
	employeeDbId: integer("employee_db_id").notNull(),
	fromDate: text("from_date").notNull(),
	toDate: text("to_date").notNull(),
	preDaysOverride: integer("pre_days_override"),
	curDaysOverride: integer("cur_days_override"),
	leaveEncashmentDays: integer("leave_encashment_days"),
	allowOther: real("allow_other"),
	eobi: real(),
	tax: real(),
	fineAdvExtra: real("fine_adv_extra"),
	otRateOverride: real("ot_rate_override"),
	remarks: text(),
	bankCash: text("bank_cash"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeDbId],
			foreignColumns: [employees.id],
			name: "payroll_sheet_entries_employee_db_id_employees_id_fk"
		}),
]);

export const employeeAdvanceDeductions = pgTable("employee_advance_deductions", {
	id: serial().primaryKey().notNull(),
	employeeDbId: integer("employee_db_id").notNull(),
	month: text().notNull(),
	amount: real().notNull(),
	note: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeDbId],
			foreignColumns: [employees.id],
			name: "employee_advance_deductions_employee_db_id_employees_id_fk"
		}),
]);

export const employeeAdvances = pgTable("employee_advances", {
	id: serial().primaryKey().notNull(),
	employeeDbId: integer("employee_db_id").notNull(),
	amount: real().notNull(),
	note: text(),
	advanceDate: text("advance_date").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeDbId],
			foreignColumns: [employees.id],
			name: "employee_advances_employee_db_id_employees_id_fk"
		}),
]);

export const vehicleCategories = pgTable("vehicle_categories", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const industries = pgTable("industries", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const vehicleTypes = pgTable("vehicle_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const usersToRoles = pgTable("users_to_roles", {
	userId: integer("user_id").notNull(),
	roleId: integer("role_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "users_to_roles_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "users_to_roles_role_id_roles_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.roleId], name: "users_to_roles_user_id_role_id_pk"}),
]);

export const rolesToPermissions = pgTable("roles_to_permissions", {
	roleId: integer("role_id").notNull(),
	permissionId: integer("permission_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "roles_to_permissions_role_id_roles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "roles_to_permissions_permission_id_permissions_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.roleId, table.permissionId], name: "roles_to_permissions_role_id_permission_id_pk"}),
]);
