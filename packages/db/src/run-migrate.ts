import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { resolveDatabaseUrl } from './database-url.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const url = resolveDatabaseUrl();
console.log('Connecting via URL prefix:', url.substring(0, 40) + '...');

const client = postgres(url, { max: 1 });
const db = drizzle(client);

console.log('Running migrations...');
await migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });
console.log('Migrations complete!');

await client.end();
