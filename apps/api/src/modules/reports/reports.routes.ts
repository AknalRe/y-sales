import type { FastifyInstance } from 'fastify';
import { and, count, eq, gte, isNull, sum } from 'drizzle-orm';
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
    const user = request.user!;
    const canReview = user.isSuperAdmin || user.roleCode === 'ADMINISTRATOR' || user.permissions.includes('sales.order.review') || user.permissions.includes('visits.review');
    const today = todayStart();
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

    const [visits] = await db.select({ count: count() })
      .from(visitSessions).where(and(...visitsConditions));

    const [visitsToday] = await db.select({ count: count() })
      .from(visitSessions)
      .where(and(...visitsConditions, gte(visitSessions.createdAt, today)));

    const [productCount] = await db.select({ count: count() })
      .from(products).where(and(eq(products.companyId, companyId), eq(products.status, 'active')));

    const [activeUserCount] = await db.select({ count: count() })
      .from(users).where(and(eq(users.companyId, companyId), eq(users.status, 'active'), isNull(users.deletedAt)));

    const [pending] = await db.select({ count: count() })
      .from(salesTransactions)
      .where(and(...salesConditions, eq(salesTransactions.status, 'pending_approval')));

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

