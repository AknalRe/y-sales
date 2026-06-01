import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { createDb } from './client.js';
import { resolveDatabaseUrl } from './database-url.js';
import { appSettings, companies, inventoryBalances, outlets, permissions, products, rolePermissions, roles, subscriptionFeatures, subscriptionPlans, tenantSubscriptions, users, warehouses } from './schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const db = createDb(resolveDatabaseUrl());

await db.insert(companies).values({
  name: 'YukSales',
  slug: 'yuksales',
  status: 'active',
  timezone: 'Asia/Jakarta',
}).onConflictDoUpdate({
  target: companies.slug,
  set: { name: 'YukSales', status: 'active', timezone: 'Asia/Jakarta', updatedAt: new Date() },
});

const [defaultCompany] = await db.select().from(companies).where(eq(companies.slug, 'yuksales'));

if (!defaultCompany) {
  throw new Error('Default company YukSales gagal dibuat.');
}

const roleSeeds = [
  { code: 'ADMINISTRATOR', name: 'Administrator', description: 'Full system access including role and permission management.' },
  { code: 'OWNER', name: 'Owner', description: 'Business owner with executive access.' },
  { code: 'OPERATIONAL_MANAGER', name: 'Operational Manager', description: 'High-level operational monitoring and validation.' },
  { code: 'SUPERVISOR', name: 'Supervisor', description: 'Outlet control, assignment, approvals, and deposits.' },
  { code: 'ADMIN', name: 'Admin', description: 'Administrative master data and operational verification.' },
  { code: 'SALES_AGENT', name: 'Sales Agent', description: 'Field sales attendance, visits, and sales transactions.' },
];

const permissionSeeds = [
  ['system.manage', 'Manage System', 'system'],
  ['roles.manage', 'Manage Roles', 'access'],
  ['permissions.manage', 'Manage Permissions', 'access'],
  ['settings.manage', 'Manage Settings', 'settings'],
  ['users.manage', 'Manage Users', 'users'],
  ['attendance.review', 'Review Attendance', 'attendance'],
  ['attendance.execute', 'Execute Attendance', 'attendance'],
  ['outlets.manage', 'Manage Outlets', 'outlets'],
  ['outlets.verify', 'Verify Outlets', 'outlets'],
  ['visits.execute', 'Execute Visits', 'visits'],
  ['transactions.execute', 'Execute Transactions', 'transactions'],
  ['transactions.approve', 'Approve Transactions', 'transactions'],
  ['inventory.manage', 'Manage Inventory', 'inventory'],
  ['deposits.execute', 'Execute Deposits', 'deposits'],
  ['deposits.reconcile', 'Reconcile Deposits', 'deposits'],
  ['reports.view', 'View Reports', 'reports'],
  ['sales.view', 'View Sales', 'sales'],
  ['sales.order.create', 'Create Sales Orders', 'sales'],
  ['sales.order.review', 'Review Sales Orders', 'sales'],
  ['products.manage', 'Manage Products', 'products'],
  ['media.manage', 'Manage Media', 'media'],
  ['receivables.view', 'View Receivables', 'receivables'],
  ['invoice.review', 'Review Invoices', 'invoices'],
  ['visits.review', 'Review Visits', 'visits'],
] as const;

const settingSeeds: Array<{ key: string; value: unknown; description: string }> = [
  { key: 'default_geofence_radius_m', value: 100, description: 'Default outlet geofence radius in meters.' },
  { key: 'max_gps_accuracy_m', value: 100, description: 'Maximum accepted GPS accuracy in meters.' },
  { key: 'daily_visit_target', value: 20, description: 'Default daily visit target for sales agents.' },
  { key: 'gps_log_interval_seconds', value: 300, description: 'GPS logging interval while app is active.' },
  { key: 'face_detection_required', value: true, description: 'Require face presence detection for attendance.' },
];

for (const role of roleSeeds) {
  await db.insert(roles).values({ ...role, companyId: defaultCompany.id, isSystemRole: true }).onConflictDoUpdate({
    target: [roles.companyId, roles.code],
    set: { name: role.name, description: role.description, isSystemRole: true, updatedAt: new Date() },
  });
}

// ─── Platform Super Admin Role (global, no company) ────────────────────────
await db.insert(roles).values({
  companyId: null,
  code: 'SUPER_ADMIN',
  name: 'Super Admin Platform',
  description: 'Platform-level administrator. Has full access to all companies and system settings.',
  isSystemRole: true,
}).onConflictDoNothing();

