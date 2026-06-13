import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
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
  mediaFiles,
  outlets,
  transactionNotePhotos,
} from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { authenticate, requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { getGeneralSettings } from '../../utils/settings.js';
import { writeAuditLog } from '../audit/audit.service.js';

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.string().or(z.number()).transform(String),
  unitPrice: z.string().or(z.number()).transform(String),
});

const orderSchema = z.object({
  outletId: z.string().uuid().optional(),
  visitSessionId: z.string().uuid(),
  customerType: z.enum(['store', 'agent', 'end_user']).default('store'),
  paymentMethod: z.enum(['cash', 'qris', 'credit', 'consignment']).default('cash'),
  clientRequestId: z.string().uuid(),
  sourceWarehouseId: z.string().uuid().optional(),
  dueDate: z.string().date().optional(),
  items: z.array(itemSchema).min(1),
});

const rejectOrderSchema = z.object({
  reason: z.string().min(3).optional(),
});

const orderListQuerySchema = z.object({
  status: z.enum(['draft', 'submitted', 'pending_approval', 'approved', 'validated', 'rejected', 'cancelled', 'closed']).optional(),
  noteStatus: z.enum(['pending', 'approved', 'settlement', 'rejected']).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  salesUserId: z.string().uuid().optional(),
});

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function outletConsignmentWarehouseCode(outletId: string) {
  return `WH-KO-${outletId.slice(0, 8).toUpperCase()}`;
}

async function ensureOutletConsignmentWarehouse(tx: Tx, input: { companyId: string; outletId: string }) {
  const [existing] = await tx.select().from(warehouses).where(and(
    eq(warehouses.companyId, input.companyId),
    eq(warehouses.outletId, input.outletId),
    eq(warehouses.type, 'outlet_consignment'),
  ));
  if (existing) return existing;

  const code = outletConsignmentWarehouseCode(input.outletId);
  const [warehouse] = await tx.insert(warehouses).values({
    companyId: input.companyId,
    code,
    name: `Konsinyasi Outlet ${input.outletId.slice(0, 8).toUpperCase()}`,
    type: 'outlet_consignment',
    outletId: input.outletId,
    status: 'active',
  }).onConflictDoUpdate({
    target: [warehouses.companyId, warehouses.code],
    set: { type: 'outlet_consignment', outletId: input.outletId, status: 'active' },
  }).returning();
  return warehouse;
}

function canReviewSalesOrders(user: any) {
  return user.isSuperAdmin
    || user.roleCode === 'ADMINISTRATOR'
    || ['sales.order.review', 'invoice.review', 'reports.view', 'visits.review'].some((permission) => user.permissions.includes(permission));
}

function canReadSalesOrders(user: any) {
  return canReviewSalesOrders(user) || user.permissions.includes('sales.view');
}

function canApproveSalesOrders(user: any) {
  return user.isSuperAdmin
    || user.roleCode === 'ADMINISTRATOR'
    || ['sales.order.review', 'invoice.review'].some((permission) => user.permissions.includes(permission));
}

function noteStatusSql() {
  return sql<string>`case
    when ${salesTransactions.status} in ('submitted', 'pending_approval') then 'pending'
    when ${salesTransactions.status} = 'approved' then 'approved'
    when ${salesTransactions.status} in ('validated', 'closed') then 'settlement'
    when ${salesTransactions.status} = 'rejected' then 'rejected'
    else ${salesTransactions.status}::text
  end`;
}

