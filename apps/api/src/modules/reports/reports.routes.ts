import type { FastifyInstance } from 'fastify';
import { and, count, eq, gte, sum } from 'drizzle-orm';
import { products, salesTransactions, users, visitSessions } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function reportRoutes(app: FastifyInstance) {
  app.get('/reports/summary', { preHandler: requirePermission('reports.view') }, async (request) => {
    const companyId = requireTenantId(request);
    const today = todayStart();

    const [sales] = await db.select({ total: sum(salesTransactions.totalAmount), count: count() })
      .from(salesTransactions).where(eq(salesTransactions.companyId, companyId));

    const [salesToday] = await db.select({ total: sum(salesTransactions.totalAmount), count: count() })
      .from(salesTransactions)
      .where(and(eq(salesTransactions.companyId, companyId), gte(salesTransactions.createdAt, today)));

    const [visits] = await db.select({ count: count() })
      .from(visitSessions).where(eq(visitSessions.companyId, companyId));

    const [visitsToday] = await db.select({ count: count() })
      .from(visitSessions)
      .where(and(eq(visitSessions.companyId, companyId), gte(visitSessions.createdAt, today)));

    const [productCount] = await db.select({ count: count() })
      .from(products).where(eq(products.companyId, companyId));

    const [activeUserCount] = await db.select({ count: count() })
      .from(users).where(eq(users.companyId, companyId));

    const [pending] = await db.select({ count: count() })
      .from(salesTransactions)
      .where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.status, 'pending_approval')));

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
      },
    };
  });
}


