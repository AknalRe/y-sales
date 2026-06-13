import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';

import { env } from './config/env.js';
import { registerRoutes } from './routes.js';

import fs from 'node:fs';
import path from 'node:path';

function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'input';
    return `${path}: ${issue.message}`;
  });
  return issues.join('; ');
}

export async function buildApp() {
  const allowedOrigins = env.WEB_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  const httpsOptions = env.API_HTTPS_ENABLED
    ? {
        key: fs.readFileSync(path.resolve(env.API_TLS_KEY_PATH)),
        cert: fs.readFileSync(path.resolve(env.API_TLS_CERT_PATH)),
      }
    : undefined;
  const app = Fastify({
    logger: env.APP_DEBUG,
    ...(httpsOptions ? { https: httpsOptions } : {}),
  });

  // ─── Request/Response Logger (always active) ────────────────────────────
  app.addHook('onRequest', async (request) => {
    (request as any)._startTime = Date.now();
    console.log(`[${new Date().toISOString()}] → ${request.method} ${request.url} ip=${request.ip}`);
  });

  app.addHook('onResponse', async (request, reply) => {
    const elapsed = Date.now() - ((request as any)._startTime || Date.now());
    console.log(`[${new Date().toISOString()}] ← ${request.method} ${request.url} status=${reply.statusCode} elapsed=${elapsed}ms`);
  });

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(multipart, {
    limits: {
      fileSize: 8 * 1024 * 1024,
    },
  });


  app.setErrorHandler((error, request, reply) => {
    const appError = error as Error & { statusCode?: number; code?: string };
    request.log.error(appError);

    // Zod validation errors → 400 with formatted message
    if (error instanceof ZodError) {
      const message = env.APP_DEBUG
        ? `Validasi gagal: ${formatZodError(error)}`
        : `Data tidak valid: ${formatZodError(error)}`;
      return reply.status(400).send({ message });
    }

    const statusCode = appError.statusCode && appError.statusCode >= 400 ? appError.statusCode : 500;
    const safeMessage = statusCode >= 500 ? 'Terjadi kesalahan server. Silakan coba lagi.' : appError.message;

    return reply.status(statusCode).send({
      message: env.APP_DEBUG ? appError.message : safeMessage,
      ...(env.APP_DEBUG ? { raw: { name: appError.name, stack: appError.stack, code: appError.code } } : {}),
    });
  });

  app.get('/health', async () => ({ status: 'ok', service: 'yuksales-api' }));

  await registerRoutes(app);

  return app;
}


