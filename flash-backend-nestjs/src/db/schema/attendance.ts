import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  real,
} from 'drizzle-orm/pg-core';

/**
 * ATTENDANCE SCHEMA - Supports GPS and selfie
 */
export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  employee_id: text('employee_id').notNull(),
  date: text('date').notNull(),
  status: text('status').notNull(), // present, absent, leave, late
  note: text('note'),
  overtime_minutes: integer('overtime_minutes'),
  overtime_rate: real('overtime_rate'),
  late_minutes: integer('late_minutes'),
  late_deduction: real('late_deduction'),
  leave_type: text('leave_type'),
  fine_amount: real('fine_amount'),
  location: text('location'), // JSON string: {lat, lng} (optional)
  initial_location: text('initial_location'), // JSON string: {lat, lng} captured at selfie time
  picture: text('picture'), // URL or file path (optional)
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
