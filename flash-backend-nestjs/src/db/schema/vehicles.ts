import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
} from 'drizzle-orm/pg-core';

export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  vehicle_id: text('vehicle_id').unique().notNull(),
  vehicle_type: text('vehicle_type').notNull(),
  category: text('category').notNull(),
  make_model: text('make_model').notNull(),
  license_plate: text('license_plate').notNull(),
  chassis_number: text('chassis_number'),
  asset_tag: text('asset_tag'),
  year: integer('year'),
  status: text('status').default('active'),
  compliance: text('compliance').default('compliant'),
  government_permit: text('government_permit').default('valid'),
    fuel_limit_monthly: real('fuel_limit_monthly'),
  created_at: timestamp('created_at').defaultNow(),
});

export const vehicleDocuments = pgTable('vehicle_documents', {
  id: serial('id').primaryKey(),
  vehicle_id: text('vehicle_id')
    .notNull()
    .references(() => vehicles.vehicle_id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  mime_type: text('mime_type'),
  created_at: timestamp('created_at').defaultNow(),
});

export const vehicleImages = pgTable('vehicle_images', {
  id: serial('id').primaryKey(),
  vehicle_id: text('vehicle_id')
    .notNull()
    .references(() => vehicles.vehicle_id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  mime_type: text('mime_type'),
  created_at: timestamp('created_at').defaultNow(),
});

export const vehicleAssignments = pgTable('vehicle_assignments', {
  id: serial('id').primaryKey(),
  vehicle_id: text('vehicle_id')
    .notNull()
    .references(() => vehicles.vehicle_id),
  employee_id: text('employee_id'),
  from_date: text('from_date'),
  to_date: text('to_date'),
  assignment_date: text('assignment_date'), // Legacy/Single date
  route: text('route'),
  location: text('location'),
  purpose: text('purpose'),
  distance_km: real('distance_km'),
  cost: real('cost'),
  status: text('status').default('active'),
  created_at: timestamp('created_at').defaultNow(),
});

export const vehicleMaintenance = pgTable('vehicle_maintenance', {
  id: serial('id').primaryKey(),
  vehicle_id: text('vehicle_id')
    .notNull()
    .references(() => vehicles.vehicle_id),
  maintenance_date: text('maintenance_date').notNull(),
  maintenance_type: text('maintenance_type'),
  description: text('description').notNull(),
  cost: real('cost'),
  vendor: text('vendor'),
  odometer_reading: integer('odometer_reading'),
  status: text('status').default('completed'),
  notes: text('notes'),
  next_maintenance_date: text('next_maintenance_date'),
  created_at: timestamp('created_at').defaultNow(),
});

export const fuelEntries = pgTable('fuel_entries', {
  id: serial('id').primaryKey(),
  vehicle_id: text('vehicle_id')
    .notNull()
    .references(() => vehicles.vehicle_id),
  entry_date: text('entry_date').notNull(),
  fuel_type: text('fuel_type'),
  liters: real('liters').notNull(),
  price_per_liter: real('price_per_liter'),
  total_cost: real('total_cost').notNull(),
  odometer_km: integer('odometer_km'),
  vendor: text('vendor'),
  location: text('location'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
});
