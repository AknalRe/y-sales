import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { companies } from './companies.js';
import { outlets } from './outlets.js';
import { visitSessions } from './visits.js';
import { products, warehouses } from './products.js';
import { mediaFiles } from './media.js';

export const transactionCustomerTypeEnum = pgEnum('transaction_customer_type', ['store', 'agent', 'end_user']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'qris', 'consignment']);
export const transactionStatusEnum = pgEnum('transaction_status', ['draft', 'submitted', 'pending_approval', 'approved', 'validated', 'rejected', 'cancelled', 'closed']);
export const paymentStatusEnum = pgEnum('sales_payment_status', ['unpaid', 'partial', 'paid']);
export const verificationStatusEnum = pgEnum('verification_status', ['pending', 'verified', 'rejected']);

export const salesTransactions = pgTable('sales_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  transactionNo: varchar('transaction_no', { length: 80 }).notNull().unique(),
  salesUserId: uuid('sales_user_id').notNull().references(() => users.id),
  outletId: uuid('outlet_id').references(() => outlets.id),
  visitSessionId: uuid('visit_session_id').references(() => visitSessions.id),
  sourceWarehouseId: uuid('source_warehouse_id').references(() => warehouses.id),
  customerType: transactionCustomerTypeEnum('customer_type').notNull(),
  endUserName: varchar('end_user_name', { length: 160 }),
  endUserPhone: varchar('end_user_phone', { length: 40 }),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  subtotalAmount: numeric('subtotal_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  status: transactionStatusEnum('status').default('draft').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').default('unpaid').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  approvedByUserId: uuid('approved_by_user_id').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  stockReleasedAt: timestamp('stock_released_at', { withTimezone: true }),
  validatedByUserId: uuid('validated_by_user_id').references(() => users.id),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  closedByUserId: uuid('closed_by_user_id').references(() => users.id),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  clientRequestId: uuid('client_request_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const salesTransactionItems = pgTable('sales_transaction_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => salesTransactions.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 14, scale: 2 }).notNull(),
  reservedQuantity: numeric('reserved_quantity', { precision: 14, scale: 2 }).default('0').notNull(),
  releasedQuantity: numeric('released_quantity', { precision: 14, scale: 2 }).default('0').notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const transactionNotePhotos = pgTable('transaction_note_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => salesTransactions.id, { onDelete: 'cascade' }),
  mediaFileId: uuid('media_file_id').notNull().references(() => mediaFiles.id),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  capturedByUserId: uuid('captured_by_user_id').references(() => users.id),
  verifiedByUserId: uuid('verified_by_user_id').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verificationStatus: verificationStatusEnum('verification_status').default('pending').notNull(),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});


