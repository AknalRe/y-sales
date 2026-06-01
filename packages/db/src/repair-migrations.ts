import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { getPostgresClientOptions, resolveDatabaseUrl } from './database-url.js';

type JournalEntry = {
  idx: number;
  when: number;
  tag: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const migrationsDir = path.resolve(__dirname, '../drizzle');
const journalPath = path.join(migrationsDir, 'meta/_journal.json');
const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as { entries: JournalEntry[] };

const sql = postgres(resolveDatabaseUrl(), getPostgresClientOptions());

async function hasColumn(tableName: string, columnName: string) {
  const [row] = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = ${tableName}
        and column_name = ${columnName}
    ) as "exists"
  `;
  return row?.exists === true;
}

async function hasIndex(indexName: string) {
  const [row] = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and indexname = ${indexName}
    ) as "exists"
  `;
  return row?.exists === true;
}

async function hasTable(tableName: string) {
  const [row] = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = ${tableName}
    ) as "exists"
  `;
  return row?.exists === true;
}

async function assertSchemaLooksCurrent() {
  const checks = [
    ['companies table', await hasTable('companies')],
    ['users table', await hasTable('users')],
    ['visit_schedules table', await hasTable('visit_schedules')],
    ['companies.code column', await hasColumn('companies', 'code')],
    ['products.image_url column', await hasColumn('products', 'image_url')],
    ['users_company_employee_code_idx index', await hasIndex('users_company_employee_code_idx')],
    ['attendance_sessions_company_user_date_idx index', await hasIndex('attendance_sessions_company_user_date_idx')],
    ['visit_sessions_status_idx index', await hasIndex('visit_sessions_status_idx')],
  ] as const;

  const missing = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Schema database belum terlihat lengkap, repair dibatalkan. Missing: ${missing.join(', ')}`);
  }
}

function migrationHash(entry: JournalEntry) {
  const filePath = path.join(migrationsDir, `${entry.tag}.sql`);
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

try {
  await assertSchemaLooksCurrent();

  await sql`create schema if not exists drizzle`;
  await sql`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;

  const existing = await sql<{ created_at: string | number | null }[]>`
    select created_at
    from drizzle.__drizzle_migrations
  `;
  const existingCreatedAt = new Set(existing.map((row) => Number(row.created_at)));
  const missing = journal.entries.filter((entry) => !existingCreatedAt.has(entry.when));

  if (!missing.length) {
    console.log('Drizzle migration journal already synchronized.');
  } else {
    for (const entry of missing) {
      await sql`
        insert into drizzle.__drizzle_migrations (hash, created_at)
        values (${migrationHash(entry)}, ${entry.when})
      `;
      console.log(`Marked migration as applied: ${entry.tag}`);
    }
    console.log(`Repair complete. ${missing.length} migration record(s) inserted.`);
  }
} catch (error) {
  console.error('Repair failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
