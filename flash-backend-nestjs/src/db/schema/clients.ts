import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

export const industries = pgTable('industries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
});

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  client_id: text('client_id').unique(), 
  name: text('name').notNull(),
  company_name: text('company_name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  industry: text('industry'),
  industry_id: integer('industry_id').references(() => industries.id),
  status: text('status').default('active'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
});

export const client_contacts = pgTable('client_contacts', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  role: text('role'),
  is_primary: boolean('is_primary').default(false),
  created_at: timestamp('created_at').defaultNow(),
});

export const client_addresses = pgTable('client_addresses', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  address_line1: text('address_line1').notNull(),
  address_line2: text('address_line2'),
  city: text('city'),
  state: text('state'),
  postal_code: text('postal_code'),
  address_type: text('address_type'),
  created_at: timestamp('created_at').defaultNow(),
});

export const client_sites = pgTable('client_sites', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  guards_required: integer('guards_required').default(0),
  status: text('status').default('active'),
  created_at: timestamp('created_at').defaultNow(),
});

export const client_contracts = pgTable('client_contracts', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  contract_number: text('contract_number'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  value: real('value'),
  status: text('status').default('active'),
  terms: text('terms'),
  created_at: timestamp('created_at').defaultNow(),
});

export const client_contract_documents = pgTable('client_contract_documents', {
  id: serial('id').primaryKey(),
  contract_id: integer('contract_id')
    .notNull()
    .references(() => client_contracts.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  file_path: text('file_path').notNull(),
  file_type: text('file_type'),
  file_size: integer('file_size'),
  uploaded_at: timestamp('uploaded_at').defaultNow(),
});

export const site_guard_assignments = pgTable('site_guard_assignments', {
  id: serial('id').primaryKey(),
  site_id: integer('site_id')
    .notNull()
    .references(() => client_sites.id, { onDelete: 'cascade' }),
  employee_id: text('employee_id').notNull(), // Reference to employees
  assignment_date: text('assignment_date').notNull(),
  end_date: text('end_date'),
  shift: text('shift'), 
  status: text('status').default('active'), // active, ejected, completed
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
});
