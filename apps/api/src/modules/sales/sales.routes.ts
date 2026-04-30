import type { FastifyInstance } from 'fastify';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { inventoryBalances, inventoryMovements, products, salesTransactionItems, salesTransactions, warehouses } from '@yuksales/db/schema';
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
  customerType: z.enum(['store', 'agent', 'end_user']).default('store'),
  paymentMethod: z.enum(['cash', 'qris', 'consignment']).default('cash'),
  clientRequestId: z.string().uuid(),
  items: z.array(itemSchema).min(1),
});

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

    const order = await db.transaction(async (tx) => {
      const [created] = await tx.insert(salesTransactions).values({
        companyId,
        transactionNo: `SO-${Date.now()}`,
        salesUserId: request.user!.id,
        outletId: body.outletId,
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
    const [mainWarehouse] = await db.select().from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.code, 'WH-MAIN')));
    if (!mainWarehouse) throw new Error('Gudang utama belum tersedia');

    const [order] = await db.select().from(salesTransactions).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.id, params.id)));
    if (!order) return { message: 'Order tidak ditemukan' };

    const items = await db.select().from(salesTransactionItems).where(and(eq(salesTransactionItems.companyId, companyId), eq(salesTransactionItems.transactionId, order.id)));

    await db.transaction(async (tx) => {
      for (const item of items) {
        const [balance] = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.companyId, companyId), eq(inventoryBalances.warehouseId, mainWarehouse.id), eq(inventoryBalances.productId, item.productId)));
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
          warehouseId: mainWarehouse.id,
          productId: item.productId,
          movementType: 'sale',
          quantityDelta: `-${item.quantity}`,
          referenceType: 'sales_transaction',
          referenceId: order.id,
          notes: 'Release stok setelah approval admin',
          createdByUserId: request.user?.id,
        });
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


