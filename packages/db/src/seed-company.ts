import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { createDb } from './client.js';
import { resolveDatabaseUrl } from './database-url.js';
import { companies, permissions, rolePermissions, roles, subscriptionFeatures, subscriptionPlans, tenantSubscriptions, users } from './schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const db = createDb(resolveDatabaseUrl());

const allFeatureKeys = [
  'attendance', 'visits', 'basic_reports', 'route_tracking',
  'face_recognition', 'offline_sync', 'order_taking', 'stock_management',
  'advanced_reports', 'export_excel', 'r2_storage', 'api_access', 'priority_support',
];

const roleSeeds = [
  { code: 'ADMINISTRATOR', name: 'Administrator', description: 'Full system access including role and permission management.' },
  { code: 'OWNER', name: 'Owner', description: 'Business owner with executive access.' },
  { code: 'OPERATIONAL_MANAGER', name: 'Operational Manager', description: 'High-level operational monitoring and validation.' },
  { code: 'SUPERVISOR', name: 'Supervisor', description: 'Outlet control, assignment, approvals, and deposits.' },
  { code: 'ADMIN', name: 'Admin', description: 'Administrative master data and operational verification.' },
  { code: 'SALES_AGENT', name: 'Sales Agent', description: 'Field sales attendance, visits, and sales transactions.' },
];

const permissionSeeds: Array<[string, string, string]> = [
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
];

const rolePermissionSeeds: Record<string, string[]> = {
  ADMINISTRATOR: permissionSeeds.map(([code]) => code),
  OWNER: [
    'sales.view', 'sales.order.create', 'sales.order.review',
    'attendance.execute', 'attendance.review', 'visits.execute', 'visits.review',
    'transactions.execute', 'transactions.approve', 'deposits.execute', 'deposits.reconcile',
    'outlets.manage', 'outlets.verify', 'products.manage', 'inventory.manage',
    'media.manage', 'users.manage', 'roles.manage', 'reports.view', 'receivables.view', 'invoice.review', 'settings.manage',
  ],
  OPERATIONAL_MANAGER: [
    'attendance.execute', 'attendance.review', 'visits.execute', 'visits.review',
    'transactions.execute', 'transactions.approve', 'deposits.execute', 'deposits.reconcile',
    'outlets.manage', 'outlets.verify', 'products.manage', 'inventory.manage', 'media.manage',
    'reports.view', 'sales.view', 'sales.order.review', 'receivables.view', 'invoice.review',
  ],
  SUPERVISOR: [
    'attendance.execute', 'attendance.review', 'visits.execute', 'visits.review',
    'transactions.approve', 'deposits.execute', 'deposits.reconcile', 'outlets.manage',
    'reports.view', 'sales.view', 'receivables.view', 'invoice.review',
  ],
  ADMIN: [
    'users.manage', 'roles.manage', 'outlets.manage', 'outlets.verify',
    'products.manage', 'inventory.manage', 'media.manage', 'attendance.review', 'visits.review',
    'reports.view', 'sales.view', 'receivables.view', 'invoice.review',
  ],
  SALES_AGENT: [
    'attendance.execute', 'visits.execute', 'transactions.execute',
    'sales.view', 'sales.order.create', 'deposits.execute', 'reports.view',
  ],
};

