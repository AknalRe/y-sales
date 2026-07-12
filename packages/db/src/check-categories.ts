import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { eq, like } from 'drizzle-orm';
import { createDb } from './client.js';
import { resolveDatabaseUrl } from './database-url.js';
import { outlets, companies, users, warehouses } from './schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
const db = createDb(resolveDatabaseUrl());

const clariceOutlets = await db.select().from(outlets).where(like(outlets.name, '%Clarice%'));
console.log('\n🏪 Clarice Outlets:');
for (const o of clariceOutlets) {
  const comp = await db.select().from(companies).where(eq(companies.id, o.companyId));
  console.log(`  - Outlet Name: ${o.name} (Company: ${comp[0]?.name} / ${comp[0]?.slug})`);
}

process.exit(0);
