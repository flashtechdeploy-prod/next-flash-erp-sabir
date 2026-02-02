import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, SQL } from 'drizzle-orm';

@Injectable()
export class VehicleMaintenanceService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(query: {
    vehicle_id?: string;
    employee_id?: string;
    vendor?: string;
    status?: string;
    maintenance_type?: string;
    date?: string;
    month?: string;
  }) {
    const filters: SQL[] = [];
    if (query.vehicle_id)
      filters.push(eq(schema.vehicleMaintenance.vehicle_id, query.vehicle_id));
    if (query.vendor)
      filters.push(eq(schema.vehicleMaintenance.vendor, query.vendor));
    if (query.status)
      filters.push(eq(schema.vehicleMaintenance.status, query.status));
    if (query.maintenance_type)
      filters.push(eq(schema.vehicleMaintenance.maintenance_type, query.maintenance_type));

    const finalFilter = filters.length > 0 ? and(...filters) : undefined;

    return this.db
      .select({
        id: schema.vehicleMaintenance.id,
        vehicle_id: schema.vehicleMaintenance.vehicle_id,
        maintenance_date: schema.vehicleMaintenance.maintenance_date,
        maintenance_type: schema.vehicleMaintenance.maintenance_type,
        description: schema.vehicleMaintenance.description,
        cost: schema.vehicleMaintenance.cost,
        vendor: schema.vehicleMaintenance.vendor,
        odometer_reading: schema.vehicleMaintenance.odometer_reading,
        status: schema.vehicleMaintenance.status,
        notes: schema.vehicleMaintenance.notes,
        created_at: schema.vehicleMaintenance.created_at,
        make_model: schema.vehicles.make_model,
        license_plate: schema.vehicles.license_plate,
        vehicle_type: schema.vehicles.vehicle_type,
      })
      .from(schema.vehicleMaintenance)
      .innerJoin(
        schema.vehicles,
        eq(schema.vehicleMaintenance.vehicle_id, schema.vehicles.vehicle_id),
      )
      .where(finalFilter)
      .orderBy(desc(schema.vehicleMaintenance.id));
  }

  async findOne(id: number) {
    const [record] = await this.db
      .select()
      .from(schema.vehicleMaintenance)
      .where(eq(schema.vehicleMaintenance.id, id));
    if (!record)
      throw new NotFoundException(`Maintenance record ${id} not found`);
    return record;
  }

  async create(dto: any) {
    const data: any = { ...dto };
    const [result] = await this.db
      .insert(schema.vehicleMaintenance)
      .values(data)
      .returning();
    return result;
  }

  async update(id: number, dto: any) {
    await this.findOne(id);
    const data: any = { ...dto };

    await this.db
      .update(schema.vehicleMaintenance)
      .set(data)
      .where(eq(schema.vehicleMaintenance.id, id));
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.db
      .delete(schema.vehicleMaintenance)
      .where(eq(schema.vehicleMaintenance.id, id));
    return { message: 'Deleted' };
  }
}
