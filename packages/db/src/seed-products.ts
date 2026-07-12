import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { createDb } from './client.js';
import { resolveDatabaseUrl } from './database-url.js';
import { companies, inventoryBalances, products, warehouses, users, roles } from './schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const db = createDb(resolveDatabaseUrl());

// ─── Resolve YukSales Company ─────────────────────────────────────────────────
const [company] = await db.select().from(companies).where(eq(companies.slug, 'yuksales'));
if (!company) {
  console.error('❌ Company YukSales tidak ditemukan. Jalankan seed.ts terlebih dahulu.');
  process.exit(1);
}

console.log(`✅ Company: ${company.name} (${company.id})`);

// ─── Ensure Gudang Utama & Sales Van ─────────────────────────────────────────
const [mainWarehouse] = await db
  .insert(warehouses)
  .values({
    companyId: company.id,
    code: 'YK-WH-MAIN',
    name: 'Gudang Utama YukSales',
    address: 'Gudang pusat operasional YukSales',
    type: 'main',
    status: 'active',
  })
  .onConflictDoUpdate({
    target: [warehouses.companyId, warehouses.code],
    set: { name: 'Gudang Utama YukSales', status: 'active' },
  })
  .returning();

const [salesAgent] = await db
  .select({ id: users.id })
  .from(users)
  .innerJoin(roles, eq(users.roleId, roles.id))
  .where(and(eq(users.companyId, company.id), eq(roles.code, 'SALES_AGENT')))
  .limit(1);

const salesAgentUserId = salesAgent?.id ?? null;

const [salesVanWarehouse] = await db
  .insert(warehouses)
  .values({
    companyId: company.id,
    code: 'YK-WH-SALES-001',
    name: 'Gudang Sales Van 001',
    address: 'Stok canvas sales default',
    type: 'sales_van',
    ownerUserId: salesAgentUserId,
    status: 'active',
  })
  .onConflictDoUpdate({
    target: [warehouses.companyId, warehouses.code],
    set: { name: 'Gudang Sales Van 001', ownerUserId: salesAgentUserId, status: 'active' },
  })
  .returning();

console.log(`✅ Gudang Utama : ${mainWarehouse?.name}`);
console.log(`✅ Gudang Sales : ${salesVanWarehouse?.name} (Owner ID: ${salesAgentUserId})`);

// ─── Product Seeds ────────────────────────────────────────────────────────────
type ProductSeed = {
  sku: string;
  name: string;
  description: string;
  unit: string;
  priceDefault: string;
  category: string;
};

