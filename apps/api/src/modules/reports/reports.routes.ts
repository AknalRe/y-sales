import type { FastifyInstance } from 'fastify';
import { and, count, eq, sum } from 'drizzle-orm';
import { products, salesTransactions, visitSessions } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';

export async function reportRoutes(app: FastifyInstance) {
  app.get('/reports/summary', { preHandler: requirePermission('reports.view') }, async (request) => {
    const companyId = requireTenantId(request);
    const [sales] = await db.select({ total: sum(salesTransactions.totalAmount), count: count() }).from(salesTransactions).where(eq(salesTransactions.companyId, companyId));
    const [visits] = await db.select({ count: count() }).from(visitSessions).where(eq(visitSessions.companyId, companyId));
    const [productCount] = await db.select({ count: count() }).from(products).where(eq(products.companyId, companyId));
    const [pending] = await db.select({ count: count() }).from(salesTransactions).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.status, 'pending_approval')));

    return {
      summary: {
        totalSalesAmount: sales.total ?? '0',
        totalOrders: sales.count,
        totalVisits: visits.count,
        totalProducts: productCount.count,
        pendingApprovals: pending.count,
      },
    };
  });
}


