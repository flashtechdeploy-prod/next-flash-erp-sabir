import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, like, or, and, sql, desc, SQL } from 'drizzle-orm';
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

  private generateEmployeeId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SEC-${timestamp}${random}`;
  }

  async findAll(query: EmployeeQueryDto) {
    const skip = Number(query.skip) || 0;
    const limit = Number(query.limit) || 100;
    const { search, status, unit, rank, deployed_at, with_total } = query;

    const filters: SQL[] = [];

    if (status) filters.push(eq(schema.employees.status, status));
    if (unit) filters.push(eq(schema.employees.unit, unit));
    if (rank) filters.push(eq(schema.employees.rank, rank));
    if (deployed_at)
      filters.push(eq(schema.employees.deployed_at, deployed_at));

    if (search) {
      filters.push(
        or(
          like(schema.employees.full_name, `%${search}%`),
          like(schema.employees.employee_id, `%${search}%`),
          like(schema.employees.cnic, `%${search}%`),
          like(schema.employees.phone, `%${search}%`),
        ) as SQL,
      );
    }

    const finalFilter = filters.length > 0 ? and(...filters) : undefined;

    const employees = await (
      this.db.select().from(schema.employees).where(finalFilter) as any
    )
      .limit(limit)
      .offset(skip)
      .orderBy(desc(schema.employees.id));

    if (with_total) {
      const results = await (this.db
        .select({ count: sql`count(*)` })
        .from(schema.employees)
        .where(finalFilter) as any);
      const count = Number(results[0]?.count || 0);
      return { employees, total: count };
    }

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
    return employee;
  }

  async create(createDto: CreateEmployeeDto) {
    const data: any = {
      ...createDto,
      employee_id: this.generateEmployeeId(),
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

    const data: any = { ...updateDto };
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
    await this.findOne(employee_id);
    await this.db
      .delete(schema.employees)
      .where(eq(schema.employees.employee_id, employee_id));
    return { message: `Employee ${employee_id} deleted successfully` };
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
    const { employees, total } = await this.findAll({
      ...query,
      with_total: true,
    });

    const statusCounts: Record<string, number> = {};
    const departmentCounts: Record<string, number> = {};

    employees.forEach((emp) => {
      const status = emp.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      if (emp.department) {
        departmentCounts[emp.department] =
          (departmentCounts[emp.department] || 0) + 1;
      }
    });

    return {
      total,
      by_status: statusCounts,
      by_department: departmentCounts,
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

      // Create remote file path
      const remoteFilePath = `employees/${employeeId}/${filename}`;
      
      this.logger.log(`Starting upload for employee ${employeeId}: ${filename}`);
      
      // Upload to Cloud Storage
      const { url } = await this.cloudStorageService.uploadFile(
        fileBuffer,
        filename,
        mime_type || 'application/octet-stream',
        `employees/${employeeId}`,
      );

      this.logger.log(`Cloud upload successful for ${filename}`);

      // Store reference in database
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
}
