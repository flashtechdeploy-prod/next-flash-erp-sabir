import { Inject, Injectable } from '@nestjs/common';
import { and, asc, between, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CloudStorageService } from '../../common/storage/cloud-storage.service';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';

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
  location?: string | null;
  initial_location?: string | null;
  picture?: string | null;
  check_in?: string | null;
  check_in_date?: string | null;
  check_out?: string | null;
  check_out_date?: string | null;
  check_out_picture?: string | null;
  check_out_location?: string | null;
  overtime_in?: string | null;
  overtime_in_date?: string | null;
  overtime_in_picture?: string | null;
  overtime_in_location?: string | null;
  overtime_out?: string | null;
  overtime_out_date?: string | null;
  overtime_out_picture?: string | null;
  overtime_out_location?: string | null;
}

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
    private cloudStorageService: CloudStorageService,
  ) {}

  private calculateMinutesBetween(
    startTime?: string | null,
    startDate?: string | null,
    endTime?: string | null,
    endDate?: string | null,
  ): number | null {
    if (!startTime || !endTime) return null;
    
    try {
      // Use provided date or fallback to a dummy date if missing
      const startD = startDate || '2000-01-01';
      const endD = endDate || startD;
      
      const start = new Date(`${startD}T${startTime}`);
      const end = new Date(`${endD}T${endTime}`);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      
      let diffMs = end.getTime() - start.getTime();
      
      // If diff is negative but dates are same, it likely crosses midnight (e.g. 20:00 to 06:00)
      if (diffMs < 0 && startD === endD) {
          const crossDayEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);
          diffMs = crossDayEnd.getTime() - start.getTime();
      }
      
      const diffMins = Math.round(diffMs / (1000 * 60));
      return diffMins > 0 ? diffMins : 0;
    } catch (e) {
      return null;
    }
  }

  async findByDate(date: string) {
    try {
      const records = await this.db
        .select({
          id: schema.attendance.id,
          employee_id: schema.attendance.employee_id,
          fss_id: schema.employees.fss_no,
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
          location: schema.attendance.location,
          initial_location: schema.attendance.initial_location,
          picture: schema.attendance.picture,
          check_in: schema.attendance.check_in,
          check_in_date: schema.attendance.check_in_date,
          check_out: schema.attendance.check_out,
          check_out_date: schema.attendance.check_out_date,
          check_out_picture: schema.attendance.check_out_picture,
          check_out_location: schema.attendance.check_out_location,
          overtime_in: schema.attendance.overtime_in,
          overtime_in_date: schema.attendance.overtime_in_date,
          overtime_in_picture: schema.attendance.overtime_in_picture,
          overtime_in_location: schema.attendance.overtime_in_location,
          overtime_out: schema.attendance.overtime_out,
          overtime_out_date: schema.attendance.overtime_out_date,
          overtime_out_picture: schema.attendance.overtime_out_picture,
          overtime_out_location: schema.attendance.overtime_out_location,
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
          date: schema.attendance.date,
          status: schema.attendance.status,
          note: schema.attendance.note,
          overtime_minutes: schema.attendance.overtime_minutes,
          overtime_rate: schema.attendance.overtime_rate,
          late_minutes: schema.attendance.late_minutes,
          late_deduction: schema.attendance.late_deduction,
          leave_type: schema.attendance.leave_type,
          fine_amount: schema.attendance.fine_amount,
          overtime_in: schema.attendance.overtime_in,
          overtime_in_date: schema.attendance.overtime_in_date,
          overtime_out: schema.attendance.overtime_out,
          overtime_out_date: schema.attendance.overtime_out_date,
          created_at: schema.attendance.created_at,
        })
        .from(schema.attendance)
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
          fss_id: schema.employees.fss_no,
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
          location: schema.attendance.location,
          initial_location: schema.attendance.initial_location,
          picture: schema.attendance.picture,
          check_in: schema.attendance.check_in,
          check_in_date: schema.attendance.check_in_date,
          check_out: schema.attendance.check_out,
          check_out_date: schema.attendance.check_out_date,
          check_out_picture: schema.attendance.check_out_picture,
          check_out_location: schema.attendance.check_out_location,
          overtime_in: schema.attendance.overtime_in,
          overtime_in_date: schema.attendance.overtime_in_date,
          overtime_in_picture: schema.attendance.overtime_in_picture,
          overtime_in_location: schema.attendance.overtime_in_location,
          overtime_out: schema.attendance.overtime_out,
          overtime_out_date: schema.attendance.overtime_out_date,
          overtime_out_picture: schema.attendance.overtime_out_picture,
          overtime_out_location: schema.attendance.overtime_out_location,
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
          .select()
          .from(schema.attendance)
          .where(
            and(
              eq(schema.attendance.employee_id, record.employee_id),
              eq(schema.attendance.date, date),
            ),
          );

        console.log(`[bulkUpsert] Employee: ${record.employee_id}, Date: ${date}, Existing: ${existing?.id || 'NO'}`);

        // Construct update object with existing data as fallback to prevent null wipes
        const data: any = {
          employee_id: record.employee_id,
          date: date,
          status: record.status || existing?.status || 'present',
          updated_at: new Date(),
        };

        // Helper to safely set fields (only if provided in record, else preserve existing)
        const setField = (key: string, val: any, existingVal: any) => {
           if (val !== undefined && val !== null) data[key] = val;
           else if (existingVal !== undefined && existingVal !== null) data[key] = existingVal;
        };

        setField('note', record.note, existing?.note);
        setField('overtime_minutes', record.overtime_minutes, existing?.overtime_minutes);
        setField('overtime_rate', record.overtime_rate, existing?.overtime_rate);
        setField('late_minutes', record.late_minutes, existing?.late_minutes);
        setField('late_deduction', record.late_deduction, existing?.late_deduction);
        setField('leave_type', record.leave_type, existing?.leave_type);
        setField('fine_amount', record.fine_amount, existing?.fine_amount);
        setField('location', record.location, existing?.location);
        setField('initial_location', record.initial_location, existing?.initial_location);
        setField('picture', record.picture, existing?.picture);
        setField('check_in', record.check_in, existing?.check_in);
        setField('check_in_date', record.check_in_date, existing?.check_in_date);
        setField('check_out', record.check_out, existing?.check_out);
        setField('check_out_date', record.check_out_date, existing?.check_out_date);
        setField('check_out_picture', record.check_out_picture, existing?.check_out_picture);
        setField('check_out_location', record.check_out_location, existing?.check_out_location);
        setField('overtime_in', record.overtime_in, existing?.overtime_in);
        setField('overtime_in_date', record.overtime_in_date, existing?.overtime_in_date);
        setField('overtime_in_picture', record.overtime_in_picture, existing?.overtime_in_picture);
        setField('overtime_in_location', record.overtime_in_location, existing?.overtime_in_location);
        setField('overtime_out', record.overtime_out, existing?.overtime_out);
        setField('overtime_out_date', record.overtime_out_date, existing?.overtime_out_date);
        setField('overtime_out_picture', record.overtime_out_picture, existing?.overtime_out_picture);
        setField('overtime_out_location', record.overtime_out_location, existing?.overtime_out_location);

        if (existing) {
          const res = await this.db
            .update(schema.attendance)
            .set(data)
            .where(eq(schema.attendance.id, existing.id));
          console.log(`[bulkUpsert] Update result for ${record.employee_id}: SUCCESS`);
          updated++;
        } else {
          const res = await this.db.insert(schema.attendance).values(data);
          console.log(`[bulkUpsert] Insert result for ${record.employee_id}: SUCCESS`);
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
          fss_id: schema.employees.fss_no,
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
          location: schema.attendance.location,
          initial_location: schema.attendance.initial_location,
          picture: schema.attendance.picture,
          check_in: schema.attendance.check_in,
          check_in_date: schema.attendance.check_in_date,
          check_out: schema.attendance.check_out,
          check_out_date: schema.attendance.check_out_date,
          check_out_picture: schema.attendance.check_out_picture,
          check_out_location: schema.attendance.check_out_location,
          overtime_in: schema.attendance.overtime_in,
          overtime_in_date: schema.attendance.overtime_in_date,
          overtime_in_picture: schema.attendance.overtime_in_picture,
          overtime_in_location: schema.attendance.overtime_in_location,
          overtime_out: schema.attendance.overtime_out,
          overtime_out_date: schema.attendance.overtime_out_date,
          overtime_out_picture: schema.attendance.overtime_out_picture,
          overtime_out_location: schema.attendance.overtime_out_location,
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

  /**
   */
  async markSelf(employeeId: string, date: string, record: AttendanceRecord, file?: Express.Multer.File, type: string = 'check_in') {
    try {
      const normalizedType = (type || 'check_in').toLowerCase();
      
      // Autoritative Pakistan Timezone Helpers
      const now = new Date();
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(now);
      const timeStr = new Intl.DateTimeFormat('en-GB', { 
          timeZone: 'Asia/Karachi', 
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
      }).format(now);

      console.log(`[markSelf] Processing ${normalizedType} for ID=${employeeId}, Date=${dateStr}, Time=${timeStr}`);

      let pictureUrl = record.picture;
      if (file) {
        // Force type subfolder to be consistent with normalized type
        const uploadResult = await this.cloudStorageService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          `attendance/${normalizedType}`
        );
        pictureUrl = uploadResult.url;
        console.log(`[markSelf] ${normalizedType} picture uploaded: ${pictureUrl}`);
      }

      // Find existing record for this employee and date
      const [existing] = await this.db
        .select()
        .from(schema.attendance)
        .where(
          and(
            eq(schema.attendance.employee_id, employeeId),
            eq(schema.attendance.date, dateStr),
          ),
        );

      // Start with existing data to prevent inadvertent wipes if we update only some fields
      const data: any = {
        employee_id: employeeId,
        date: dateStr,
        status: record.status || existing?.status || 'present',
        updated_at: now,
      };

      // Map fields based on logic type
      const submissionLoc = record.location;
      const selfieLoc = record.initial_location || submissionLoc;

      if (normalizedType === 'check_in') {
          data.check_in = timeStr;
          data.check_in_date = dateStr;
          data.picture = pictureUrl;
          if (submissionLoc) data.location = submissionLoc;
          if (selfieLoc) data.initial_location = selfieLoc;
      } else if (normalizedType === 'check_out') {
          data.check_out = timeStr;
          data.check_out_date = dateStr;
          data.check_out_picture = pictureUrl;
          if (submissionLoc) data.check_out_location = submissionLoc;
      } else if (normalizedType === 'overtime_in') {
          data.overtime_in = timeStr;
          data.overtime_in_date = dateStr;
          data.overtime_in_picture = pictureUrl;
          if (submissionLoc) data.overtime_in_location = submissionLoc;
      } else if (normalizedType === 'overtime_out') {
          data.overtime_out = timeStr;
          data.overtime_out_date = dateStr;
          data.overtime_out_picture = pictureUrl;
          if (submissionLoc) data.overtime_out_location = submissionLoc;

          // Auto-calculate overtime minutes
          const otIn = data.overtime_in || existing?.overtime_in;
          const otInDate = data.overtime_in_date || existing?.overtime_in_date;
          if (otIn) {
              const mins = this.calculateMinutesBetween(otIn, otInDate, timeStr, dateStr);
              if (mins !== null) data.overtime_minutes = mins;
          }
      }

      // Note and Leave logic
      if (record.note) data.note = record.note;
      if (record.leave_type) data.leave_type = record.leave_type;

      console.log(`[markSelf] DB Payload for ${normalizedType}:`, JSON.stringify(data, null, 2));

      if (existing) {
        await this.db.update(schema.attendance)
          .set(data)
          .where(eq(schema.attendance.id, existing.id));
      } else {
        await this.db.insert(schema.attendance).values(data);
      }

      // Auto-create leave periods if status is leave
      if (data.status === 'leave' && data.leave_type) {
        await this.autoCreateLeavePeriods([{
          employee_id: employeeId,
          date: dateStr,
          leave_type: data.leave_type,
          note: data.note,
        }]);
      }

      // Fetch the definitive record to return (using desc ID to ensure latest if duplicates exist)
      const [finalRecord] = await this.db
        .select()
        .from(schema.attendance)
        .where(
          and(
            eq(schema.attendance.employee_id, employeeId),
            eq(schema.attendance.date, dateStr),
          ),
        )
        .orderBy(desc(schema.attendance.id))
        .limit(1);

      return finalRecord;
    } catch (error) {
      console.error(`Error marking self attendance for ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get attendance for a specific employee on a specific date
   */
  async getEmployeeStatus(employeeId: string, date: string) {
    const [record] = await this.db
      .select({
        id: schema.attendance.id,
        employee_id: schema.attendance.employee_id,
        date: schema.attendance.date,
        status: schema.attendance.status,
        note: schema.attendance.note,
        location: schema.attendance.location,
        initial_location: schema.attendance.initial_location,
        picture: schema.attendance.picture,
        check_in: schema.attendance.check_in,
        check_in_date: schema.attendance.check_in_date,
        check_out: schema.attendance.check_out,
        check_out_date: schema.attendance.check_out_date,
        check_out_picture: schema.attendance.check_out_picture,
        check_out_location: schema.attendance.check_out_location,
        overtime_in: schema.attendance.overtime_in,
        overtime_in_date: schema.attendance.overtime_in_date,
        overtime_in_picture: schema.attendance.overtime_in_picture,
        overtime_in_location: schema.attendance.overtime_in_location,
        overtime_out: schema.attendance.overtime_out,
        overtime_out_date: schema.attendance.overtime_out_date,
        overtime_out_picture: schema.attendance.overtime_out_picture,
        overtime_out_location: schema.attendance.overtime_out_location,
        created_at: schema.attendance.created_at,
      })
      .from(schema.attendance)
      .where(
        and(
          eq(schema.attendance.employee_id, employeeId),
          eq(schema.attendance.date, date),
        ),
      );
    return record || null;
  }

  /**
   * Get attendance statistics for an employee for the current month
   */
  async getEmployeeStats(employeeId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const records = await this.db
      .select({
        status: schema.attendance.status,
      })
      .from(schema.attendance)
      .where(
        and(
          eq(schema.attendance.employee_id, employeeId),
          between(schema.attendance.date, startOfMonth, endOfMonth),
        ),
      );

    const stats = {
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
    };

    records.forEach((r) => {
      if (r.status in stats) {
        stats[r.status as keyof typeof stats]++;
      }
    });

    return stats;
  }

  /**
   * Get attendance history for an employee
   */
  async getEmployeeHistory(employeeId: string, limit = 30) {
    return this.db
      .select({
        id: schema.attendance.id,
        employee_id: schema.attendance.employee_id,
        date: schema.attendance.date,
        status: schema.attendance.status,
        note: schema.attendance.note,
        location: schema.attendance.location,
        initial_location: schema.attendance.initial_location,
        picture: schema.attendance.picture,
        check_in: schema.attendance.check_in,
        check_in_date: schema.attendance.check_in_date,
        check_out: schema.attendance.check_out,
        check_out_date: schema.attendance.check_out_date,
        check_out_picture: schema.attendance.check_out_picture,
        check_out_location: schema.attendance.check_out_location,
        overtime_in: schema.attendance.overtime_in,
        overtime_in_date: schema.attendance.overtime_in_date,
        overtime_in_picture: schema.attendance.overtime_in_picture,
        overtime_in_location: schema.attendance.overtime_in_location,
        overtime_out: schema.attendance.overtime_out,
        overtime_out_date: schema.attendance.overtime_out_date,
        overtime_out_picture: schema.attendance.overtime_out_picture,
        overtime_out_location: schema.attendance.overtime_out_location,
        created_at: schema.attendance.created_at,
      })
      .from(schema.attendance)
      .where(eq(schema.attendance.employee_id, employeeId))
      .orderBy(desc(schema.attendance.date), desc(schema.attendance.created_at))
      .limit(limit);
  }

  /**
   * Optimized full day sheet for admin dashboard
   * Joins active employees with attendance for a specific date
   */
  async getFullDaySheet(date: string) {
    try {
      console.log(`[getFullDaySheet] Fetching for date: ${date}`);
      const records = await this.db
        .select({
          employee_id: schema.employees.employee_id,
          employee_name: schema.employees.full_name,
          fss_id: schema.employees.fss_no,
          // Attendance fields (using attendance table if entry exists)
          id: schema.attendance.id,
          status: schema.attendance.status,
          note: schema.attendance.note,
          overtime_minutes: schema.attendance.overtime_minutes,
          late_minutes: schema.attendance.late_minutes,
          fine_amount: schema.attendance.fine_amount,
          leave_type: schema.attendance.leave_type,
          location: schema.attendance.location,
          initial_location: schema.attendance.initial_location,
          picture: schema.attendance.picture,
          check_in: schema.attendance.check_in,
          check_in_date: schema.attendance.check_in_date,
          check_out: schema.attendance.check_out,
          check_out_date: schema.attendance.check_out_date,
          check_out_picture: schema.attendance.check_out_picture,
          check_out_location: schema.attendance.check_out_location,
          overtime_in: schema.attendance.overtime_in,
          overtime_in_date: schema.attendance.overtime_in_date,
          overtime_in_picture: schema.attendance.overtime_in_picture,
          overtime_in_location: schema.attendance.overtime_in_location,
          overtime_out: schema.attendance.overtime_out,
          overtime_out_date: schema.attendance.overtime_out_date,
          overtime_out_picture: schema.attendance.overtime_out_picture,
          overtime_out_location: schema.attendance.overtime_out_location,
          date: sql<string>`${date}`,
        })
        .from(schema.employees)
        .leftJoin(
          schema.attendance,
          and(
            eq(schema.employees.employee_id, schema.attendance.employee_id),
            eq(schema.attendance.date, date),
          ),
        )
        .orderBy(desc(sql`CAST(NULLIF(${schema.employees.fss_no}, '') AS INTEGER)`));

      const markedCount = records.filter(r => r.status && r.status !== 'unmarked').length;
      console.log(`[getFullDaySheet] Total records: ${records.length}, Marked: ${markedCount}`);
      if (markedCount > 0) {
        console.log(`[getFullDaySheet] First marked record:`, JSON.stringify(records.find(r => r.status && r.status !== 'unmarked')));
      }

      return records;
    } catch (error) {
      console.error('Error fetching full day sheet:', error);
      throw error;
    }
  }
}