async function seedCompany(companyConfig: { name: string; slug: string; adminEmail: string; adminPassword: string }) {
  const { name, slug, adminEmail, adminPassword } = companyConfig;

  console.log(`\n  ── Company: ${name} ──────────────────────────────────────`);

  const [company] = await db.insert(companies).values({
    name, slug, status: 'active', timezone: 'Asia/Jakarta',
  }).onConflictDoUpdate({
    target: companies.slug,
    set: { name, status: 'active', timezone: 'Asia/Jakarta', updatedAt: new Date() },
  }).returning();

  if (!company) throw new Error(`Company ${name} gagal dibuat.`);

  // Subscription
  const [enterprisePlan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, 'enterprise')).limit(1);
  if (enterprisePlan) {
    const now = new Date();
    await db.insert(tenantSubscriptions).values({
      companyId: company.id,
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
    }).onConflictDoUpdate({
      target: tenantSubscriptions.companyId,
      set: {
        planId: enterprisePlan.id, planCode: enterprisePlan.code, billingCycle: 'lifetime', status: 'active',
        activatedAt: now, currentPeriodStart: now, currentPeriodEnd: null,
        limitsSnapshot: enterprisePlan.limits ?? null, featuresSnapshot: enterprisePlan.features ?? allFeatureKeys,
        invoiceRef: 'SEED-FULL-PLAN', amountPaid: '0', paidAt: now, updatedAt: now,
      },
    });
    console.log('  Enterprise subscription assigned.');
  }

  // Roles
  for (const role of roleSeeds) {
    await db.insert(roles).values({ ...role, companyId: company.id, isSystemRole: true }).onConflictDoUpdate({
      target: [roles.companyId, roles.code],
      set: { name: role.name, description: role.description, isSystemRole: true, updatedAt: new Date() },
    });
  }

  // Permissions
  for (const [code, name, module] of permissionSeeds) {
    await db.insert(permissions).values({ code, name, module }).onConflictDoUpdate({
      target: permissions.code, set: { name, module },
    });
  }

  const allPermissions = await db.select().from(permissions);
  const permissionMap = new Map(allPermissions.map((p) => [p.code, p.id]));
  const seededRoles = await db.select().from(roles).where(eq(roles.companyId, company.id));
  const roleMap = new Map(seededRoles.map((r) => [r.code, r.id]));

  for (const [roleCode, permCodes] of Object.entries(rolePermissionSeeds)) {
    const roleId = roleMap.get(roleCode);
    if (!roleId) continue;
    for (const permCode of permCodes) {
      const permissionId = permissionMap.get(permCode);
      if (!permissionId) continue;
      await db.insert(rolePermissions).values({ roleId, permissionId }).onConflictDoNothing();
    }
  }
  console.log('  Roles & permissions seeded.');

  // Admin account
  const [adminRole] = await db.select().from(roles).where(and(eq(roles.companyId, company.id), eq(roles.code, 'ADMINISTRATOR')));
  if (adminRole) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.insert(users).values({
      companyId: company.id,
      roleId: adminRole.id,
      name: `Administrator ${name}`,
      email: adminEmail,
      passwordHash,
      status: 'active',
    }).onConflictDoUpdate({
      target: users.email,
      set: { companyId: company.id, roleId: adminRole.id, name: `Administrator ${name}`, passwordHash, status: 'active', updatedAt: new Date() },
    });
    console.log(`  Admin account: ${adminEmail} / ${adminPassword}`);
  }
}

// ─── Platform Super Admin ─────────────────────────────────────────────────
const [superAdminRole] = await db.select().from(roles).where(and(eq(roles.code, 'SUPER_ADMIN')));
if (superAdminRole) {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@yuksales.id';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'SuperAdmin@123!';
  const passwordHash = await bcrypt.hash(superAdminPassword, 12);

  await db.insert(users).values({
    companyId: null,
    roleId: superAdminRole.id,
    name: 'Super Admin',
    email: superAdminEmail,
    passwordHash,
    status: 'active',
  }).onConflictDoUpdate({
    target: users.email,
    set: { name: 'Super Admin', roleId: superAdminRole.id, passwordHash, status: 'active', updatedAt: new Date() },
  });
  console.log(`\n  Platform Super Admin: ${superAdminEmail} / ${superAdminPassword}`);
}

// ─── Companies ─────────────────────────────────────────────────────────────
await seedCompany({
  name: 'YukSales',
  slug: 'yuksales',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@yuksales.local',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'Admin@123!',
});

await seedCompany({
  name: 'Mahasura',
  slug: 'mahasura',
  adminEmail: process.env.MAHASURA_ADMIN_EMAIL ?? 'admin@mahasura.local',
  adminPassword: process.env.MAHASURA_ADMIN_PASSWORD ?? 'MahasuraAdmin@123!',
});

console.log('\n  ── db:seedcompany complete! ─────────────────────────────\n');
