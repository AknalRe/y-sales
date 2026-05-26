import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

import { env } from './config/env.js';
import { registerRoutes } from './routes.js';

import fs from 'node:fs';
import path from 'node:path';

export async function buildApp() {
  const allowedOrigins = env.WEB_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  const app = Fastify({
    logger: env.APP_DEBUG,
    https: {
      key: fs.readFileSync(path.resolve('192.168.18.66+2-key.pem')),
      cert: fs.readFileSync(path.resolve('192.168.18.66+2.pem')),
    }
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


