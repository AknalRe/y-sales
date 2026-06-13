import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { createDb } from './client.js';
import { resolveDatabaseUrl } from './database-url.js';
import { permissions, rolePermissions, roles } from './schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const db = createDb(resolveDatabaseUrl());

// ─── Master Permission List ───────────────────────────────────────────────────
// Sumber kebenaran tunggal untuk seluruh permission yang diakui sistem.
// Tambahkan entri baru di sini agar ter-upsert ke semua role yang relevan.
const permissionSeeds: Array<[string, string, string]> = [
  ['system.manage',           'Manage System',            'system'],
  ['roles.manage',            'Manage Roles',             'access'],
  ['permissions.manage',      'Manage Permissions',       'access'],
  ['settings.manage',         'Manage Settings',          'settings'],
  ['users.manage',            'Manage Users',             'users'],
  ['attendance.review',       'Review Attendance',        'attendance'],
  ['attendance.execute',      'Execute Attendance',       'attendance'],
  ['outlets.manage',          'Manage Outlets',           'outlets'],
  ['outlets.verify',          'Verify Outlets',           'outlets'],
  ['visits.execute',          'Execute Visits',           'visits'],
  ['visits.review',           'Review Visits',            'visits'],
  ['transactions.execute',    'Execute Transactions',     'transactions'],
  ['transactions.approve',    'Approve Transactions',     'transactions'],
  ['inventory.manage',        'Manage Inventory',         'inventory'],
  ['deposits.execute',        'Execute Deposits',         'deposits'],
  ['deposits.reconcile',      'Reconcile Deposits',       'deposits'],
  ['reports.view',            'View Reports',             'reports'],
  ['sales.view',              'View Sales',               'sales'],
  ['sales.order.create',      'Create Sales Orders',      'sales'],
  ['sales.order.review',      'Review Sales Orders',      'sales'],
  ['products.manage',         'Manage Products',          'products'],
  ['media.manage',            'Manage Media',             'media'],
  ['receivables.view',        'View Receivables',         'receivables'],
  ['receivables.manage',      'Manage Receivables',       'receivables'],
  ['invoice.review',          'Review Invoices',          'invoices'],
];

// ─── Permission per Role ──────────────────────────────────────────────────────
// Mendefinisikan permission default per role. Hanya menambah (onConflictDoNothing),
// tidak mencabut permission yang sudah di-assign secara manual.
const rolePermissionSeeds: Record<string, string[]> = {
  ADMINISTRATOR: permissionSeeds.map(([code]) => code), // semua permission
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
    'reports.view', 'receivables.view', 'receivables.manage', 'invoice.review',
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
    'receivables.view', 'receivables.manage', 'invoice.review',
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

// ─── Step 1: Upsert semua permission ke tabel permissions ────────────────────
console.log('\n  ── Upserting permissions ─────────────────────────────────');
let upsertedCount = 0;
for (const [code, name, module] of permissionSeeds) {
  await db.insert(permissions).values({ code, name, module }).onConflictDoUpdate({
    target: permissions.code,
    set: { name, module },
  });
  upsertedCount++;
}
console.log(`  [OK] ${upsertedCount} permissions upserted.`);

// ─── Step 2: Ambil semua permission & semua role dari DB ─────────────────────
const allPermissions = await db.select().from(permissions);
const permissionMap = new Map(allPermissions.map((p) => [p.code, p.id]));

const allRoles = await db.select().from(roles);

// ─── Step 3: Assign permissions ke tiap role di tiap company ─────────────────
// Grouping role by code — karena setiap company punya role dengan code yang sama.
const rolesByCode = new Map<string, typeof allRoles>();
for (const role of allRoles) {
  if (!rolesByCode.has(role.code)) rolesByCode.set(role.code, []);
  rolesByCode.get(role.code)!.push(role);
}

console.log('\n  ── Assigning permissions to roles ────────────────────────');
let totalAssigned = 0;
let totalSkipped = 0;

for (const [roleCode, permCodes] of Object.entries(rolePermissionSeeds)) {
  const matchedRoles = rolesByCode.get(roleCode) ?? [];
  if (matchedRoles.length === 0) {
    console.log(`  [SKIP] Role "${roleCode}" tidak ditemukan di database.`);
    continue;
  }

  for (const role of matchedRoles) {
    // Cek permission yang sudah di-assign untuk role ini
    const existing = await db.select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, role.id));
    const existingSet = new Set(existing.map((r) => r.permissionId));

    let assigned = 0;
    for (const permCode of permCodes) {
      const permissionId = permissionMap.get(permCode);
      if (!permissionId) {
        console.log(`  [WARN] Permission "${permCode}" tidak ditemukan.`);
        totalSkipped++;
        continue;
      }
      if (existingSet.has(permissionId)) continue; // sudah ada, skip
      await db.insert(rolePermissions).values({ roleId: role.id, permissionId }).onConflictDoNothing();
      assigned++;
      totalAssigned++;
    }

    const companyLabel = role.companyId ? `companyId=${role.companyId.slice(0, 8)}` : 'global';
    if (assigned > 0) {
      console.log(`  [OK] ${roleCode.padEnd(22)} (${companyLabel}) +${assigned} permission baru.`);
    }
  }
}

console.log(`\n  Total assigned : ${totalAssigned} role-permission baru`);
console.log(`  Total skipped  : ${totalSkipped} permission tidak ditemukan`);
console.log('  ─────────────────────────────────────────────────────────');
console.log('  db:seed --permissions selesai.\n');
