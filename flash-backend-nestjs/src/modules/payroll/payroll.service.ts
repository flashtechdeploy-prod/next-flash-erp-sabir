import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class PayrollService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async getPaymentStatus(month: string, employeeId: string) {
    const [status] = await this.db
      .select()
      .from(schema.payrollPaymentStatus)
      .where(
        and(
          eq(schema.payrollPaymentStatus.month, month),
          eq(schema.payrollPaymentStatus.employee_id, employeeId),
        ),
      );
    return status || { employee_id: employeeId, month, status: 'unpaid' };
  }

  async getAllPaymentStatuses(month: string) {
    const statuses = await this.db
      .select()
      .from(schema.payrollPaymentStatus)
      .where(eq(schema.payrollPaymentStatus.month, month));
    
    return {
      month,
      statuses,
      count: statuses.length,
    };
  }

  async upsertPaymentStatus(dto: {
    month: string;
    employee_id: string;
    status: string;
  }) {
    const [existing] = await this.db
      .select()
      .from(schema.payrollPaymentStatus)
      .where(
        and(
          eq(schema.payrollPaymentStatus.month, dto.month),
          eq(schema.payrollPaymentStatus.employee_id, dto.employee_id),
        ),
      );

    if (existing) {
      await this.db
        .update(schema.payrollPaymentStatus)
        .set({ status: dto.status })
        .where(eq(schema.payrollPaymentStatus.id, (existing as { id: number }).id));
    } else {
      await this.db.insert(schema.payrollPaymentStatus).values({
        employee_id: dto.employee_id,
        month: dto.month,
        status: dto.status,
      });
    }
    return this.getPaymentStatus(dto.month, dto.employee_id);
  }

  async bulkUpdatePaymentStatus(dto: {
    month: string;
    employee_ids: string[];
    status: string;
  }) {
    let updated = 0;
    
    for (const employeeId of dto.employee_ids) {
      await this.upsertPaymentStatus({
        month: dto.month,
        employee_id: employeeId,
        status: dto.status,
      });
      updated++;
    }
    
    return {
      month: dto.month,
      status: dto.status,
      updated,
      message: `Updated ${updated} payment statuses to ${dto.status}`,
    };
  }

  async getReport(month: string) {
    // Get all employees and their attendance for the month
    const employees = await this.db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.status, 'Active'));

    const paymentStatuses = await this.getAllPaymentStatuses(month);
    const statusMap = new Map(
      paymentStatuses.statuses.map(s => [s.employee_id, s.status])
    );

    const rows = employees.map(emp => ({
      employee_id: emp.employee_id,
      full_name: emp.full_name,
      department: emp.department,
      payment_status: statusMap.get(emp.employee_id) || 'unpaid',
    }));

    return {
      month,
      summary: { 
        month, 
        employees: employees.length, 
        paid: rows.filter(r => r.payment_status === 'paid').length,
        unpaid: rows.filter(r => r.payment_status === 'unpaid').length,
      },
      rows,
    };
  }

  async getRangeReport(fromDate: string, toDate: string, month?: string) {
    return { from_date: fromDate, to_date: toDate, month, rows: [] };
  }

  async listSheetEntries(fromDate: string, toDate: string) {
    return this.db
      .select()
      .from(schema.payrollSheetEntries)
      .where(
        and(
          eq(schema.payrollSheetEntries.from_date, fromDate),
          eq(schema.payrollSheetEntries.to_date, toDate),
        ),
      );
  }

  async bulkUpsertSheetEntries(dto: {
    from_date: string;
    to_date: string;
    entries: Array<{
      employee_db_id: number;
      pre_days_override?: number;
      cur_days_override?: number;
      leave_encashment_days?: number;
      allow_other?: number;
      eobi?: number;
      tax?: number;
      fine_adv_extra?: number;
      ot_rate_override?: number;
      ot_amount_override?: number;
      remarks?: string;
      bank_cash?: string;
    }>;
  }) {
    let upserted = 0;
    for (const entry of dto.entries) {
      const [existing] = await this.db
        .select()
        .from(schema.payrollSheetEntries)
        .where(
          and(
            eq(schema.payrollSheetEntries.employee_db_id, entry.employee_db_id),
            eq(schema.payrollSheetEntries.from_date, dto.from_date),
            eq(schema.payrollSheetEntries.to_date, dto.to_date),
          ),
        );

      if (existing) {
        // For update, only include fields that are explicitly provided
        const updateData: Record<string, any> = {};
        if (entry.pre_days_override !== undefined) updateData.pre_days_override = entry.pre_days_override;
        if (entry.cur_days_override !== undefined) updateData.cur_days_override = entry.cur_days_override;
        if (entry.leave_encashment_days !== undefined) updateData.leave_encashment_days = entry.leave_encashment_days;
        if (entry.allow_other !== undefined) updateData.allow_other = entry.allow_other;
        if (entry.eobi !== undefined) updateData.eobi = entry.eobi;
        if (entry.tax !== undefined) updateData.tax = entry.tax;
        if (entry.fine_adv_extra !== undefined) updateData.fine_adv_extra = entry.fine_adv_extra;
        if (entry.ot_rate_override !== undefined) updateData.ot_rate_override = entry.ot_rate_override;
        if (entry.ot_amount_override !== undefined) updateData.ot_amount_override = entry.ot_amount_override;
        if (entry.remarks !== undefined) updateData.remarks = entry.remarks;
        if (entry.bank_cash !== undefined) updateData.bank_cash = entry.bank_cash;

        await this.db
          .update(schema.payrollSheetEntries)
          .set(updateData)
          .where(eq(schema.payrollSheetEntries.id, (existing as { id: number }).id));
      } else {
        // For insert, include all fields
        const insertData = {
          employee_db_id: entry.employee_db_id,
          from_date: dto.from_date,
          to_date: dto.to_date,
          pre_days_override: entry.pre_days_override,
          cur_days_override: entry.cur_days_override,
          leave_encashment_days: entry.leave_encashment_days,
          allow_other: entry.allow_other,
          eobi: entry.eobi,
          tax: entry.tax,
          fine_adv_extra: entry.fine_adv_extra,
          ot_rate_override: entry.ot_rate_override,
          ot_amount_override: entry.ot_amount_override,
          remarks: entry.remarks,
          bank_cash: entry.bank_cash,
        };
        await this.db.insert(schema.payrollSheetEntries).values(insertData);
      }
      upserted++;
    }
    return { upserted };
  }

  async exportPdf(_query: Record<string, unknown>, _body: Record<string, unknown>) {
    return {
      message: 'PDF export logic would go here',
      timestamp: new Date().toISOString(),
      report_type: 'payroll_summary',
    };
  }
}
