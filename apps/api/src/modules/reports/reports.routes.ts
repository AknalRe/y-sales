import type { FastifyInstance } from 'fastify';
import { and, count, desc, eq, gte, isNull, lte, ne, sum } from 'drizzle-orm';
import { z } from 'zod';
import {
  attendanceSessions,
  inventoryBalances,
  outlets,
  products,
  roles,
  salesTransactions,
  users,
  visitSessions,
} from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayDateString() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

function startOfDate(value: string) {
  return new Date(`${value}T00:00:00.000+07:00`);
}

function endOfDate(value: string) {
  return new Date(`${value}T23:59:59.999+07:00`);
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

const reportSummaryQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export async function reportRoutes(app: FastifyInstance) {
  app.get('/reports/summary', { preHandler: requirePermission('reports.view') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = reportSummaryQuerySchema.parse(request.query);
    const user = request.user!;
    const canReview = user.isSuperAdmin || user.roleCode === 'ADMINISTRATOR' || user.permissions.includes('sales.order.review') || user.permissions.includes('visits.review');
    const today = todayStart();
    const month = monthStart();
    const from = query.from ?? todayDateString();
    const to = query.to ?? from;
    const periodStart = startOfDate(from);
    const periodEnd = endOfDate(to);
    const salesConditions = [eq(salesTransactions.companyId, companyId)];
    const visitsConditions = [eq(visitSessions.companyId, companyId)];
    if (!canReview) {
      salesConditions.push(eq(salesTransactions.salesUserId, user.id));
      visitsConditions.push(eq(visitSessions.salesUserId, user.id));
    }

    const [sales] = await db.select({ total: sum(salesTransactions.totalAmount), count: count() })
      .from(salesTransactions).where(and(...salesConditions));

    const [salesToday] = await db.select({ total: sum(salesTransactions.totalAmount), count: count() })
      .from(salesTransactions)
      .where(and(...salesConditions, gte(salesTransactions.createdAt, today)));

    const [salesPeriod] = await db.select({ total: sum(salesTransactions.totalAmount), count: count() })
      .from(salesTransactions)
      .where(and(...salesConditions, gte(salesTransactions.createdAt, periodStart), lte(salesTransactions.createdAt, periodEnd)));

    const [salesMonth] = await db.select({ total: sum(salesTransactions.totalAmount), count: count() })
      .from(salesTransactions)
      .where(and(...salesConditions, gte(salesTransactions.createdAt, month)));

    const [visits] = await db.select({ count: count() })
      .from(visitSessions).where(and(...visitsConditions));

    const [visitsToday] = await db.select({ count: count() })
      .from(visitSessions)
      .where(and(...visitsConditions, gte(visitSessions.createdAt, today)));

    const [visitsPeriod] = await db.select({ count: count() })
      .from(visitSessions)
      .where(and(...visitsConditions, gte(visitSessions.createdAt, periodStart), lte(visitSessions.createdAt, periodEnd)));

    const [productCount] = await db.select({ count: count() })
      .from(products).where(and(eq(products.companyId, companyId), eq(products.status, 'active')));

    const [outletCount] = await db.select({ count: count() })
      .from(outlets).where(and(eq(outlets.companyId, companyId), isNull(outlets.deletedAt)));

    const [activeOutletCount] = await db.select({ count: count() })
      .from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.status, 'active'), isNull(outlets.deletedAt)));

    const [pendingOutletCount] = await db.select({ count: count() })
      .from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.status, 'pending_verification'), isNull(outlets.deletedAt)));

    const [activeUserCount] = await db.select({ count: count() })
      .from(users).where(and(eq(users.companyId, companyId), eq(users.status, 'active'), isNull(users.deletedAt)));

    const [activeSalesCount] = await db.select({ count: count() })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.companyId, companyId), eq(users.status, 'active'), eq(roles.code, 'SALES_AGENT'), isNull(users.deletedAt)));

    const [pending] = await db.select({ count: count() })
      .from(salesTransactions)
      .where(and(...salesConditions, eq(salesTransactions.status, 'pending_approval'), gte(salesTransactions.createdAt, periodStart), lte(salesTransactions.createdAt, periodEnd)));

    const [attendanceOpen] = await db.select({ count: count() })
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.companyId, companyId), gte(attendanceSessions.workDate, from), lte(attendanceSessions.workDate, to), eq(attendanceSessions.status, 'open')));

    const [attendanceClosed] = await db.select({ count: count() })
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.companyId, companyId), gte(attendanceSessions.workDate, from), lte(attendanceSessions.workDate, to), eq(attendanceSessions.status, 'closed')));

    const [pendingAttendance] = await db.select({ count: count() })
      .from(attendanceSessions)
      .where(and(
        eq(attendanceSessions.companyId, companyId),
        gte(attendanceSessions.workDate, from),
        lte(attendanceSessions.workDate, to),
        ne(attendanceSessions.validationStatus, 'valid'),
        ne(attendanceSessions.status, 'flagged'),
      ));

    const stockRows = await db.select({
      productId: inventoryBalances.productId,
      quantity: sum(inventoryBalances.quantity),
      reservedQuantity: sum(inventoryBalances.reservedQuantity),
    }).from(inventoryBalances)
      .where(eq(inventoryBalances.companyId, companyId))
      .groupBy(inventoryBalances.productId);

    const stockStats = stockRows.reduce((acc, row) => {
      const quantity = toNumber(row.quantity);
      const reserved = toNumber(row.reservedQuantity);
      const available = quantity - reserved;
      acc.totalStockQuantity += quantity;
      if (available <= 0) acc.outOfStockProducts += 1;
      if (available > 0 && available <= 10) acc.lowStockProducts += 1;
      return acc;
    }, { totalStockQuantity: 0, lowStockProducts: 0, outOfStockProducts: 0 });

    const recentOrders = await db.select({
      id: salesTransactions.id,
      createdAt: salesTransactions.createdAt,
      amount: salesTransactions.totalAmount,
      status: salesTransactions.status,
      salesName: users.name,
      outletName: outlets.name,
    })
      .from(salesTransactions)
      .innerJoin(users, eq(salesTransactions.salesUserId, users.id))
      .leftJoin(outlets, eq(salesTransactions.outletId, outlets.id))
      .where(and(...salesConditions, gte(salesTransactions.createdAt, periodStart), lte(salesTransactions.createdAt, periodEnd)))
      .orderBy(desc(salesTransactions.createdAt))
      .limit(5);

    const recentVisits = await db.select({
      id: visitSessions.id,
      createdAt: visitSessions.createdAt,
      status: visitSessions.status,
      outcome: visitSessions.outcome,
      salesName: users.name,
      outletName: outlets.name,
    })
      .from(visitSessions)
      .innerJoin(users, eq(visitSessions.salesUserId, users.id))
      .innerJoin(outlets, eq(visitSessions.outletId, outlets.id))
      .where(and(...visitsConditions, gte(visitSessions.createdAt, periodStart), lte(visitSessions.createdAt, periodEnd)))
      .orderBy(desc(visitSessions.createdAt))
      .limit(5);

    const recentActivities = [
      ...recentOrders.map((row) => ({
        id: row.id,
        type: 'order' as const,
        title: `${row.salesName} membuat transaksi`,
        description: `${row.outletName ?? 'Tanpa outlet'} · Rp ${toNumber(row.amount).toLocaleString('id-ID')}`,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
      ...recentVisits.map((row) => ({
        id: row.id,
        type: 'visit' as const,
        title: `${row.salesName} visit outlet`,
        description: `${row.outletName} · ${row.outcome ?? row.status}`,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

    return {
      summary: {
        totalSalesAmount: sales.total ?? '0',
        totalOrders: sales.count,
        totalVisits: visits.count,
        totalProducts: productCount.count,
        pendingApprovals: pending.count,
        activeUsers: activeUserCount.count,
        todaySalesAmount: salesToday.total ?? '0',
        todayOrders: salesToday.count,
        todayVisits: visitsToday.count,
        periodFrom: from,
        periodTo: to,
        periodSalesAmount: salesPeriod.total ?? '0',
        periodOrders: salesPeriod.count,
        periodVisits: visitsPeriod.count,
        monthSalesAmount: salesMonth.total ?? '0',
        monthOrders: salesMonth.count,
        totalOutlets: outletCount.count,
        activeOutlets: activeOutletCount.count,
        pendingOutletVerification: pendingOutletCount.count,
        activeSales: activeSalesCount.count,
        todayAttendanceOpen: attendanceOpen.count,
        todayAttendanceClosed: attendanceClosed.count,
        pendingAttendanceReviews: pendingAttendance.count,
        lowStockProducts: stockStats.lowStockProducts,
        outOfStockProducts: stockStats.outOfStockProducts,
        totalStockQuantity: stockStats.totalStockQuantity,
        recentActivities,
      },
    };
  });
}
