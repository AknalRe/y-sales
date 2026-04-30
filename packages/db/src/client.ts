import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getPostgresClientOptions } from './database-url.js';
import * as schema from './schema/index.js';

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, getPostgresClientOptions());
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;


