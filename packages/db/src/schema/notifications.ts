import { boolean, index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { users } from './auth.js';

export const userDeviceTokens = pgTable('user_device_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  devicePlatform: varchar('device_platform', { length: 40 }).notNull(), // 'ios', 'android', 'web'
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('user_device_tokens_user_idx').on(table.userId),
  index('user_device_tokens_user_company_idx').on(table.userId, table.companyId),
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  type: varchar('type', { length: 80 }).notNull(), // 'system', 'withdrawal', 'approval', etc.
  isRead: boolean('is_read').default(false).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }), // diisi saat isRead = true
  referenceId: uuid('reference_id'), // optional link to a specific entity
  data: jsonb('data'), // extra payload data
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('notifications_user_is_read_idx').on(table.userId, table.isRead),
]);