for (const [code, name, module] of permissionSeeds) {
  await db.insert(permissions).values({ code, name, module }).onConflictDoUpdate({
    target: permissions.code,
    set: { name, module },
  });
}

const allPermissions = await db.select().from(permissions);
const permissionMap = new Map(allPermissions.map((p) => [p.code, p.id]));
const seededCompanyRoles = await db.select().from(roles).where(eq(roles.companyId, defaultCompany.id));
const roleMap = new Map(seededCompanyRoles.map((r) => [r.code, r.id]));

// ─── Default permissions per role ──────────────────────────────────────────
const rolePermissionSeeds: Record<string, string[]> = {
  ADMINISTRATOR: allPermissions.map((p) => p.code), // all permissions
  OWNER: [
    'sales.view', 'sales.order.create', 'sales.order.review',
    'attendance.execute', 'attendance.review',
    'visits.execute', 'visits.review',
    'transactions.execute', 'transactions.approve',
    'deposits.execute', 'deposits.reconcile',
    'outlets.manage', 'outlets.verify',
    'products.manage', 'inventory.manage',
    'media.manage',
    'users.manage', 'roles.manage',
    'reports.view', 'receivables.view', 'invoice.review',
    'settings.manage',
  ],
  OPERATIONAL_MANAGER: [
    'attendance.execute', 'attendance.review',
    'visits.execute', 'visits.review',
    'transactions.execute', 'transactions.approve',
    'deposits.execute', 'deposits.reconcile',
    'outlets.manage', 'outlets.verify',
    'products.manage', 'inventory.manage', 'media.manage',
    'reports.view', 'sales.view', 'sales.order.review',
    'receivables.view', 'invoice.review',
  ],
  SUPERVISOR: [
    'attendance.execute', 'attendance.review',
    'visits.execute', 'visits.review',
    'transactions.approve',
    'deposits.execute', 'deposits.reconcile',
    'outlets.manage',
    'reports.view', 'sales.view',
    'receivables.view', 'invoice.review',
  ],
  ADMIN: [
    'users.manage', 'roles.manage',
    'outlets.manage', 'outlets.verify',
    'products.manage', 'inventory.manage', 'media.manage',
    'attendance.review', 'visits.review',
    'reports.view', 'sales.view',
    'receivables.view', 'invoice.review',
  ],
  SALES_AGENT: [
    'attendance.execute',
    'visits.execute',
    'transactions.execute',
    'sales.view', 'sales.order.create',
    'deposits.execute',
    'reports.view',
  ],
};

console.log('\n  ── Default Permissions per Role ─────────────────────────');
for (const [roleCode, permCodes] of Object.entries(rolePermissionSeeds)) {
  const roleId = roleMap.get(roleCode);
  if (!roleId) {
    console.log(`  [SKIP] Role "${roleCode}" not found.`);
    continue;
  }
  let seeded = 0;
  for (const permCode of permCodes) {
    const permissionId = permissionMap.get(permCode);
    if (!permissionId) {
      console.log(`  [WARN] Permission "${permCode}" not found for role "${roleCode}".`);
      continue;
    }
    await db.insert(rolePermissions).values({ roleId, permissionId }).onConflictDoNothing();
    seeded++;
  }
  console.log(`  [OK] ${roleCode.padEnd(22)} ${seeded}/${permCodes.length} permissions`);
}
console.log('  ─────────────────────────────────────────────────────────');
console.log('  Role permissions seeded.\n');

for (const setting of settingSeeds) {
  await db.insert(appSettings).values(setting).onConflictDoUpdate({
    target: appSettings.key,
    set: { value: setting.value, description: setting.description },
  });
}

const sampleOutlets = [
  { code: 'OUT-001', name: 'Toko Jaya Abadi', customerType: 'store' as const, ownerName: 'Pak Jaya', phone: '081111111111', address: 'Jl. Merdeka No. 12, Surabaya', latitude: '-7.2504450', longitude: '112.7688450', geofenceRadiusM: 100, status: 'active' as const },
  { code: 'OUT-002', name: 'Warkop Berkah', customerType: 'store' as const, ownerName: 'Bu Sri', phone: '082222222222', address: 'Jl. Sudirman Blok C, Surabaya', latitude: '-7.2574720', longitude: '112.7520880', geofenceRadiusM: 120, status: 'active' as const },
  { code: 'OUT-003', name: 'Toko Makmur', customerType: 'store' as const, ownerName: 'Pak Makmur', phone: '083333333333', address: 'Pasar Baru Kios 4, Surabaya', latitude: '-7.2459710', longitude: '112.7378260', geofenceRadiusM: 100, status: 'active' as const },
];

