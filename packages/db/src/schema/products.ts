import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { companies } from './companies.js';
import { outlets } from './outlets.js';

export const productStatusEnum = pgEnum('product_status', ['active', 'inactive']);
export const warehouseTypeEnum = pgEnum('warehouse_type', ['main', 'sales_van', 'outlet_consignment']);
export const inventoryMovementTypeEnum = pgEnum('inventory_movement_type', ['sale', 'return', 'adjustment', 'transfer_in', 'transfer_out', 'consignment_reset']);

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 80 }).notNull(),
  name: varchar('name', { length: 180 }).notNull(),
  description: text('description'),
  unit: varchar('unit', { length: 40 }).notNull(),
  priceDefault: numeric('price_default', { precision: 14, scale: 2 }).default('0').notNull(),
  status: productStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueCompanySku: uniqueIndex('products_company_sku_idx').on(table.companyId, table.sku),
}));

export const warehouses = pgTable('warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 80 }).notNull(),
  name: varchar('name', { length: 180 }).notNull(),
  address: text('address'),
  type: warehouseTypeEnum('type').default('main').notNull(),
  ownerUserId: uuid('owner_user_id').references(() => users.id),
  outletId: uuid('outlet_id').references(() => outlets.id),
  status: productStatusEnum('status').default('active').notNull(),
}, (table) => ({
  uniqueCompanyWarehouseCode: uniqueIndex('warehouses_company_code_idx').on(table.companyId, table.code),
}));

export const inventoryBalances = pgTable('inventory_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 14, scale: 2 }).default('0').notNull(),
  reservedQuantity: numeric('reserved_quantity', { precision: 14, scale: 2 }).default('0').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueWarehouseProduct: uniqueIndex('inventory_balances_warehouse_product_idx').on(table.warehouseId, table.productId),
}));

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  movementType: inventoryMovementTypeEnum('movement_type').notNull(),
  quantityDelta: numeric('quantity_delta', { precision: 14, scale: 2 }).notNull(),
  referenceType: varchar('reference_type', { length: 80 }),
  referenceId: uuid('reference_id'),
  notes: text('notes'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});


