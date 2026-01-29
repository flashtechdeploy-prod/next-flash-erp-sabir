import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
} from 'drizzle-orm/pg-core';
import { employees } from './employees';

export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  employee_id: text('employee_id')
    .notNull()
    .references(() => employees.employee_id),
  date: text('date').notNull(),
  status: text('status').notNull(), // present, late, absent, leave, unmarked
  note: text('note'),
  overtime_minutes: integer('overtime_minutes'),
  overtime_rate: real('overtime_rate'),
  late_minutes: integer('late_minutes'),
  late_deduction: real('late_deduction'),
  leave_type: text('leave_type'),
  fine_amount: real('fine_amount'),
  created_at: timestamp('created_at').defaultNow(),
});

export const leavePeriods = pgTable('leave_periods', {
  id: serial('id').primaryKey(),
  employee_id: text('employee_id')
    .notNull()
    .references(() => employees.employee_id),
  from_date: text('from_date').notNull(),
  to_date: text('to_date').notNull(),
  leave_type: text('leave_type').notNull(),
  reason: text('reason'),
  status: text('status').default('approved'),
  created_at: timestamp('created_at').defaultNow(),
});

export const payrollSheetEntries = pgTable('payroll_sheet_entries', {
  id: serial('id').primaryKey(),
  employee_db_id: integer('employee_db_id')
    .notNull()
    .references(() => employees.id),
  from_date: text('from_date').notNull(),
  to_date: text('to_date').notNull(),
  pre_days_override: integer('pre_days_override'),
  cur_days_override: integer('cur_days_override'),
  leave_encashment_days: integer('leave_encashment_days'),
  allow_other: real('allow_other'),
  eobi: real('eobi'),
  tax: real('tax'),
  fine_adv_extra: real('fine_adv_extra'),
  ot_rate_override: real('ot_rate_override'),
  remarks: text('remarks'),
  bank_cash: text('bank_cash'),
  created_at: timestamp('created_at').defaultNow(),
});

export const payrollPaymentStatus = pgTable('payroll_payment_status', {
  id: serial('id').primaryKey(),
  employee_id: text('employee_id')
    .notNull()
    .references(() => employees.employee_id),
  month: text('month').notNull(), // YYYY-MM
  status: text('status').default('unpaid'),
  created_at: timestamp('created_at').defaultNow(),
});
