import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { appSettings, auditLogs, inventoryBalances, inventoryMovements, products, warehouses } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';

const defaultInventoryLabels = {
  warehouseCodePrefix: 'WH',
  mainWarehouseLabel: 'Gudang Utama',
  salesWarehouseLabel: 'Gudang Sales',
  outletConsignmentLabel: 'Gudang Konsinyasi Outlet',
  transferOutLabel: 'Transfer Keluar',
  transferInLabel: 'Transfer Masuk',
  saleLabel: 'Penjualan',
  returnLabel: 'Retur',
  adjustmentLabel: 'Adjustment Stok',
  stockResetLabel: 'Reset Stok',
  movementReversalLabel: 'Pembatalan Movement',
};

const inventoryLabelsSchema = z.object({
  warehouseCodePrefix: z.string().min(1).max(16).optional(),
  mainWarehouseLabel: z.string().min(1).max(80).optional(),
  salesWarehouseLabel: z.string().min(1).max(80).optional(),
  outletConsignmentLabel: z.string().min(1).max(80).optional(),
  transferOutLabel: z.string().min(1).max(80).optional(),
  transferInLabel: z.string().min(1).max(80).optional(),
  saleLabel: z.string().min(1).max(80).optional(),
  returnLabel: z.string().min(1).max(80).optional(),
  adjustmentLabel: z.string().min(1).max(80).optional(),
  stockResetLabel: z.string().min(1).max(80).optional(),
  movementReversalLabel: z.string().min(1).max(80).optional(),
});

type InventoryLabels = z.infer<typeof inventoryLabelsSchema> & typeof defaultInventoryLabels;

const warehouseSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  address: z.string().optional(),
  type: z.enum(['main', 'sales_van', 'outlet_consignment']).default('main'),
  ownerUserId: z.string().uuid().optional(),
  outletId: z.string().uuid().optional(),
});

const warehouseUpdateSchema = warehouseSchema.partial();

const adjustmentSchema = z.object({
  warehouseId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityDelta: z.string().or(z.number()).transform(String),
  notes: z.string().optional(),
});

const resetSchema = z.object({
  warehouseId: z.string().uuid(),
  productId: z.string().uuid(),
  targetQuantity: z.string().or(z.number()).transform(String),
  notes: z.string().optional(),
});

const reverseSchema = z.object({ notes: z.string().optional() });

const transferSchema = z.object({
  fromWarehouseId: z.string().uuid(),
  toWarehouseId: z.string().uuid(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.string().or(z.number()).transform(String),
  })).min(1),
});

function inventoryLabelsKey(companyId: string) {
  return `inventory_labels:${companyId}`;
}

function mergeLabels(value: unknown): InventoryLabels {
  const parsed = inventoryLabelsSchema.safeParse(value ?? {});
  return { ...defaultInventoryLabels, ...(parsed.success ? parsed.data : {}) };
}

async function getInventoryLabels(companyId: string) {
  const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, inventoryLabelsKey(companyId)));
  return mergeLabels(setting?.value);
}

function warehouseTypeLabel(type: string, labels: InventoryLabels) {
  if (type === 'main') return labels.mainWarehouseLabel;
  if (type === 'sales_van') return labels.salesWarehouseLabel;
  if (type === 'outlet_consignment') return labels.outletConsignmentLabel;
  return type;
}

function movementLabel(row: { movementType: string; referenceType: string | null }, labels: InventoryLabels) {
  if (row.referenceType === 'stock_reset') return labels.stockResetLabel;
  if (row.referenceType === 'movement_reversal') return labels.movementReversalLabel;
  if (row.movementType === 'transfer_out') return labels.transferOutLabel;
  if (row.movementType === 'transfer_in') return labels.transferInLabel;
  if (row.movementType === 'sale') return labels.saleLabel;
  if (row.movementType === 'return') return labels.returnLabel;
  if (row.movementType === 'adjustment') return labels.adjustmentLabel;
  return row.movementType;
}

function parseQuantity(value: string | number, label: string, options: { positive?: boolean; nonNegative?: boolean } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw Object.assign(new Error(`${label} harus berupa angka valid.`), { statusCode: 400 });
  if (options.positive && parsed <= 0) throw Object.assign(new Error(`${label} harus lebih dari 0.`), { statusCode: 400 });
  if (options.nonNegative && parsed < 0) throw Object.assign(new Error(`${label} tidak boleh negatif.`), { statusCode: 400 });
  return parsed;
}

function toQty(value: number) {
  return value.toFixed(2);
}

async function writeAudit(request: FastifyRequest, input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
}) {
  await db.insert(auditLogs).values({
    actorUserId: request.user?.id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    oldValues: input.oldValues,
    newValues: input.newValues,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  });
}

