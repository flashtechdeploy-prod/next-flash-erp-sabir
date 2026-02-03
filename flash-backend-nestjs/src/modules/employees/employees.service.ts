import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, or, and, sql, desc, SQL, ilike } from 'drizzle-orm';
import { CloudStorageService } from '../../common/storage/cloud-storage.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  CreateWarningDto,
} from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  private logger = new Logger(EmployeesService.name);

  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
    private cloudStorageService: CloudStorageService,
  ) {}

  private generateEmployeeId(fss_no?: string): string {
    if (fss_no) {
      return `FSE-${fss_no}`;
    }
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SEC-${timestamp}${random}`;
  }

  async findAll(query: EmployeeQueryDto) {
    const skip = Number(query.skip) || 0;
    const limit = Number(query.limit) || 100;
    const { search, status, unit, rank, served_in, person_status, deployed_at, with_total, fss_no, full_name, cnic } = query;

    const filters: SQL[] = [];

    if (status) filters.push(eq(schema.employees.status, status));
    if (unit) filters.push(eq(schema.employees.unit, unit));
    if (rank) filters.push(eq(schema.employees.rank, rank));
    if (served_in) filters.push(eq(schema.employees.served_in, served_in));
    if (person_status) filters.push(eq(schema.employees.person_status, person_status));

    if (deployed_at)
      filters.push(eq(schema.employees.deployed_at, deployed_at));
    
    if (fss_no) filters.push(ilike(schema.employees.fss_no, `%${fss_no}%`));
    if (full_name) filters.push(ilike(schema.employees.full_name, `%${full_name}%`));
    if (cnic) filters.push(or(
        ilike(schema.employees.cnic, `%${cnic}%`),
        ilike(schema.employees.cnic_no, `%${cnic}%`)
    ) as SQL);
    if (query.father_name) filters.push(ilike(schema.employees.father_name, `%${query.father_name}%`));
    if (query.date_of_birth) filters.push(or(
        ilike(schema.employees.date_of_birth, `%${query.date_of_birth}%`),
        ilike(schema.employees.dob, `%${query.date_of_birth}%`)
    ) as SQL);
    if (query.department) filters.push(ilike(schema.employees.department, `%${query.department}%`));
    if (query.designation) filters.push(ilike(schema.employees.designation, `%${query.designation}%`));
    if (query.enrolled_as) filters.push(ilike(schema.employees.enrolled_as, `%${query.enrolled_as}%`));
    if (query.date_of_enrolment) filters.push(ilike(schema.employees.date_of_enrolment, `%${query.date_of_enrolment}%`));
    
    if (query.mobile_number) {
        filters.push(or(
          ilike(schema.employees.mobile_number, `%${query.mobile_number}%`),
          ilike(schema.employees.mobile_no, `%${query.mobile_number}%`),
          ilike(schema.employees.personal_phone_number, `%${query.mobile_number}%`)
        ) as SQL);
    }

    if (search) {
      filters.push(
        or(
          ilike(schema.employees.full_name, `%${search}%`),
          ilike(schema.employees.employee_id, `%${search}%`),
          ilike(schema.employees.cnic, `%${search}%`),
          ilike(schema.employees.cnic_no, `%${search}%`),
          ilike(schema.employees.fss_no, `%${search}%`),
          ilike(schema.employees.personal_phone_number, `%${search}%`),
        ),
      );
    }

    const finalFilter = filters.length > 0 ? and(...filters) : undefined;

    const employees = await (
      this.db.select().from(schema.employees).where(finalFilter) as any
    )
      .limit(limit)
      .offset(skip)
      .orderBy(desc(sql`CAST(COALESCE(${schema.employees.fss_no}, '0') AS INTEGER)`));

    if (with_total) {
      const results = await (this.db
        .select({ count: sql`count(*)` })
        .from(schema.employees)
        .where(finalFilter) as any);
      const count = Number(results[0]?.count || 0);
      return { employees, total: count };
    }

    // Sanitize list
    employees.forEach(emp => {
      if ('photo' in emp) delete (emp as any)['photo'];
      if ('avatar_url' in emp) delete (emp as any)['avatar_url'];
    });

    return { employees };
  }

  async findOne(employee_id: string) {
    const [employee] = await this.db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.employee_id, employee_id));
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employee_id} not found`);
    }

    const documents = await this.db
      .select()
      .from(schema.employeeFiles)
      .where(eq(schema.employeeFiles.employee_id, employee_id));
    const warnings = await this.db
      .select()
      .from(schema.employeeWarnings)
      .where(eq(schema.employeeWarnings.employee_id, employee_id));

    // Explicitly remove legacy fields if they exist
    if ('photo' in employee) delete (employee as any)['photo'];
    if ('avatar_url' in employee) delete (employee as any)['avatar_url'];

    return { ...employee, documents, warnings };
  }

  async findByDbId(id: number) {
    const [employee] = await this.db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, id));
    if (!employee) {
      throw new NotFoundException(`Employee with DB ID ${id} not found`);
    }
    // Explicitly remove legacy fields if they exist
    if ('photo' in employee) delete (employee as any)['photo'];
    if ('avatar_url' in employee) delete (employee as any)['avatar_url'];

    return employee;
  }

  async create(createDto: CreateEmployeeDto) {
    const data: any = {
      ...createDto,
      employee_id: this.generateEmployeeId(createDto.fss_no),
      status:
        (createDto as any).status ||
        (createDto as any).employment_status ||
        'Active',
      full_name:
        (createDto as any).name ||
        (createDto as any).full_name ||
        `${(createDto as any).first_name || ''} ${(createDto as any).last_name || ''}`.trim(),
    };

    // Auto-map dob -> date_of_birth and vice versa
    if (data.dob && !data.date_of_birth) data.date_of_birth = data.dob;
    if (data.date_of_birth && !data.dob) data.dob = data.date_of_birth;

    const [result] = await this.db
      .insert(schema.employees)
      .values(data)
      .returning();
    return result;
  }

  async update(employee_id: string, updateDto: UpdateEmployeeDto) {
    await this.findOne(employee_id);
    this.logger.log(`Updating employee ${employee_id} with data: ${JSON.stringify(updateDto)}`);

    const data: any = { ...updateDto };
    // Remove temporary/DTO-only fields that don't exist in the database
    delete data._profilePhotoFile;
    if ((updateDto as any).employment_status)
      data.status = (updateDto as any).employment_status;

    // Auto-map dob -> date_of_birth and vice versa
    if (data.dob && !data.date_of_birth) data.date_of_birth = data.dob;
    if (data.date_of_birth && !data.dob) data.dob = data.date_of_birth;

    await this.db
      .update(schema.employees)
      .set(data)
      .where(eq(schema.employees.employee_id, employee_id));
    return this.findOne(employee_id);
  }

  async remove(employee_id: string) {
    const employee = await this.findOne(employee_id);
    
    try {
      // Delete all related records first (in order to avoid foreign key violations)
      
      // Delete attendance records
      await this.db
        .delete(schema.attendance)
        .where(eq(schema.attendance.employee_id, employee_id));
      
      // Delete leave periods
      await this.db
        .delete(schema.leavePeriods)
        .where(eq(schema.leavePeriods.employee_id, employee_id));
      
      // Delete payroll payment status
      await this.db
        .delete(schema.payrollPaymentStatus)
        .where(eq(schema.payrollPaymentStatus.employee_id, employee_id));
      
      // Delete advances (legacy table)
      await this.db
        .delete(schema.advances)
        .where(eq(schema.advances.employee_id, employee_id));
      
      // Delete records referencing employee.id
      if (employee.id) {
        // Delete payroll sheet entries
        await this.db
          .delete(schema.payrollSheetEntries)
          .where(eq(schema.payrollSheetEntries.employee_db_id, employee.id));
        
        // Delete employee advances
        await this.db
          .delete(schema.employee_advances)
          .where(eq(schema.employee_advances.employee_db_id, employee.id));
        
        // Delete employee advance deductions
        await this.db
          .delete(schema.employee_advance_deductions)
          .where(eq(schema.employee_advance_deductions.employee_db_id, employee.id));
      }
      
      // Finally delete the employee
      await this.db
        .delete(schema.employees)
        .where(eq(schema.employees.employee_id, employee_id));
        
      return { message: `Employee ${employee_id} deleted successfully` };
    } catch (error) {
      this.logger.error(`Failed to delete employee ${employee_id}:`, error);
      throw new Error(`Failed to delete employee: ${error.message}`);
    }
  }

  async removeAll() {
    await this.db.delete(schema.employees);
    return { message: 'All employees deleted' };
  }

  async bulkDelete(employee_ids: string[]) {
    let deleted = 0;
    for (const id of employee_ids) {
      await this.remove(id);
      deleted++;
    }
    return { deleted };
  }

  async markLeft(employee_id: string, reason?: string) {
    await this.findOne(employee_id);
    await this.db
      .update(schema.employees)
      .set({
        status: 'left',
        cause_of_discharge: reason,
      })
      .where(eq(schema.employees.employee_id, employee_id));
    return this.findOne(employee_id);
  }

  async deactivate(employee_id: string) {
    await this.findOne(employee_id);
    await this.db
      .update(schema.employees)
      .set({
        status: 'inactive',
      })
      .where(eq(schema.employees.employee_id, employee_id));
    return this.findOne(employee_id);
  }

  // Bulk import from CSV Buffer
  async importCsvBuffer(fileBuffer: Buffer) {
    const csvText = fileBuffer.toString('utf8');

    // Minimal CSV parser supporting quoted fields and commas
    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result.map((s) => s.trim());
    };

    const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) return { processed: 0, inserted: 0, skipped: 0, errors: [] };
    const header = parseRow(lines[0]);
    const records: Record<string, any>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseRow(lines[i]);
      const row: Record<string, any> = {};
      for (let c = 0; c < header.length; c++) {
        row[header[c]] = cols[c] ?? '';
      }
      records.push(row);
    }

    const allowedKeys = new Set(Object.keys(schema.employees));
    const timestampKeys = new Set(['created_at', 'updated_at']);
    const booleanKeys = new Set([
      'basic_security_training',
      'fire_safety_training',
      'first_aid_certification',
      'agreement',
      'police_clearance',
      'fingerprint_check',
      'background_screening',
      'reference_verification',
      'guard_card',
    ]);

    const normalize = (val: any) => {
      if (val === undefined) return undefined;
      if (val === '' || val === 'NULL') return null;
      return val;
    };

    const toBoolean = (val: any): boolean | null => {
      const s = String(val).toLowerCase();
      if (s === 'true' || s === '1') return true;
      if (s === 'false' || s === '0') return false;
      return null;
    };

    const cleaned: any[] = records.map((row) => {
      const obj: any = {};
      for (const [k, v] of Object.entries(row)) {
        if (allowedKeys.has(k) && k !== 'id') {
          // Handle timestamp columns: use Date if parseable, otherwise omit to let DB defaults apply
          if (timestampKeys.has(k)) {
            const val = normalize(v);
            if (val) {
              const d = new Date(val as any);
              if (!isNaN(d.getTime())) {
                obj[k] = d;
              }
              // else: skip setting to allow defaultNow()
            }
            continue;
          }

          // Handle booleans
          if (booleanKeys.has(k)) {
            const b = toBoolean(v);
            obj[k] = b !== null ? b : null;
            continue;
          }

      obj[k] = normalize(v);
        }
      }
      
      // Post-process employee_id to ensure FSE- format if fss_no is present
      if (obj.fss_no && (!obj.employee_id || obj.employee_id.startsWith('SEC-'))) {
        obj.employee_id = `FSE-${obj.fss_no}`;
      } else if (!obj.employee_id) {
        obj.employee_id = this.generateEmployeeId();
      }

      return obj;
    });

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    const chunkSize = 100;
    for (let i = 0; i < cleaned.length; i += chunkSize) {
      const chunk = cleaned.slice(i, i + chunkSize);
      try {
        const results = await (this.db
          .insert(schema.employees)
          .values(chunk)
          .onConflictDoNothing()
          .returning({ employee_id: schema.employees.employee_id }) as any);
        inserted += results.length;
        skipped += chunk.length - results.length;
      } catch (err: any) {
        this.logger.error(`CSV import chunk failed at index ${i}: ${err?.message}`);
        errors.push(err?.message || 'Unknown error');
      }
    }

    return { processed: cleaned.length, inserted, skipped, errors };
  }

  async getDepartments() {
    // Department field doesn't exist in new schema - return empty array
    return [];
  }

  async getDesignations() {
    // Designation field doesn't exist in new schema - return ranks instead
    const result = await this.db
      .selectDistinct({ rank: schema.employees.rank })
      .from(schema.employees);
    return result.map((r) => r.rank).filter(Boolean);
  }

  async getCategories() {
    // Category field doesn't exist in new schema - return medical categories instead
    const result = await this.db
      .selectDistinct({ medical_category: schema.employees.medical_category })
      .from(schema.employees);
    return result.map((r) => r.medical_category).filter(Boolean);
  }

  async getKpis(query: EmployeeQueryDto) {
    const { search, status, unit, rank, served_in, deployed_at, fss_no, full_name, cnic } = query;

    const filters: SQL[] = [];

    if (status) filters.push(eq(schema.employees.status, status));
    if (unit) filters.push(eq(schema.employees.unit, unit));
    if (rank) filters.push(eq(schema.employees.rank, rank));
    if (served_in) filters.push(eq(schema.employees.served_in, served_in));
    if (deployed_at)
      filters.push(eq(schema.employees.deployed_at, deployed_at));
    
    if (fss_no) filters.push(ilike(schema.employees.fss_no, `%${fss_no}%`));
    if (full_name) filters.push(ilike(schema.employees.full_name, `%${full_name}%`));
    if (cnic) filters.push(or(
        ilike(schema.employees.cnic, `%${cnic}%`),
        ilike(schema.employees.cnic_no, `%${cnic}%`)
    ) as SQL);

    if (search) {
      filters.push(
        or(
          ilike(schema.employees.full_name, `%${search}%`),
          ilike(schema.employees.employee_id, `%${search}%`),
          ilike(schema.employees.cnic, `%${search}%`),
          ilike(schema.employees.cnic_no, `%${search}%`),
          ilike(schema.employees.fss_no, `%${search}%`),
        ),
      );
    }

    const finalFilter = filters.length > 0 ? and(...filters) : undefined;

    // Get total count and status counts using grouping
    const statusResults = await (this.db
      .select({ 
        status: schema.employees.status, 
        count: sql<number>`count(*)` 
      })
      .from(schema.employees)
      .where(finalFilter)
      .groupBy(schema.employees.status) as any);

    const statusCounts: Record<string, number> = {};
    let total = 0;
    
    statusResults.forEach((r: any) => {
      const s = r.status || 'unknown';
      const count = Number(r.count);
      statusCounts[s] = count;
      total += count;
    });

    return {
      total,
      by_status: statusCounts,
    };
  }

  async getActiveAllocatedIds() {
    return [];
  }

  // Documents
  async listDocuments(employee_db_id: number) {
    const employee = await this.findByDbId(employee_db_id);
    return this.db
      .select()
      .from(schema.employeeFiles)
      .where(
        eq(schema.employeeFiles.employee_id, (employee as any).employee_id),
      );
  }

  async uploadDocument(
    employee_db_id: number,
    name: string,
    filename: string,
    fileBuffer?: Buffer,
    mime_type?: string,
    category?: string,
  ) {
    try {
      if (!fileBuffer) {
        throw new Error('File buffer is required');
      }

      const employee = await this.findByDbId(employee_db_id);
      const employeeId = (employee as any).employee_id;

      this.logger.log(`Starting upload for employee ${employeeId}: ${filename}`);
      
      // Upload to Cloud Storage
      const { url } = await this.cloudStorageService.uploadFile(
        fileBuffer,
        filename,
        mime_type || 'application/octet-stream',
        `employees/${employeeId}`,
      );

      this.logger.log(`Cloud upload successful for ${filename}`);

      // If uploading a profile photo, update the employee record directly and skip the document record
      if (category === 'profile_photo') {
        this.logger.log(`Found ${category} upload for employee ${employeeId}. Updating profile_photo directly.`);
        
        // 1. Delete previous cloud file if it exists
        if (employee.profile_photo) {
          const oldKey = this.cloudStorageService.extractKeyFromUrl(employee.profile_photo);
          if (oldKey) {
            this.logger.log(`Deleting old cloud file: ${oldKey}`);
            await this.cloudStorageService.deleteFile(oldKey);
          }
        }

        // 2. Clear out any legacy 'profile_photo' or 'photo' entries in employeeFiles to be safe/clean
        const oldEntries = await this.db
          .select()
          .from(schema.employeeFiles)
          .where(
            and(
              eq(schema.employeeFiles.employee_id, employeeId),
                eq(schema.employeeFiles.category, 'profile_photo'),
            ),
          );
        for (const entry of oldEntries) {
          await this.db.delete(schema.employeeFiles).where(eq(schema.employeeFiles.id, entry.id));
        }

        // 3. Update the employees table with the new URL
        await this.db
          .update(schema.employees)
          .set({ profile_photo: url })
          .where(eq(schema.employees.id, employee_db_id));

        return { file_path: url };
      }

      // Store reference in database for all other documents
      const [result] = await this.db
        .insert(schema.employeeFiles)
        .values({
          employee_id: employeeId,
          category: category || 'general_document',
          filename: name || filename,
          file_path: url, 
          file_type: mime_type,
        })
        .returning();
      
      this.logger.log(`Employee document saved to database: ${filename}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to upload document for employee ${employee_db_id}:`, error);
      throw error;
    }
  }

  async deleteDocument(employee_db_id: number, doc_id: number) {
    await this.db
      .delete(schema.employeeFiles)
      .where(eq(schema.employeeFiles.id, doc_id));
    return { message: 'Document deleted' };
  }

  // Warnings
  async listWarnings(employee_db_id: number) {
    const employee = await this.findByDbId(employee_db_id);
    return this.db
      .select()
      .from(schema.employeeWarnings)
      .where(
        eq(schema.employeeWarnings.employee_id, (employee as any).employee_id),
      );
  }

  async createWarning(employee_db_id: number, createDto: CreateWarningDto) {
    const employee = await this.findByDbId(employee_db_id);
    const [result] = await this.db
      .insert(schema.employeeWarnings)
      .values({
        employee_id: (employee as any).employee_id,
        warning_date:
          (createDto as any).date || new Date().toISOString().split('T')[0],
        subject:
          (createDto as any).subject || `Warning ${createDto.warning_number}`,
        description:
          (createDto as any).description || createDto.notice_text || '',
        issued_by: (createDto as any).issued_by || '',
        warning_number: createDto.warning_number,
      })
      .returning();
    return result;
  }

  async deleteWarning(employee_db_id: number, warning_id: number) {
    await this.db
      .delete(schema.employeeWarnings)
      .where(eq(schema.employeeWarnings.id, warning_id));
    return { message: 'Warning deleted' };
  }

  // Warning Documents
  async listWarningDocuments(warning_id: number) {
    // Get warning documents from employeeFiles table with category 'warning_document'
    return this.db
      .select()
      .from(schema.employeeFiles)
      .where(
        and(
          eq(schema.employeeFiles.sub_category, `warning_${warning_id}`),
          eq(schema.employeeFiles.category, 'warning_document'),
        ),
      );
  }

  async uploadWarningDocument(
    warning_id: number,
    filename: string,
    fileBuffer: Buffer,
    mime_type: string,
  ) {
    try {
      // Get the employee_id from the warning
      const warning = await this.db
        .select()
        .from(schema.employeeWarnings)
        .where(eq(schema.employeeWarnings.id, warning_id))
        .limit(1);
      if (!warning.length) {
        throw new Error('Warning not found');
      }

      const employeeId = warning[0].employee_id;
      const remoteFilePath = `employees/${employeeId}/warnings/${warning_id}/${filename}`;

      this.logger.log(`Uploading warning document to cloud storage: ${filename}`);

      // Upload to Cloud Storage
      const { url } = await this.cloudStorageService.uploadFile(
        fileBuffer,
        filename,
        mime_type,
        `employees/${employeeId}/warnings/${warning_id}`,
      );

      this.logger.log(`Warning document uploaded successfully: ${filename}`);

      // Store reference in database
      const [result] = await this.db
        .insert(schema.employeeFiles)
        .values({
          employee_id: employeeId,
          category: 'warning_document',
          sub_category: `warning_${warning_id}`,
          filename,
          file_path: url,
          file_type: mime_type,
        })
        .returning();
      return result;
    } catch (error) {
      this.logger.error(`Failed to upload warning document: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteWarningDocument(warning_id: number, doc_id: number) {
    await this.db
      .delete(schema.employeeFiles)
      .where(
        and(
          eq(schema.employeeFiles.id, doc_id),
          eq(schema.employeeFiles.sub_category, `warning_${warning_id}`),
          eq(schema.employeeFiles.category, 'warning_document'),
        ),
      );
    return { message: 'Warning document deleted' };
  }

  async fixLegacyEmployeeIds() {
    const allEmployees = await this.db.select().from(schema.employees);
    const updated = [];
    const skipped = [];

    const toFix = allEmployees.filter(emp => {
      if (!emp.fss_no) return false;
      const targetId = `FSE-${emp.fss_no}`;
      return emp.employee_id !== targetId;
    });

    console.log(`[ID MIGRATION] Start: Found ${toFix.length} employees needing ID update out of ${allEmployees.length} total.`);

    for (const emp of toFix) {
      try {
        await this.fixEmployeeIdByDbId(emp.id);
        updated.push({ oldId: emp.employee_id, newId: `FSE-${emp.fss_no}` });
        console.log(`[ID MIGRATION] Successfully updated ${emp.employee_id} -> FSE-${emp.fss_no}`);
      } catch (e) {
        console.error(`[ID MIGRATION] Failed to update ${emp.employee_id}: ${e.message}`);
        skipped.push({ oldId: emp.employee_id, reason: e.message });
      }
    }

    console.log(`[ID MIGRATION] Finished: ${updated.length} updated, ${skipped.length} skipped.`);
    return { updated_count: updated.length, updated, skipped_count: skipped.length, skipped };
  }

  async fixEmployeeIdByDbId(dbId: number) {
    const [emp] = await this.db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, dbId));
    
    if (!emp) throw new NotFoundException(`Employee with DB ID ${dbId} not found`);

    if (!emp.fss_no) throw new Error('Employee has no FSS number');

    const newIdString = `FSE-${emp.fss_no}`;
    const oldIdString = emp.employee_id;

    try {
      await this.db.transaction(async (tx) => {
        // 1. Check if newId already exists
        const [exists] = await tx
          .select()
          .from(schema.employees)
          .where(eq(schema.employees.employee_id, newIdString));
        
        if (exists) {
          throw new Error(`Target ID ${newIdString} already exists`);
        }

        // 2. Clone the employee record with the new ID
        const empToInsert: any = {};
        Object.keys(emp).forEach(key => {
          if (key !== 'id') empToInsert[key] = (emp as any)[key];
        });
        empToInsert.employee_id = newIdString;

        const [newEmp] = await tx.insert(schema.employees).values(empToInsert).returning();
        const newDbId = newEmp.id;

        // 3. Update related records by employee_id (text)
        await tx.update(schema.employeeFiles)
          .set({ employee_id: newIdString })
          .where(eq(schema.employeeFiles.employee_id, oldIdString));
          
        await tx.update(schema.employeeWarnings)
          .set({ employee_id: newIdString })
          .where(eq(schema.employeeWarnings.employee_id, oldIdString));

        await tx.update(schema.attendance)
          .set({ employee_id: newIdString })
          .where(eq(schema.attendance.employee_id, oldIdString));

        await tx.update(schema.leavePeriods)
          .set({ employee_id: newIdString })
          .where(eq(schema.leavePeriods.employee_id, oldIdString));

        await tx.update(schema.payrollPaymentStatus)
          .set({ employee_id: newIdString })
          .where(eq(schema.payrollPaymentStatus.employee_id, oldIdString));

        await tx.update(schema.advances)
          .set({ employee_id: newIdString })
          .where(eq(schema.advances.employee_id, oldIdString));

        // 4. Update related records by id (database serial)
        await tx.update(schema.payrollSheetEntries)
          .set({ employee_db_id: newDbId })
          .where(eq(schema.payrollSheetEntries.employee_db_id, dbId));

        await tx.update(schema.employee_advances)
          .set({ employee_db_id: newDbId })
          .where(eq(schema.employee_advances.employee_db_id, dbId));

        await tx.update(schema.employee_advance_deductions)
          .set({ employee_db_id: newDbId })
          .where(eq(schema.employee_advance_deductions.employee_db_id, dbId));

        // 5. Delete the OLD employee record
        await tx.delete(schema.employees).where(eq(schema.employees.id, dbId));
      });
    } catch (e) {
      console.error(`[COMPREHENSIVE FIX ERROR] ${e.message}`);
      throw e;
    }

    return { success: true, oldId: oldIdString, newId: newIdString };
  }

  async activateAllEmployees() {
    return this.db
      .update(schema.employees)
      .set({ status: 'Active' });
  }

  // Person Status Management
  async getPersonStatuses() {
    const result = await this.db
      .select()
      .from(schema.personStatuses)
      .orderBy(schema.personStatuses.name);
    return result;
  }

  async createPersonStatus(name: string) {
    const [result] = await this.db
      .insert(schema.personStatuses)
      .values({ name })
      .returning();
    return result;
  }

  async updatePersonStatus(id: number, name: string) {
    await this.db
      .update(schema.personStatuses)
      .set({ name })
      .where(eq(schema.personStatuses.id, id));
    const [result] = await this.db
      .select()
      .from(schema.personStatuses)
      .where(eq(schema.personStatuses.id, id));
    return result;
  }

  async deletePersonStatus(id: number) {
    await this.db
      .delete(schema.personStatuses)
      .where(eq(schema.personStatuses.id, id));
    return { message: 'Person status deleted' };
  }
}
