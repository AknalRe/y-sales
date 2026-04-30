import { jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { companies } from './companies.js';

export const syncOperationEnum = pgEnum('sync_operation', ['create', 'update', 'delete', 'upload']);
export const syncStatusEnum = pgEnum('sync_status', ['received', 'processed', 'failed', 'conflict']);

export const syncEvents = pgTable('sync_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  deviceId: varchar('device_id', { length: 160 }),
  clientRequestId: uuid('client_request_id').notNull().unique(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: uuid('entity_id'),
  operation: syncOperationEnum('operation').notNull(),
  status: syncStatusEnum('status').default('received').notNull(),
  errorMessage: text('error_message'),
  conflictReason: text('conflict_reason'),
  payloadHash: varchar('payload_hash', { length: 128 }),
  payload: jsonb('payload'),
  result: jsonb('result'),
  createdAtClient: timestamp('created_at_client', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  action: varchar('action', { length: 160 }).notNull(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: uuid('entity_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 80 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
