import type { FastifyInstance } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { permissions, rolePermissions, roles, users } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';

const createRoleSchema = z.object({
  code: z.string().min(2).regex(/^[A-Z0-9_]+$/, 'Role code harus huruf kapital dan underscore'),
  name: z.string().min(2),
  description: z.string().optional(),
});

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

  // ─── Roles (scoped to company) ─────────────────────────────────────────────

  app.get('/roles', { preHandler: requirePermission('roles.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    // Return roles belonging to this company only
    const rows = await db.select().from(roles).where(eq(roles.companyId, companyId));
    return { roles: rows };
  });

  app.post('/roles', { preHandler: requirePermission('roles.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = createRoleSchema.parse(request.body);

    // Prevent using reserved system role codes
    const reserved = ['SUPER_ADMIN', 'ADMINISTRATOR'];
    if (reserved.includes(body.code)) {
      throw Object.assign(new Error('Role code tersebut tidak dapat digunakan.'), { statusCode: 400 });
    }

    const [role] = await db.insert(roles).values({
      companyId,
      code: body.code,
      name: body.name,
      description: body.description,
      isSystemRole: false,
    }).returning();
    await writeAuditLog({ request, action: 'role.created', entityType: 'role', entityId: role.id, newValues: role });
    return { role };
  });

  app.patch('/roles/:roleId', { preHandler: requirePermission('roles.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ roleId: z.string().uuid() }).parse(request.params);
    const body = createRoleSchema.partial().parse(request.body);

    const [existing] = await db.select().from(roles).where(and(eq(roles.id, params.roleId), eq(roles.companyId, companyId)));
    if (!existing) return reply.status(404).send({ message: 'Role tidak ditemukan.' });
    if (existing.isSystemRole) return reply.status(403).send({ message: 'System role tidak dapat diubah.' });

    const [updated] = await db.update(roles).set({ ...body, updatedAt: new Date() }).where(eq(roles.id, params.roleId)).returning();
    await writeAuditLog({ request, action: 'role.updated', entityType: 'role', entityId: updated.id, oldValues: existing, newValues: updated });
    return { role: updated };
  });

  app.delete('/roles/:roleId', { preHandler: requirePermission('roles.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ roleId: z.string().uuid() }).parse(request.params);

    const [existing] = await db.select().from(roles).where(and(eq(roles.id, params.roleId), eq(roles.companyId, companyId)));
    if (!existing) return reply.status(404).send({ message: 'Role tidak ditemukan.' });
    if (existing.isSystemRole) return reply.status(403).send({ message: 'System role tidak dapat dihapus.' });

    // Check if any users still have this role
    const [userWithRole] = await db.select({ id: users.id }).from(users).where(and(eq(users.roleId, params.roleId), isNull(users.deletedAt)));
    if (userWithRole) return reply.status(400).send({ message: 'Role tidak dapat dihapus karena masih digunakan oleh user.' });

    // Remove all permissions first, then delete role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, params.roleId));
    await db.delete(roles).where(eq(roles.id, params.roleId));
    await writeAuditLog({ request, action: 'role.deleted', entityType: 'role', entityId: params.roleId, oldValues: existing });
    return { success: true };
  });

  // ─── Permissions (global list, readable by all company admins) ─────────────

  app.get('/permissions', { preHandler: requirePermission('permissions.manage') }, async () => {
    const rows = await db.select().from(permissions).orderBy(permissions.module, permissions.code);
    return { permissions: rows };
  });

  app.post('/permissions', { preHandler: requirePermission('permissions.manage') }, async (request) => {
    const body = createPermissionSchema.parse(request.body);
    const [permission] = await db.insert(permissions).values(body).returning();
    await writeAuditLog({ request, action: 'permission.created', entityType: 'permission', entityId: permission.id, newValues: permission });
    return { permission };
  });

  // ─── Role Permissions ──────────────────────────────────────────────────────

  app.get('/roles/:roleId/permissions', { preHandler: requirePermission('roles.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ roleId: z.string().uuid() }).parse(request.params);

    // Ensure role belongs to this company
    const [role] = await db.select().from(roles).where(and(eq(roles.id, params.roleId), eq(roles.companyId, companyId)));
    if (!role) return reply.status(404).send({ message: 'Role tidak ditemukan.' });

    const rows = await db
      .select({ id: permissions.id, code: permissions.code, name: permissions.name, module: permissions.module })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, params.roleId));

    return { permissions: rows };
  });

  app.post('/roles/:roleId/permissions', { preHandler: requirePermission('roles.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ roleId: z.string().uuid() }).parse(request.params);
    const body = assignPermissionSchema.parse(request.body);

    const [role] = await db.select().from(roles).where(and(eq(roles.id, params.roleId), eq(roles.companyId, companyId)));
    if (!role) return reply.status(404).send({ message: 'Role tidak ditemukan.' });

    await db.insert(rolePermissions).values({
      roleId: params.roleId,
      permissionId: body.permissionId,
      grantedByUserId: request.user?.id,
    }).onConflictDoNothing();

    await writeAuditLog({ request, action: 'role.permission_assigned', entityType: 'role_permission', entityId: params.roleId, newValues: { roleId: params.roleId, permissionId: body.permissionId } });
    return { success: true };
  });

  app.delete('/roles/:roleId/permissions/:permissionId', { preHandler: requirePermission('roles.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ roleId: z.string().uuid(), permissionId: z.string().uuid() }).parse(request.params);

    const [role] = await db.select().from(roles).where(and(eq(roles.id, params.roleId), eq(roles.companyId, companyId)));
    if (!role) return reply.status(404).send({ message: 'Role tidak ditemukan.' });

    await db.delete(rolePermissions).where(and(eq(rolePermissions.roleId, params.roleId), eq(rolePermissions.permissionId, params.permissionId)));
    await writeAuditLog({ request, action: 'role.permission_removed', entityType: 'role_permission', entityId: params.roleId, oldValues: { roleId: params.roleId, permissionId: params.permissionId } });
    return { success: true };
  });
}
