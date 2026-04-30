import type { FastifyRequest } from 'fastify';
import { auditLogs } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';

type AuditPayload = {
  request: FastifyRequest;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
};

export async function writeAuditLog({ request, action, entityType, entityId, oldValues, newValues }: AuditPayload) {
  await db.insert(auditLogs).values({
    actorUserId: request.user?.id,
    action,
    entityType,
    entityId: entityId ?? undefined,
    oldValues,
    newValues,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  });
}