for (const outlet of sampleOutlets) {
  await db.insert(outlets).values({ ...outlet, companyId: defaultCompany.id }).onConflictDoUpdate({
    target: [outlets.companyId, outlets.code],
    set: { ...outlet, updatedAt: new Date() },
  });
}

const sampleProducts = [
  { sku: 'YKS-KP-001', name: 'Kopi Robusta YukSales 250gr', description: 'Produk kopi retail premium.', unit: 'pack', priceDefault: '35000.00', status: 'active' as const },
  { sku: 'YKS-TH-001', name: 'Teh Rempah YukSales 20 pcs', description: 'Teh rempah untuk outlet dan agen.', unit: 'box', priceDefault: '28000.00', status: 'active' as const },
  { sku: 'YKS-SNK-001', name: 'Snack Singkong Original', description: 'Snack pendamping penjualan outlet.', unit: 'pack', priceDefault: '18000.00', status: 'active' as const },
  { sku: 'YKS-GFT-001', name: 'Paket Hampers YukSales', description: 'Bundle seasonal untuk program sales.', unit: 'set', priceDefault: '125000.00', status: 'active' as const },
];

for (const product of sampleProducts) {
  await db.insert(products).values({ ...product, companyId: defaultCompany.id }).onConflictDoUpdate({
    target: [products.companyId, products.sku],
    set: { ...product, updatedAt: new Date() },
  });
}

await db.insert(warehouses).values({
  companyId: defaultCompany.id,
  code: 'WH-MAIN',
  name: 'Gudang Utama YukSales',
  address: 'Gudang pusat operasional YukSales',
  type: 'main',
  status: 'active',
}).onConflictDoUpdate({
  target: [warehouses.companyId, warehouses.code],
  set: { name: 'Gudang Utama YukSales', address: 'Gudang pusat operasional YukSales', type: 'main', status: 'active' },
});

await db.insert(warehouses).values({
  companyId: defaultCompany.id,
  code: 'WH-SALES-001',
  name: 'Gudang Sales 001',
  address: 'Stok canvas sales default',
  type: 'sales_van',
  status: 'active',
}).onConflictDoUpdate({
  target: [warehouses.companyId, warehouses.code],
  set: { name: 'Gudang Sales 001', address: 'Stok canvas sales default', type: 'sales_van', status: 'active' },
});

const [mainWarehouse] = await db.select().from(warehouses).where(and(eq(warehouses.companyId, defaultCompany.id), eq(warehouses.code, 'WH-MAIN')));
const [salesWarehouse] = await db.select().from(warehouses).where(and(eq(warehouses.companyId, defaultCompany.id), eq(warehouses.code, 'WH-SALES-001')));
const seededProducts = await db.select().from(products).where(eq(products.companyId, defaultCompany.id));

if (mainWarehouse) {
  for (const product of seededProducts) {
    await db.insert(inventoryBalances).values({
      companyId: defaultCompany.id,
      warehouseId: mainWarehouse.id,
      productId: product.id,
      quantity: '100.00',
      reservedQuantity: '0.00',
    }).onConflictDoUpdate({
      target: [inventoryBalances.warehouseId, inventoryBalances.productId],
      set: { quantity: '100.00', reservedQuantity: '0.00', updatedAt: new Date() },
    });
  }
}

if (salesWarehouse) {
  for (const product of seededProducts) {
    await db.insert(inventoryBalances).values({
      companyId: defaultCompany.id,
      warehouseId: salesWarehouse.id,
      productId: product.id,
      quantity: '25.00',
      reservedQuantity: '0.00',
    }).onConflictDoUpdate({
      target: [inventoryBalances.warehouseId, inventoryBalances.productId],
      set: { quantity: '25.00', reservedQuantity: '0.00', updatedAt: new Date() },
    });
  }
}

