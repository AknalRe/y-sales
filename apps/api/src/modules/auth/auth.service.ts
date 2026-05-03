import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { permissions, rolePermissions, roles, sessions, users } from '@yuksales/db/schema';
import { env } from '../../config/env.js';
import { db } from '../../plugins/db.js';

export type AuthUser = {
  id: string;
  companyId: string | null;
  roleCode: string;
  isSuperAdmin: boolean;
  permissions: string[];
};

export type AuthTokenPayload = {
  sub: string;
  companyId: string | null;
  roleCode: string;
  isSuperAdmin: boolean;
};

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthTokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthTokenPayload;
}

export async function getUserPermissions(userId: string) {
  const [user] = await db
    .select({ companyId: users.companyId, roleId: users.roleId, roleCode: roles.code })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId));

  if (!user) return null;

  const isSuperAdmin = user.roleCode === 'SUPER_ADMIN';

  const rows = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, user.roleId));

  return {
    companyId: user.companyId,
    roleCode: user.roleCode,
    isSuperAdmin,
    permissions: rows.map((row) => row.code),
  };
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return reply.status(401).send({ message: 'Missing bearer token' });
  }

  try {
    const payload = verifyAccessToken(token);
    const permissionData = await getUserPermissions(payload.sub);

    if (!permissionData) {
      return reply.status(401).send({ message: 'User not found' });
    }

    request.user = {
      id: payload.sub,
      companyId: payload.companyId,
      roleCode: permissionData.roleCode,
      isSuperAdmin: permissionData.isSuperAdmin,
      permissions: permissionData.permissions,
    };
  } catch {
    return reply.status(401).send({ message: 'Invalid or expired token' });
  }
}

export function requirePermission(permissionCode: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    if (reply.sent) return;

    const user = request.user as AuthUser | undefined;
    // Super Admin bypasses all permission checks
    const allowed = user?.isSuperAdmin || user?.roleCode === 'ADMINISTRATOR' || user?.permissions.includes(permissionCode);

    if (!allowed) {
      return reply.status(403).send({ message: 'Permission denied', permission: permissionCode });
    }
  };
}

export async function createSession(userId: string, companyId: string | null, roleCode: string, deviceId?: string) {
  const isSuperAdmin = roleCode === 'SUPER_ADMIN';
  const refreshToken = signRefreshToken({ sub: userId, companyId, roleCode, isSuperAdmin });
  const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ companyId, userId, refreshTokenHash, deviceId, expiresAt });

  return refreshToken;
}

export async function revokeRefreshToken(refreshToken: string) {
  try {
    // Decode payload first to get userId — avoids full table scan
    const payload = verifyRefreshToken(refreshToken);
    const rows = await db.select().from(sessions).where(eq(sessions.userId, payload.sub));

    for (const session of rows) {
      if (session.revokedAt) continue;
      const match = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (match) {
        await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));
        return true;
      }
    }
  } catch {
    // Token already invalid — treat as already revoked
    return false;
  }

  return false;
}

export async function findValidRefreshSession(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, payload.sub));

  for (const session of rows) {
    if (session.revokedAt) continue;
    if (session.expiresAt < new Date()) continue;
    const match = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (match) return { session, payload };
  }

  return null;
}


