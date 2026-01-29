import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, between, desc, SQL } from 'drizzle-orm';

@Injectable()
export class FuelEntriesService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(query: {
    vehicle_id?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }) {
    const filters: SQL[] = [];
    if (query.vehicle_id)
      filters.push(eq(schema.fuelEntries.vehicle_id, query.vehicle_id));
    if (query.from_date && query.to_date)
      filters.push(
        between(schema.fuelEntries.entry_date, query.from_date, query.to_date),
      );

    const finalFilter = filters.length > 0 ? and(...filters) : undefined;

    return this.db
      .select()
      .from(schema.fuelEntries)
      .where(finalFilter)
      .limit(query.limit || 100)
      .orderBy(desc(schema.fuelEntries.id));
  }

  async findOne(id: number) {
    const [entry] = await this.db
      .select()
      .from(schema.fuelEntries)
      .where(eq(schema.fuelEntries.id, id));
    if (!entry) throw new NotFoundException(`Fuel entry ${id} not found`);
    return entry;
  }

  async create(dto: any) {
    const data: any = { ...dto };
    const [result] = await this.db
      .insert(schema.fuelEntries)
      .values(data)
      .returning();
    return result;
  }

  async update(id: number, dto: any) {
    await this.findOne(id);
    const data: any = { ...dto };

    await this.db
      .update(schema.fuelEntries)
      .set(data)
      .where(eq(schema.fuelEntries.id, id));
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.db
      .delete(schema.fuelEntries)
      .where(eq(schema.fuelEntries.id, id));
    return { message: 'Deleted' };
  }

  async getSummary(query: {
    vehicle_id?: string;
    from_date?: string;
    to_date?: string;
  }) {
    const entries = await this.findAll({ ...query, limit: 10000 });
    const totalLiters = entries.reduce((sum, e) => sum + Number(e.liters), 0);
    const totalCost = entries.reduce(
      (sum, e) => sum + Number((e as any).total_cost || 0),
      0,
    );
    const odometers = entries
      .map((e) => (e as any).odometer_km)
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    const distanceKm =
      odometers.length >= 2
        ? odometers[odometers.length - 1] - odometers[0]
        : null;

    return {
      vehicle_id: query.vehicle_id,
      from_date: query.from_date,
      to_date: query.to_date,
      entries: entries.length,
      total_liters: totalLiters,
      total_cost: totalCost,
      distance_km: distanceKm,
      avg_km_per_liter:
        distanceKm && totalLiters ? distanceKm / totalLiters : null,
      avg_cost_per_km: distanceKm && totalCost ? totalCost / distanceKm : null,
      tips: [],
    };
  }
}
