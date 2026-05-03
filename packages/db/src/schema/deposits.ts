import { date, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { companies } from './companies.js';
import { attendanceSessions } from './attendance.js';
import { products } from './products.js';

export const depositStatusEnum = pgEnum('deposit_status', ['submitted', 'under_review', 'reconciled', 'rejected']);
export const approvalActionEnum = pgEnum('approval_action', ['approved', 'rejected', 'verified', 'reconciled']);

export const cashDeposits = pgTable('cash_deposits', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  salesUserId: uuid('sales_user_id').notNull().references(() => users.id),
  workDate: date('work_date').notNull(),
  attendanceSessionId: uuid('attendance_session_id').references(() => attendanceSessions.id),
  expectedCashAmount: numeric('expected_cash_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  declaredCashAmount: numeric('declared_cash_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  qrisAmount: numeric('qris_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  consignmentAmount: numeric('consignment_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  totalSoldQuantity: numeric('total_sold_quantity', { precision: 14, scale: 2 }).default('0').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  status: depositStatusEnum('status').default('submitted').notNull(),
  reconciledByUserId: uuid('reconciled_by_user_id').references(() => users.id),
  reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
  discrepancyAmount: numeric('discrepancy_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  notes: text('notes'),
  clientRequestId: uuid('client_request_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cashDepositItems = pgTable('cash_deposit_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  cashDepositId: uuid('cash_deposit_id').notNull().references(() => cashDeposits.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  soldQuantity: numeric('sold_quantity', { precision: 14, scale: 2 }).notNull(),
  expectedAmount: numeric('expected_amount', { precision: 14, scale: 2 }).notNull(),
  declaredAmount: numeric('declared_amount', { precision: 14, scale: 2 }).notNull(),
});

export const approvalLogs = pgTable('approval_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  approvableType: varchar('approvable_type', { length: 80 }).notNull(),
  approvableId: uuid('approvable_id').notNull(),
  action: approvalActionEnum('action').notNull(),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});


