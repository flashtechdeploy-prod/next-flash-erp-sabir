import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const generalInventoryItems = pgTable('general_inventory_items', {
  id: serial('id').primaryKey(),
  item_code: text('item_code').unique().notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  unit_name: text('unit_name').notNull(),
  quantity_on_hand: integer('quantity_on_hand').default(0),
  min_quantity: integer('min_quantity'),
  image_url: text('image_url'),
  status: text('status').default('active'),
  created_at: timestamp('created_at').defaultNow(),
});

export const generalInventoryTransactions = pgTable(
  'general_inventory_transactions',
  {
    id: serial('id').primaryKey(),
    item_code: text('item_code')
      .notNull()
      .references(() => generalInventoryItems.item_code),
    employee_id: text('employee_id'),
    action: text('action').notNull(), // issue, return, lost, damaged, adjust
    quantity: integer('quantity').notNull(),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow(),
  },
);

export const restrictedInventoryItems = pgTable('restricted_inventory_items', {
  id: serial('id').primaryKey(),
  item_code: text('item_code').unique().notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  is_serial_tracked: boolean('is_serial_tracked').default(false),
  unit_name: text('unit_name').notNull(),
  quantity_on_hand: integer('quantity_on_hand').default(0),
  min_quantity: integer('min_quantity'),
  serial_total: integer('serial_total'),
  serial_in_stock: integer('serial_in_stock'),
  make_model: text('make_model'),
  caliber: text('caliber'),
  storage_location: text('storage_location'),
  license_number: text('license_number'),
  weapon_region: text('weapon_region'),
  requires_maintenance: boolean('requires_maintenance').default(false),
  requires_cleaning: boolean('requires_cleaning').default(false),
  status: text('status').default('active'),
  created_at: timestamp('created_at').defaultNow(),
});

export const restrictedSerialUnits = pgTable('restricted_serial_units', {
  id: serial('id').primaryKey(),
  item_code: text('item_code')
    .notNull()
    .references(() => restrictedInventoryItems.item_code),
  serial_number: text('serial_number').unique().notNull(),
  status: text('status').default('in_stock'), // in_stock, issued, maintenance, lost
  issued_to_employee_id: text('issued_to_employee_id'),
  created_at: timestamp('created_at').defaultNow(),
});

export const restrictedTransactions = pgTable('restricted_transactions', {
  id: serial('id').primaryKey(),
  item_code: text('item_code')
    .notNull()
    .references(() => restrictedInventoryItems.item_code),
  employee_id: text('employee_id'),
  serial_unit_id: integer('serial_unit_id').references(
    () => restrictedSerialUnits.id,
  ),
  action: text('action').notNull(),
  quantity: integer('quantity'),
  condition_note: text('condition_note'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
});
