import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, SQL } from 'drizzle-orm';

@Injectable()
export class AdvancesService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async listAdvances(query: { employee_db_id?: number; month?: string }) {
    const filter: SQL | undefined = query.employee_db_id
      ? eq(schema.employee_advances.employee_db_id, query.employee_db_id)
      : undefined;
    return this.db
      .select()
      .from(schema.employee_advances)
      .where(filter)
      .orderBy(desc(schema.employee_advances.id));
  }

  async createAdvance(dto: any) {
    const data: any = {
      employee_db_id: dto.employee_db_id || dto.employeeDbId,
      amount: dto.amount,
      note: dto.note,
      advance_date: dto.advance_date || dto.advanceDate,
    };
    const [result] = await this.db
      .insert(schema.employee_advances)
      .values(data)
      .returning();
    return result;
  }

  async deleteAdvance(id: number) {
    await this.db
      .delete(schema.employee_advances)
      .where(eq(schema.employee_advances.id, id));
    return { message: 'Deleted' };
  }

  async listDeductions(query: { employee_db_id?: number; month?: string }) {
    const filters: SQL[] = [];
    if (query.employee_db_id)
      filters.push(
        eq(
          schema.employee_advance_deductions.employee_db_id,
          query.employee_db_id,
        ),
      );
    if (query.month)
      filters.push(eq(schema.employee_advance_deductions.month, query.month));

    const finalFilter = filters.length > 0 ? and(...filters) : undefined;
    return this.db
      .select()
      .from(schema.employee_advance_deductions)
      .where(finalFilter)
      .orderBy(desc(schema.employee_advance_deductions.id));
  }

  async upsertDeduction(dto: any) {
    const employee_db_id = dto.employee_db_id || dto.employeeDbId;
    const [existing] = await this.db
      .select()
      .from(schema.employee_advance_deductions)
      .where(
        and(
          eq(schema.employee_advance_deductions.employee_db_id, employee_db_id),
          eq(schema.employee_advance_deductions.month, dto.month),
        ),
      );

    const data: any = {
      employee_db_id,
      month: dto.month,
      amount: dto.amount,
      note: dto.note,
    };

    if (existing) {
      await this.db
        .update(schema.employee_advance_deductions)
        .set(data)
        .where(eq(schema.employee_advance_deductions.id, (existing as any).id));
    } else {
      await this.db.insert(schema.employee_advance_deductions).values(data);
    }
    const [result] = await this.db
      .select()
      .from(schema.employee_advance_deductions)
      .where(
        and(
          eq(schema.employee_advance_deductions.employee_db_id, employee_db_id),
          eq(schema.employee_advance_deductions.month, dto.month),
        ),
      );
    return result;
  }

  async getSummary(employeeDbId: number) {
    const advances = await this.db
      .select()
      .from(schema.employee_advances)
      .where(eq(schema.employee_advances.employee_db_id, employeeDbId));
    const deductions = await this.db
      .select()
      .from(schema.employee_advance_deductions)
      .where(
        eq(schema.employee_advance_deductions.employee_db_id, employeeDbId),
      );

    const totalAdvanced = advances.reduce(
      (sum, a) => sum + Number((a as any).amount),
      0,
    );
    const totalDeducted = deductions.reduce(
      (sum, d) => sum + Number((d as any).amount),
      0,
    );

    return {
      employee_db_id: employeeDbId,
      total_advanced: totalAdvanced,
      total_deducted: totalDeducted,
      balance: totalAdvanced - totalDeducted,
      total_paid_so_far: totalDeducted,
    };
  }
}
