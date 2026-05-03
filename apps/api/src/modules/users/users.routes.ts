import type { FastifyInstance } from 'fastify';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { roles, tenantSubscriptions, users } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { hashPassword, requirePermission } from '../auth/auth.service.js';
import { requireTenantId, requireLimit } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';

const createUserSchema = z.object({
  roleId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  employeeCode: z.string().optional(),
  password: z.string().min(6),
  supervisorId: z.string().uuid().optional(),
});

const updateUserSchema = z.object({
  roleId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  employeeCode: z.string().optional(),
  supervisorId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6),
});

export async function usersRoutes(app: FastifyInstance) {

  // ─── List Users ────────────────────────────────────────────────────────────
  app.get('/users', { preHandler: requirePermission('users.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = z.object({ status: z.string().optional() }).parse(request.query);

    const conditions: Parameters<typeof and>[0][] = [
      eq(users.companyId, companyId),
      isNull(users.deletedAt),
    ];
    if (query.status) conditions.push(eq(users.status, query.status as 'active' | 'inactive' | 'suspended'));

    const rows = await db.select({
      id: users.id, name: users.name, email: users.email, phone: users.phone,
      employeeCode: users.employeeCode, status: users.status,
      roleId: users.roleId, roleCode: roles.code, roleName: roles.name,
      lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
    })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));

    return { users: rows };
  });

  // ─── Create User ───────────────────────────────────────────────────────────
  app.post('/users', { preHandler: requirePermission('users.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const body = createUserSchema.parse(request.body);

    // Ensure the role belongs to this company
    const [role] = await db.select().from(roles).where(and(eq(roles.id, body.roleId), eq(roles.companyId, companyId)));
    if (!role) return reply.status(400).send({ message: 'Role tidak valid untuk company ini.' });

    // Check for duplicate email/phone/code
    const identifiers = [];
    if (body.email) identifiers.push(eq(users.email, body.email));
    if (body.phone) identifiers.push(eq(users.phone, body.phone));
    if (body.employeeCode) identifiers.push(eq(users.employeeCode, body.employeeCode));
    if (identifiers.length) {
      const [dup] = await db.select({ id: users.id }).from(users).where(or(...identifiers));
      if (dup) return reply.status(409).send({ message: 'Email, nomor HP, atau kode karyawan sudah digunakan.' });
    }

    // Check user limit from subscription plan
    const currentUserCount = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.companyId, companyId), isNull(users.deletedAt)));
    await requireLimit(request, 'users', currentUserCount.length);

    const passwordHash = await hashPassword(body.password);
    const [user] = await db.insert(users).values({
      companyId,
      roleId: body.roleId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      employeeCode: body.employeeCode,
      supervisorId: body.supervisorId,
      passwordHash,
      status: 'active',
    }).returning();

    await writeAuditLog({ request, action: 'user.created', entityType: 'user', entityId: user.id, newValues: { name: user.name, email: user.email, roleId: user.roleId } });
    return { user };
  });

  // ─── Get User ──────────────────────────────────────────────────────────────
  app.get('/users/:id', { preHandler: requirePermission('users.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [user] = await db.select({
      id: users.id, name: users.name, email: users.email, phone: users.phone,
      employeeCode: users.employeeCode, status: users.status, profilePhotoUrl: users.profilePhotoUrl,
      roleId: users.roleId, roleCode: roles.code, roleName: roles.name,
      supervisorId: users.supervisorId, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
    })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.id, params.id), eq(users.companyId, companyId), isNull(users.deletedAt)));

    if (!user) return reply.status(404).send({ message: 'User tidak ditemukan.' });
    return { user };
  });

  // ─── Update User ───────────────────────────────────────────────────────────
  app.patch('/users/:id', { preHandler: requirePermission('users.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateUserSchema.parse(request.body);

    const [existing] = await db.select().from(users).where(and(eq(users.id, params.id), eq(users.companyId, companyId), isNull(users.deletedAt)));
    if (!existing) return reply.status(404).send({ message: 'User tidak ditemukan.' });

    if (body.roleId) {
      const [role] = await db.select().from(roles).where(and(eq(roles.id, body.roleId), eq(roles.companyId, companyId)));
      if (!role) return reply.status(400).send({ message: 'Role tidak valid untuk company ini.' });
    }

    const [updated] = await db.update(users).set({ ...body, updatedAt: new Date() }).where(eq(users.id, params.id)).returning();
    await writeAuditLog({ request, action: 'user.updated', entityType: 'user', entityId: updated.id, oldValues: existing, newValues: body });
    return { user: updated };
  });

  // ─── Delete User (soft) ────────────────────────────────────────────────────
  app.delete('/users/:id', { preHandler: requirePermission('users.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    // Prevent deleting yourself
    if (params.id === request.user!.id) return reply.status(400).send({ message: 'Tidak dapat menghapus akun yang sedang digunakan.' });

    const [existing] = await db.select().from(users).where(and(eq(users.id, params.id), eq(users.companyId, companyId), isNull(users.deletedAt)));
    if (!existing) return reply.status(404).send({ message: 'User tidak ditemukan.' });

    await db.update(users).set({ status: 'inactive', deletedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, params.id));
    await writeAuditLog({ request, action: 'user.deleted', entityType: 'user', entityId: params.id, oldValues: { name: existing.name } });
    return { success: true };
  });

  // ─── Reset Password ────────────────────────────────────────────────────────
  app.post('/users/:id/reset-password', { preHandler: requirePermission('users.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = resetPasswordSchema.parse(request.body);

    const [existing] = await db.select().from(users).where(and(eq(users.id, params.id), eq(users.companyId, companyId), isNull(users.deletedAt)));
    if (!existing) return reply.status(404).send({ message: 'User tidak ditemukan.' });

    const passwordHash = await hashPassword(body.newPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, params.id));
    await writeAuditLog({ request, action: 'user.password_reset', entityType: 'user', entityId: params.id });
    return { success: true };
  });

  // ─── Company Subscription Info (tenant self-service) ──────────────────────
  app.get('/company/subscription', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const [sub] = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.companyId, companyId)).orderBy(desc(tenantSubscriptions.createdAt)).limit(1);
    return { subscription: sub ?? null };
  });

  app.post('/company/subscription/cancel', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = z.object({ reason: z.string().optional() }).parse(request.body ?? {});
    await db.update(tenantSubscriptions).set({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: body.reason,
      updatedAt: new Date(),
    }).where(eq(tenantSubscriptions.companyId, companyId));
    await writeAuditLog({ request, action: 'subscription.cancelled', entityType: 'tenant_subscription', entityId: companyId });
    return { success: true, message: 'Permintaan pembatalan langganan telah diterima.' };
  });
}