const productSeeds: ProductSeed[] = [
  // ── ROKOK ──────────────────────────────────────────────────────────────────
  { sku: 'RKK-SURYA12', name: 'Rokok Surya 12', description: 'Rokok kretek Surya 12 batang per bungkus.', unit: 'bungkus', priceDefault: '24000', category: 'Rokok' },
  { sku: 'RKK-SURYA16', name: 'Rokok Surya 16', description: 'Rokok kretek Surya 16 batang per bungkus.', unit: 'bungkus', priceDefault: '28000', category: 'Rokok' },
  { sku: 'RKK-GUDMRH', name: 'Gudang Garam Merah', description: 'Rokok kretek Gudang Garam Merah 12 batang.', unit: 'bungkus', priceDefault: '23000', category: 'Rokok' },
  { sku: 'RKK-GUDSGM', name: 'Gudang Garam Surya Pro Mild', description: 'Rokok Gudang Garam Surya Pro Mild 16 batang.', unit: 'bungkus', priceDefault: '27000', category: 'Rokok' },
  { sku: 'RKK-SAMHIJAU', name: 'Sampoerna Hijau', description: 'Rokok kretek Sampoerna Hijau 12 batang.', unit: 'bungkus', priceDefault: '22000', category: 'Rokok' },
  { sku: 'RKK-SAMADMLD', name: 'Sampoerna A Mild', description: 'Rokok mild Sampoerna A Mild 16 batang.', unit: 'bungkus', priceDefault: '30000', category: 'Rokok' },
  { sku: 'RKK-DJARSUPR', name: 'Djarum Super', description: 'Rokok kretek Djarum Super 12 batang.', unit: 'bungkus', priceDefault: '26000', category: 'Rokok' },
  { sku: 'RKK-DJARBK', name: 'Djarum Black Mild', description: 'Rokok kretek Djarum Black Mild 16 batang.', unit: 'bungkus', priceDefault: '32000', category: 'Rokok' },
  { sku: 'RKK-LABOLD', name: 'LA Bold', description: 'Rokok mild LA Bold 16 batang per bungkus.', unit: 'bungkus', priceDefault: '29000', category: 'Rokok' },
  { sku: 'RKK-MARLBRED', name: 'Marlboro Red', description: 'Rokok Marlboro Red 20 batang impor.', unit: 'bungkus', priceDefault: '40000', category: 'Rokok' },
  { sku: 'RKK-MARLBGLD', name: 'Marlboro Gold', description: 'Rokok Marlboro Gold 20 batang impor.', unit: 'bungkus', priceDefault: '42000', category: 'Rokok' },
  { sku: 'RKK-CLASMLD', name: 'Class Mild', description: 'Rokok mild Class Mild 16 batang.', unit: 'bungkus', priceDefault: '27000', category: 'Rokok' },
  { sku: 'RKK-PRNTHN', name: 'Preton Filter', description: 'Rokok preton filter 12 batang ekonomis.', unit: 'bungkus', priceDefault: '12000', category: 'Rokok' },
  { sku: 'RKK-ECR', name: 'Rokok Eceran', description: 'Batang rokok eceran berbagai merek.', unit: 'batang', priceDefault: '2000', category: 'Rokok' },

  // ── MINYAK & LEMAK ─────────────────────────────────────────────────────────
  { sku: 'MYK-BIMOLI1L', name: 'Minyak Goreng Bimoli 1L', description: 'Minyak goreng sawit Bimoli 1 liter.', unit: 'botol', priceDefault: '16000', category: 'Minyak & Lemak' },
  { sku: 'MYK-BIMOLI2L', name: 'Minyak Goreng Bimoli 2L', description: 'Minyak goreng sawit Bimoli 2 liter.', unit: 'botol', priceDefault: '30000', category: 'Minyak & Lemak' },
  { sku: 'MYK-SANIA2L', name: 'Minyak Goreng Sania 2L', description: 'Minyak goreng sawit Sania 2 liter.', unit: 'botol', priceDefault: '29000', category: 'Minyak & Lemak' },
  { sku: 'MYK-TRPKL2L', name: 'Minyak Goreng Tropical 2L', description: 'Minyak goreng Tropical kemasan 2 liter.', unit: 'botol', priceDefault: '28000', category: 'Minyak & Lemak' },
  { sku: 'MYK-BLUBAND', name: 'Blue Band Margarin 200g', description: 'Margarin serbaguna Blue Band 200 gram.', unit: 'bungkus', priceDefault: '12000', category: 'Minyak & Lemak' },

  // ── BERAS & SEREALIA ───────────────────────────────────────────────────────
  { sku: 'BRS-PREM5K', name: 'Beras Premium 5kg', description: 'Beras putih premium kualitas terbaik 5kg.', unit: 'karung', priceDefault: '72000', category: 'Beras & Serealia' },
  { sku: 'BRS-PREM10K', name: 'Beras Premium 10kg', description: 'Beras putih premium 10 kg.', unit: 'karung', priceDefault: '140000', category: 'Beras & Serealia' },
  { sku: 'BRS-MED5K', name: 'Beras Medium 5kg', description: 'Beras medium harga terjangkau 5kg.', unit: 'karung', priceDefault: '58000', category: 'Beras & Serealia' },
  { sku: 'BRS-ROJLELE5', name: 'Beras Rojolele 5kg', description: 'Beras Rojolele pulen aroma khas 5kg.', unit: 'karung', priceDefault: '76000', category: 'Beras & Serealia' },

  // ── GULA & PEMANIS ─────────────────────────────────────────────────────────
  { sku: 'GLA-PASIR1K', name: 'Gula Pasir 1kg', description: 'Gula pasir rafinasi kemasan 1kg.', unit: 'bungkus', priceDefault: '15000', category: 'Gula & Pemanis' },
  { sku: 'GLA-PASIR2K', name: 'Gula Pasir 2kg', description: 'Gula pasir kemasan 2kg hemat.', unit: 'bungkus', priceDefault: '28000', category: 'Gula & Pemanis' },
  { sku: 'GLA-AREN500', name: 'Gula Aren 500g', description: 'Gula aren asli cetak 500 gram.', unit: 'bungkus', priceDefault: '18000', category: 'Gula & Pemanis' },
  { sku: 'GLA-JAWA250', name: 'Gula Merah / Jawa 250g', description: 'Gula merah cetak 250 gram.', unit: 'bungkus', priceDefault: '8000', category: 'Gula & Pemanis' },

  // ── TEPUNG & OLAHAN ────────────────────────────────────────────────────────
  { sku: 'TPG-SEGITIGA1', name: 'Tepung Terigu Segitiga 1kg', description: 'Tepung protein tinggi Segitiga Biru 1kg.', unit: 'bungkus', priceDefault: '13000', category: 'Tepung & Olahan' },
  { sku: 'TPG-KUNCI1K', name: 'Tepung Terigu Kunci Biru 1kg', description: 'Tepung terigu serba guna Kunci Biru 1kg.', unit: 'bungkus', priceDefault: '11000', category: 'Tepung & Olahan' },
  { sku: 'TPG-MAIZENA', name: 'Tepung Maizena 500g', description: 'Tepung jagung Maizena 500 gram.', unit: 'bungkus', priceDefault: '10000', category: 'Tepung & Olahan' },
  { sku: 'TPG-BERAS500', name: 'Tepung Beras 500g', description: 'Tepung beras halus 500 gram.', unit: 'bungkus', priceDefault: '7000', category: 'Tepung & Olahan' },

  // ── MI & PASTA ─────────────────────────────────────────────────────────────
  { sku: 'MI-INDOGR', name: 'Indomie Goreng', description: 'Mie instan goreng Indomie original.', unit: 'bungkus', priceDefault: '3500', category: 'Mi & Pasta' },
  { sku: 'MI-INDOSOTO', name: 'Indomie Kuah Soto', description: 'Mie instan kuah rasa soto Indomie.', unit: 'bungkus', priceDefault: '3500', category: 'Mi & Pasta' },
  { sku: 'MI-SUPRMGR', name: 'Supermi Goreng', description: 'Mie instan goreng Supermi 1 bungkus.', unit: 'bungkus', priceDefault: '3000', category: 'Mi & Pasta' },
  { sku: 'MI-SARIMI', name: 'Sarimi Ayam Bawang', description: 'Mie instan Sarimi rasa ayam bawang.', unit: 'bungkus', priceDefault: '2500', category: 'Mi & Pasta' },
  { sku: 'MI-DUS40', name: 'Indomie 1 Dus (40 pcs)', description: 'Indomie goreng 1 dus isi 40 bungkus.', unit: 'dus', priceDefault: '135000', category: 'Mi & Pasta' },

  // ── MINUMAN ────────────────────────────────────────────────────────────────
  { sku: 'MNM-AQUA600', name: 'Aqua Mineral 600ml', description: 'Air mineral Aqua botol 600ml.', unit: 'botol', priceDefault: '4000', category: 'Minuman' },
  { sku: 'MNM-AQUA1500', name: 'Aqua Mineral 1500ml', description: 'Air mineral Aqua botol 1500ml.', unit: 'botol', priceDefault: '7000', category: 'Minuman' },
  { sku: 'MNM-AQUAGLN', name: 'Aqua Galon 19L', description: 'Air mineral Aqua galon 19 liter.', unit: 'galon', priceDefault: '50000', category: 'Minuman' },
  { sku: 'MNM-TEHPUCUK', name: 'Teh Pucuk Harum 350ml', description: 'Minuman teh Pucuk Harum kemasan 350ml.', unit: 'botol', priceDefault: '5000', category: 'Minuman' },
  { sku: 'MNM-KAPALAPI', name: 'Kopi Kapal Api Sachet', description: 'Kopi hitam Kapal Api 1 sachet 25gr.', unit: 'sachet', priceDefault: '1500', category: 'Minuman' },
  { sku: 'MNM-GOODDAY', name: 'Good Day Cappuccino', description: 'Kopi Good Day Cappuccino 1 sachet.', unit: 'sachet', priceDefault: '2000', category: 'Minuman' },
  { sku: 'MNM-NUTRSARI', name: 'Nutrisari Jeruk Sachet', description: 'Minuman serbuk Nutrisari rasa jeruk 1 sachet.', unit: 'sachet', priceDefault: '1500', category: 'Minuman' },
  { sku: 'MNM-POCARISWT', name: 'Pocari Sweat 350ml', description: 'Minuman isotonik Pocari Sweat 350ml.', unit: 'botol', priceDefault: '8000', category: 'Minuman' },

  // ── SABUN & DETERJEN ───────────────────────────────────────────────────────
  { sku: 'SBN-RINSO800', name: 'Rinso Anti Noda 800g', description: 'Deterjen bubuk Rinso Anti Noda 800 gram.', unit: 'bungkus', priceDefault: '22000', category: 'Sabun & Deterjen' },
  { sku: 'SBN-DAIA900', name: 'Daia Deterjen 900g', description: 'Deterjen bubuk Daia 900 gram.', unit: 'bungkus', priceDefault: '16000', category: 'Sabun & Deterjen' },
  { sku: 'SBN-ATTACK800', name: 'Attack Plus Softener 800g', description: 'Deterjen bubuk Attack Plus Softener 800g.', unit: 'bungkus', priceDefault: '20000', category: 'Sabun & Deterjen' },
  { sku: 'SBN-LIFBY85', name: 'Sabun Lifebuoy 85g', description: 'Sabun batang Lifebuoy antibakteri 85 gram.', unit: 'batang', priceDefault: '5500', category: 'Sabun & Deterjen' },
  { sku: 'SBN-LUX85', name: 'Sabun Lux 85g', description: 'Sabun batang Lux parfum 85 gram.', unit: 'batang', priceDefault: '6500', category: 'Sabun & Deterjen' },
  { sku: 'SBN-SUNLGHT', name: 'Sunlight Cuci Piring 750ml', description: 'Cairan cuci piring Sunlight lemon 750ml.', unit: 'botol', priceDefault: '13000', category: 'Sabun & Deterjen' },
  { sku: 'SBN-MAMALMN', name: 'Mama Lemon 800ml', description: 'Cairan cuci piring Mama Lemon 800ml.', unit: 'botol', priceDefault: '11000', category: 'Sabun & Deterjen' },

  // ── PERSONAL CARE ──────────────────────────────────────────────────────────
  { sku: 'PRS-PANTENE', name: 'Shampo Pantene 170ml', description: 'Shampo Pantene Anti Rontok 170ml.', unit: 'botol', priceDefault: '18000', category: 'Personal Care' },
  { sku: 'PRS-CLEAR170', name: 'Shampo Clear 170ml', description: 'Shampo Clear Anti Ketombe 170ml.', unit: 'botol', priceDefault: '17000', category: 'Personal Care' },
  { sku: 'PRS-SUNSILK', name: 'Shampo Sunsilk 170ml', description: 'Shampo Sunsilk Smooth & Manageable 170ml.', unit: 'botol', priceDefault: '16000', category: 'Personal Care' },
  { sku: 'PRS-PEPSODT', name: 'Pasta Gigi Pepsodent 190g', description: 'Pasta gigi Pepsodent Action 123 190 gram.', unit: 'tube', priceDefault: '14000', category: 'Personal Care' },
  { sku: 'PRS-CIPTADT', name: 'Pasta Gigi Ciptadent 190g', description: 'Pasta gigi Ciptadent maxi 12 190 gram.', unit: 'tube', priceDefault: '12000', category: 'Personal Care' },

  // ── BUMBU & SAUS ───────────────────────────────────────────────────────────
  { sku: 'BMB-ABCKCP135', name: 'Kecap Manis ABC 135ml', description: 'Kecap manis ABC botol 135ml.', unit: 'botol', priceDefault: '9000', category: 'Bumbu & Saus' },
  { sku: 'BMB-BANGOKCP', name: 'Kecap Manis Bango 135ml', description: 'Kecap manis Bango botol 135ml.', unit: 'botol', priceDefault: '10000', category: 'Bumbu & Saus' },
  { sku: 'BMB-SAMBLBG', name: 'Saus Sambal ABC 335ml', description: 'Saus sambal ABC original 335ml.', unit: 'botol', priceDefault: '13000', category: 'Bumbu & Saus' },
  { sku: 'BMB-ROYCO75', name: 'Royco Bumbu Serbaguna 75g', description: 'Royco bumbu masak serbaguna 75 gram.', unit: 'sachet', priceDefault: '5000', category: 'Bumbu & Saus' },
  { sku: 'BMB-KNORR20', name: 'Knorr Kaldu Ayam 20g', description: 'Bumbu kaldu Knorr Chicken Powder 20 gram.', unit: 'sachet', priceDefault: '4000', category: 'Bumbu & Saus' },

  // ── SNACK & CAMILAN ────────────────────────────────────────────────────────
  { sku: 'SNK-CHITATO68', name: 'Chitato Sapi Panggang 68g', description: 'Keripik kentang Chitato rasa sapi panggang 68g.', unit: 'bungkus', priceDefault: '12000', category: 'Snack & Camilan' },
  { sku: 'SNK-TARO130', name: 'Taro Net Seaweed 130g', description: 'Snack Taro Net rasa rumput laut 130 gram.', unit: 'bungkus', priceDefault: '10000', category: 'Snack & Camilan' },
  { sku: 'SNK-PIATTOS50', name: 'Piattos Cheese 50g', description: 'Keripik kentang Piattos Cheese 50 gram.', unit: 'bungkus', priceDefault: '7000', category: 'Snack & Camilan' },
  { sku: 'SNK-REGALMAR', name: 'Biskuit Regal Marie 200g', description: 'Biskuit Marie Regal 200 gram.', unit: 'bungkus', priceDefault: '9000', category: 'Snack & Camilan' },
  { sku: 'SNK-OREO133', name: 'Oreo Sandwich Coklat 133g', description: 'Biskuit Oreo sandwich coklat 133 gram.', unit: 'bungkus', priceDefault: '11000', category: 'Snack & Camilan' },

  // ── SUSU ───────────────────────────────────────────────────────────────────
  { sku: 'SSU-INDOMLK400', name: 'Indomilk Kental Manis 400g', description: 'Susu kental manis Indomilk 400 gram.', unit: 'kaleng', priceDefault: '12000', category: 'Susu & Produk Susu' },
  { sku: 'SSU-FRISIAN1L', name: 'Susu Frisian Flag 1L', description: 'Susu pasteurisasi Frisian Flag full cream 1L.', unit: 'kotak', priceDefault: '18000', category: 'Susu & Produk Susu' },
  { sku: 'SSU-ULTRA1L', name: 'Susu Ultra Milk 1L', description: 'Susu UHT Ultra Milk full cream 1 liter.', unit: 'kotak', priceDefault: '17000', category: 'Susu & Produk Susu' },

  // ── PRODUK BAYI ────────────────────────────────────────────────────────────
  { sku: 'BYI-PAMPM', name: 'Pampers Active Baby M (24)', description: 'Popok bayi Pampers Active Baby ukuran M 24 lembar.', unit: 'pack', priceDefault: '65000', category: 'Produk Bayi' },
  { sku: 'BYI-SOFTNB', name: 'Softex Popok Bayi NB (20)', description: 'Popok bayi Softex Newborn 20 lembar.', unit: 'pack', priceDefault: '40000', category: 'Produk Bayi' },

  // ── TISSUE & KEBERSIHAN ────────────────────────────────────────────────────
  { sku: 'TIS-PASEO250', name: 'Tisu Paseo 250 lembar', description: 'Tisu wajah Paseo 250 lembar.', unit: 'kotak', priceDefault: '12000', category: 'Tissue & Kebersihan' },
  { sku: 'TIS-TESSA4R', name: 'Tisu Toilet Tessa 4 roll', description: 'Tisu toilet Tessa 4 roll per pack.', unit: 'pack', priceDefault: '16000', category: 'Tissue & Kebersihan' },
  { sku: 'TIS-ANTIS10', name: 'Tisu Basah Antis 10 lembar', description: 'Tisu basah antibakteri Antis 10 lembar.', unit: 'pack', priceDefault: '5000', category: 'Tissue & Kebersihan' },
  { sku: 'PLK-OXO100', name: 'Kantong Plastik OXO S', description: 'Kantong plastik Oxo ukuran S 100 lembar.', unit: 'roll', priceDefault: '8000', category: 'Tissue & Kebersihan' },
];

