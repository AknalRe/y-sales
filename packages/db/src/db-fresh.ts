import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { resolveDatabaseUrl } from './database-url.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const url = resolveDatabaseUrl();
console.log('Connecting:', url.substring(0, 40) + '...');

const sql = postgres(url, { max: 1 });

console.log('\n  ── Resetting database ──────────────────────────────────');
await sql`DROP SCHEMA public CASCADE`;
await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
await sql`CREATE SCHEMA public`;
console.log('  Schemas reset (public + drizzle).');

console.log('\n  ── Running migrations ──────────────────────────────────');
const { drizzle } = await import('drizzle-orm/postgres-js');
const { migrate } = await import('drizzle-orm/postgres-js/migrator');
const db = drizzle(sql);
await migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });
console.log('  Migrations complete!');

await sql.end();

console.log('\n  ── Running seed ────────────────────────────────────────');
await import('./seed-company.js');

console.log('\n  ── db:fresh complete! ──────────────────────────────────\n');