// ─── Subscription Feature Catalog ───────────────────────────────────────────
const featureSeeds = [
  { key: 'attendance', label: 'Attendance', description: 'Absensi user tenant.', category: 'Operasional', status: 'active' },
  { key: 'visits', label: 'Customer Visits', description: 'Pencatatan kunjungan outlet/customer.', category: 'Sales', status: 'active' },
  { key: 'basic_reports', label: 'Basic Reports', description: 'Laporan dasar operasional dan aktivitas sales.', category: 'Reporting', status: 'active' },
  { key: 'route_tracking', label: 'Route Tracking', description: 'Tracking rute dan aktivitas sales lapangan.', category: 'Sales', status: 'active' },
  { key: 'face_recognition', label: 'Face Recognition', description: 'Validasi wajah untuk absensi/kunjungan.', category: 'Operasional', status: 'active' },
  { key: 'offline_sync', label: 'Offline Sync', description: 'Sinkronisasi data saat koneksi kembali online.', category: 'Operasional', status: 'active' },
  { key: 'order_taking', label: 'Order Taking', description: 'Pembuatan order penjualan dari aplikasi.', category: 'Sales', status: 'active' },
  { key: 'stock_management', label: 'Stock Management', description: 'Manajemen stok, gudang, dan produk.', category: 'Operasional', status: 'active' },
  { key: 'advanced_reports', label: 'Advanced Reports', description: 'Laporan lanjutan dan insight performa.', category: 'Reporting', status: 'active' },
  { key: 'export_excel', label: 'Export Excel', description: 'Export data operasional ke Excel.', category: 'Reporting', status: 'active' },
  { key: 'r2_storage', label: 'Cloud Storage', description: 'Penyimpanan file/foto berbasis object storage.', category: 'Integrasi', status: 'active' },
  { key: 'api_access', label: 'API Access', description: 'Akses integrasi API untuk sistem eksternal.', category: 'Integrasi', status: 'active' },
  { key: 'priority_support', label: 'Priority Support', description: 'Prioritas support untuk tenant enterprise.', category: 'Support', status: 'active' },
] as const;

for (const feature of featureSeeds) {
  await db.insert(subscriptionFeatures).values(feature).onConflictDoUpdate({
    target: subscriptionFeatures.key,
    set: {
      label: feature.label,
      description: feature.description,
      category: feature.category,
      status: feature.status,
      updatedAt: new Date(),
    },
  });
}

// ─── Subscription Plans ────────────────────────────────────────────────────
const allFeatureKeys = featureSeeds.map((f) => f.key);

const planSeeds = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'Untuk bisnis kecil yang baru memulai.',
    level: 1,
    priceMonthly: '0',
    priceYearly: '0',
    limits: { users: 10, outlets: 50, products: 200, warehouses: 2, sales_reps: 5, monthly_visits: 1000, monthly_orders: 500, storage_gb: 1 },
    features: ['visits', 'attendance', 'basic_reports'],
    isPublic: true,
    status: 'active',
  },
  {
    code: 'pro',
    name: 'Pro',
    description: 'Untuk tim sales yang lebih besar dengan fitur lengkap.',
    level: 2,
    priceMonthly: '299000',
    priceYearly: '2990000',
    limits: { users: 50, outlets: 500, products: 2000, warehouses: 10, sales_reps: 30, monthly_visits: 10000, monthly_orders: 5000, storage_gb: 10 },
    features: ['visits', 'attendance', 'face_recognition', 'advanced_reports', 'offline_sync', 'r2_storage'],
    isPublic: true,
    status: 'active',
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Full akses semua fitur platform tanpa batasan.',
    level: 3,
    priceMonthly: '999000',
    priceYearly: '9990000',
    limits: { users: 999999, outlets: 999999, products: 999999, warehouses: 999999, sales_reps: 999999, monthly_visits: 999999, monthly_orders: 999999, storage_gb: 999999 },
    features: allFeatureKeys,
    isPublic: true,
    status: 'active',
  },
];

for (const plan of planSeeds) {
  await db.insert(subscriptionPlans).values(plan).onConflictDoUpdate({
    target: subscriptionPlans.code,
    set: { name: plan.name, description: plan.description, level: plan.level, priceMonthly: plan.priceMonthly, priceYearly: plan.priceYearly, limits: plan.limits, features: plan.features, updatedAt: new Date() },
  });
}

const [enterprisePlan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, 'enterprise')).limit(1);

