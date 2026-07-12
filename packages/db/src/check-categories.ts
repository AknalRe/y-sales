import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { eq, isNull } from 'drizzle-orm';
import { createDb } from './client.js';
import { resolveDatabaseUrl } from './database-url.js';
import { companies, products } from './schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
const db = createDb(resolveDatabaseUrl());

const [company] = await db.select().from(companies).where(eq(companies.slug, 'yuksales'));
if (!company) { console.error('Company not found'); process.exit(1); }

const nullCatProducts = await db.select({ id: products.id, sku: products.sku, name: products.name })
  .from(products)
  .where(eq(products.companyId, company.id))

const missing = nullCatProducts.filter(p => !p);
console.log('\n📋 Produk tanpa kategori (NULL):');
nullCatProducts.forEach(p => console.log(`  SKU: ${p.sku} | ${p.name}`));

process.exit(0);
