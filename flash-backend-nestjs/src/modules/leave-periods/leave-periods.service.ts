import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, sql, SQL, gte, lte, count } from 'drizzle-orm';
import { CreateLeavePeriodDto, UpdateLeavePeriodDto, QueryLeavePeriodDto } from './leave-periods.dto';

@Injectable()
export class LeavePeriodsService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private calculateDays(fromDate: string, toDate: string): number {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  async findAll(query: QueryLeavePeriodDto) {
    const filters: SQL[] = [];
    
    if (query.employee_id) {
      filters.push(eq(schema.leavePeriods.employee_id, query.employee_id));
    }
    
    if (query.leave_type) {
      filters.push(eq(schema.leavePeriods.leave_type, query.leave_type));
    }
    
    if (query.active_on) {
      filters.push(
        sql`${query.active_on} BETWEEN ${schema.leavePeriods.from_date} AND ${schema.leavePeriods.to_date}`,
      );
    }
    
    if (query.from_date) {
      filters.push(gte(schema.leavePeriods.from_date, query.from_date));
    }
    
    if (query.to_date) {
      filters.push(lte(schema.leavePeriods.to_date, query.to_date));
    }

    const finalFilter = filters.length > 0 ? and(...filters) : undefined;
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    // Get leaves with employee details
    const leaves = await this.db
      .select({
        id: schema.leavePeriods.id,
        employee_id: schema.leavePeriods.employee_id,
        employee_name: schema.employees.full_name,
        department: schema.employees.department,
        designation: schema.employees.designation,
        from_date: schema.leavePeriods.from_date,
        to_date: schema.leavePeriods.to_date,
        leave_type: schema.leavePeriods.leave_type,
        reason: schema.leavePeriods.reason,
        status: schema.leavePeriods.status,
        created_at: schema.leavePeriods.created_at,
      })
      .from(schema.leavePeriods)
      .leftJoin(schema.employees, eq(schema.leavePeriods.employee_id, schema.employees.employee_id))
      .where(finalFilter)
      .orderBy(desc(schema.leavePeriods.from_date))
      .limit(limit)
      .offset(offset);

    // Add days calculation
    const leavesWithDays = leaves.map(leave => ({
      ...leave,
      days: this.calculateDays(leave.from_date, leave.to_date),
    }));

    // Get total count
    const [countResult] = await this.db
      .select({ total: count() })
      .from(schema.leavePeriods)
      .where(finalFilter);

