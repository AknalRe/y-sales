import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { permissions, rolePermissions, roles } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';

const createPermissionSchema = z.object({
  code: z.string().min(3),
  name: z.string().min(3),
  module: z.string().min(2),
  description: z.string().optional(),
});

const assignPermissionSchema = z.object({
  permissionId: z.string().uuid(),
});

export async function accessRoutes(app: FastifyInstance) {
  app.get('/roles', { preHandler: requirePermission('roles.manage') }, async () => {
    return { roles: await db.select().from(roles) };
  });

  app.get('/permissions', { preHandler: requirePermission('permissions.manage') }, async () => {
    return { permissions: await db.select().from(permissions) };
  });

  app.post('/permissions', { preHandler: requirePermission('permissions.manage') }, async (request) => {
    const body = createPermissionSchema.parse(request.body);
    const [permission] = await db.insert(permissions).values(body).returning();
    return { permission };
  });

  app.get('/roles/:roleId/permissions', { preHandler: requirePermission('roles.manage') }, async (request) => {
    const params = z.object({ roleId: z.string().uuid() }).parse(request.params);
    const rows = await db
      .select({ id: permissions.id, code: permissions.code, name: permissions.name, module: permissions.module })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, params.roleId));

    return { permissions: rows };
  });

  app.post('/roles/:roleId/permissions', { preHandler: requirePermission('roles.manage') }, async (request) => {
    const params = z.object({ roleId: z.string().uuid() }).parse(request.params);
    const body = assignPermissionSchema.parse(request.body);

    await db.insert(rolePermissions).values({
      roleId: params.roleId,
      permissionId: body.permissionId,
      grantedByUserId: request.user?.id,
    }).onConflictDoNothing();

    return { success: true };
  });
}


