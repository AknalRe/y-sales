import { jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { companies } from './companies.js';

export const integrationTypeEnum = pgEnum('integration_type', ['storage', 'face_recognition', 'payment', 'notification']);
export const integrationProviderEnum = pgEnum('integration_provider', ['cloudflare_r2', 's3', 'custom_http', 'aws_rekognition', 'azure_face', 'google_vertex', 'mock']);
export const integrationStatusEnum = pgEnum('integration_status', ['active', 'inactive']);

export const companyIntegrations = pgTable('company_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  type: integrationTypeEnum('type').notNull(),
  provider: integrationProviderEnum('provider').notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  status: integrationStatusEnum('status').default('inactive').notNull(),
  config: jsonb('config'),
  secretConfig: jsonb('secret_config'),
  description: text('description'),
  updatedByUserId: uuid('updated_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueCompanyIntegrationTypeProvider: uniqueIndex('company_integrations_company_type_provider_idx').on(table.companyId, table.type, table.provider),
}));