if (!enterprisePlan) {
  throw new Error('Plan enterprise gagal dibuat.');
}

async function seedFullPlanSubscription(companyId: string, managedByUserId?: string | null) {
  const now = new Date();

  await db.insert(tenantSubscriptions).values({
    companyId,
    planId: enterprisePlan.id,
    planCode: enterprisePlan.code,
    billingCycle: 'lifetime',
    status: 'active',
    activatedAt: now,
    currentPeriodStart: now,
    currentPeriodEnd: null,
    limitsSnapshot: enterprisePlan.limits ?? null,
    featuresSnapshot: enterprisePlan.features ?? allFeatureKeys,
    invoiceRef: 'SEED-FULL-PLAN',
    amountPaid: '0',
    paidAt: now,
    managedByUserId: managedByUserId ?? undefined,
  }).onConflictDoUpdate({
    target: tenantSubscriptions.companyId,
    set: {
      planId: enterprisePlan.id,
      planCode: enterprisePlan.code,
      billingCycle: 'lifetime',
      status: 'active',
      activatedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: null,
      limitsSnapshot: enterprisePlan.limits ?? null,
      featuresSnapshot: enterprisePlan.features ?? allFeatureKeys,
      invoiceRef: 'SEED-FULL-PLAN',
      amountPaid: '0',
      paidAt: now,
      managedByUserId: managedByUserId ?? undefined,
      updatedAt: now,
    },
  });
}

// YukSales is the internal/demo company, so seed it with full enterprise access.
await seedFullPlanSubscription(defaultCompany.id);

// ─── Users ────────────────────────────────────────────────────────────────
console.log('  ── Users ─────────────────────────────────────────────────');

// ─── Super Admin User ──────────────────────────────────────────────────────
const [superAdminRole] = await db.select().from(roles).where(and(eq(roles.code, 'SUPER_ADMIN')));
if (superAdminRole) {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@yuksales.id';
  const superAdminName = process.env.SUPER_ADMIN_NAME ?? 'Super Admin YukSales';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'SuperAdmin@123!';
  const passwordHash = await bcrypt.hash(superAdminPassword, 12);

  await db.insert(users).values({
    companyId: null,
    roleId: superAdminRole.id,
    name: superAdminName,
    email: superAdminEmail,
    passwordHash,
    status: 'active',
  }).onConflictDoUpdate({
    target: users.email,
    set: { name: superAdminName, roleId: superAdminRole.id, passwordHash, status: 'active', updatedAt: new Date() },
  });

  console.log(`  Super Admin created: ${superAdminEmail}`);
}

// ─── Sales Agent User ─────────────────────────────────────────────────────
const [salesAgentRole] = await db.select().from(roles).where(and(eq(roles.companyId, defaultCompany.id), eq(roles.code, 'SALES_AGENT')));
if (salesAgentRole) {
  const salesEmail = process.env.SALES_EMAIL ?? 'sales@yuksales.local';
  const salesName = process.env.SALES_NAME ?? 'Sales Agent YukSales';
  const salesPhone = process.env.SALES_PHONE ?? '089999999999';
  const salesEmployeeCode = process.env.SALES_EMPLOYEE_CODE ?? 'SA-001';
  const salesPassword = process.env.SALES_PASSWORD ?? 'YukSales@123!';
  const passwordHash = await bcrypt.hash(salesPassword, 12);

  await db.insert(users).values({
    companyId: defaultCompany.id,
    roleId: salesAgentRole.id,
    name: salesName,
    email: salesEmail,
    phone: salesPhone,
    employeeCode: salesEmployeeCode,
    passwordHash,
    status: 'active',
  }).onConflictDoUpdate({
    target: users.email,
    set: {
      companyId: defaultCompany.id,
      roleId: salesAgentRole.id,
      name: salesName,
      phone: salesPhone,
      employeeCode: salesEmployeeCode,
      passwordHash,
      status: 'active',
      updatedAt: new Date(),
    },
  });

  console.log(`  Sales Agent created: ${salesEmail}`);
}