async function ensureWarehouse(companyId: string, warehouseId: string) {
  const [warehouse] = await db.select().from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.id, warehouseId)));
  if (!warehouse) throw Object.assign(new Error('Warehouse tidak ditemukan untuk company ini.'), { statusCode: 404 });
  return warehouse;
}

async function ensureProduct(companyId: string, productId: string) {
  const [product] = await db.select().from(products).where(and(eq(products.companyId, companyId), eq(products.id, productId)));
  if (!product) throw Object.assign(new Error('Produk tidak ditemukan untuk company ini.'), { statusCode: 404 });
  return product;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function applyInventoryDelta(tx: Tx, input: { companyId: string; warehouseId: string; productId: string; quantityDelta: number }) {
  const [existing] = await tx.select().from(inventoryBalances).where(and(
    eq(inventoryBalances.companyId, input.companyId),
    eq(inventoryBalances.warehouseId, input.warehouseId),
    eq(inventoryBalances.productId, input.productId),
  ));

  const currentQty = Number(existing?.quantity ?? 0);
  const nextQty = currentQty + input.quantityDelta;
  if (nextQty < 0) throw Object.assign(new Error('Operasi membuat stok negatif.'), { statusCode: 400 });

  const [balance] = existing
    ? await tx.update(inventoryBalances).set({ quantity: toQty(nextQty), updatedAt: new Date() }).where(eq(inventoryBalances.id, existing.id)).returning()
    : await tx.insert(inventoryBalances).values({ companyId: input.companyId, warehouseId: input.warehouseId, productId: input.productId, quantity: toQty(nextQty), reservedQuantity: '0.00' }).returning();

  return balance;
}

async function warehouseHasStock(companyId: string, warehouseId: string) {
  const rows = await db.select().from(inventoryBalances).where(and(eq(inventoryBalances.companyId, companyId), eq(inventoryBalances.warehouseId, warehouseId)));
  return rows.some((row) => Number(row.quantity) > 0 || Number(row.reservedQuantity) > 0);
}

export async function inventoryRoutes(app: FastifyInstance) {
  app.get('/inventory/settings', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    return { labels: await getInventoryLabels(companyId), scope: { companyId } };
  });

  app.put('/inventory/settings', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const oldLabels = await getInventoryLabels(companyId);
    const patch = inventoryLabelsSchema.parse(request.body);
    const labels = { ...oldLabels, ...patch };

    const [setting] = await db.insert(appSettings).values({
      key: inventoryLabelsKey(companyId),
      value: labels,
      description: `Inventory labels for company ${companyId}`,
      updatedByUserId: request.user?.id,
    }).onConflictDoUpdate({
      target: appSettings.key,
      set: { value: labels, updatedByUserId: request.user?.id, updatedAt: new Date() },
    }).returning();

    await writeAudit(request, { action: 'inventory.settings.update', entityType: 'app_settings', entityId: setting.id, oldValues: oldLabels, newValues: labels });
    return { labels, scope: { companyId } };
  });

  app.get('/inventory/warehouses', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const labels = await getInventoryLabels(companyId);
    const rows = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId)).orderBy(warehouses.code);
    return { warehouses: rows.map((row) => ({ ...row, warehouseTypeLabel: warehouseTypeLabel(row.type, labels) })) };
  });

  app.post('/inventory/warehouses', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = warehouseSchema.parse(request.body);
    const [warehouse] = await db.insert(warehouses).values({ companyId, ...body, status: 'active' }).onConflictDoUpdate({
      target: [warehouses.companyId, warehouses.code],
      set: { ...body, status: 'active' },
    }).returning();

    await writeAudit(request, { action: 'warehouse.create', entityType: 'warehouse', entityId: warehouse.id, newValues: warehouse });
    return { warehouse };
  });

  app.patch('/inventory/warehouses/:id', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = warehouseUpdateSchema.parse(request.body);
    const oldWarehouse = await ensureWarehouse(companyId, params.id);
    const [warehouse] = await db.update(warehouses).set(body).where(and(eq(warehouses.companyId, companyId), eq(warehouses.id, params.id))).returning();
    await writeAudit(request, { action: 'warehouse.update', entityType: 'warehouse', entityId: params.id, oldValues: oldWarehouse, newValues: warehouse });
    return { warehouse };
  });

  app.delete('/inventory/warehouses/:id', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const oldWarehouse = await ensureWarehouse(companyId, params.id);
    if (await warehouseHasStock(companyId, params.id)) {
      throw Object.assign(new Error('Warehouse tidak bisa dinonaktifkan karena masih memiliki stok atau reserved stock.'), { statusCode: 400 });
    }

    const [warehouse] = await db.update(warehouses).set({ status: 'inactive' }).where(and(eq(warehouses.companyId, companyId), eq(warehouses.id, params.id))).returning();
    await writeAudit(request, { action: 'warehouse.deactivate', entityType: 'warehouse', entityId: params.id, oldValues: oldWarehouse, newValues: warehouse });
    return { warehouse };
  });

  app.get('/inventory/balances', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const labels = await getInventoryLabels(companyId);
    const query = z.object({ warehouseId: z.string().uuid().optional(), productId: z.string().uuid().optional() }).parse(request.query);
    const conditions = [eq(inventoryBalances.companyId, companyId)];
    if (query.warehouseId) conditions.push(eq(inventoryBalances.warehouseId, query.warehouseId));
    if (query.productId) conditions.push(eq(inventoryBalances.productId, query.productId));

    const rows = await db.select({
      id: inventoryBalances.id,
      warehouseId: inventoryBalances.warehouseId,
      warehouseCode: warehouses.code,
      warehouseName: warehouses.name,
      warehouseType: warehouses.type,
      productId: inventoryBalances.productId,
      productSku: products.sku,
      productName: products.name,
      quantity: inventoryBalances.quantity,
      reservedQuantity: inventoryBalances.reservedQuantity,
      updatedAt: inventoryBalances.updatedAt,
    }).from(inventoryBalances).innerJoin(warehouses, eq(inventoryBalances.warehouseId, warehouses.id)).innerJoin(products, eq(inventoryBalances.productId, products.id)).where(and(...conditions)).orderBy(warehouses.code, products.sku);

    return { balances: rows.map((row) => ({ ...row, warehouseTypeLabel: warehouseTypeLabel(row.warehouseType, labels) })) };
  });

  app.get('/inventory/movements', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const labels = await getInventoryLabels(companyId);
    const rows = await db.select({
      id: inventoryMovements.id,
      warehouseId: inventoryMovements.warehouseId,
      warehouseCode: warehouses.code,
      productId: inventoryMovements.productId,
      productSku: products.sku,
      productName: products.name,
      movementType: inventoryMovements.movementType,
      quantityDelta: inventoryMovements.quantityDelta,
      referenceType: inventoryMovements.referenceType,
      referenceId: inventoryMovements.referenceId,
      notes: inventoryMovements.notes,
      createdByUserId: inventoryMovements.createdByUserId,
      createdAt: inventoryMovements.createdAt,
    }).from(inventoryMovements).innerJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id)).innerJoin(products, eq(inventoryMovements.productId, products.id)).where(eq(inventoryMovements.companyId, companyId)).orderBy(desc(inventoryMovements.createdAt)).limit(200);

    return { movements: rows.map((row) => ({ ...row, movementLabel: movementLabel(row, labels), directionLabel: Number(row.quantityDelta) < 0 ? labels.transferOutLabel : labels.transferInLabel })) };
  });

  app.post('/inventory/adjustments', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = adjustmentSchema.parse(request.body);
    await ensureWarehouse(companyId, body.warehouseId);
    await ensureProduct(companyId, body.productId);
    const delta = parseQuantity(body.quantityDelta, 'Quantity adjustment');

    const result = await db.transaction(async (tx) => {
      const balance = await applyInventoryDelta(tx, { companyId, warehouseId: body.warehouseId, productId: body.productId, quantityDelta: delta });
      await tx.insert(inventoryMovements).values({ companyId, warehouseId: body.warehouseId, productId: body.productId, movementType: 'adjustment', quantityDelta: toQty(delta), referenceType: 'stock_adjustment', notes: body.notes, createdByUserId: request.user?.id });
      return balance;
    });
    await writeAudit(request, { action: 'inventory.adjustment', entityType: 'inventory_balance', entityId: result.id, newValues: { ...body, companyId } });
    return { balance: result };
  });

  app.post('/inventory/resets', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = resetSchema.parse(request.body);
    await ensureWarehouse(companyId, body.warehouseId);
    await ensureProduct(companyId, body.productId);
    const targetQuantity = parseQuantity(body.targetQuantity, 'Target quantity', { nonNegative: true });

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.companyId, companyId), eq(inventoryBalances.warehouseId, body.warehouseId), eq(inventoryBalances.productId, body.productId)));
      const currentQty = Number(existing?.quantity ?? 0);
      const delta = targetQuantity - currentQty;
      const balance = await applyInventoryDelta(tx, { companyId, warehouseId: body.warehouseId, productId: body.productId, quantityDelta: delta });
      await tx.insert(inventoryMovements).values({ companyId, warehouseId: body.warehouseId, productId: body.productId, movementType: 'adjustment', quantityDelta: toQty(delta), referenceType: 'stock_reset', notes: body.notes ?? `Reset stok dari ${toQty(currentQty)} ke ${toQty(targetQuantity)}`, createdByUserId: request.user?.id });
      return { balance, currentQty, targetQuantity, delta };
    });
    await writeAudit(request, { action: 'inventory.reset', entityType: 'inventory_balance', entityId: result.balance.id, oldValues: { quantity: toQty(result.currentQty) }, newValues: { quantity: toQty(result.targetQuantity), delta: toQty(result.delta), companyId } });
    return { balance: result.balance };
  });

  app.post('/inventory/movements/:id/reverse', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = reverseSchema.parse(request.body ?? {});
    const [movement] = await db.select().from(inventoryMovements).where(and(eq(inventoryMovements.companyId, companyId), eq(inventoryMovements.id, params.id)));
    if (!movement) throw Object.assign(new Error('Movement tidak ditemukan.'), { statusCode: 404 });
    if (movement.referenceType === 'movement_reversal') throw Object.assign(new Error('Movement reversal tidak boleh dibalik ulang.'), { statusCode: 400 });
    const [existingReversal] = await db.select().from(inventoryMovements).where(and(eq(inventoryMovements.companyId, companyId), eq(inventoryMovements.referenceType, 'movement_reversal'), eq(inventoryMovements.referenceId, movement.id)));
    if (existingReversal) throw Object.assign(new Error('Movement ini sudah pernah dibatalkan.'), { statusCode: 409 });

    const result = await db.transaction(async (tx) => {
      const originalDelta = parseQuantity(movement.quantityDelta, 'Original movement quantity');
      const reversalDelta = originalDelta * -1;
      const balance = await applyInventoryDelta(tx, { companyId, warehouseId: movement.warehouseId, productId: movement.productId, quantityDelta: reversalDelta });
      const [reversal] = await tx.insert(inventoryMovements).values({ companyId, warehouseId: movement.warehouseId, productId: movement.productId, movementType: 'adjustment', quantityDelta: toQty(reversalDelta), referenceType: 'movement_reversal', referenceId: movement.id, notes: body.notes ?? `Reversal untuk movement ${movement.id}`, createdByUserId: request.user?.id }).returning();
      return { balance, reversal };
    });
    await writeAudit(request, { action: 'inventory.reverse', entityType: 'inventory_movement', entityId: movement.id, oldValues: movement, newValues: result.reversal });
    return result;
  });

  app.post('/inventory/transfers', { preHandler: requirePermission('inventory.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = transferSchema.parse(request.body);
    if (body.fromWarehouseId === body.toWarehouseId) throw Object.assign(new Error('Gudang asal dan tujuan tidak boleh sama.'), { statusCode: 400 });
    await ensureWarehouse(companyId, body.fromWarehouseId);
    await ensureWarehouse(companyId, body.toWarehouseId);
    for (const item of body.items) await ensureProduct(companyId, item.productId);
    const transferReferenceId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      for (const item of body.items) {
        const qty = parseQuantity(item.quantity, 'Quantity transfer', { positive: true });
        const [source] = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.companyId, companyId), eq(inventoryBalances.warehouseId, body.fromWarehouseId), eq(inventoryBalances.productId, item.productId)));
        if (!source || Number(source.quantity) < qty) throw Object.assign(new Error(`Stok source tidak cukup untuk produk ${item.productId}.`), { statusCode: 400 });
        await applyInventoryDelta(tx, { companyId, warehouseId: body.fromWarehouseId, productId: item.productId, quantityDelta: qty * -1 });
        await applyInventoryDelta(tx, { companyId, warehouseId: body.toWarehouseId, productId: item.productId, quantityDelta: qty });
        await tx.insert(inventoryMovements).values({ companyId, warehouseId: body.fromWarehouseId, productId: item.productId, movementType: 'transfer_out', quantityDelta: toQty(qty * -1), referenceType: 'stock_transfer', referenceId: transferReferenceId, notes: body.notes, createdByUserId: request.user?.id });
        await tx.insert(inventoryMovements).values({ companyId, warehouseId: body.toWarehouseId, productId: item.productId, movementType: 'transfer_in', quantityDelta: toQty(qty), referenceType: 'stock_transfer', referenceId: transferReferenceId, notes: body.notes, createdByUserId: request.user?.id });
      }
    });
    await writeAudit(request, { action: 'inventory.transfer', entityType: 'inventory_transfer', entityId: transferReferenceId, newValues: { ...body, companyId, transferReferenceId } });
    return { success: true, transferReferenceId };
  });
}
