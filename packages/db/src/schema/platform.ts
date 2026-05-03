import { integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar, boolean } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { users } from './auth.js';

export const billingCycleEnum = pgEnum('billing_cycle', ['monthly', 'yearly', 'lifetime']);
export const tenantSubStatusEnum = pgEnum('tenant_sub_status', ['trialing', 'active', 'past_due', 'suspended', 'cancelled', 'expired']);
export const platformInvoiceStatusEnum = pgEnum('platform_invoice_status', ['draft', 'issued', 'paid', 'overdue', 'void', 'cancelled']);
export const platformBillingReasonEnum = pgEnum('platform_billing_reason', ['new_subscription', 'renewal', 'upgrade', 'downgrade', 'manual_adjustment']);
export const platformPaymentStatusEnum = pgEnum('platform_payment_status', ['pending', 'succeeded', 'failed', 'refunded']);
export const platformActionEnum = pgEnum('platform_action', [
  'company.created',
  'company.updated',
  'company.suspended',
  'company.activated',
  'company.cancelled',
  'company.deleted',
  'subscription.created',
  'subscription.updated',
  'subscription.cancelled',
  'subscription.upgraded',
  'subscription.downgraded',
  'plan.created',
  'plan.updated',
  'plan.deleted',
  'invoice.created',
  'invoice.voided',
  'payment.recorded',
  'payment.refunded',
  'user.created',
  'user.updated',
  'user.deleted',
  'user.password_reset',
  'user.suspended',
]);

// ─── Subscription Plans ────────────────────────────────────────────────────
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description'),
  level: integer('level').default(1).notNull(),
  priceMonthly: numeric('price_monthly', { precision: 12, scale: 2 }).default('0').notNull(),
  priceYearly: numeric('price_yearly', { precision: 12, scale: 2 }).default('0').notNull(),
  // e.g. { users: 25, outlets: 500, products: 1000, storage_gb: 5 }
  limits: jsonb('limits'),
  // e.g. ['visits', 'face_recognition', 'offline_sync']
  features: jsonb('features'),
  isPublic: boolean('is_public').default(true).notNull(),
  status: varchar('status', { length: 40 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptionFeatures = pgTable('subscription_features', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  label: varchar('label', { length: 140 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 80 }).default('Custom').notNull(),
  status: varchar('status', { length: 40 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Company Subscriptions (extends companies.ts companySubscriptions) ─────
// This replaces the simpler companySubscriptions in companies.ts with full billing info.
// We keep the existing table and ADD new columns via migration.
export const tenantSubscriptions = pgTable('tenant_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').references(() => subscriptionPlans.id),
  planCode: varchar('plan_code', { length: 80 }).notNull(),
  billingCycle: billingCycleEnum('billing_cycle').default('monthly').notNull(),
  status: tenantSubStatusEnum('status').default('trialing').notNull(),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  // limits snapshot at time of subscription (so plan changes don't break active subs)
  limitsSnapshot: jsonb('limits_snapshot'),
  featuresSnapshot: jsonb('features_snapshot'),
  // lifecycle
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  suspendReason: text('suspend_reason'),
  expiredAt: timestamp('expired_at', { withTimezone: true }),
  // billing
  invoiceRef: varchar('invoice_ref', { length: 120 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }),
  // managed by
  managedByUserId: uuid('managed_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const platformInvoices = pgTable('platform_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').references(() => tenantSubscriptions.id),
  invoiceNumber: varchar('invoice_number', { length: 120 }).notNull().unique(),
  status: platformInvoiceStatusEnum('status').default('issued').notNull(),
  billingReason: platformBillingReasonEnum('billing_reason').default('manual_adjustment').notNull(),
  billingCycle: billingCycleEnum('billing_cycle').default('monthly').notNull(),
  // snapshot plan at invoice creation time
  planCode: varchar('plan_code', { length: 80 }),
  planName: varchar('plan_name', { length: 120 }),
  periodStart: timestamp('period_start', { withTimezone: true }),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  subtotalAmount: numeric('subtotal_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  currency: varchar('currency', { length: 8 }).default('IDR').notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  notes: text('notes'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const platformPayments = pgTable('platform_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  invoiceId: uuid('invoice_id').references(() => platformInvoices.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').references(() => tenantSubscriptions.id),
  paymentRef: varchar('payment_ref', { length: 140 }),
  provider: varchar('provider', { length: 80 }).default('manual').notNull(),
  method: varchar('method', { length: 80 }).default('manual').notNull(),
  status: platformPaymentStatusEnum('status').default('succeeded').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).default('0').notNull(),
  currency: varchar('currency', { length: 8 }).default('IDR').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  receivedByUserId: uuid('received_by_user_id').references(() => users.id),
  notes: text('notes'),
  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Platform Audit Logs ───────────────────────────────────────────────────
export const platformAuditLogs = pgTable('platform_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').references(() => users.id),
  action: platformActionEnum('action').notNull(),
  targetType: varchar('target_type', { length: 80 }).notNull(),
  targetId: uuid('target_id'),
  meta: jsonb('meta'),
  ipAddress: varchar('ip_address', { length: 60 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