// ─── Administrator User ───────────────────────────────────────────────────
const [administrator] = await db.select().from(roles).where(and(eq(roles.companyId, defaultCompany.id), eq(roles.code, 'ADMINISTRATOR')));
if (administrator) {
  const adminName = process.env.ADMIN_NAME ?? 'Administrator YukSales';
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@yuksales.local';
  const adminPhone = process.env.ADMIN_PHONE ?? '080000000000';
  const adminEmployeeCode = process.env.ADMIN_EMPLOYEE_CODE ?? 'ADM-001';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await db.insert(users).values({
    companyId: defaultCompany.id,
    roleId: administrator.id,
    name: adminName,
    email: adminEmail,
    phone: adminPhone,
    employeeCode: adminEmployeeCode,
    passwordHash,
    status: 'active',
  }).onConflictDoUpdate({
    target: users.email,
    set: {
      companyId: defaultCompany.id,
      roleId: administrator.id,
      name: adminName,
      phone: adminPhone,
      employeeCode: adminEmployeeCode,
      passwordHash,
      status: 'active',
      updatedAt: new Date(),
    },
  });

  console.log(`  Administrator created: ${adminEmail}`);
}

// ─── Mahasura Company (alternative) ─────────────────────────────────────────
const mahasuraCompany = await db
  .insert(companies)
  .values({
    name: 'Mahasura Sales Tracking',
    slug: 'mahasura',
    status: 'active',
    timezone: 'Asia/Jakarta',
  })
  .onConflictDoUpdate({
    target: companies.slug,
    set: { name: 'Mahasura Sales Tracking', status: 'active', timezone: 'Asia/Jakarta', updatedAt: new Date() },
  })
  .returning();

const [mahasuraCompanyResult] = mahasuraCompany;
if (!mahasuraCompanyResult) {
  throw new Error('Mahasura company gagal dibuat.');
}

console.log('  Mahasura company created: mahasura');
await seedFullPlanSubscription(mahasuraCompanyResult.id);
console.log('  Mahasura full enterprise plan assigned.');

// ─── Mahasura Roles & Permissions ─────────────────────────────────────────
// Insert roles if not exist
for (const role of roleSeeds) {
  const [existing] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.companyId, mahasuraCompanyResult.id), eq(roles.code, role.code)));

  if (!existing) {
    await db.insert(roles).values({ ...role, companyId: mahasuraCompanyResult.id, isSystemRole: true }).onConflictDoUpdate({
      target: [roles.companyId, roles.code],
      set: { name: role.name, description: role.description, isSystemRole: true, updatedAt: new Date() },
    });
  }
}

// Refresh role map for mahasura
const mahasuraSeededRoles = await db.select().from(roles).where(eq(roles.companyId, mahasuraCompanyResult.id));
const mahasuraRoleMap = new Map(mahasuraSeededRoles.map((r) => [r.code, r.id]));

// Assign all permissions to mahasura roles (same as yuksales)
console.log('\n  ── Mahasura Permissions per Role ──────────────────────────');
for (const [roleCode, permCodes] of Object.entries(rolePermissionSeeds)) {
  const roleId = mahasuraRoleMap.get(roleCode);
  if (!roleId) {
    console.log(`  [SKIP] Role "${roleCode}" not found.`);
    continue;
  }
  let seeded = 0;
  for (const permCode of permCodes) {
    const permissionId = permissionMap.get(permCode);
    if (!permissionId) {
      console.log(`  [WARN] Permission "${permCode}" not found for role "${roleCode}".`);
      continue;
    }
    await db.insert(rolePermissions).values({ roleId, permissionId }).onConflictDoNothing();
    seeded++;
  }
  console.log(`  [OK] ${roleCode.padEnd(22)} ${seeded}/${permCodes.length} permissions`);
}
console.log('  ─────────────────────────────────────────────────────────');
console.log('  Mahasura role permissions seeded.\n');

// ─── Mahasura Settings ─────────────────────────────────────────────
for (const setting of settingSeeds) {
  await db.insert(appSettings).values(setting).onConflictDoUpdate({
    target: appSettings.key,
    set: { value: setting.value, description: setting.description },
  });
}

