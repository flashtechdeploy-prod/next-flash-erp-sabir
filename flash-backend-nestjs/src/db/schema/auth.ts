import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  primaryKey,
  integer,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  full_name: text('full_name'),
  is_admin: boolean('is_admin').default(false),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description'),
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description'),
});

export const users_to_roles = pgTable(
  'users_to_roles',
  {
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role_id: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.user_id, t.role_id] }),
  }),
);

export const roles_to_permissions = pgTable(
  'roles_to_permissions',
  {
    role_id: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permission_id: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.role_id, t.permission_id] }),
  }),
);
