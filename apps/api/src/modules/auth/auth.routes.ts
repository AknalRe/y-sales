import type { FastifyInstance, FastifyReply } from 'fastify';
import { and, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { companies, roles, users } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { env } from '../../config/env.js';
import {
  authenticate,
  createSession,
  findValidRefreshSession,
  revokeRefreshToken,
  signAccessToken,
  verifyPassword,
} from './auth.service.js';

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
  deviceId: z.string().optional(),
  companySlug: z.string().min(1).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

function cookieOptions(maxAgeSeconds: number) {
  const sameSite = env.REFRESH_COOKIE_SECURE ? 'None' : 'Lax';
  const secure = env.REFRESH_COOKIE_SECURE ? '; Secure' : '';
  return `HttpOnly; SameSite=${sameSite}; Path=/auth; Max-Age=${maxAgeSeconds}${secure}`;
}

function setRefreshCookie(reply: FastifyReply, refreshToken: string) {
  reply.header('Set-Cookie', `${env.REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}; ${cookieOptions(30 * 24 * 60 * 60)}`);
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.header('Set-Cookie', `${env.REFRESH_COOKIE_NAME}=; ${cookieOptions(0)}`);
}

function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const found = cookies.find((cookie) => cookie.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : undefined;
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    if (body.companySlug) {
      const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, body.companySlug)).limit(1);
      if (!company) {
        return reply.status(404).send({ message: 'Perusahaan tidak ditemukan.' });
      }
    }

    const identifierConditions = [
      eq(users.email, body.identifier),
      eq(users.phone, body.identifier),
      eq(users.employeeCode, body.identifier),
    ];

    const conditions = [or(...identifierConditions)!];
    if (body.companySlug) {
      conditions.push(eq(companies.slug, body.companySlug));
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        passwordHash: users.passwordHash,
        status: users.status,
        deletedAt: users.deletedAt,
        companyId: users.companyId,
        companyName: companies.name,
        companySlug: companies.slug,
        roleCode: roles.code,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(and(...conditions));

    if (!user || !user.passwordHash || user.status !== 'active' || user.deletedAt) {
      return reply.status(401).send({ message: 'Email/HP/kode karyawan atau password salah.' });
    }

    if (!await verifyPassword(body.password, user.passwordHash)) {
      return reply.status(401).send({ message: 'Email/HP/kode karyawan atau password salah.' });
    }

    const accessToken = signAccessToken({ sub: user.id, companyId: user.companyId, roleCode: user.roleCode, isSuperAdmin: user.roleCode === 'SUPER_ADMIN' });
    const refreshToken = await createSession(user.id, user.companyId, user.roleCode, body.deviceId);
    await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
    setRefreshCookie(reply, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roleCode: user.roleCode,
        isSuperAdmin: user.roleCode === 'SUPER_ADMIN',
        company: user.companyId ? {
          id: user.companyId,
          name: user.companyName,
          slug: user.companySlug,
        } : null,
      },
    };
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body ?? {});
    const refreshToken = body.refreshToken ?? getCookieValue(request.headers.cookie, env.REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      return reply.status(401).send({ message: 'Sesi tidak valid atau sudah berakhir. Silakan login ulang.' });
    }

    const result = await findValidRefreshSession(refreshToken);

    if (!result) {
      return reply.status(401).send({ message: 'Sesi tidak valid atau sudah berakhir. Silakan login ulang.' });
    }

    // Rotate refresh token
    const newRefreshToken = await createSession(result.payload.sub, result.payload.companyId, result.payload.roleCode);
    await revokeRefreshToken(refreshToken);
    setRefreshCookie(reply, newRefreshToken);

    return {
      accessToken: signAccessToken(result.payload),
      refreshToken: newRefreshToken,
    };
  });

  app.post('/auth/logout', async (request, reply) => {
    const body = refreshSchema.parse(request.body ?? {});
    const refreshToken = body.refreshToken ?? getCookieValue(request.headers.cookie, env.REFRESH_COOKIE_NAME);
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    clearRefreshCookie(reply);
    return { success: true };
  });

  app.get('/auth/me', { preHandler: authenticate }, async (request) => {
    const authUser = request.user!;
    const [profile] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        employeeCode: users.employeeCode,
        roleCode: roles.code,
        companyId: companies.id,
        companyName: companies.name,
        companySlug: companies.slug,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.id, authUser.id));

    return {
      user: profile ? {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        employeeCode: profile.employeeCode,
        roleCode: profile.roleCode,
        isSuperAdmin: authUser.isSuperAdmin,
        company: profile.companyId ? {
          id: profile.companyId,
          name: profile.companyName,
          slug: profile.companySlug,
        } : null,
      } : null,
      permissions: authUser.permissions,
    };
  });

  // ─── Public: Get company info by slug (no auth) ───────────────────────
  app.get('/auth/company/:slug', async (request, reply) => {
    const params = request.params as { slug: string };
    const [company] = await db
      .select({ name: companies.name, slug: companies.slug, logoUrl: companies.logoUrl })
      .from(companies)
      .where(eq(companies.slug, params.slug))
      .limit(1);

    if (!company) {
      return reply.status(404).send({ message: 'Perusahaan tidak ditemukan.' });
    }

    return { company };
  });
}
