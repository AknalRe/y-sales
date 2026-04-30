import { jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar, uniqueIndex } from 'drizzle-orm/pg-core';

export const companyStatusEnum = pgEnum('company_status', ['active', 'trialing', 'suspended', 'cancelled']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trialing', 'active', 'past_due', 'cancelled', 'expired']);

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 180 }).notNull(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  status: companyStatusEnum('status').default('active').notNull(),
  logoUrl: text('logo_url'),
  timezone: varchar('timezone', { length: 80 }).default('Asia/Jakarta').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const companySubscriptions = pgTable('company_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  planCode: varchar('plan_code', { length: 80 }).notNull(),
  status: subscriptionStatusEnum('status').default('trialing').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  limits: jsonb('limits'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueCompanyPlan: uniqueIndex('company_subscriptions_company_plan_idx').on(table.companyId, table.planCode),
}));


