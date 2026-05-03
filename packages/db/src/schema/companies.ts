import { jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar, uniqueIndex } from 'drizzle-orm/pg-core';

export const companyStatusEnum = pgEnum('company_status', ['active', 'trialing', 'suspended', 'cancelled']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trialing', 'active', 'past_due', 'cancelled', 'expired']);

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 180 }).notNull(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  status: companyStatusEnum('status').default('active').notNull(),
  logoUrl: text('logo_url'),
  coverPhotoUrl: text('cover_photo_url'),
  legalName: varchar('legal_name', { length: 180 }),
  email: varchar('email', { length: 160 }),
  phone: varchar('phone', { length: 40 }),
  address: text('address'),
  city: varchar('city', { length: 120 }),
  province: varchar('province', { length: 120 }),
  postalCode: varchar('postal_code', { length: 30 }),
  country: varchar('country', { length: 80 }).default('Indonesia'),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  taxNumber: varchar('tax_number', { length: 80 }),
  websiteUrl: text('website_url'),
  timezone: varchar('timezone', { length: 80 }).default('Asia/Jakarta').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @deprecated Use `tenantSubscriptions` from platform.ts instead.
 * This table is kept for backward compatibility and data migration only.
 * Do NOT use this in new code — all subscription logic should reference tenant_subscriptions.
 */
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


