import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { getPostgresClientOptions, resolveDatabaseUrl } from './database-url.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const url = resolveDatabaseUrl();
const parsed = new URL(url);
const maskedUrl = `${parsed.protocol}//${parsed.username}:***@${parsed.host}${parsed.pathname}`;

console.log('SUPABASE_DATABASE =', process.env.SUPABASE_DATABASE ?? '(not set)');
console.log('Resolved database URL =', maskedUrl);
console.log('Host =', parsed.hostname);
console.log('Port =', parsed.port || '(default)');
console.log('Username =', decodeURIComponent(parsed.username));
console.log('Database =', parsed.pathname.replace(/^\//, ''));
console.log('Options =', getPostgresClientOptions());

const sql = postgres(url, getPostgresClientOptions());
try {
  const result = await sql`select current_user, current_database(), now()`;
  console.log('Connection OK:', result[0]);
} catch (error) {
  console.error('Connection FAILED');
  console.error(error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}