// ─── Mahasura Sample Outlets ─────────────────────────────────────────
const mahasuraSampleOutlets = [
  { code: 'MHS-OT-01', name: 'Toko Surya Jaya', customerType: 'store', ownerName: 'Budi Santoso', phone: '081234567890', address: 'Jl. Pahlawan No. 45, Jakarta', latitude: '-6.2088', longitude: '106.8456', geofenceRadiusM: 150, status: 'active' },
  { code: 'MHS-OT-02', name: 'Warung Kopi Enak', customerType: 'store', ownerName: 'Siti Aminah', phone: '081234567891', address: 'Jl. Sudirman Kav. 12, Jakarta', latitude: '-6.1751', longitude: '106.8650', geofenceRadiusM: 100, status: 'active' },
  { code: 'MHS-OT-03', name: 'Toko Bahagia', customerType: 'store', ownerName: 'Ahmad Fauzi', phone: '081234567892', address: 'Mangga Dua Square Blok A No. 12, Jakarta', latitude: '-6.1422', longitude: '106.8802', geofenceRadiusM: 200, status: 'active' },
] as const;

for (const outlet of mahasuraSampleOutlets) {
  await db.insert(outlets).values({ ...outlet, companyId: mahasuraCompanyResult.id }).onConflictDoUpdate({
    target: [outlets.companyId, outlets.code],
    set: { ...outlet, updatedAt: new Date() },
  });
}

// ─── Mahasura Sample Products ─────────────────────────────────────────
const mahasuraSampleProducts = [
  { sku: 'MHS-PR-001', name: 'Beras Premium 5kg', description: 'Beras super premium untuk konsumsi rumah tangga.', unit: 'pack', priceDefault: '75000', status: 'active' },
  { sku: 'MHS-PR-002', name: 'Minyak Goreng 2L', description: 'Minyak sawit premium untuk memasak.', unit: 'botol', priceDefault: '28000', status: 'active' },
  { sku: 'MHS-PR-003', name: 'Gula Pasir 1kg', description: 'Gula pasir refined untuk industri rumah tangga.', unit: 'pack', priceDefault: '14000', status: 'active' },
  { sku: 'MHS-PR-004', name: 'Telur Ayam Kampung', description: 'Telur bebas rasakan dari peternakan lokal.', unit: 'butir (10 butir)', priceDefault: '25000', status: 'active' },
] as const;

for (const product of mahasuraSampleProducts) {
  await db.insert(products).values({ ...product, companyId: mahasuraCompanyResult.id }).onConflictDoUpdate({
    target: [products.companyId, products.sku],
    set: { ...product, updatedAt: new Date() },
  });
}

// ─── Mahasura Warehouses ─────────────────────────────────────────
const [mahasuraMainWarehouse] = await db
  .insert(warehouses)
  .values({
    companyId: mahasuraCompanyResult.id,
    code: 'MHS-WH-MAIN',
    name: 'Gudang Utama Mahasura',
    address: 'Gudang pusat operasional Mahasura',
    type: 'main',
    status: 'active',
  })
  .onConflictDoUpdate({
    target: [warehouses.companyId, warehouses.code],
    set: { name: 'Gudang Utama Mahasura', address: 'Gudang pusat operasional Mahasura', type: 'main', status: 'active' },
  })
  .returning();

const [mahasuraSalesWarehouse] = await db
  .insert(warehouses)
  .values({
    companyId: mahasuraCompanyResult.id,
    code: 'MHS-WH-SALES-001',
    name: 'Gudang Sales Mahasura 001',
    address: 'Stok canvas sales default',
    type: 'sales_van',
    status: 'active',
  })
  .onConflictDoUpdate({
    target: [warehouses.companyId, warehouses.code],
    set: { name: 'Gudang Sales Mahasura 001', address: 'Stok canvas sales default', type: 'sales_van', status: 'active' },
  })
  .returning();

// ─── Mahasura Inventory ─────────────────────────────────────────
const mahasuraSeededProducts = await db.select().from(products).where(eq(products.companyId, mahasuraCompanyResult.id));
if (mahasuraMainWarehouse && mahasuraSeededProducts.length > 0) {
  for (const product of mahasuraSeededProducts) {
    await db.insert(inventoryBalances).values({
      companyId: mahasuraCompanyResult.id,
      warehouseId: mahasuraMainWarehouse.id,
      productId: product.id,
      quantity: '50.00',
      reservedQuantity: '0.00',
    }).onConflictDoUpdate({
      target: [inventoryBalances.warehouseId, inventoryBalances.productId],
      set: { quantity: '50.00', reservedQuantity: '0.00', updatedAt: new Date() },
    });
  }
}

