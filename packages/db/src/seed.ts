import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { createDb } from './client.js';
import { resolveDatabaseUrl } from './database-url.js';
import { appSettings, companies, companySubscriptions, inventoryBalances, outlets, permissions, products, rolePermissions, roles, users, warehouses } from './schema/index.js';

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

await db.insert(companySubscriptions).values({
  companyId: defaultCompany.id,
  planCode: 'starter',
  status: 'active',
  limits: { users: 25, outlets: 500, products: 1000 },
}).onConflictDoUpdate({
  target: [companySubscriptions.companyId, companySubscriptions.planCode],
  set: { status: 'active', limits: { users: 25, outlets: 500, products: 1000 }, updatedAt: new Date() },
});

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
  await db.insert(roles).values({ ...role, companyId: defaultCompany.id }).onConflictDoUpdate({
    target: [roles.companyId, roles.code],
    set: { name: role.name, description: role.description, updatedAt: new Date() },
  });
}

for (const [code, name, module] of permissionSeeds) {
  await db.insert(permissions).values({ code, name, module }).onConflictDoUpdate({
    target: permissions.code,
    set: { name, module },
  });
}

const [administrator] = await db.select().from(roles).where(and(eq(roles.companyId, defaultCompany.id), eq(roles.code, 'ADMINISTRATOR')));
const allPermissions = await db.select().from(permissions);

if (administrator) {
  for (const permission of allPermissions) {
    await db.insert(rolePermissions).values({
      roleId: administrator.id,
      permissionId: permission.id,
    }).onConflictDoNothing();
  }

  if (process.env.ADMIN_PASSWORD) {
    const adminName = process.env.ADMIN_NAME ?? 'Administrator YukSales';
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@yuksales.local';
    const adminPhone = process.env.ADMIN_PHONE ?? '080000000000';
    const adminEmployeeCode = process.env.ADMIN_EMPLOYEE_CODE ?? 'ADM-001';
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

    await db.update(users).set({
      companyId: defaultCompany.id,
      roleId: administrator.id,
      name: adminName,
      email: adminEmail,
      employeeCode: adminEmployeeCode,
      passwordHash,
      status: 'active',
      updatedAt: new Date(),
    }).where(eq(users.phone, adminPhone));
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
  }
}

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

const [mainWarehouse] = await db.select().from(warehouses).where(and(eq(warehouses.companyId, defaultCompany.id), eq(warehouses.code, 'WH-MAIN')));
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

console.log('Seed completed');


