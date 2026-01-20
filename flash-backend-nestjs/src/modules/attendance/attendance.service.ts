import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, between, asc, desc } from 'drizzle-orm';

interface AttendanceRecord {
  employee_id: string;
  status: string;
  note?: string | null;
  overtime_minutes?: number | null;
  overtime_rate?: number | null;
  late_minutes?: number | null;
  late_deduction?: number | null;
  leave_type?: string | null;
  fine_amount?: number | null;
}

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async findByDate(date: string) {
    try {
      const records = await this.db
        .select({
          id: schema.attendance.id,
          employee_id: schema.attendance.employee_id,
          fss_id: schema.employees.fss_number,
          employee_name: schema.employees.full_name,
          date: schema.attendance.date,
          status: schema.attendance.status,
          note: schema.attendance.note,
          overtime_minutes: schema.attendance.overtime_minutes,
          overtime_rate: schema.attendance.overtime_rate,
          late_minutes: schema.attendance.late_minutes,
          late_deduction: schema.attendance.late_deduction,
          leave_type: schema.attendance.leave_type,
          fine_amount: schema.attendance.fine_amount,
          created_at: schema.attendance.created_at,
        })
        .from(schema.attendance)
        .leftJoin(schema.employees, eq(schema.attendance.employee_id, schema.employees.employee_id))
        .where(eq(schema.attendance.date, date))
        .orderBy(asc(schema.attendance.employee_id));
      
      return { date, records, count: records.length };
    } catch (error) {
      console.error('Error fetching attendance by date:', error);
      throw error;
    }
  }

  async findByRange(fromDate: string, toDate: string) {
    try {
      const records = await this.db
        .select({
          id: schema.attendance.id,
          employee_id: schema.attendance.employee_id,
          fss_id: schema.employees.fss_number,
          employee_name: schema.employees.full_name,
          date: schema.attendance.date,
          status: schema.attendance.status,
          note: schema.attendance.note,
          overtime_minutes: schema.attendance.overtime_minutes,
          overtime_rate: schema.attendance.overtime_rate,
          late_minutes: schema.attendance.late_minutes,
          late_deduction: schema.attendance.late_deduction,
          leave_type: schema.attendance.leave_type,
          fine_amount: schema.attendance.fine_amount,
          created_at: schema.attendance.created_at,
        })
        .from(schema.attendance)
        .leftJoin(schema.employees, eq(schema.attendance.employee_id, schema.employees.employee_id))
        .where(between(schema.attendance.date, fromDate, toDate))
        .orderBy(asc(schema.attendance.date), asc(schema.attendance.employee_id));
      
      return records;
    } catch (error) {
      console.error('Error fetching attendance by range:', error);
      throw error;
    }
  }

  async findByEmployee(employeeId: string, fromDate: string, toDate: string) {
    try {
      const records = await this.db
        .select({
          id: schema.attendance.id,
          employee_id: schema.attendance.employee_id,
          fss_id: schema.employees.fss_number,
          employee_name: schema.employees.full_name,
          date: schema.attendance.date,
          status: schema.attendance.status,
          note: schema.attendance.note,
          overtime_minutes: schema.attendance.overtime_minutes,
          overtime_rate: schema.attendance.overtime_rate,
          late_minutes: schema.attendance.late_minutes,
          late_deduction: schema.attendance.late_deduction,
          leave_type: schema.attendance.leave_type,
          fine_amount: schema.attendance.fine_amount,
          created_at: schema.attendance.created_at,
        })
        .from(schema.attendance)
        .leftJoin(schema.employees, eq(schema.attendance.employee_id, schema.employees.employee_id))
        .where(
          and(
            eq(schema.attendance.employee_id, employeeId),
            between(schema.attendance.date, fromDate, toDate),
          ),
        )
        .orderBy(desc(schema.attendance.date));
      
      return records;
    } catch (error) {
      console.error('Error fetching attendance by employee:', error);
      throw error;
    }
  }

  async bulkUpsert(date: string, records: AttendanceRecord[]) {
    let upserted = 0;
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    const leaveRecords: { employee_id: string; date: string; leave_type: string; note?: string | null }[] = [];

    for (const record of records) {
      try {
        // Check if record exists
        const [existing] = await this.db
          .select({ id: schema.attendance.id })
          .from(schema.attendance)
          .where(
            and(
              eq(schema.attendance.employee_id, record.employee_id),
              eq(schema.attendance.date, date),
            ),
          );

        const data = {
          employee_id: record.employee_id,
          date: date,
          status: record.status,
          note: record.note || null,
          overtime_minutes: record.overtime_minutes || null,
          overtime_rate: record.overtime_rate || null,
          late_minutes: record.late_minutes || null,
          late_deduction: record.late_deduction || null,
          leave_type: record.leave_type || null,
          fine_amount: record.fine_amount || null,
        };

        if (existing) {
          await this.db
            .update(schema.attendance)
            .set(data)
            .where(eq(schema.attendance.id, existing.id));
          updated++;
        } else {
          await this.db.insert(schema.attendance).values(data);
          created++;
        }
        upserted++;

        // Collect leave records for automatic leave period creation
        if (record.status === 'leave' && record.leave_type) {
          leaveRecords.push({
            employee_id: record.employee_id,
            date: date,
            leave_type: record.leave_type,
            note: record.note,
          });
        }
      } catch (error) {
        console.error(`Error upserting attendance for ${record.employee_id}:`, error);
        errors.push(`Failed to save attendance for ${record.employee_id}`);
      }
    }

    // Auto-create leave periods for leave attendance
    if (leaveRecords.length > 0) {
      try {
        await this.autoCreateLeavePeriods(leaveRecords);
      } catch (error) {
        console.error('Error auto-creating leave periods:', error);
      }
    }

    return { 
      success: errors.length === 0,
      upserted, 
      created, 
      updated,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Automatically create or extend leave periods based on attendance
   * Groups consecutive leave days into single leave periods
   */
  private async autoCreateLeavePeriods(leaveRecords: { employee_id: string; date: string; leave_type: string; note?: string | null }[]) {
    for (const leave of leaveRecords) {
      const currentDate = leave.date;
      const employeeId = leave.employee_id;
      const leaveType = leave.leave_type;

      try {
        // Check if there's an existing leave period that can be extended
        // Look for leave periods ending yesterday or starting tomorrow
        const yesterday = new Date(currentDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const tomorrow = new Date(currentDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Find leave period ending yesterday (extend forward)
        const [extendForward] = await this.db
          .select()
          .from(schema.leavePeriods)
          .where(
            and(
              eq(schema.leavePeriods.employee_id, employeeId),
              eq(schema.leavePeriods.to_date, yesterdayStr),
              eq(schema.leavePeriods.leave_type, leaveType),
            ),
          );

        // Find leave period starting tomorrow (extend backward)
        const [extendBackward] = await this.db
          .select()
          .from(schema.leavePeriods)
          .where(
            and(
              eq(schema.leavePeriods.employee_id, employeeId),
              eq(schema.leavePeriods.from_date, tomorrowStr),
              eq(schema.leavePeriods.leave_type, leaveType),
            ),
          );

        if (extendForward) {
          // Extend the leave period forward
          await this.db
            .update(schema.leavePeriods)
            .set({ to_date: currentDate })
            .where(eq(schema.leavePeriods.id, extendForward.id));
        } else if (extendBackward) {
          // Extend the leave period backward
          await this.db
            .update(schema.leavePeriods)
            .set({ from_date: currentDate })
            .where(eq(schema.leavePeriods.id, extendBackward.id));
        } else {
          // Check if leave period already exists for this exact date
          const [existing] = await this.db
            .select()
            .from(schema.leavePeriods)
            .where(
              and(
                eq(schema.leavePeriods.employee_id, employeeId),
                eq(schema.leavePeriods.from_date, currentDate),
                eq(schema.leavePeriods.to_date, currentDate),
              ),
            );

          if (!existing) {
            // Create new single-day leave period
            await this.db.insert(schema.leavePeriods).values({
              employee_id: employeeId,
              from_date: currentDate,
              to_date: currentDate,
              leave_type: leaveType,
              reason: leave.note || `Auto-created from attendance (${leaveType})`,
            });
          }
        }
      } catch (error) {
        console.error(`Error creating leave period for ${employeeId}:`, error);
      }
    }
  }

  async getSummary(
    fromDate: string,
    toDate: string,
    _query: { department?: string; designation?: string },
  ) {
    try {
      const records = await this.findByRange(fromDate, toDate);

      const summary = {
        from_date: fromDate,
        to_date: toDate,
        total_records: records.length,
        by_status: {} as Record<string, number>,
      };

      records.forEach((r) => {
        summary.by_status[r.status] = (summary.by_status[r.status] || 0) + 1;
      });

      return summary;
    } catch (error) {
      console.error('Error getting attendance summary:', error);
      throw error;
    }
  }

  /**
   * Get attendance with employee details for a specific date
   */
  async getAttendanceWithEmployees(date: string) {
    try {
      const records = await this.db
        .select({
          id: schema.attendance.id,
          employee_id: schema.attendance.employee_id,
          employee_name: schema.employees.full_name,
          department: schema.employees.department,
          designation: schema.employees.designation,
          date: schema.attendance.date,
          status: schema.attendance.status,
          note: schema.attendance.note,
          overtime_minutes: schema.attendance.overtime_minutes,
          late_minutes: schema.attendance.late_minutes,
          fine_amount: schema.attendance.fine_amount,
          leave_type: schema.attendance.leave_type,
        })
        .from(schema.attendance)
        .leftJoin(schema.employees, eq(schema.attendance.employee_id, schema.employees.employee_id))
        .where(eq(schema.attendance.date, date))
        .orderBy(asc(schema.employees.full_name));

      return { date, records, count: records.length };
    } catch (error) {
      console.error('Error fetching attendance with employees:', error);
      throw error;
    }
  }
}
