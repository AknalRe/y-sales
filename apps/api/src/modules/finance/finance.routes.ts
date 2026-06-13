import type { FastifyInstance } from 'fastify';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { consignmentActions, consignmentItems, consignments, inventoryBalances, inventoryMovements, products, receivablePayments, receivables, salesTransactions, warehouses } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { parsePaginationQuery } from '../../utils/pagination.js';
import { writeAuditLog } from '../audit/audit.service.js';

const paymentSchema = z.object({
  amount: z.string().or(z.number()).transform(String),
  paymentMethod: z.enum(['cash', 'qris', 'credit', 'consignment']).default('cash'),
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const consignmentActionSchema = z.object({
  actionType: z.enum(['notify_withdrawal', 'extend', 'withdraw', 'reset_stock_zero', 'report_sold', 'collect_payment']),
  productId: z.string().uuid().optional(),
  quantity: z.string().or(z.number()).transform(String).optional(),
  amount: z.string().or(z.number()).transform(String).optional(),
  notes: z.string().optional(),
});

const consignmentQuerySchema = z.object({
  outletId: z.string().uuid().optional(),
  status: z.string().optional(),
});

const actionQuerySchema = z.object({
  status: z.enum(['pending_approval', 'approved', 'rejected']).default('pending_approval'),
});

const rejectActionSchema = z.object({ reason: z.string().min(2) });

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function parseQty(value: string | number | null | undefined, label: string) {
  const qty = Number(value ?? 0);
  if (!Number.isFinite(qty) || qty <= 0) throw Object.assign(new Error(`${label} harus lebih dari 0.`), { statusCode: 400 });
  return qty;
}

function toQty(value: number) {
  return value.toFixed(2);
}

async function getOutletConsignmentWarehouse(companyId: string, outletId: string) {
  const [warehouse] = await db.select().from(warehouses).where(and(
    eq(warehouses.companyId, companyId),
    eq(warehouses.outletId, outletId),
    eq(warehouses.type, 'outlet_consignment'),
  ));
  return warehouse;
}

async function getSalesWarehouse(companyId: string, userId: string) {
  const [warehouse] = await db.select().from(warehouses).where(and(
    eq(warehouses.companyId, companyId),
    eq(warehouses.ownerUserId, userId),
    eq(warehouses.type, 'sales_van'),
    eq(warehouses.status, 'active'),
  ));
  return warehouse;
}

async function applyDelta(tx: Tx, input: { companyId: string; warehouseId: string; productId: string; quantityDelta: number }) {
  const [existing] = await tx.select().from(inventoryBalances).where(and(
    eq(inventoryBalances.companyId, input.companyId),
    eq(inventoryBalances.warehouseId, input.warehouseId),
    eq(inventoryBalances.productId, input.productId),
  )).for('update');
  const nextQty = Number(existing?.quantity ?? 0) + input.quantityDelta;
  const reserved = Number(existing?.reservedQuantity ?? 0);
  if (nextQty < 0 || nextQty < reserved) throw Object.assign(new Error('Stok konsinyasi tidak cukup untuk aksi ini.'), { statusCode: 400 });

  if (existing) {
    await tx.update(inventoryBalances).set({ quantity: toQty(nextQty), updatedAt: new Date() }).where(eq(inventoryBalances.id, existing.id));
  } else {
    await tx.insert(inventoryBalances).values({ companyId: input.companyId, warehouseId: input.warehouseId, productId: input.productId, quantity: toQty(nextQty), reservedQuantity: '0.00' });
  }
}

async function allItemsSettled(tx: Tx, consignmentId: string) {
  const rows = await tx.select().from(consignmentItems).where(eq(consignmentItems.consignmentId, consignmentId));
  return rows.every((item) => Number(item.remainingQuantity) <= 0);
}

export async function financeRoutes(app: FastifyInstance) {
  // List receivables — filtered by companyId via salesTransactions join
  app.get('/receivables', { preHandler: requirePermission('receivables.view') }, async (request) => {
    const companyId = requireTenantId(request);
    const { page, limit, offset } = parsePaginationQuery(request.query);
    const rows = await db
      .select({
        id: receivables.id,
        transactionId: receivables.transactionId,
        outletId: receivables.outletId,
        customerType: receivables.customerType,
        principalAmount: receivables.principalAmount,
        paidAmount: receivables.paidAmount,
        outstandingAmount: receivables.outstandingAmount,
        dueDate: receivables.dueDate,
        status: receivables.status,
        createdAt: receivables.createdAt,
        updatedAt: receivables.updatedAt,
      })
      .from(receivables)
      .innerJoin(salesTransactions, eq(receivables.transactionId, salesTransactions.id))
      .where(eq(salesTransactions.companyId, companyId))
      .orderBy(desc(receivables.createdAt))
      .limit(limit)
      .offset(offset);
    return { receivables: rows, page, limit };
  });

  app.post('/receivables/:id/payments', { preHandler: requirePermission('receivables.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = paymentSchema.parse(request.body);
    const [joined] = await db.select().from(receivables)
      .innerJoin(salesTransactions, eq(receivables.transactionId, salesTransactions.id))
      .where(and(eq(receivables.id, params.id), eq(salesTransactions.companyId, companyId)));
    const receivable = joined?.receivables;
    if (!receivable) throw Object.assign(new Error('Piutang tidak ditemukan.'), { statusCode: 404 });
    const amount = Number(body.amount);
    const result = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(receivables)
        .innerJoin(salesTransactions, eq(receivables.transactionId, salesTransactions.id))
        .where(and(eq(receivables.id, params.id), eq(salesTransactions.companyId, companyId)))
        .for('update');
      const lockedReceivable = locked?.receivables;
      if (!lockedReceivable) throw Object.assign(new Error('Piutang tidak ditemukan.'), { statusCode: 404 });
      const nextPaid = Number(lockedReceivable.paidAmount) + amount;
      const outstanding = Math.max(0, Number(lockedReceivable.principalAmount) - nextPaid);
      const status = outstanding <= 0 ? 'paid' : 'partial';
      const [payment] = await tx.insert(receivablePayments).values({ receivableId: lockedReceivable.id, amount: body.amount, paymentMethod: body.paymentMethod, paidAt: body.paidAt ? new Date(body.paidAt) : new Date(), receivedByUserId: request.user?.id, notes: body.notes }).returning();
      const [updated] = await tx.update(receivables).set({ paidAmount: nextPaid.toFixed(2), outstandingAmount: outstanding.toFixed(2), status, updatedAt: new Date() }).where(eq(receivables.id, lockedReceivable.id)).returning();
      return { payment, receivable: updated };
    });
    try {
      await writeAuditLog({ request, action: 'receivable.payment_created', entityType: 'receivable_payment', entityId: result.payment.id, newValues: result.payment });
    } catch (err) {
      console.error('[AuditLog] Failed to write receivable payment creation audit log:', err);
    }
    return result;
  });

  // List consignments — filtered by companyId via salesTransactions join
  app.get('/consignments', { preHandler: requirePermission('receivables.view') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = consignmentQuerySchema.parse(request.query);
    const { page, limit, offset } = parsePaginationQuery(request.query);
    const conditions = [eq(salesTransactions.companyId, companyId)];
    if (query.outletId) conditions.push(eq(consignments.outletId, query.outletId));
    if (query.status) conditions.push(eq(consignments.status, query.status as any));
    const rows = await db
      .select()
      .from(consignments)
      .innerJoin(salesTransactions, eq(consignments.transactionId, salesTransactions.id))
      .where(and(...conditions))
      .orderBy(desc(consignments.createdAt))
      .limit(limit)
      .offset(offset);
    const consignmentRows = rows.map(r => r.consignments);
    const consignmentIds = consignmentRows.map(c => c.id);
    const allItems = consignmentIds.length
      ? await db.select({
        id: consignmentItems.id,
        consignmentId: consignmentItems.consignmentId,
        productId: consignmentItems.productId,
        productSku: products.sku,
        productName: products.name,
        quantity: consignmentItems.quantity,
        paidQuantity: consignmentItems.paidQuantity,
        remainingQuantity: consignmentItems.remainingQuantity,
      }).from(consignmentItems).innerJoin(products, eq(consignmentItems.productId, products.id)).where(inArray(consignmentItems.consignmentId, consignmentIds))
      : [];
    const grouped = new Map(allItems.map(i => [i.consignmentId, [] as typeof allItems]));
    for (const item of allItems) grouped.get(item.consignmentId)!.push(item);
    const result = consignmentRows.map(c => ({ ...c, items: grouped.get(c.id) ?? [] }));
    return { consignments: result, page, limit };
  });

  app.get('/sales/consignments', { preHandler: requirePermission('visits.execute') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = consignmentQuerySchema.parse(request.query);
    if (!query.outletId) throw Object.assign(new Error('outletId wajib diisi.'), { statusCode: 400 });
    const rows = await db.select().from(consignments).innerJoin(salesTransactions, eq(consignments.transactionId, salesTransactions.id)).where(and(
      eq(salesTransactions.companyId, companyId),
      eq(consignments.outletId, query.outletId),
      eq(consignments.status, 'active'),
    )).orderBy(desc(consignments.createdAt));
    const consignmentIds = rows.map(r => r.consignments.id);
    const allItems = consignmentIds.length
      ? await db.select({
        id: consignmentItems.id,
        consignmentId: consignmentItems.consignmentId,
        productId: consignmentItems.productId,
        productSku: products.sku,
        productName: products.name,
        quantity: consignmentItems.quantity,
        paidQuantity: consignmentItems.paidQuantity,
        remainingQuantity: consignmentItems.remainingQuantity,
      }).from(consignmentItems).innerJoin(products, eq(consignmentItems.productId, products.id)).where(inArray(consignmentItems.consignmentId, consignmentIds))
      : [];
    const grouped = new Map(allItems.map(i => [i.consignmentId, [] as typeof allItems]));
    for (const item of allItems) grouped.get(item.consignmentId)!.push(item);
    const result = rows.map(r => ({
      ...r.consignments,
      items: (grouped.get(r.consignments.id) ?? []).filter((item) => Number(item.remainingQuantity) > 0),
    }));
    return { consignments: result.filter((item) => item.items.length > 0) };
  });

  app.post('/sales/consignments/:id/actions', { preHandler: requirePermission('visits.execute') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = consignmentActionSchema.parse(request.body);
    const [row] = await db.select().from(consignments).innerJoin(salesTransactions, eq(consignments.transactionId, salesTransactions.id)).where(and(eq(consignments.id, params.id), eq(salesTransactions.companyId, companyId)));
    if (!row) throw Object.assign(new Error('Konsinyasi tidak ditemukan.'), { statusCode: 404 });
    if (['report_sold', 'withdraw'].includes(body.actionType)) {
      if (!body.productId) throw Object.assign(new Error('Produk wajib dipilih.'), { statusCode: 400 });
      parseQty(body.quantity, 'Quantity');
    }
    if (body.actionType === 'collect_payment' && !body.amount) throw Object.assign(new Error('Nominal pembayaran wajib diisi.'), { statusCode: 400 });

    const [action] = await db.insert(consignmentActions).values({
      consignmentId: params.id,
      actionType: body.actionType,
      productId: body.productId,
      quantity: body.quantity,
      amount: body.amount,
      approvalStatus: 'pending_approval',
      notes: body.notes,
      performedByUserId: request.user?.id,
    }).returning();
    try {
      await writeAuditLog({ request, action: 'consignment.action_created', entityType: 'consignment_action', entityId: action.id, newValues: action });
    } catch (err) {
      console.error('[AuditLog] Failed to write consignment action creation audit log:', err);
    }
    return { action };
  });

  app.get('/consignment-actions', { preHandler: requirePermission('receivables.view') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = actionQuerySchema.parse(request.query);
    const rows = await db.select({
      id: consignmentActions.id,
      consignmentId: consignmentActions.consignmentId,
      outletId: consignments.outletId,
      actionType: consignmentActions.actionType,
      productId: consignmentActions.productId,
      productSku: products.sku,
      productName: products.name,
      quantity: consignmentActions.quantity,
      amount: consignmentActions.amount,
      approvalStatus: consignmentActions.approvalStatus,
      notes: consignmentActions.notes,
      performedByUserId: consignmentActions.performedByUserId,
      performedAt: consignmentActions.performedAt,
      dueDate: consignments.dueDate,
    })
      .from(consignmentActions)
      .innerJoin(consignments, eq(consignmentActions.consignmentId, consignments.id))
      .innerJoin(salesTransactions, eq(consignments.transactionId, salesTransactions.id))
      .leftJoin(products, eq(consignmentActions.productId, products.id))
      .where(and(eq(salesTransactions.companyId, companyId), eq(consignmentActions.approvalStatus, query.status)))
      .orderBy(desc(consignmentActions.performedAt))
      .limit(200);
    return { actions: rows };
  });

  app.post('/consignment-actions/:id/approve', { preHandler: requirePermission('receivables.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [row] = await db.select({ action: consignmentActions, consignment: consignments, transaction: salesTransactions })
      .from(consignmentActions)
      .innerJoin(consignments, eq(consignmentActions.consignmentId, consignments.id))
      .innerJoin(salesTransactions, eq(consignments.transactionId, salesTransactions.id))
      .where(and(eq(consignmentActions.id, params.id), eq(salesTransactions.companyId, companyId)));
    if (!row) throw Object.assign(new Error('Action konsinyasi tidak ditemukan.'), { statusCode: 404 });
    if (row.action.approvalStatus !== 'pending_approval') throw Object.assign(new Error('Action sudah diproses.'), { statusCode: 400 });

    const result = await db.transaction(async (tx) => {
      if (['report_sold', 'withdraw'].includes(row.action.actionType)) {
        if (!row.action.productId) throw Object.assign(new Error('Action tidak memiliki produk.'), { statusCode: 400 });
        const qty = parseQty(row.action.quantity, 'Quantity');
        const [item] = await tx.select().from(consignmentItems).where(and(eq(consignmentItems.consignmentId, row.consignment.id), eq(consignmentItems.productId, row.action.productId)));
        if (!item || Number(item.remainingQuantity) < qty) throw Object.assign(new Error('Sisa konsinyasi tidak cukup.'), { statusCode: 400 });
        const outletWarehouse = await getOutletConsignmentWarehouse(companyId, row.consignment.outletId);
        if (!outletWarehouse) throw Object.assign(new Error('Warehouse konsinyasi outlet tidak ditemukan.'), { statusCode: 400 });

        if (row.action.actionType === 'report_sold') {
          await tx.update(consignmentItems).set({
            paidQuantity: sql`${consignmentItems.paidQuantity} + ${toQty(qty)}`,
            remainingQuantity: sql`${consignmentItems.remainingQuantity} - ${toQty(qty)}`,
          }).where(eq(consignmentItems.id, item.id));
        } else {
          await tx.update(consignmentItems).set({
            remainingQuantity: sql`${consignmentItems.remainingQuantity} - ${toQty(qty)}`,
          }).where(eq(consignmentItems.id, item.id));
        }

        await applyDelta(tx, { companyId, warehouseId: outletWarehouse.id, productId: row.action.productId, quantityDelta: qty * -1 });
        await tx.insert(inventoryMovements).values({
          companyId,
          warehouseId: outletWarehouse.id,
          productId: row.action.productId,
          movementType: row.action.actionType === 'report_sold' ? 'sale' : 'transfer_out',
          quantityDelta: toQty(qty * -1),
          referenceType: 'consignment_action',
          referenceId: row.action.id,
          notes: row.action.actionType === 'report_sold' ? 'Barang konsinyasi dilaporkan terjual' : 'Barang konsinyasi ditarik dari outlet',
          createdByUserId: request.user?.id,
        });

        if (row.action.actionType === 'withdraw') {
          const salesWarehouse = row.action.performedByUserId ? await getSalesWarehouse(companyId, row.action.performedByUserId) : null;
          if (!salesWarehouse) throw Object.assign(new Error('Gudang sales penarik barang tidak ditemukan.'), { statusCode: 400 });
          await applyDelta(tx, { companyId, warehouseId: salesWarehouse.id, productId: row.action.productId, quantityDelta: qty });
          await tx.insert(inventoryMovements).values({
            companyId,
            warehouseId: salesWarehouse.id,
            productId: row.action.productId,
            movementType: 'transfer_in',
            quantityDelta: toQty(qty),
            referenceType: 'consignment_action',
            referenceId: row.action.id,
            notes: 'Barang konsinyasi ditarik masuk ke stok sales',
            createdByUserId: request.user?.id,
          });
        }
      }

      const settled = await allItemsSettled(tx, row.consignment.id);
      const nextStatus = row.action.actionType === 'extend' ? 'extended' : settled ? (row.action.actionType === 'withdraw' ? 'withdrawn' : 'paid') : row.consignment.status;
      const [consignment] = await tx.update(consignments).set({
        status: nextStatus,
        extendedUntil: row.action.actionType === 'extend'
          ? new Date(new Date(row.consignment.dueDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          : row.consignment.extendedUntil,
        updatedAt: new Date(),
      }).where(eq(consignments.id, row.consignment.id)).returning();
      const [action] = await tx.update(consignmentActions).set({
        approvalStatus: 'approved',
        approvedByUserId: request.user?.id,
        approvedAt: new Date(),
      }).where(eq(consignmentActions.id, row.action.id)).returning();
      return { action, consignment };
    });
    try {
      await writeAuditLog({ request, action: 'consignment.action_approved', entityType: 'consignment_action', entityId: result.action.id, oldValues: row.action, newValues: result.action });
    } catch (err) {
      console.error('[AuditLog] Failed to write consignment action approval audit log:', err);
    }
    return result;
  });

  app.post('/consignment-actions/:id/reject', { preHandler: requirePermission('receivables.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = rejectActionSchema.parse(request.body);
    const [row] = await db.select({ actionId: consignmentActions.id })
      .from(consignmentActions)
      .innerJoin(consignments, eq(consignmentActions.consignmentId, consignments.id))
      .innerJoin(salesTransactions, eq(consignments.transactionId, salesTransactions.id))
      .where(and(eq(consignmentActions.id, params.id), eq(salesTransactions.companyId, companyId)));
    if (!row) throw Object.assign(new Error('Action konsinyasi tidak ditemukan.'), { statusCode: 404 });
    const [action] = await db.update(consignmentActions).set({
      approvalStatus: 'rejected',
      approvedByUserId: request.user?.id,
      approvedAt: new Date(),
      rejectionReason: body.reason,
    }).where(eq(consignmentActions.id, params.id)).returning();
    try {
      await writeAuditLog({ request, action: 'consignment.action_rejected', entityType: 'consignment_action', entityId: action.id, newValues: action });
    } catch (err) {
      console.error('[AuditLog] Failed to write consignment action rejection audit log:', err);
    }
    return { action };
  });
}