export async function salesRoutes(app: FastifyInstance) {
  app.get('/sales/orders', { preHandler: authenticate }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const query = orderListQuerySchema.parse(request.query);
    const user = request.user!;
    if (!canReadSalesOrders(user)) return reply.status(403).send({ message: 'Permission denied', permission: 'sales.view' });
    const canReview = canReviewSalesOrders(user);
    const conditions = [eq(salesTransactions.companyId, companyId)];
    if (query.noteStatus === 'pending') conditions.push(inArray(salesTransactions.status, ['submitted', 'pending_approval']));
    else if (query.noteStatus === 'approved') conditions.push(eq(salesTransactions.status, 'approved'));
    else if (query.noteStatus === 'settlement') conditions.push(inArray(salesTransactions.status, ['validated', 'closed']));
    else if (query.noteStatus === 'rejected') conditions.push(eq(salesTransactions.status, 'rejected'));
    else if (query.status) conditions.push(eq(salesTransactions.status, query.status));
    if (query.from) conditions.push(gte(salesTransactions.createdAt, new Date(`${query.from}T00:00:00.000Z`)));
    if (query.to) conditions.push(lte(salesTransactions.createdAt, new Date(`${query.to}T23:59:59.999Z`)));
    if (canReview && query.salesUserId) {
      conditions.push(eq(salesTransactions.salesUserId, query.salesUserId));
    } else if (!canReview) {
      conditions.push(eq(salesTransactions.salesUserId, user.id));
    }

    const photoStats = db
      .select({
        transactionId: transactionNotePhotos.transactionId,
        proofPhotoCount: sql<number>`count(${transactionNotePhotos.id})::int`.as('proof_photo_count'),
        photoUrl: sql<string | null>`max(${mediaFiles.fileUrl})`.as('photo_url'),
      })
      .from(transactionNotePhotos)
      .leftJoin(mediaFiles, eq(transactionNotePhotos.mediaFileId, mediaFiles.id))
      .where(eq(transactionNotePhotos.companyId, companyId))
      .groupBy(transactionNotePhotos.transactionId)
      .as('photo_stats');

    const rows = await db
      .select({
        id: salesTransactions.id,
        companyId: salesTransactions.companyId,
        transactionNo: salesTransactions.transactionNo,
        salesUserId: salesTransactions.salesUserId,
        outletId: salesTransactions.outletId,
        visitSessionId: salesTransactions.visitSessionId,
        outletName: outlets.name,
        customerType: salesTransactions.customerType,
        paymentMethod: salesTransactions.paymentMethod,
        subtotalAmount: salesTransactions.subtotalAmount,
        discountAmount: salesTransactions.discountAmount,
        totalAmount: salesTransactions.totalAmount,
        status: salesTransactions.status,
        noteStatus: noteStatusSql(),
        paymentStatus: salesTransactions.paymentStatus,
        submittedAt: salesTransactions.submittedAt,
        approvedAt: salesTransactions.approvedAt,
        createdAt: salesTransactions.createdAt,
        photoUrl: photoStats.photoUrl,
        proofPhotoCount: sql<number>`coalesce(${photoStats.proofPhotoCount}, 0)::int`,
      })
      .from(salesTransactions)
      .leftJoin(photoStats, eq(salesTransactions.id, photoStats.transactionId))
      .leftJoin(outlets, eq(salesTransactions.outletId, outlets.id))
      .where(and(...conditions))
      .orderBy(desc(salesTransactions.createdAt))
      .limit(100);

    return { orders: rows };
  });

  app.get('/sales/orders/:id', { preHandler: authenticate }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const user = request.user!;
    if (!canReadSalesOrders(user)) return reply.status(403).send({ message: 'Permission denied', permission: 'sales.view' });
    const canReview = canReviewSalesOrders(user);
    const conditions = [eq(salesTransactions.companyId, companyId), eq(salesTransactions.id, params.id)];
    if (!canReview) conditions.push(eq(salesTransactions.salesUserId, user.id));

    const [order] = await db
      .select({
        id: salesTransactions.id,
        companyId: salesTransactions.companyId,
        transactionNo: salesTransactions.transactionNo,
        salesUserId: salesTransactions.salesUserId,
        outletId: salesTransactions.outletId,
        outletName: outlets.name,
        visitSessionId: salesTransactions.visitSessionId,
        customerType: salesTransactions.customerType,
        paymentMethod: salesTransactions.paymentMethod,
        subtotalAmount: salesTransactions.subtotalAmount,
        discountAmount: salesTransactions.discountAmount,
        totalAmount: salesTransactions.totalAmount,
        status: salesTransactions.status,
        noteStatus: noteStatusSql(),
        paymentStatus: salesTransactions.paymentStatus,
        submittedAt: salesTransactions.submittedAt,
        approvedAt: salesTransactions.approvedAt,
        rejectionReason: salesTransactions.rejectionReason,
        createdAt: salesTransactions.createdAt,
      })
      .from(salesTransactions)
      .leftJoin(outlets, eq(salesTransactions.outletId, outlets.id))
      .where(and(...conditions))
      .limit(1);

    if (!order) return reply.status(404).send({ message: 'Transaksi tidak ditemukan.' });

    const items = await db
      .select({
        id: salesTransactionItems.id,
        productId: salesTransactionItems.productId,
        productName: products.name,
        productSku: products.sku,
        quantity: salesTransactionItems.quantity,
        unitPrice: salesTransactionItems.unitPrice,
        discountAmount: salesTransactionItems.discountAmount,
        lineTotal: salesTransactionItems.lineTotal,
      })
      .from(salesTransactionItems)
      .innerJoin(products, eq(salesTransactionItems.productId, products.id))
      .where(and(eq(salesTransactionItems.companyId, companyId), eq(salesTransactionItems.transactionId, order.id)));

    const photos = await db
      .select({
        id: transactionNotePhotos.id,
        mediaFileId: transactionNotePhotos.mediaFileId,
        fileUrl: mediaFiles.fileUrl,
        verificationStatus: transactionNotePhotos.verificationStatus,
        capturedAt: transactionNotePhotos.capturedAt,
      })
      .from(transactionNotePhotos)
      .innerJoin(mediaFiles, eq(transactionNotePhotos.mediaFileId, mediaFiles.id))
      .where(and(eq(transactionNotePhotos.companyId, companyId), eq(transactionNotePhotos.transactionId, order.id)))
      .orderBy(desc(transactionNotePhotos.createdAt));

    return { order: { ...order, items, photos } };
  });

  app.post('/sales/orders', { preHandler: requirePermission('sales.order.create') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = orderSchema.parse(request.body);
    const total = body.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0).toFixed(2);

    const [existing] = await db.select().from(salesTransactions).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.clientRequestId, body.clientRequestId)));
    if (existing) return { order: existing, idempotent: true };

    const [visit] = await db.select().from(visitSessions).where(and(eq(visitSessions.companyId, companyId), eq(visitSessions.id, body.visitSessionId), eq(visitSessions.salesUserId, request.user!.id)));
    if (!visit) throw Object.assign(new Error('Visit session tidak ditemukan untuk sales ini.'), { statusCode: 404 });
    if (visit.status !== 'open') throw Object.assign(new Error('Order hanya bisa dibuat pada visit yang masih open.'), { statusCode: 400 });
    if (body.outletId && visit.outletId !== body.outletId) throw Object.assign(new Error('Outlet order harus sama dengan outlet visit.'), { statusCode: 400 });

    const [stockWarehouse] = body.sourceWarehouseId
      ? await db.select().from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.id, body.sourceWarehouseId), eq(warehouses.type, 'sales_van'), eq(warehouses.ownerUserId, request.user!.id)))
      : await db.select().from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.type, 'sales_van'), eq(warehouses.ownerUserId, request.user!.id), eq(warehouses.status, 'active')));
    if (!stockWarehouse) throw Object.assign(new Error('Stok sales belum tersedia untuk user ini.'), { statusCode: 400 });

    const order = await db.transaction(async (tx) => {
      const [created] = await tx.insert(salesTransactions).values({
        companyId,
        transactionNo: `SO-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        salesUserId: request.user!.id,
        outletId: visit.outletId,
        visitSessionId: body.visitSessionId,
        sourceWarehouseId: stockWarehouse.id,
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
        const [balance] = await tx.select().from(inventoryBalances).where(and(
          eq(inventoryBalances.companyId, companyId),
          eq(inventoryBalances.warehouseId, stockWarehouse.id),
          eq(inventoryBalances.productId, item.productId),
        ));
        const availableQuantity = Number(balance?.quantity ?? 0) - Number(balance?.reservedQuantity ?? 0);
        if (!balance || availableQuantity < Number(item.quantity)) {
          const [product] = await tx.select().from(products).where(and(eq(products.companyId, companyId), eq(products.id, item.productId)));
          throw Object.assign(new Error(`Stok sales tidak cukup untuk ${product?.name ?? item.productId}`), { statusCode: 400 });
        }
        await tx.update(inventoryBalances).set({
          reservedQuantity: sql`${inventoryBalances.reservedQuantity} + ${item.quantity}`,
          updatedAt: new Date(),
        }).where(eq(inventoryBalances.id, balance.id));
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

    await writeAuditLog({ request, action: 'sales.order.created', entityType: 'sales_transaction', entityId: order.id, newValues: order });
    return { order };
  });

  app.post('/sales/orders/:id/approve', { preHandler: authenticate }, async (request, reply) => {
    if (!canApproveSalesOrders(request.user!)) return reply.status(403).send({ message: 'Permission denied', permission: 'sales.order.review' });
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [order] = await db.select().from(salesTransactions).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.id, params.id)));
    if (!order) throw Object.assign(new Error('Order tidak ditemukan.'), { statusCode: 404 });
    if (order.status !== 'pending_approval') throw Object.assign(new Error('Order tidak dalam status pending approval.'), { statusCode: 400 });

    const settings = await getGeneralSettings(companyId);
    if (settings.requireTransactionProofPhoto) {
      const [proofCount] = await db.select({ count: sql<number>`count(*)::int` }).from(transactionNotePhotos).where(and(eq(transactionNotePhotos.companyId, companyId), eq(transactionNotePhotos.transactionId, order.id)));
      if (!proofCount?.count) throw Object.assign(new Error('Bukti foto transaksi wajib diupload sebelum approval.'), { statusCode: 400 });
    }

    const [stockWarehouse] = order.sourceWarehouseId
      ? await db.select().from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.id, order.sourceWarehouseId)))
      : await db.select().from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.type, 'sales_van'), eq(warehouses.ownerUserId, order.salesUserId)));
    if (!stockWarehouse) throw Object.assign(new Error('Gudang sumber stok sales belum tersedia. Hubungi admin.'), { statusCode: 400 });

    const items = await db.select().from(salesTransactionItems).where(and(eq(salesTransactionItems.companyId, companyId), eq(salesTransactionItems.transactionId, order.id)));

    const updated = await db.transaction(async (tx) => {
      const outletConsignmentWarehouse = order.paymentMethod === 'consignment' && order.outletId
        ? await ensureOutletConsignmentWarehouse(tx, { companyId, outletId: order.outletId })
        : null;

      for (const item of items) {
        const [balance] = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.companyId, companyId), eq(inventoryBalances.warehouseId, stockWarehouse.id), eq(inventoryBalances.productId, item.productId)));
        if (!balance || Number(balance.quantity) < Number(item.quantity)) {
          const [product] = await tx.select().from(products).where(and(eq(products.companyId, companyId), eq(products.id, item.productId)));
          throw Object.assign(new Error(`Stok tidak cukup untuk ${product?.name ?? item.productId}. Sisa stok: ${balance?.quantity ?? 0}`), { statusCode: 400 });
        }
        await tx.update(inventoryBalances).set({
          quantity: sql`${inventoryBalances.quantity} - ${item.quantity}`,
          reservedQuantity: sql`${inventoryBalances.reservedQuantity} - ${item.reservedQuantity}`,
          updatedAt: new Date(),
        }).where(eq(inventoryBalances.id, balance.id));
        await tx.update(salesTransactionItems).set({ releasedQuantity: item.quantity }).where(eq(salesTransactionItems.id, item.id));
        await tx.insert(inventoryMovements).values({
          companyId,
          warehouseId: stockWarehouse.id,
          productId: item.productId,
          movementType: outletConsignmentWarehouse ? 'transfer_out' : 'sale',
          quantityDelta: `-${item.quantity}`,
          referenceType: outletConsignmentWarehouse ? 'consignment_transfer' : 'sales_transaction',
          referenceId: order.id,
          notes: outletConsignmentWarehouse ? 'Transfer stok ke konsinyasi outlet setelah approval admin' : 'Release stok setelah approval admin',
          createdByUserId: request.user?.id,
        });

        if (outletConsignmentWarehouse) {
          const [outletBalance] = await tx.select().from(inventoryBalances).where(and(
            eq(inventoryBalances.companyId, companyId),
            eq(inventoryBalances.warehouseId, outletConsignmentWarehouse.id),
            eq(inventoryBalances.productId, item.productId),
          ));
          if (outletBalance) {
            await tx.update(inventoryBalances).set({
              quantity: sql`${inventoryBalances.quantity} + ${item.quantity}`,
              updatedAt: new Date(),
            }).where(eq(inventoryBalances.id, outletBalance.id));
          } else {
            await tx.insert(inventoryBalances).values({
              companyId,
              warehouseId: outletConsignmentWarehouse.id,
              productId: item.productId,
              quantity: item.quantity,
              reservedQuantity: '0',
            });
          }
          await tx.insert(inventoryMovements).values({
            companyId,
            warehouseId: outletConsignmentWarehouse.id,
            productId: item.productId,
            movementType: 'transfer_in',
            quantityDelta: item.quantity,
            referenceType: 'consignment_transfer',
            referenceId: order.id,
            notes: 'Stok titipan masuk ke outlet konsinyasi',
            createdByUserId: request.user?.id,
          });
        }
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

      const [approved] = await tx.update(salesTransactions).set({
        status: 'approved',
        approvedByUserId: request.user!.id,
        approvedAt: new Date(),
        stockReleasedAt: new Date(),
        updatedAt: new Date(),
      }).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.id, order.id))).returning();
      return approved;
    });

    await writeAuditLog({ request, action: 'sales.order.approved', entityType: 'sales_transaction', entityId: order.id, oldValues: order, newValues: updated });
    return { transaction: updated };
  });

  app.post('/sales/orders/:id/settle', { preHandler: authenticate }, async (request, reply) => {
    if (!canApproveSalesOrders(request.user!)) return reply.status(403).send({ message: 'Permission denied', permission: 'invoice.review' });
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [order] = await db.select().from(salesTransactions).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.id, params.id)));
    if (!order) throw Object.assign(new Error('Order tidak ditemukan.'), { statusCode: 404 });
    if (order.status !== 'approved') throw Object.assign(new Error('Nota hanya bisa diselesaikan setelah status approved.'), { statusCode: 400 });

    const [updated] = await db.update(salesTransactions).set({
      status: 'closed',
      closedByUserId: request.user!.id,
      closedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.id, order.id))).returning();

    await writeAuditLog({ request, action: 'sales.order.settled', entityType: 'sales_transaction', entityId: order.id, oldValues: order, newValues: updated });
    return { transaction: updated };
  });

  app.post('/sales/orders/:id/reject', { preHandler: authenticate }, async (request, reply) => {
    if (!canApproveSalesOrders(request.user!)) return reply.status(403).send({ message: 'Permission denied', permission: 'sales.order.review' });
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = rejectOrderSchema.parse(request.body ?? {});
    const [order] = await db.select().from(salesTransactions).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.id, params.id)));
    if (!order) throw Object.assign(new Error('Order tidak ditemukan.'), { statusCode: 404 });
    if (order.status !== 'pending_approval') throw Object.assign(new Error('Order tidak dalam status pending approval.'), { statusCode: 400 });
    if (!order.sourceWarehouseId) throw Object.assign(new Error('Gudang sumber stok order tidak ditemukan.'), { statusCode: 400 });

    const items = await db.select().from(salesTransactionItems).where(and(eq(salesTransactionItems.companyId, companyId), eq(salesTransactionItems.transactionId, order.id)));

    const updated = await db.transaction(async (tx) => {
      for (const item of items) {
        const [balance] = await tx.select().from(inventoryBalances).where(and(
          eq(inventoryBalances.companyId, companyId),
          eq(inventoryBalances.warehouseId, order.sourceWarehouseId!),
          eq(inventoryBalances.productId, item.productId),
        ));
        if (balance) {
          await tx.update(inventoryBalances).set({
            reservedQuantity: sql`${inventoryBalances.reservedQuantity} - ${item.reservedQuantity}`,
            updatedAt: new Date(),
          }).where(eq(inventoryBalances.id, balance.id));
        }
      }

      const [rejected] = await tx.update(salesTransactions).set({
        status: 'rejected',
        rejectionReason: body.reason,
        updatedAt: new Date(),
      }).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.id, order.id))).returning();
      return rejected;
    });

    await writeAuditLog({ request, action: 'sales.order.rejected', entityType: 'sales_transaction', entityId: order.id, oldValues: order, newValues: updated });
    return { transaction: updated };
  });
}
