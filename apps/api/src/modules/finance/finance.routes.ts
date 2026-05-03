import type { FastifyInstance } from 'fastify';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { consignmentActions, consignments, receivablePayments, receivables, salesTransactions } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';

const paymentSchema = z.object({
  amount: z.string().or(z.number()).transform(String),
  paymentMethod: z.enum(['cash', 'qris', 'credit', 'consignment']).default('cash'),
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const consignmentActionSchema = z.object({
  actionType: z.enum(['notify_withdrawal', 'extend', 'withdraw', 'reset_stock_zero']),
  notes: z.string().optional(),
});

export async function financeRoutes(app: FastifyInstance) {
  // List receivables — filtered by companyId via salesTransactions join
  app.get('/receivables', { preHandler: requirePermission('receivables.view') }, async (request) => {
    const companyId = requireTenantId(request);
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
      .limit(200);
    return { receivables: rows };
  });

  app.post('/receivables/:id/payments', { preHandler: requirePermission('receivables.view') }, async (request) => {
    requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = paymentSchema.parse(request.body);
    const [receivable] = await db.select().from(receivables).where(eq(receivables.id, params.id));
    if (!receivable) throw Object.assign(new Error('Piutang tidak ditemukan.'), { statusCode: 404 });
    const amount = Number(body.amount);
    const nextPaid = Number(receivable.paidAmount) + amount;
    const outstanding = Math.max(0, Number(receivable.principalAmount) - nextPaid);
    const status = outstanding <= 0 ? 'paid' : 'partial';
    const result = await db.transaction(async (tx) => {
      const [payment] = await tx.insert(receivablePayments).values({ receivableId: receivable.id, amount: body.amount, paymentMethod: body.paymentMethod, paidAt: body.paidAt ? new Date(body.paidAt) : new Date(), receivedByUserId: request.user?.id, notes: body.notes }).returning();
      const [updated] = await tx.update(receivables).set({ paidAmount: nextPaid.toFixed(2), outstandingAmount: outstanding.toFixed(2), status, updatedAt: new Date() }).where(eq(receivables.id, receivable.id)).returning();
      return { payment, receivable: updated };
    });
    return result;
  });

  // List consignments — filtered by companyId via salesTransactions join
  app.get('/consignments', { preHandler: requirePermission('receivables.view') }, async (request) => {
    const companyId = requireTenantId(request);
    const rows = await db
      .select()
      .from(consignments)
      .innerJoin(salesTransactions, eq(consignments.transactionId, salesTransactions.id))
      .where(eq(salesTransactions.companyId, companyId))
      .orderBy(desc(consignments.createdAt))
      .limit(200);
    return { consignments: rows.map(r => r.consignments) };
  });

  app.post('/consignments/:id/actions', { preHandler: requirePermission('receivables.view') }, async (request) => {
    requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = consignmentActionSchema.parse(request.body);
    const statusMap = {
      notify_withdrawal: 'withdrawal_required',
      extend: 'extended',
      withdraw: 'withdrawn',
      reset_stock_zero: 'reset_stock',
    } as const;
    const result = await db.transaction(async (tx) => {
      const [action] = await tx.insert(consignmentActions).values({ consignmentId: params.id, actionType: body.actionType, notes: body.notes, performedByUserId: request.user?.id }).returning();
      const [consignment] = await tx.update(consignments).set({ status: statusMap[body.actionType], updatedAt: new Date() }).where(eq(consignments.id, params.id)).returning();
      return { action, consignment };
    });
    return result;
  });
}
