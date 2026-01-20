import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const companySettings = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().default('Flash Security Services'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  logo_url: text('logo_url'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
