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

    const results = await this.db
      .select({
        id: schema.fuelEntries.id,
        vehicle_id: schema.fuelEntries.vehicle_id,
        entry_date: schema.fuelEntries.entry_date,
        fuel_type: schema.fuelEntries.fuel_type,
        liters: schema.fuelEntries.liters,
        price_per_liter: schema.fuelEntries.price_per_liter,
        total_cost: schema.fuelEntries.total_cost,
        odometer_km: schema.fuelEntries.odometer_km,
        vendor: schema.fuelEntries.vendor,
        location: schema.fuelEntries.location,
        notes: schema.fuelEntries.notes,
        created_at: schema.fuelEntries.created_at,
        make_model: schema.vehicles.make_model,
        vehicle_type: schema.vehicles.vehicle_type,
        license_plate: schema.vehicles.license_plate,
      })
      .from(schema.fuelEntries)
      .innerJoin(
        schema.vehicles,
        eq(schema.fuelEntries.vehicle_id, schema.vehicles.vehicle_id),
      )
      .where(finalFilter)
      .limit(query.limit || 100)
      .orderBy(desc(schema.fuelEntries.id));

    return results;
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
