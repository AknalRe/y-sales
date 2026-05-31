import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import {
  approvalLogs,
  cashDepositItems,
  cashDeposits,
  users,
} from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';

const depositItemSchema = z.object({
  productId: z.string().uuid(),
  soldQuantity: z.string().or(z.number()).transform(String),
  expectedAmount: z.string().or(z.number()).transform(String),
  declaredAmount: z.string().or(z.number()).transform(String),
});

const createDepositSchema = z.object({
  salesUserId: z.string().uuid(),
  workDate: z.string().date(),
  attendanceSessionId: z.string().uuid().optional(),
  expectedCashAmount: z.string().or(z.number()).transform(String).default('0'),
  declaredCashAmount: z.string().or(z.number()).transform(String).default('0'),
  qrisAmount: z.string().or(z.number()).transform(String).default('0'),
  consignmentAmount: z.string().or(z.number()).transform(String).default('0'),
  totalSoldQuantity: z.string().or(z.number()).transform(String).default('0'),
  notes: z.string().optional(),
  clientRequestId: z.string().uuid(),
  items: z.array(depositItemSchema).default([]),
});

const reconcileSchema = z.object({
  action: z.enum(['reconciled', 'rejected']),
  notes: z.string().optional(),
});

const depositListQuerySchema = z.object({
  status: z.enum(['submitted', 'under_review', 'reconciled', 'rejected']).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  salesUserId: z.string().uuid().optional(),
});

export async function depositRoutes(app: FastifyInstance) {
  app.get('/deposits', { preHandler: requirePermission('deposits.execute') }, async (request) => {
    const companyId = requireTenantId(request);
    const user = request.user!;
    const query = depositListQuerySchema.parse(request.query);
    const canReconcile = user.isSuperAdmin || user.roleCode === 'ADMINISTRATOR' || user.permissions.includes('deposits.reconcile');

    const conditions = [eq(cashDeposits.companyId, companyId)];
    if (query.status) conditions.push(eq(cashDeposits.status, query.status));
    if (query.from) conditions.push(gte(cashDeposits.workDate, query.from));
    if (query.to) conditions.push(lte(cashDeposits.workDate, query.to));
    if (canReconcile && query.salesUserId) {
      conditions.push(eq(cashDeposits.salesUserId, query.salesUserId));
    } else if (!canReconcile) {
      conditions.push(eq(cashDeposits.salesUserId, user.id));
    }

    const rows = await db
      .select({
        id: cashDeposits.id,
        salesUserId: cashDeposits.salesUserId,
        salesName: users.name,
        workDate: cashDeposits.workDate,
        expectedCashAmount: cashDeposits.expectedCashAmount,
        declaredCashAmount: cashDeposits.declaredCashAmount,
        qrisAmount: cashDeposits.qrisAmount,
        consignmentAmount: cashDeposits.consignmentAmount,
        totalSoldQuantity: cashDeposits.totalSoldQuantity,
        status: cashDeposits.status,
        discrepancyAmount: cashDeposits.discrepancyAmount,
        notes: cashDeposits.notes,
        submittedAt: cashDeposits.submittedAt,
        reconciledAt: cashDeposits.reconciledAt,
        createdAt: cashDeposits.createdAt,
      })
      .from(cashDeposits)
      .leftJoin(users, eq(cashDeposits.salesUserId, users.id))
      .where(and(...conditions))
      .orderBy(desc(cashDeposits.workDate), desc(cashDeposits.createdAt))
      .limit(100);

    return { deposits: rows };
  });

  app.get('/deposits/:id', { preHandler: requirePermission('deposits.execute') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const [deposit] = await db.select().from(cashDeposits).where(
      and(eq(cashDeposits.companyId, companyId), eq(cashDeposits.id, params.id))
    );
    if (!deposit) throw Object.assign(new Error('Setoran tidak ditemukan.'), { statusCode: 404 });

    const items = await db.select().from(cashDepositItems).where(eq(cashDepositItems.cashDepositId, deposit.id));
    const approvals = await db.select().from(approvalLogs).where(
      and(eq(approvalLogs.approvableType, 'cash_deposit'), eq(approvalLogs.approvableId, deposit.id))
    ).orderBy(desc(approvalLogs.createdAt));

    return { deposit, items, approvals };
  });

  app.post('/deposits', { preHandler: requirePermission('deposits.execute') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const body = createDepositSchema.parse(request.body);

    const [existing] = await db.select().from(cashDeposits).where(
      and(eq(cashDeposits.companyId, companyId), eq(cashDeposits.clientRequestId, body.clientRequestId))
    );
    if (existing) return { deposit: existing, idempotent: true };

    const expectedCash = Number(body.expectedCashAmount);
    const declaredCash = Number(body.declaredCashAmount);
    const discrepancy = declaredCash - expectedCash;

    const [deposit] = await db.insert(cashDeposits).values({
      companyId,
      salesUserId: body.salesUserId,
      workDate: body.workDate,
      attendanceSessionId: body.attendanceSessionId,
      expectedCashAmount: body.expectedCashAmount,
      declaredCashAmount: body.declaredCashAmount,
      qrisAmount: body.qrisAmount,
      consignmentAmount: body.consignmentAmount,
      totalSoldQuantity: body.totalSoldQuantity,
      discrepancyAmount: discrepancy.toFixed(2),
      notes: body.notes,
      status: 'submitted',
      submittedAt: new Date(),
      clientRequestId: body.clientRequestId,
    }).returning();

    if (body.items.length) {
      await db.insert(cashDepositItems).values(
        body.items.map((item) => ({
          cashDepositId: deposit.id,
          productId: item.productId,
          soldQuantity: item.soldQuantity,
          expectedAmount: item.expectedAmount,
          declaredAmount: item.declaredAmount,
        }))
      );
    }

    await writeAuditLog({ request, action: 'deposit.created', entityType: 'cash_deposit', entityId: deposit.id, newValues: deposit });
    return reply.status(201).send({ deposit });
  });

  app.post('/deposits/:id/reconcile', { preHandler: requirePermission('deposits.reconcile') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = reconcileSchema.parse(request.body);

    const [deposit] = await db.select().from(cashDeposits).where(
      and(eq(cashDeposits.companyId, companyId), eq(cashDeposits.id, params.id))
    );
    if (!deposit) throw Object.assign(new Error('Setoran tidak ditemukan.'), { statusCode: 404 });
    if (deposit.status === 'reconciled') throw Object.assign(new Error('Setoran sudah direkonsiliasi.'), { statusCode: 400 });

    const newStatus = body.action;
    const [updated] = await db.update(cashDeposits).set({
      status: newStatus,
      reconciledByUserId: request.user!.id,
      reconciledAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(cashDeposits.id, deposit.id)).returning();

    await db.insert(approvalLogs).values({
      approvableType: 'cash_deposit',
      approvableId: deposit.id,
      action: newStatus === 'reconciled' ? 'reconciled' : 'rejected',
      actorUserId: request.user!.id,
      notes: body.notes,
    });

    await writeAuditLog({ request, action: `deposit.${newStatus}`, entityType: 'cash_deposit', entityId: deposit.id, oldValues: deposit, newValues: updated });
    return { deposit: updated };
  });
}
