import type { FastifyInstance } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { outlets, visitSessions } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';

const checkInSchema = z.object({
  outletId: z.string().uuid(),
  clientRequestId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  accuracyM: z.number().optional(),
});

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const earth = 6371000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function visitRoutes(app: FastifyInstance) {
  app.get('/visits/today', { preHandler: requirePermission('visits.execute') }, async (request) => {
    const companyId = requireTenantId(request);
    const outletRows = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.status, 'active')));
    return { outlets: outletRows };
  });

  app.post('/visits/check-in', { preHandler: requirePermission('visits.execute') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = checkInSchema.parse(request.body);
    const [outlet] = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, body.outletId)));
    if (!outlet) return { message: 'Outlet tidak ditemukan' };

    const distance = distanceMeters(body.latitude, body.longitude, Number(outlet.latitude), Number(outlet.longitude));
    const radius = outlet.geofenceRadiusM ?? 100;
    const valid = distance <= radius;

    const [existing] = await db.select().from(visitSessions).where(and(eq(visitSessions.companyId, companyId), eq(visitSessions.clientRequestId, body.clientRequestId)));
    if (existing) return { visit: existing, idempotent: true };

    const [visit] = await db.insert(visitSessions).values({
      companyId,
      salesUserId: request.user!.id,
      outletId: outlet.id,
      checkInAt: new Date(),
      checkInLatitude: String(body.latitude),
      checkInLongitude: String(body.longitude),
      checkInAccuracyM: body.accuracyM ? String(body.accuracyM) : undefined,
      checkInDistanceM: distance.toFixed(2),
      geofenceRadiusMUsed: radius,
      status: valid ? 'open' : 'invalid_location',
      validationStatus: valid ? 'valid' : 'manual_review',
      clientRequestId: body.clientRequestId,
    }).returning();

    return { visit, geofence: { valid, distanceM: distance, radiusM: radius } };
  });

  app.get('/visits/review', { preHandler: requirePermission('visits.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const rows = await db.select().from(visitSessions).where(eq(visitSessions.companyId, companyId)).orderBy(desc(visitSessions.createdAt)).limit(100);
    return { visits: rows };
  });
}


