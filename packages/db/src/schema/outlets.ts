import { date, integer, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { companies } from './companies.js';
import { mediaFiles } from './media.js';

export const outletStatusEnum = pgEnum('outlet_status', ['draft', 'pending_verification', 'active', 'rejected', 'inactive']);
export const outletCustomerTypeEnum = pgEnum('outlet_customer_type', ['store', 'agent']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['active', 'inactive']);

export const outlets = pgTable('outlets', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 80 }).notNull(),
  name: varchar('name', { length: 180 }).notNull(),
  customerType: outletCustomerTypeEnum('customer_type').notNull(),
  ownerName: varchar('owner_name', { length: 160 }),
  phone: varchar('phone', { length: 40 }),
  address: text('address').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  geofenceRadiusM: integer('geofence_radius_m'),
  status: outletStatusEnum('status').default('pending_verification').notNull(),
  registeredByUserId: uuid('registered_by_user_id').references(() => users.id),
  verifiedByUserId: uuid('verified_by_user_id').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  uniqueCompanyOutletCode: uniqueIndex('outlets_company_code_idx').on(table.companyId, table.code),
}));

export const outletPhotos = pgTable('outlet_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id, { onDelete: 'cascade' }),
  mediaFileId: uuid('media_file_id').notNull().references(() => mediaFiles.id),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  capturedByUserId: uuid('captured_by_user_id').references(() => users.id),
  source: varchar('source', { length: 40 }).default('camera').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const salesOutletAssignments = pgTable('sales_outlet_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  salesUserId: uuid('sales_user_id').notNull().references(() => users.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id, { onDelete: 'cascade' }),
  assignedByUserId: uuid('assigned_by_user_id').references(() => users.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  status: assignmentStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueActiveAssignment: uniqueIndex('sales_outlet_assignments_sales_outlet_idx').on(table.salesUserId, table.outletId),
}));