if (mahasuraSalesWarehouse && mahasuraSeededProducts.length > 0) {
  for (const product of mahasuraSeededProducts) {
    await db.insert(inventoryBalances).values({
      companyId: mahasuraCompanyResult.id,
      warehouseId: mahasuraSalesWarehouse.id,
      productId: product.id,
      quantity: '15.00',
      reservedQuantity: '0.00',
    }).onConflictDoUpdate({
      target: [inventoryBalances.warehouseId, inventoryBalances.productId],
      set: { quantity: '15.00', reservedQuantity: '0.00', updatedAt: new Date() },
    });
  }
}

// ─── Mahasura Users ─────────────────────────────────────────────
console.log('  ── Mahasura Users ─────────────────────────────────────────');

// Super Admin User (global, same as yuksales)
// (Super admin is companyId: null, so shared with yuksales)

// Mahasura Sales Agent
const [mahasuraSalesAgentRole] = await db.select().from(roles).where(and(eq(roles.companyId, mahasuraCompanyResult.id), eq(roles.code, 'SALES_AGENT')));
if (mahasuraSalesAgentRole) {
  const mahasuraSalesEmail = process.env.MAHASURA_SALES_EMAIL ?? 'sales@mahasura.local';
  const mahasuraSalesName = process.env.MAHASURA_SALES_NAME ?? 'Sales Agent Mahasura';
  const mahasuraSalesPhone = process.env.MAHASURA_SALES_PHONE ?? '089999999998';
  const mahasuraSalesEmployeeCode = process.env.MAHASURA_SALES_EMPLOYEE_CODE ?? 'MH-SA-001';
  const passwordHash = await bcrypt.hash(process.env.MAHASURA_SALES_PASSWORD ?? 'MahasuraSales@123!', 12);

  await db.insert(users).values({
    companyId: mahasuraCompanyResult.id,
    roleId: mahasuraSalesAgentRole.id,
    name: mahasuraSalesName,
    email: mahasuraSalesEmail,
    phone: mahasuraSalesPhone,
    employeeCode: mahasuraSalesEmployeeCode,
    passwordHash,
    status: 'active',
  }).onConflictDoUpdate({
    target: users.email,
    set: {
      companyId: mahasuraCompanyResult.id,
      roleId: mahasuraSalesAgentRole.id,
      name: mahasuraSalesName,
      phone: mahasuraSalesPhone,
      employeeCode: mahasuraSalesEmployeeCode,
      passwordHash,
      status: 'active',
      updatedAt: new Date(),
    },
  });

  console.log(`  Mahasura Sales Agent created: ${mahasuraSalesEmail}`);
}

// Mahasura Administrator
const [mahasuraAdminRole] = await db.select().from(roles).where(and(eq(roles.companyId, mahasuraCompanyResult.id), eq(roles.code, 'ADMINISTRATOR')));
if (mahasuraAdminRole) {
  const mahasuraAdminName = process.env.MAHASURA_ADMIN_NAME ?? 'Administrator Mahasura';
  const mahasuraAdminEmail = process.env.MAHASURA_ADMIN_EMAIL ?? 'admin@mahasura.local';
  const mahasuraAdminPhone = process.env.MAHASURA_ADMIN_PHONE ?? '080000000001';
  const mahasuraAdminEmployeeCode = process.env.MAHASURA_ADMIN_EMPLOYEE_CODE ?? 'MH-ADM-001';
  const passwordHash = await bcrypt.hash(process.env.MAHASURA_ADMIN_PASSWORD ?? 'MahasuraAdmin@123!', 12);

  await db.insert(users).values({
    companyId: mahasuraCompanyResult.id,
    roleId: mahasuraAdminRole.id,
    name: mahasuraAdminName,
    email: mahasuraAdminEmail,
    phone: mahasuraAdminPhone,
    employeeCode: mahasuraAdminEmployeeCode,
    passwordHash,
    status: 'active',
  }).onConflictDoUpdate({
    target: users.email,
    set: {
      companyId: mahasuraCompanyResult.id,
      roleId: mahasuraAdminRole.id,
      name: mahasuraAdminName,
      phone: mahasuraAdminPhone,
      employeeCode: mahasuraAdminEmployeeCode,
      passwordHash,
      status: 'active',
      updatedAt: new Date(),
    },
  });

  console.log(`  Mahasura Administrator created: ${mahasuraAdminEmail}`);
}

console.log('  ─────────────────────────────────────────────────────────');

console.log('  ─────────────────────────────────────────────────────────');
console.log('  Seed completed');


