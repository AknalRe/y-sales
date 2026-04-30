import type { FastifyInstance } from 'fastify';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  consignments,
  consignmentItems,
  inventoryBalances,
  inventoryMovements,
  products,
  receivables,
  salesTransactionItems,
  salesTransactions,
  visitSessions,
  warehouses,
} from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.string().or(z.number()).transform(String),
  unitPrice: z.string().or(z.number()).transform(String),
});

const orderSchema = z.object({
  outletId: z.string().uuid().optional(),
  visitSessionId: z.string().uuid().optional(),
  customerType: z.enum(['store', 'agent', 'end_user']).default('store'),
  paymentMethod: z.enum(['cash', 'qris', 'credit', 'consignment']).default('cash'),
  clientRequestId: z.string().uuid(),
  sourceWarehouseId: z.string().uuid().optional(),
  dueDate: z.string().date().optional(),
  items: z.array(itemSchema).min(1),
});

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export async function salesRoutes(app: FastifyInstance) {
  app.get('/sales/orders', { preHandler: requirePermission('sales.view') }, async (request) => {
    const companyId = requireTenantId(request);
    const rows = await db.select().from(salesTransactions).where(eq(salesTransactions.companyId, companyId)).orderBy(desc(salesTransactions.createdAt)).limit(100);
    return { orders: rows };
  });

  app.post('/sales/orders', { preHandler: requirePermission('sales.order.create') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = orderSchema.parse(request.body);
    const total = body.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0).toFixed(2);

    const [existing] = await db.select().from(salesTransactions).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.clientRequestId, body.clientRequestId)));
    if (existing) return { order: existing, idempotent: true };

    let visit: typeof visitSessions.$inferSelect | undefined;
    if (body.visitSessionId) {
      [visit] = await db.select().from(visitSessions).where(and(eq(visitSessions.companyId, companyId), eq(visitSessions.id, body.visitSessionId), eq(visitSessions.salesUserId, request.user!.id)));
      if (!visit) throw Object.assign(new Error('Visit session tidak ditemukan untuk sales ini.'), { statusCode: 404 });
      if (visit.status !== 'open') throw Object.assign(new Error('Order hanya bisa dibuat pada visit yang masih open.'), { statusCode: 400 });
      if (body.outletId && visit.outletId !== body.outletId) throw Object.assign(new Error('Outlet order harus sama dengan outlet visit.'), { statusCode: 400 });
    }

    const order = await db.transaction(async (tx) => {
      const [created] = await tx.insert(salesTransactions).values({
        companyId,
        transactionNo: `SO-${Date.now()}`,
        salesUserId: request.user!.id,
        outletId: body.outletId ?? visit?.outletId,
        visitSessionId: body.visitSessionId,
        sourceWarehouseId: body.sourceWarehouseId,
        customerType: body.customerType,
        paymentMethod: body.paymentMethod,
        subtotalAmount: total,
        totalAmount: total,
        status: 'pending_approval',
        paymentStatus: body.paymentMethod === 'cash' || body.paymentMethod === 'qris' ? 'paid' : 'unpaid',
        submittedAt: new Date(),
        clientRequestId: body.clientRequestId,
      }).returning();

      for (const item of body.items) {
        const lineTotal = (Number(item.quantity) * Number(item.unitPrice)).toFixed(2);
        await tx.insert(salesTransactionItems).values({
          companyId,
          transactionId: created.id,
          productId: item.productId,
          quantity: item.quantity,
          reservedQuantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal,
        });
      }

      return created;
    });

    return { order };
  });

  app.post('/sales/orders/:id/approve', { preHandler: requirePermission('sales.order.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [order] = await db.select().from(salesTransactions).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.id, params.id)));
    if (!order) return { message: 'Order tidak ditemukan' };

    const [stockWarehouse] = order.sourceWarehouseId
      ? await db.select().from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.id, order.sourceWarehouseId)))
      : await db.select().from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.code, 'WH-MAIN')));
    if (!stockWarehouse) throw new Error('Gudang sumber stok belum tersedia');

    const items = await db.select().from(salesTransactionItems).where(and(eq(salesTransactionItems.companyId, companyId), eq(salesTransactionItems.transactionId, order.id)));

    await db.transaction(async (tx) => {
      for (const item of items) {
        const [balance] = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.companyId, companyId), eq(inventoryBalances.warehouseId, stockWarehouse.id), eq(inventoryBalances.productId, item.productId)));
        if (!balance || Number(balance.quantity) < Number(item.quantity)) {
          const [product] = await tx.select().from(products).where(and(eq(products.companyId, companyId), eq(products.id, item.productId)));
          throw new Error(`Stok tidak cukup untuk ${product?.name ?? item.productId}`);
        }
        await tx.update(inventoryBalances).set({
          quantity: sql`${inventoryBalances.quantity} - ${item.quantity}`,
          updatedAt: new Date(),
        }).where(eq(inventoryBalances.id, balance.id));
        await tx.update(salesTransactionItems).set({ releasedQuantity: item.quantity }).where(eq(salesTransactionItems.id, item.id));
        await tx.insert(inventoryMovements).values({
          companyId,
          warehouseId: stockWarehouse.id,
          productId: item.productId,
          movementType: 'sale',
          quantityDelta: `-${item.quantity}`,
          referenceType: 'sales_transaction',
          referenceId: order.id,
          notes: 'Release stok setelah approval admin',
          createdByUserId: request.user?.id,
        });
      }

      if (order.paymentMethod === 'credit') {
        await tx.insert(receivables).values({
          transactionId: order.id,
          outletId: order.outletId,
          customerType: order.customerType,
          principalAmount: order.totalAmount,
          outstandingAmount: order.totalAmount,
          dueDate: addDays(new Date(), 14),
          status: 'open',
        });
      }

      if (order.paymentMethod === 'consignment' && order.outletId) {
        const [consignment] = await tx.insert(consignments).values({
          transactionId: order.id,
          outletId: order.outletId,
          salesUserId: order.salesUserId,
          startDate: new Date().toISOString().slice(0, 10),
          dueDate: addDays(new Date(), 14),
          authorizedByUserId: request.user!.id,
          status: 'active',
        }).returning();
        for (const item of items) {
          await tx.insert(consignmentItems).values({
            consignmentId: consignment.id,
            productId: item.productId,
            quantity: item.quantity,
            remainingQuantity: item.quantity,
          });
        }
      }

      await tx.update(salesTransactions).set({
        status: 'closed',
        approvedByUserId: request.user!.id,
        approvedAt: new Date(),
        stockReleasedAt: new Date(),
        closedByUserId: request.user!.id,
        closedAt: new Date(),
        updatedAt: new Date(),
      }).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.id, order.id)));
    });

    return { success: true };
  });
}
