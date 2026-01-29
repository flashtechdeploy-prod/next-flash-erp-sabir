import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, between, desc, SQL } from 'drizzle-orm';

@Injectable()
export class VehicleAssignmentsService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(query: {
    vehicle_id?: string;
    from_date?: string;
    to_date?: string;
    status?: string;
    limit?: number;
  }) {
    const { vehicle_id, from_date, to_date, status, limit = 100 } = query;

    const filters: SQL[] = [];
    if (vehicle_id)
      filters.push(eq(schema.vehicleAssignments.vehicle_id, vehicle_id));
    if (status) filters.push(eq(schema.vehicleAssignments.status, status));
    
    // Support filtering by the range
    if (from_date && to_date) {
      filters.push(
        and(
          eq(schema.vehicleAssignments.from_date, from_date),
          eq(schema.vehicleAssignments.to_date, to_date),
        )!,
      );
    } else if (from_date) {
      filters.push(eq(schema.vehicleAssignments.from_date, from_date));
    }

    const finalFilter = filters.length > 0 ? and(...filters) : undefined;

    return this.db
      .select({
        id: schema.vehicleAssignments.id,
        vehicle_id: schema.vehicleAssignments.vehicle_id,
        employee_id: schema.vehicleAssignments.employee_id,
        from_date: schema.vehicleAssignments.from_date,
        to_date: schema.vehicleAssignments.to_date,
        location: schema.vehicleAssignments.location,
        purpose: schema.vehicleAssignments.purpose,
        distance_km: schema.vehicleAssignments.distance_km,
        cost: schema.vehicleAssignments.cost,
        status: schema.vehicleAssignments.status,
        created_at: schema.vehicleAssignments.created_at,
      })
      .from(schema.vehicleAssignments)
      .where(finalFilter)
      .limit(limit)
      .orderBy(desc(schema.vehicleAssignments.id));
  }

  async findOne(id: number) {
    const [assignment] = await this.db
      .select()
      .from(schema.vehicleAssignments)
      .where(eq(schema.vehicleAssignments.id, id));
    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }
    return assignment;
  }

  async create(createDto: any) {
    const data: any = { ...createDto };
    const [result] = await this.db
      .insert(schema.vehicleAssignments)
      .values(data)
      .returning();
    return result;
  }

  async update(id: number, updateDto: any) {
    await this.findOne(id);
    const data: any = { ...updateDto };

    await this.db
      .update(schema.vehicleAssignments)
      .set(data)
      .where(eq(schema.vehicleAssignments.id, id));
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.db
      .delete(schema.vehicleAssignments)
      .where(eq(schema.vehicleAssignments.id, id));
    return { message: `Assignment ${id} deleted` };
  }

  async getAnalytics(query: {
    period?: string;
    day?: string;
    month?: string;
    year?: number;
    vehicle_id?: string;
  }) {
    const assignments = await this.findAll({
      vehicle_id: query.vehicle_id,
      limit: 10000,
    });

    const totalKm = assignments.reduce(
      (sum, a) => sum + (Number((a as any).distance_km) || 0),
      0,
    );
    const totalAmount = assignments.reduce(
      (sum, a) => sum + (Number(a.cost) || 0),
      0,
    );

    return {
      period: query.period || 'all',
      assignments: assignments.length,
      total_km: totalKm,
      total_amount: totalAmount,
      avg_cost_per_km: totalKm > 0 ? totalAmount / totalKm : 0,
    };
  }

  async getEfficiency(query: any) {
    return this.getAnalytics(query);
  }
}