    return {
      leaves: leavesWithDays,
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / limit),
      },
    };
  }

  async findOne(id: number) {
    const [leave] = await this.db
      .select({
        id: schema.leavePeriods.id,
        employee_id: schema.leavePeriods.employee_id,
        employee_name: schema.employees.full_name,
        department: schema.employees.department,
        designation: schema.employees.designation,
        from_date: schema.leavePeriods.from_date,
        to_date: schema.leavePeriods.to_date,
        leave_type: schema.leavePeriods.leave_type,
        reason: schema.leavePeriods.reason,
        status: schema.leavePeriods.status,
        created_at: schema.leavePeriods.created_at,
      })
      .from(schema.leavePeriods)
      .leftJoin(schema.employees, eq(schema.leavePeriods.employee_id, schema.employees.employee_id))
      .where(eq(schema.leavePeriods.id, id));

    if (!leave) {
      throw new NotFoundException(`Leave period with ID ${id} not found`);
    }

    return {
      ...leave,
      days: this.calculateDays(leave.from_date, leave.to_date),
    };
  }

  async create(dto: CreateLeavePeriodDto) {
    const data = {
      employee_id: dto.employee_id,
      from_date: dto.from_date,
      to_date: dto.to_date,
      leave_type: dto.leave_type,
      reason: dto.reason || null,
      status: dto.status || 'approved',
    };

    const [result] = await this.db
      .insert(schema.leavePeriods)
      .values(data)
      .returning();

    return {
      ...result,
      days: this.calculateDays(result.from_date, result.to_date),
      message: 'Leave period created successfully',
    };
  }

  async update(id: number, dto: UpdateLeavePeriodDto) {
    // Check if exists
    const [existing] = await this.db
      .select({ id: schema.leavePeriods.id })
      .from(schema.leavePeriods)
      .where(eq(schema.leavePeriods.id, id));

    if (!existing) {
      throw new NotFoundException(`Leave period with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};

    if (dto.employee_id) updateData.employee_id = dto.employee_id;
    if (dto.from_date) updateData.from_date = dto.from_date;
    if (dto.to_date) updateData.to_date = dto.to_date;
    if (dto.leave_type) updateData.leave_type = dto.leave_type;
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.status) updateData.status = dto.status;

    if (Object.keys(updateData).length > 0) {
      await this.db
        .update(schema.leavePeriods)
        .set(updateData)
        .where(eq(schema.leavePeriods.id, id));
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const [existing] = await this.db
      .select({ id: schema.leavePeriods.id })
      .from(schema.leavePeriods)
      .where(eq(schema.leavePeriods.id, id));

    if (!existing) {
      throw new NotFoundException(`Leave period with ID ${id} not found`);
    }

    await this.db
      .delete(schema.leavePeriods)
      .where(eq(schema.leavePeriods.id, id));

    return { message: 'Leave period deleted successfully', id };
  }

  async getAlerts(query: { as_of?: string; employee_id?: string; threshold_days?: number }) {
    const today = query.as_of ? new Date(query.as_of) : new Date();
    const thresholdDays = query.threshold_days || 3;
    
    // Get all active or upcoming leave periods
    const filters: SQL[] = [
      gte(schema.leavePeriods.to_date, today.toISOString().split('T')[0]),
    ];
    
    if (query.employee_id) {
      filters.push(eq(schema.leavePeriods.employee_id, query.employee_id));
    }

    const periods = await this.db
      .select({
        id: schema.leavePeriods.id,
        employee_id: schema.leavePeriods.employee_id,
        employee_name: schema.employees.full_name,
        from_date: schema.leavePeriods.from_date,
        to_date: schema.leavePeriods.to_date,
        leave_type: schema.leavePeriods.leave_type,
        reason: schema.leavePeriods.reason,
      })
      .from(schema.leavePeriods)
      .leftJoin(schema.employees, eq(schema.leavePeriods.employee_id, schema.employees.employee_id))
      .where(and(...filters));

    const alerts = periods
      .filter((p) => {
        const toDate = new Date(p.to_date);
        const daysRemaining = Math.ceil(
          (toDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysRemaining <= thresholdDays && daysRemaining >= 0;
      })
      .map((p) => {
        const toDate = new Date(p.to_date);
        const daysRemaining = Math.ceil(
          (toDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          leave_period_id: p.id,
          employee_id: p.employee_id,
          employee_name: p.employee_name,
          from_date: p.from_date,
          to_date: p.to_date,
          leave_type: p.leave_type,
          reason: p.reason,
          days_remaining: daysRemaining,
          alert_type: daysRemaining === 0 ? 'ending_today' : 'ending_soon',
          message: daysRemaining === 0 
            ? 'Leave period ends today' 
            : `Leave period ends in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
        };
      });

    return {
      alerts,
      total: alerts.length,
      as_of: today.toISOString().split('T')[0],
    };
  }

  async getStatistics(query: { from_date?: string; to_date?: string; employee_id?: string }) {
    const filters: SQL[] = [];
    
    if (query.employee_id) {
      filters.push(eq(schema.leavePeriods.employee_id, query.employee_id));
    }
    
    if (query.from_date) {
      filters.push(gte(schema.leavePeriods.from_date, query.from_date));
    }
    
    if (query.to_date) {
      filters.push(lte(schema.leavePeriods.to_date, query.to_date));
    }

    const finalFilter = filters.length > 0 ? and(...filters) : undefined;

    const leaves = await this.db
      .select({
        leave_type: schema.leavePeriods.leave_type,
        from_date: schema.leavePeriods.from_date,
        to_date: schema.leavePeriods.to_date,
      })
      .from(schema.leavePeriods)
      .where(finalFilter);

    // Calculate statistics
    const byType: Record<string, { count: number; days: number }> = {};
    let totalDays = 0;

    leaves.forEach(leave => {
      const days = this.calculateDays(leave.from_date, leave.to_date);
      totalDays += days;

      if (!byType[leave.leave_type]) {
        byType[leave.leave_type] = { count: 0, days: 0 };
      }
      byType[leave.leave_type].count++;
      byType[leave.leave_type].days += days;
    });

    return {
      total_leaves: leaves.length,
      total_days: totalDays,
      by_type: byType,
      by_status: { approved: leaves.length }, // All approved for now
      query: {
        from_date: query.from_date || null,
        to_date: query.to_date || null,
        employee_id: query.employee_id || null,
      },
    };
  }

  async getEmployeeLeaveBalance(employeeId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const fromDate = `${currentYear}-01-01`;
    const toDate = `${currentYear}-12-31`;

    const leaves = await this.db
      .select({
        leave_type: schema.leavePeriods.leave_type,
        from_date: schema.leavePeriods.from_date,
        to_date: schema.leavePeriods.to_date,
      })
      .from(schema.leavePeriods)
      .where(
        and(
          eq(schema.leavePeriods.employee_id, employeeId),
          gte(schema.leavePeriods.from_date, fromDate),
          lte(schema.leavePeriods.to_date, toDate),
        ),
      );

    // Default leave entitlements (can be configured)
    const entitlements: Record<string, number> = {
      annual: 14,
      sick: 10,
      casual: 10,
      unpaid: 0,
    };

    const used: Record<string, number> = {};

    leaves.forEach(leave => {
      const days = this.calculateDays(leave.from_date, leave.to_date);
      used[leave.leave_type] = (used[leave.leave_type] || 0) + days;
    });

    const balance: Record<string, { entitled: number; used: number; remaining: number }> = {};
    
    Object.entries(entitlements).forEach(([type, entitled]) => {
      balance[type] = {
        entitled,
        used: used[type] || 0,
        remaining: entitled > 0 ? Math.max(0, entitled - (used[type] || 0)) : 0,
      };
    });

    return {
      employee_id: employeeId,
      year: currentYear,
      balance,
      total_used: Object.values(used).reduce((sum, val) => sum + val, 0),
    };
  }

  /**
   * Get all employees who are on leave for a specific date
   * Used by attendance module to auto-fill leave status
   */
  async getEmployeesOnLeave(date: string) {
    const leaves = await this.db
      .select({
        id: schema.leavePeriods.id,
        employee_id: schema.leavePeriods.employee_id,
        employee_name: schema.employees.full_name,
        from_date: schema.leavePeriods.from_date,
        to_date: schema.leavePeriods.to_date,
        leave_type: schema.leavePeriods.leave_type,
        reason: schema.leavePeriods.reason,
      })
      .from(schema.leavePeriods)
      .leftJoin(schema.employees, eq(schema.leavePeriods.employee_id, schema.employees.employee_id))
      .where(
        sql`${date} BETWEEN ${schema.leavePeriods.from_date} AND ${schema.leavePeriods.to_date}`,
      );

    return {
      date,
      employees_on_leave: leaves.map(leave => ({
        employee_id: leave.employee_id,
        employee_name: leave.employee_name,
        leave_period_id: leave.id,
        leave_type: leave.leave_type,
        from_date: leave.from_date,
        to_date: leave.to_date,
        days_remaining: this.calculateDaysRemaining(leave.to_date, date),
        reason: leave.reason,
      })),
      count: leaves.length,
    };
  }

  private calculateDaysRemaining(toDate: string, currentDate: string): number {
    const to = new Date(toDate);
    const current = new Date(currentDate);
    const diffTime = to.getTime() - current.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