// ─── Insert / Update Products ────────────────────────────────────────────────
console.log(`\n🛒 Memasukkan ${productSeeds.length} produk ke YukSales...`);
let insertedCount = 0;
let updatedCount = 0;

for (const seed of productSeeds) {
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.companyId, company.id), eq(products.sku, seed.sku)));

  if (existing) {
    await db.update(products)
      .set({ name: seed.name, description: seed.description, unit: seed.unit, priceDefault: seed.priceDefault, category: seed.category, updatedAt: new Date() })
      .where(eq(products.id, existing.id));
    updatedCount++;
  } else {
    await db.insert(products).values({ ...seed, companyId: company.id, status: 'active' });
    insertedCount++;
  }
}

console.log(`  ✅ Inserted: ${insertedCount} produk baru`);
console.log(`  ♻️  Updated:  ${updatedCount} produk lama`);

// ─── Seed Inventory Balances ─────────────────────────────────────────────────
const allProducts = await db.select().from(products).where(eq(products.companyId, company.id));

function getMainStock(category: string | null): number {
  switch (category) {
    case 'Rokok': return 200;
    case 'Mi & Pasta': return 500;
    case 'Minuman': return 120;
    case 'Beras & Serealia': return 80;
    case 'Sabun & Deterjen': return 100;
    case 'Personal Care': return 80;
    default: return 100;
  }
}

