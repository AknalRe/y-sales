import { date, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { outlets } from './outlets.js';
import { salesTransactions, paymentMethodEnum, transactionCustomerTypeEnum } from './transactions.js';
import { products } from './products.js';

export const receivableStatusEnum = pgEnum('receivable_status', ['open', 'partial', 'paid', 'overdue', 'written_off']);
export const consignmentStatusEnum = pgEnum('consignment_status', ['active', 'paid', 'overdue', 'withdrawal_required', 'withdrawn', 'extended', 'reset_stock']);
export const consignmentActionTypeEnum = pgEnum('consignment_action_type', ['notify_withdrawal', 'extend', 'withdraw', 'reset_stock_zero']);

export const receivables = pgTable('receivables', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').notNull().references(() => salesTransactions.id),
  outletId: uuid('outlet_id').references(() => outlets.id),
  customerType: transactionCustomerTypeEnum('customer_type').notNull(),
  principalAmount: numeric('principal_amount', { precision: 14, scale: 2 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  outstandingAmount: numeric('outstanding_amount', { precision: 14, scale: 2 }).notNull(),
  dueDate: date('due_date').notNull(),
  status: receivableStatusEnum('status').default('open').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const receivablePayments = pgTable('receivable_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  receivableId: uuid('receivable_id').notNull().references(() => receivables.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
  receivedByUserId: uuid('received_by_user_id').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const consignments = pgTable('consignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').notNull().references(() => salesTransactions.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  salesUserId: uuid('sales_user_id').notNull().references(() => users.id),
  startDate: date('start_date').notNull(),
  dueDate: date('due_date').notNull(),
  status: consignmentStatusEnum('status').default('active').notNull(),
  extendedUntil: date('extended_until'),
  authorizedByUserId: uuid('authorized_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const consignmentItems = pgTable('consignment_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  consignmentId: uuid('consignment_id').notNull().references(() => consignments.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 14, scale: 2 }).notNull(),
  paidQuantity: numeric('paid_quantity', { precision: 14, scale: 2 }).default('0').notNull(),
  remainingQuantity: numeric('remaining_quantity', { precision: 14, scale: 2 }).notNull(),
});

export const consignmentActions = pgTable('consignment_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  consignmentId: uuid('consignment_id').notNull().references(() => consignments.id, { onDelete: 'cascade' }),
  actionType: consignmentActionTypeEnum('action_type').notNull(),
  notes: text('notes'),
  performedByUserId: uuid('performed_by_user_id').references(() => users.id),
  performedAt: timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),
});


