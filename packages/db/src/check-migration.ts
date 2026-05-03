import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveDatabaseUrl } from './database-url.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(resolveDatabaseUrl());

try {
  const enums = await sql`SELECT typname FROM pg_type WHERE typname IN ('billing_cycle','platform_action','sub_status','subscription_status') AND typtype='e'`;
  console.log('Existing enums:', enums.map(e => e.typname));
  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('tenant_subscriptions','subscription_plans','platform_audit_logs')`;
  console.log('Existing tables:', tables.map(t => t.tablename));
  const migrations = await sql`SELECT name FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5`;
  console.log('Last migrations:', migrations.map(m => m.name));
} catch(e) {
  console.error('Error:', e instanceof Error ? e.message : e);
}

await sql.end();