function getSalesStock(category: string | null): number {
  switch (category) {
    case 'Rokok': return 80;
    case 'Mi & Pasta': return 150;
    case 'Minuman': return 40;
    case 'Beras & Serealia': return 20;
    default: return 30;
  }
}

if (mainWarehouse) {
  console.log(`\n📦 Seeding stok gudang utama: ${mainWarehouse.name}`);
  for (const product of allProducts) {
    const qty = getMainStock((product as any).category ?? null);
    await db.insert(inventoryBalances).values({
      companyId: company.id,
      warehouseId: mainWarehouse.id,
      productId: product.id,
      quantity: String(qty),
      reservedQuantity: '0',
    }).onConflictDoUpdate({
      target: [inventoryBalances.warehouseId, inventoryBalances.productId],
      set: { quantity: String(qty), reservedQuantity: '0', updatedAt: new Date() },
    });
  }
  console.log(`  ✅ ${allProducts.length} produk di-stok di gudang utama`);
}

if (salesVanWarehouse) {
  console.log(`\n🚐 Seeding stok gudang sales: ${salesVanWarehouse.name}`);
  for (const product of allProducts) {
    const qty = getSalesStock((product as any).category ?? null);
    await db.insert(inventoryBalances).values({
      companyId: company.id,
      warehouseId: salesVanWarehouse.id,
      productId: product.id,
      quantity: String(qty),
      reservedQuantity: '0',
    }).onConflictDoUpdate({
      target: [inventoryBalances.warehouseId, inventoryBalances.productId],
      set: { quantity: String(qty), reservedQuantity: '0', updatedAt: new Date() },
    });
  }
  console.log(`  ✅ ${allProducts.length} produk di-stok di gudang sales`);
}

console.log('\n🎉 Seed produk YukSales selesai!');
console.log(`   Total produk di database: ${allProducts.length}`);
