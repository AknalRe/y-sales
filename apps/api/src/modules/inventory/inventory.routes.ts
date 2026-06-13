import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { appSettings, auditLogs, inventoryBalances, inventoryMovements, products, roles, users, warehouses } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { authenticate } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { parsePaginationQuery } from '../../utils/pagination.js';
import { writeAuditLog } from '../audit/audit.service.js';

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

async function requireInventoryAccess(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;
  const user = request.user!;
  const allowed = user.isSuperAdmin
    || user.roleCode === 'ADMINISTRATOR'
    || ['inventory.manage', 'products.manage'].some((permission) => user.permissions.includes(permission));
  if (!allowed) return reply.status(403).send({ message: 'Permission denied', permission: 'inventory.manage' });
}

const warehouseSchema = z.object({
  code: z.string().min(2).optional(),
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

const ensureSalesWarehouseSchema = z.object({
  salesUserId: z.string().uuid(),
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

function warehouseTypeCode(type: z.infer<typeof warehouseSchema>['type']) {
  if (type === 'sales_van') return 'GS';
  if (type === 'outlet_consignment') return 'KO';
  return 'GD';
}

function generateWarehouseCode(input: { type: z.infer<typeof warehouseSchema>['type'] }) {
  return `WH-${warehouseTypeCode(input.type)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nextSequentialCode(prefix: string, existingCodes: string[]) {
  const matcher = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
  const max = existingCodes.reduce((currentMax, code) => {
    const match = matcher.exec(code);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
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

function isSalesRole(code?: string | null, name?: string | null) {
  const roleCode = code?.toUpperCase() ?? '';
  const roleName = name?.toLowerCase() ?? '';
  return (
    roleCode.includes('SALES') ||
    roleCode.includes('AGENT') ||
    roleCode.includes('FIELD') ||
    roleName.includes('sales') ||
    roleName.includes('lapangan') ||
    roleName.includes('agent')
  );
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function applyInventoryDelta(tx: Tx, input: { companyId: string; warehouseId: string; productId: string; quantityDelta: number }) {
  const [existing] = await tx.select().from(inventoryBalances).where(and(
    eq(inventoryBalances.companyId, input.companyId),
    eq(inventoryBalances.warehouseId, input.warehouseId),
    eq(inventoryBalances.productId, input.productId),
  )).for('update');

  const currentQty = Number(existing?.quantity ?? 0);
  const reservedQty = Number(existing?.reservedQuantity ?? 0);
  const nextQty = currentQty + input.quantityDelta;
  if (nextQty < 0) throw Object.assign(new Error('Operasi membuat stok negatif.'), { statusCode: 400 });
  if (nextQty < reservedQty) throw Object.assign(new Error('Operasi membuat stok lebih kecil dari stok yang sudah reserved.'), { statusCode: 400 });

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
  app.get('/inventory/settings', { preHandler: requireInventoryAccess }, async (request) => {
    const companyId = requireTenantId(request);
    return { labels: await getInventoryLabels(companyId), scope: { companyId } };
  });

  app.put('/inventory/settings', { preHandler: requireInventoryAccess }, async (request) => {
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

    try {
      await writeAuditLog({ request, action: 'inventory.settings.update', entityType: 'app_settings', entityId: setting.id, oldValues: oldLabels, newValues: labels });
    } catch (err) {
      console.error('[AuditLog] Failed to write settings update audit log:', err);
    }
    return { labels, scope: { companyId } };
  });

  app.get('/inventory/warehouses', { preHandler: requireInventoryAccess }, async (request) => {
    const companyId = requireTenantId(request);
    const labels = await getInventoryLabels(companyId);
    const rows = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId)).orderBy(warehouses.code);
    return { warehouses: rows.map((row) => ({ ...row, warehouseTypeLabel: warehouseTypeLabel(row.type, labels) })) };
  });

  app.post('/inventory/warehouses', { preHandler: requireInventoryAccess }, async (request) => {
    const companyId = requireTenantId(request);
    const body = warehouseSchema.parse(request.body);
    const codePrefix = generateWarehouseCode({ type: body.type });
    const existingWarehouseCodes = body.code?.trim()
      ? []
      : (await db.select({ code: warehouses.code }).from(warehouses).where(eq(warehouses.companyId, companyId))).map((warehouse) => warehouse.code);
    const code = body.code?.trim() || nextSequentialCode(codePrefix, existingWarehouseCodes);
    const [warehouse] = await db.insert(warehouses).values({ companyId, ...body, code, status: 'active' }).onConflictDoUpdate({
      target: [warehouses.companyId, warehouses.code],
      set: { ...body, status: 'active' },
    }).returning();

    try {
      await writeAuditLog({ request, action: 'warehouse.create', entityType: 'warehouse', entityId: warehouse.id, newValues: warehouse });
    } catch (err) {
      console.error('[AuditLog] Failed to write warehouse create audit log:', err);
    }
    return { warehouse };
  });

  app.post('/inventory/sales-warehouses/ensure', { preHandler: requireInventoryAccess }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const body = ensureSalesWarehouseSchema.parse(request.body);

    const [salesUser] = await db
      .select({
        id: users.id,
        name: users.name,
        employeeCode: users.employeeCode,
        status: users.status,
        roleCode: roles.code,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.companyId, companyId), eq(users.id, body.salesUserId), isNull(users.deletedAt)));

    if (!salesUser) return reply.status(404).send({ message: 'Sales tidak ditemukan pada company ini.' });
    if (salesUser.status !== 'active') return reply.status(400).send({ message: 'Sales tidak aktif.' });
    if (!isSalesRole(salesUser.roleCode, salesUser.roleName)) return reply.status(400).send({ message: 'User ini bukan role sales.' });

    const [existing] = await db.select().from(warehouses).where(and(
      eq(warehouses.companyId, companyId),
      eq(warehouses.ownerUserId, salesUser.id),
      eq(warehouses.type, 'sales_van'),
    ));

    if (existing) {
      if (existing.status === 'active') return { warehouse: existing, created: false };
      const [reactivated] = await db.update(warehouses).set({ status: 'active' }).where(eq(warehouses.id, existing.id)).returning();
      try {
        await writeAuditLog({ request, action: 'warehouse.sales.reactivate', entityType: 'warehouse', entityId: reactivated.id, oldValues: existing, newValues: reactivated });
      } catch (err) {
        console.error('[AuditLog] Failed to write reactivate audit log:', err);
      }
      return { warehouse: reactivated, created: false };
    }

    const existingWarehouseCodes = (await db.select({ code: warehouses.code }).from(warehouses).where(eq(warehouses.companyId, companyId))).map((warehouse) => warehouse.code);
    const code = nextSequentialCode('WH-GS', existingWarehouseCodes);
    const label = salesUser.employeeCode ?? salesUser.name;
    const [warehouse] = await db.insert(warehouses).values({
      companyId,
      code,
      name: `Gudang Sales ${label}`,
      address: `Stok canvas ${salesUser.name}`,
      type: 'sales_van',
      ownerUserId: salesUser.id,
      status: 'active',
    }).returning();

    try {
      await writeAuditLog({ request, action: 'warehouse.sales.create', entityType: 'warehouse', entityId: warehouse.id, newValues: warehouse });
    } catch (err) {
      console.error('[AuditLog] Failed to write sales warehouse create audit log:', err);
    }
    return { warehouse, created: true };
  });

  app.patch('/inventory/warehouses/:id', { preHandler: requireInventoryAccess }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = warehouseUpdateSchema.parse(request.body);
    const oldWarehouse = await ensureWarehouse(companyId, params.id);
    const [warehouse] = await db.update(warehouses).set(body).where(and(eq(warehouses.companyId, companyId), eq(warehouses.id, params.id))).returning();
    try {
      await writeAuditLog({ request, action: 'warehouse.update', entityType: 'warehouse', entityId: params.id, oldValues: oldWarehouse, newValues: warehouse });
    } catch (err) {
      console.error('[AuditLog] Failed to write warehouse update audit log:', err);
    }
    return { warehouse };
  });

  app.delete('/inventory/warehouses/:id', { preHandler: requireInventoryAccess }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const oldWarehouse = await ensureWarehouse(companyId, params.id);
    if (await warehouseHasStock(companyId, params.id)) {
      throw Object.assign(new Error('Warehouse tidak bisa dinonaktifkan karena masih memiliki stok atau reserved stock.'), { statusCode: 400 });
    }

    const [warehouse] = await db.update(warehouses).set({ status: 'inactive' }).where(and(eq(warehouses.companyId, companyId), eq(warehouses.id, params.id))).returning();
    try {
      await writeAuditLog({ request, action: 'warehouse.deactivate', entityType: 'warehouse', entityId: params.id, oldValues: oldWarehouse, newValues: warehouse });
    } catch (err) {
      console.error('[AuditLog] Failed to write warehouse deactivate audit log:', err);
    }
    return { warehouse };
  });

  app.get('/inventory/balances', { preHandler: requireInventoryAccess }, async (request) => {
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

  app.get('/inventory/movements', { preHandler: requireInventoryAccess }, async (request) => {
    const companyId = requireTenantId(request);
    const { page, limit, offset } = parsePaginationQuery(request.query);
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
    }).from(inventoryMovements)
      .innerJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
      .innerJoin(products, eq(inventoryMovements.productId, products.id))
      .where(eq(inventoryMovements.companyId, companyId))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      movements: rows.map((row) => ({
        ...row,
        movementLabel: movementLabel(row, labels),
        directionLabel: Number(row.quantityDelta) < 0 ? labels.transferOutLabel : labels.transferInLabel
      })),
      page,
      limit
    };
  });

  app.post('/inventory/adjustments', { preHandler: requireInventoryAccess }, async (request) => {
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
    try {
      await writeAuditLog({ request, action: 'inventory.adjustment', entityType: 'inventory_balance', entityId: result.id, newValues: { ...body, companyId } });
    } catch (err) {
      console.error('[AuditLog] Failed to write adjustment audit log:', err);
    }
    return { balance: result };
  });

  app.post('/inventory/resets', { preHandler: requireInventoryAccess }, async (request) => {
    const companyId = requireTenantId(request);
    const body = resetSchema.parse(request.body);
    await ensureWarehouse(companyId, body.warehouseId);
    await ensureProduct(companyId, body.productId);
    const targetQuantity = parseQuantity(body.targetQuantity, 'Target quantity', { nonNegative: true });

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.companyId, companyId), eq(inventoryBalances.warehouseId, body.warehouseId), eq(inventoryBalances.productId, body.productId))).for('update');
      const currentQty = Number(existing?.quantity ?? 0);
      const delta = targetQuantity - currentQty;
      const balance = await applyInventoryDelta(tx, { companyId, warehouseId: body.warehouseId, productId: body.productId, quantityDelta: delta });
      await tx.insert(inventoryMovements).values({ companyId, warehouseId: body.warehouseId, productId: body.productId, movementType: 'adjustment', quantityDelta: toQty(delta), referenceType: 'stock_reset', notes: body.notes ?? `Reset stok dari ${toQty(currentQty)} ke ${toQty(targetQuantity)}`, createdByUserId: request.user?.id });
      return { balance, currentQty, targetQuantity, delta };
    });
    try {
      await writeAuditLog({ request, action: 'inventory.reset', entityType: 'inventory_balance', entityId: result.balance.id, oldValues: { quantity: toQty(result.currentQty) }, newValues: { quantity: toQty(result.targetQuantity), delta: toQty(result.delta), companyId } });
    } catch (err) {
      console.error('[AuditLog] Failed to write reset audit log:', err);
    }
    return { balance: result.balance };
  });

  app.post('/inventory/movements/:id/reverse', { preHandler: requireInventoryAccess }, async (request) => {
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
    try {
      await writeAuditLog({ request, action: 'inventory.reverse', entityType: 'inventory_movement', entityId: movement.id, oldValues: movement, newValues: result.reversal });
    } catch (err) {
      console.error('[AuditLog] Failed to write reverse audit log:', err);
    }
    return result;
  });

  app.post('/inventory/transfers', { preHandler: requireInventoryAccess }, async (request) => {
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
        const [source] = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.companyId, companyId), eq(inventoryBalances.warehouseId, body.fromWarehouseId), eq(inventoryBalances.productId, item.productId))).for('update');
        const availableQty = Number(source?.quantity ?? 0) - Number(source?.reservedQuantity ?? 0);
        if (!source || availableQty < qty) throw Object.assign(new Error(`Stok source tidak cukup untuk produk ${item.productId}.`), { statusCode: 400 });
        await applyInventoryDelta(tx, { companyId, warehouseId: body.fromWarehouseId, productId: item.productId, quantityDelta: qty * -1 });
        await applyInventoryDelta(tx, { companyId, warehouseId: body.toWarehouseId, productId: item.productId, quantityDelta: qty });
        await tx.insert(inventoryMovements).values({ companyId, warehouseId: body.fromWarehouseId, productId: item.productId, movementType: 'transfer_out', quantityDelta: toQty(qty * -1), referenceType: 'stock_transfer', referenceId: transferReferenceId, notes: body.notes, createdByUserId: request.user?.id });
        await tx.insert(inventoryMovements).values({ companyId, warehouseId: body.toWarehouseId, productId: item.productId, movementType: 'transfer_in', quantityDelta: toQty(qty), referenceType: 'stock_transfer', referenceId: transferReferenceId, notes: body.notes, createdByUserId: request.user?.id });
      }
    });
    try {
      await writeAuditLog({ request, action: 'inventory.transfer', entityType: 'inventory_transfer', entityId: transferReferenceId, newValues: { ...body, companyId, transferReferenceId } });
    } catch (err) {
      console.error('[AuditLog] Failed to write transfer audit log:', err);
    }
    return { success: true, transferReferenceId };
  });
}
