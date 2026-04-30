import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import {
  appSettings,
  inventoryBalances,
  outlets,
  products,
  syncEvents,
  visitSchedules,
  warehouses,
} from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { authenticate } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';

const pushEventSchema = z.object({
  clientRequestId: z.string().uuid(),
  entityType: z.string().min(1).max(80),
  entityId: z.string().uuid().optional(),
  operation: z.enum(['create', 'update', 'delete', 'upload']),
  payload: z.unknown().optional(),
  payloadHash: z.string().optional(),
  createdAtClient: z.string().datetime().optional(),
});

const pushSchema = z.object({
  deviceId: z.string().max(160).optional(),
  events: z.array(pushEventSchema).min(1).max(100),
});

function hashPayload(payload: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(payload ?? {})).digest('hex');
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function syncRoutes(app: FastifyInstance) {
  app.get('/sync/manifest', { preHandler: authenticate }, async (request) => {
    const companyId = requireTenantId(request);
    return {
      serverTime: new Date().toISOString(),
      companyId,
      userId: request.user!.id,
      scope: 'sales-mobile',
      modules: ['profile', 'permissions', 'settings', 'products', 'outlets', 'visitSchedules', 'warehouses', 'inventoryBalances'],
      sync: {
        pullEndpoint: '/sync/pull?scope=sales-mobile',
        pushEndpoint: '/sync/push',
        statusEndpoint: '/sync/status',
        maxBatchSize: 100,
      },
    };
  });

  app.get('/sync/pull', { preHandler: authenticate }, async (request) => {
    const companyId = requireTenantId(request);
    const query = z.object({ scope: z.string().default('sales-mobile'), date: z.string().date().optional() }).parse(request.query);
    const date = query.date ?? todayDate();
    const [settingsRows, productRows, scheduleRows, warehouseRows] = await Promise.all([
      db.select().from(appSettings),
      db.select().from(products).where(and(eq(products.companyId, companyId), eq(products.status, 'active'))),
      db.select().from(visitSchedules).where(and(eq(visitSchedules.companyId, companyId), eq(visitSchedules.salesUserId, request.user!.id), eq(visitSchedules.scheduledDate, date))),
      db.select().from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.status, 'active'))),
    ]);

    const outletIds = scheduleRows.map((schedule) => schedule.outletId).filter((id): id is string => Boolean(id));
    const outletRows = outletIds.length
      ? await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), inArray(outlets.id, outletIds)))
      : await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.status, 'active')));
    const warehouseIds = warehouseRows.map((warehouse) => warehouse.id);
    const balanceRows = warehouseIds.length
      ? await db.select().from(inventoryBalances).where(and(eq(inventoryBalances.companyId, companyId), inArray(inventoryBalances.warehouseId, warehouseIds)))
      : [];

    return {
      serverTime: new Date().toISOString(),
      companyId,
      user: {
        id: request.user!.id,
      },
      scope: query.scope,
      date,
      entities: {
        settings: settingsRows,
        products: productRows,
        visitSchedules: scheduleRows,
        outlets: outletRows,
        warehouses: warehouseRows,
        inventoryBalances: balanceRows,
      },
    };
  });

  app.post('/sync/push', { preHandler: authenticate }, async (request) => {
    const companyId = requireTenantId(request);
    const body = pushSchema.parse(request.body);
    const results = [];
    for (const event of body.events) {
      const [existing] = await db.select().from(syncEvents).where(eq(syncEvents.clientRequestId, event.clientRequestId));
      if (existing) {
        results.push({ clientRequestId: event.clientRequestId, status: existing.status, syncEventId: existing.id, duplicate: true });
        continue;
      }
      const payloadHash = event.payloadHash ?? hashPayload(event.payload);
      const [created] = await db.insert(syncEvents).values({
        companyId,
        userId: request.user!.id,
        deviceId: body.deviceId,
        clientRequestId: event.clientRequestId,
        entityType: event.entityType,
        entityId: event.entityId,
        operation: event.operation,
        status: 'processed',
        payloadHash,
        payload: event.payload,
        result: { message: 'Event diterima dan tercatat. Processing domain handler dapat ditambahkan per entity.' },
        createdAtClient: event.createdAtClient ? new Date(event.createdAtClient) : undefined,
        processedAt: new Date(),
      }).returning();
      results.push({ clientRequestId: event.clientRequestId, status: created.status, syncEventId: created.id });
    }
    return { results };
  });

  app.get('/sync/status', { preHandler: authenticate }, async (request) => {
    const companyId = requireTenantId(request);
    const query = z.object({ deviceId: z.string().optional(), limit: z.coerce.number().int().positive().max(100).default(50) }).parse(request.query);
    const conditions = [eq(syncEvents.companyId, companyId), eq(syncEvents.userId, request.user!.id)];
    if (query.deviceId) conditions.push(eq(syncEvents.deviceId, query.deviceId));
    const events = await db.select().from(syncEvents).where(and(...conditions)).orderBy(desc(syncEvents.createdAt)).limit(query.limit);
    return { events };
  });
}
