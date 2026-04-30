import type { FastifyInstance } from 'fastify';
import { authRoutes } from './modules/auth/auth.routes.js';
import { accessRoutes } from './modules/users/access.routes.js';
import { attendanceRoutes } from './modules/attendance/attendance.routes.js';
import { attendanceReviewRoutes } from './modules/attendance/attendance-review.routes.js';
import { inventoryRoutes } from './modules/inventory/inventory.routes.js';
import { productRoutes } from './modules/products/products.routes.js';
import { reportRoutes } from './modules/reports/reports.routes.js';
import { salesRoutes } from './modules/sales/sales.routes.js';
import { visitRoutes } from './modules/visits/visits.routes.js';

const notImplemented = (moduleName: string) => async () => ({
  module: moduleName,
  status: 'planned',
});

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes);
  await app.register(accessRoutes);
  await app.register(attendanceRoutes);
  await app.register(attendanceReviewRoutes);
  await app.register(inventoryRoutes);
  await app.register(productRoutes);
  await app.register(salesRoutes);
  await app.register(visitRoutes);
  await app.register(reportRoutes);

  app.get('/settings', notImplemented('settings'));
  app.get('/outlets', notImplemented('outlets'));
  app.get('/transactions', notImplemented('transactions'));
  app.get('/sync/status', notImplemented('sync'));
}


