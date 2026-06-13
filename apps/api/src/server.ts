import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startSessionCleanupScheduler } from './tasks/session-cleanup.js';

const app = await buildApp();

// Mulai background task untuk membersihkan session expired/revoked
startSessionCleanupScheduler();

try {
  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}


