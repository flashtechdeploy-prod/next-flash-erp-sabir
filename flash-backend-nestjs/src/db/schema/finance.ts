import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { employees } from './employees';
import { clients } from './clients';

export const employee_advances = pgTable('employee_advances', {
  id: serial('id').primaryKey(),
  employee_db_id: integer('employee_db_id')
    .notNull()
    .references(() => employees.id),
  amount: real('amount').notNull(),
  note: text('note'),
  advance_date: text('advance_date').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const employee_advance_deductions = pgTable(
  'employee_advance_deductions',
  {
    id: serial('id').primaryKey(),
    employee_db_id: integer('employee_db_id')
      .notNull()
      .references(() => employees.id),
    month: text('month').notNull(), // YYYY-MM
    amount: real('amount').notNull(),
    note: text('note'),
    created_at: timestamp('created_at').defaultNow(),
  },
);

export const advances = pgTable('advances', {
  // keeping for backward compatibility if needed, but the service uses above
  id: serial('id').primaryKey(),
  employee_id: text('employee_id')
    .notNull()
    .references(() => employees.employee_id),
  amount: real('amount').notNull(),
  repayment_amount: real('repayment_amount').notNull(),
  balance: real('balance').notNull(),
  status: text('status').default('active'),
  request_date: text('request_date').notNull(),
  approved_date: text('approved_date'),
  created_at: timestamp('created_at').defaultNow(),
});

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  expense_id: text('expense_id').unique().notNull(),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  expense_date: text('expense_date').notNull(),
  status: text('status').default('pending'),
  reference: text('reference'),
  created_at: timestamp('created_at').defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoice_id: text('invoice_id').unique().notNull(),
  client_id: integer('client_id')
    .notNull()
    .references(() => clients.id),
  amount: real('amount').notNull(),
  due_date: text('due_date').notNull(),
  status: text('status').default('unpaid'),
  created_at: timestamp('created_at').defaultNow(),
});

export const client_payments = pgTable('client_payments', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .references(() => clients.id),
  invoice_id: text('invoice_id').references(() => invoices.invoice_id),
  amount: real('amount').notNull(),
  payment_date: text('payment_date').notNull(),
  payment_method: text('payment_method'),
  created_at: timestamp('created_at').defaultNow(),
});

export const finance_accounts = pgTable('finance_accounts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  account_type: text('account_type').notNull(), // asset, liability, equity, income, expense
  parent_id: integer('parent_id'),
  is_system: boolean('is_system').default(false),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
});

export const finance_journal_entries = pgTable('finance_journal_entries', {
  id: serial('id').primaryKey(),
  entry_no: text('entry_no').notNull().unique(),
  entry_date: text('entry_date').notNull(),
  memo: text('memo'),
  entry_type: text('entry_type').default('journal'), // journal, income, expense, payment, receipt
  amount: real('amount').default(0),
  reference: text('reference'),
  category: text('category'),
  status: text('status').default('draft'), // draft, posted, void
  posted_at: text('posted_at'),
  created_at: timestamp('created_at').defaultNow(),
});

export const finance_journal_lines = pgTable('finance_journal_lines', {
  id: serial('id').primaryKey(),
  entry_id: integer('entry_id')
    .notNull()
    .references(() => finance_journal_entries.id, { onDelete: 'cascade' }),
  account_id: integer('account_id')
    .notNull()
    .references(() => finance_accounts.id),
  description: text('description'),
  debit: real('debit').default(0),
  credit: real('credit').default(0),
  created_at: timestamp('created_at').defaultNow(),
});
