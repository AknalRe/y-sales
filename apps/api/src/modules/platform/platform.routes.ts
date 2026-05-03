import type { FastifyInstance } from 'fastify';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { companies, platformInvoices, platformPayments, subscriptionFeatures, subscriptionPlans, tenantSubscriptions, users, roles } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { authenticate } from '../auth/auth.service.js';
import { requireSuperAdmin } from '../tenant.js';
import { PLAN_LIMIT_KEYS } from '../subscription-catalog.js';

const companyCreateSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'slug hanya boleh huruf kecil, angka, dan tanda hubung'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().default('Indonesia').optional(),
  timezone: z.string().default('Asia/Jakarta'),
  planCode: z.string().default('starter'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  trialDays: z.number().int().min(0).default(14),
});

const companyUpdateSchema = companyCreateSchema.partial().omit({ planCode: true, billingCycle: true, trialDays: true }).extend({
  status: z.enum(['active', 'trialing', 'suspended', 'cancelled']).optional(),
});

const planFeatureSchema = z.string().min(2).max(100);
const planLimitSchema = z.enum(PLAN_LIMIT_KEYS as [typeof PLAN_LIMIT_KEYS[number], ...typeof PLAN_LIMIT_KEYS]);

const subscriptionFeatureSchema = z.object({
  key: z.string().min(2).max(100).regex(/^[a-z0-9_:-]+$/, 'key hanya boleh huruf kecil, angka, underscore, colon, atau dash'),
  label: z.string().min(2).max(140),
  description: z.string().optional(),
  category: z.string().min(2).max(80).default('Custom'),
  status: z.enum(['active', 'inactive', 'deprecated']).default('active'),
});

const planCreateSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  level: z.number().int().min(1).max(99).default(1),
  priceMonthly: z.number().min(0).default(0),
  priceYearly: z.number().min(0).default(0),
  limits: z.record(planLimitSchema, z.number().min(0)).optional(),
  features: z.array(planFeatureSchema).optional(),
  isPublic: z.boolean().default(true),
  status: z.string().default('active'),
});

const suspendSchema = z.object({
  reason: z.string().min(5),
});

const subscriptionUpdateSchema = z.object({
  planCode: z.string(),
  billingCycle: z.enum(['monthly', 'yearly', 'lifetime']).optional(),
  status: z.enum(['trialing', 'active', 'past_due', 'suspended', 'cancelled', 'expired']).optional(),
  trialDays: z.number().int().min(0).optional(),
  trialEndsAt: z.coerce.date().nullable().optional(),
  currentPeriodStart: z.coerce.date().nullable().optional(),
  currentPeriodEnd: z.coerce.date().nullable().optional(),
  autoCalculatePeriodEnd: z.boolean().optional(),
  invoiceRef: z.string().optional(),
  amountPaid: z.number().min(0).optional(),
  paidAt: z.coerce.date().nullable().optional(),
});

const invoiceCreateSchema = z.object({
  companyId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(3).max(120).optional(),
  status: z.enum(['draft', 'issued', 'paid', 'overdue', 'void', 'cancelled']).default('issued'),
  billingReason: z.enum(['new_subscription', 'renewal', 'upgrade', 'downgrade', 'manual_adjustment']).default('manual_adjustment'),
  billingCycle: z.enum(['monthly', 'yearly', 'lifetime']).default('monthly'),
  // plan snapshot — required for non-renewal reasons, optional for renewal
  planCode: z.string().min(1).max(80).optional(),
  periodStart: z.coerce.date().nullable().optional(),
  periodEnd: z.coerce.date().nullable().optional(),
  subtotalAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0).optional(),
  currency: z.string().default('IDR'),
  dueAt: z.coerce.date().nullable().optional(),
  notes: z.string().optional(),
});

const invoiceUpdateSchema = invoiceCreateSchema.partial().omit({ companyId: true, subscriptionId: true });

const paymentCreateSchema = z.object({
  paymentRef: z.string().optional(),
  provider: z.string().default('manual'),
  method: z.string().default('manual'),
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded']).default('succeeded'),
  amount: z.number().min(0),
  currency: z.string().default('IDR'),
  paidAt: z.coerce.date().nullable().optional(),
  notes: z.string().optional(),
});

function generateInvoiceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function calculateTotal(subtotal: number, discount = 0, tax = 0) {
  return Math.max(0, subtotal - discount + tax);
}

function calculatePeriodEnd(start: Date, cycle: 'monthly' | 'yearly' | 'lifetime') {
  if (cycle === 'lifetime') return null;
  const end = new Date(start);
  if (cycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

function superAdminHook() {
  return { preHandler: [authenticate, requireSuperAdmin] };
}

export async function platformRoutes(app: FastifyInstance) {

  // ─── Billing: Invoices & Payments ──────────────────────────────────────────

  app.get('/platform/billing/invoices', superAdminHook(), async (request) => {
    const query = z.object({ status: z.string().optional(), companyId: z.string().uuid().optional() }).parse(request.query);
    const conditions = [query.status ? eq(platformInvoices.status, query.status as any) : undefined, query.companyId ? eq(platformInvoices.companyId, query.companyId) : undefined].filter(Boolean) as any[];
    const rows = await db.select({ invoice: platformInvoices, companyName: companies.name }).from(platformInvoices)
      .leftJoin(companies, eq(platformInvoices.companyId, companies.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(platformInvoices.createdAt));
    return { invoices: rows.map(row => ({ ...row.invoice, companyName: row.companyName })) };
  });

  app.get('/platform/billing/invoices/:id', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [row] = await db.select({ invoice: platformInvoices, company: companies, subscription: tenantSubscriptions }).from(platformInvoices)
      .leftJoin(companies, eq(platformInvoices.companyId, companies.id))
      .leftJoin(tenantSubscriptions, eq(platformInvoices.subscriptionId, tenantSubscriptions.id))
      .where(eq(platformInvoices.id, params.id))
      .limit(1);
    if (!row) return reply.status(404).send({ message: 'Invoice tidak ditemukan.' });
    const payments = await db.select().from(platformPayments)
      .where(eq(platformPayments.invoiceId, params.id))
      .orderBy(desc(platformPayments.createdAt));
    return { invoice: { ...row.invoice, company: row.company, subscription: row.subscription, payments } };
  });

  app.get('/platform/billing/payments', superAdminHook(), async () => {
    const rows = await db.select({ payment: platformPayments, companyName: companies.name, invoiceNumber: platformInvoices.invoiceNumber }).from(platformPayments)
      .leftJoin(companies, eq(platformPayments.companyId, companies.id))
      .leftJoin(platformInvoices, eq(platformPayments.invoiceId, platformInvoices.id))
      .orderBy(desc(platformPayments.createdAt));
    return { payments: rows.map(row => ({ ...row.payment, companyName: row.companyName, invoiceNumber: row.invoiceNumber })) };
  });

  app.post('/platform/billing/invoices', superAdminHook(), async (request, reply) => {
    const body = invoiceCreateSchema.parse(request.body);
    const [company] = await db.select().from(companies).where(eq(companies.id, body.companyId)).limit(1);
    if (!company) return reply.status(404).send({ message: 'Company tidak ditemukan.' });
    const subtotal = body.subtotalAmount;
    const total = body.totalAmount ?? calculateTotal(subtotal, body.discountAmount, body.taxAmount);

    // Resolve plan snapshot
    let planCode: string | undefined;
    let planName: string | undefined;
    if (body.billingReason === 'renewal') {
      // For renewal, use the subscription's current plan
      if (body.subscriptionId) {
        const [sub] = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.id, body.subscriptionId)).limit(1);
        if (sub) {
          planCode = sub.planCode;
          const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, sub.planCode)).limit(1);
          planName = plan?.name;
        }
      }
    } else if (body.planCode) {
      // For new/upgrade/downgrade/manual — use the selected plan
      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, body.planCode)).limit(1);
      planCode = body.planCode;
      planName = plan?.name;
    }

    const [invoice] = await db.insert(platformInvoices).values({
      companyId: body.companyId,
      subscriptionId: body.subscriptionId,
      invoiceNumber: body.invoiceNumber ?? generateInvoiceNumber(),
      status: body.status as any ?? 'issued',
      billingReason: body.billingReason as any,
      billingCycle: body.billingCycle as any,
      planCode: planCode ?? null,
      planName: planName ?? null,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      subtotalAmount: String(subtotal),
      discountAmount: String(body.discountAmount),
      taxAmount: String(body.taxAmount),
      totalAmount: String(total),
      currency: body.currency,
      dueAt: body.dueAt,
      notes: body.notes,
      createdByUserId: (request as any).user?.id,
      paidAt: body.status === 'paid' ? new Date() : undefined,
    }).returning();
    return { invoice };
  });

  app.patch('/platform/billing/invoices/:id', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = invoiceUpdateSchema.parse(request.body);
    const [existing] = await db.select().from(platformInvoices).where(eq(platformInvoices.id, params.id)).limit(1);
    if (!existing) return reply.status(404).send({ message: 'Invoice tidak ditemukan.' });
    const subtotal = body.subtotalAmount ?? Number(existing.subtotalAmount);
    const discount = body.discountAmount ?? Number(existing.discountAmount);
    const tax = body.taxAmount ?? Number(existing.taxAmount);
    const total = body.totalAmount ?? calculateTotal(subtotal, discount, tax);
    const [invoice] = await db.update(platformInvoices).set({
      ...body,
      subtotalAmount: String(subtotal),
      discountAmount: String(discount),
      taxAmount: String(tax),
      totalAmount: String(total),
      paidAt: body.status === 'paid' ? new Date() : existing.paidAt,
      voidedAt: body.status === 'void' ? new Date() : existing.voidedAt,
      updatedAt: new Date(),
    }).where(eq(platformInvoices.id, params.id)).returning();
    return { invoice };
  });

  app.post('/platform/billing/invoices/:id/payments', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = paymentCreateSchema.parse(request.body);
    const [invoice] = await db.select().from(platformInvoices).where(eq(platformInvoices.id, params.id)).limit(1);
    if (!invoice) return reply.status(404).send({ message: 'Invoice tidak ditemukan.' });
    const paidAt = body.paidAt ?? new Date();
    const [payment] = await db.insert(platformPayments).values({
      companyId: invoice.companyId,
      invoiceId: invoice.id,
      subscriptionId: invoice.subscriptionId,
      paymentRef: body.paymentRef,
      provider: body.provider,
      method: body.method,
      status: body.status,
      amount: String(body.amount),
      currency: body.currency,
      paidAt,
      receivedByUserId: (request as any).user?.id,
      notes: body.notes,
    }).returning();
    if (body.status === 'succeeded') {
      await db.update(platformInvoices).set({ status: 'paid', paidAt, updatedAt: new Date() }).where(eq(platformInvoices.id, invoice.id));
      if (invoice.subscriptionId) {
        const isRenewal = invoice.billingReason === 'renewal';

        if (isRenewal) {
          // Renewal: only extend the period, keep current plan
          await db.update(tenantSubscriptions).set({
            status: 'active',
            currentPeriodStart: invoice.periodStart ?? undefined,
            currentPeriodEnd: invoice.periodEnd ?? undefined,
            invoiceRef: invoice.invoiceNumber,
            amountPaid: String(body.amount),
            paidAt,
            updatedAt: new Date(),
          }).where(eq(tenantSubscriptions.id, invoice.subscriptionId));
        } else if (invoice.planCode) {
          // New/upgrade/downgrade/manual: change plan + update period
          const [newPlan] = await db.select().from(subscriptionPlans)
            .where(eq(subscriptionPlans.code, invoice.planCode)).limit(1);
          await db.update(tenantSubscriptions).set({
            status: 'active',
            planCode: invoice.planCode,
            planId: newPlan?.id ?? undefined,
            limitsSnapshot: newPlan?.limits ?? null,
            featuresSnapshot: newPlan?.features ?? null,
            currentPeriodStart: invoice.periodStart ?? undefined,
            currentPeriodEnd: invoice.periodEnd ?? undefined,
            invoiceRef: invoice.invoiceNumber,
            amountPaid: String(body.amount),
            paidAt,
            updatedAt: new Date(),
          }).where(eq(tenantSubscriptions.id, invoice.subscriptionId));
        } else {
          // No plan info — just update period and payment info
          await db.update(tenantSubscriptions).set({
            status: 'active',
            currentPeriodStart: invoice.periodStart ?? undefined,
            currentPeriodEnd: invoice.periodEnd ?? undefined,
            invoiceRef: invoice.invoiceNumber,
            amountPaid: String(body.amount),
            paidAt,
            updatedAt: new Date(),
          }).where(eq(tenantSubscriptions.id, invoice.subscriptionId));
        }
      }
    }
    return { payment };
  });

  // ─── Companies ─────────────────────────────────────────────────────────────

  app.get('/platform/companies', superAdminHook(), async (request) => {
    const query = z.object({
      status: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(request.query);
    const offset = (query.page - 1) * query.limit;

    const rows = await db.select().from(companies)
      .orderBy(desc(companies.createdAt))
      .limit(query.limit)
      .offset(offset);

    const enriched = await Promise.all(rows.map(async (company) => {
      const [subscription] = await db.select().from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.companyId, company.id))
        .orderBy(desc(tenantSubscriptions.createdAt))
        .limit(1);

      if (!subscription) return { ...company, subscriptionSummary: null };

      const [plan] = await db.select().from(subscriptionPlans)
        .where(eq(subscriptionPlans.code, subscription.planCode))
        .limit(1);

      return {
        ...company,
        subscriptionSummary: {
          id: subscription.id,
          planCode: subscription.planCode,
          planName: plan?.name ?? subscription.planCode,
          planLevel: plan?.level ?? null,
          billingCycle: subscription.billingCycle,
          status: subscription.status,
          trialEndsAt: subscription.trialEndsAt,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          priceMonthly: plan?.priceMonthly ?? null,
          priceYearly: plan?.priceYearly ?? null,
          amountPaid: subscription.amountPaid,
          paidAt: subscription.paidAt,
          invoiceRef: subscription.invoiceRef,
        },
      };
    }));

    return { companies: enriched, page: query.page, limit: query.limit };
  });

  app.post('/platform/companies', superAdminHook(), async (request) => {
    const body = companyCreateSchema.parse(request.body);
    const actorId = request.user!.id;

    const [company] = await db.insert(companies).values({
      name: body.name,
      slug: body.slug,
      email: body.email,
      phone: body.phone,
      address: body.address,
      city: body.city,
      province: body.province,
      country: body.country,
      timezone: body.timezone,
      status: 'active',
    }).returning();

    // create starter subscription
    const trialEndsAt = body.trialDays > 0 ? new Date(Date.now() + body.trialDays * 86400000) : undefined;
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, body.planCode)).limit(1);
    await db.insert(tenantSubscriptions).values({
      companyId: company.id,
      planId: plan?.id,
      planCode: body.planCode,
      billingCycle: body.billingCycle,
      status: body.trialDays > 0 ? 'trialing' : 'active',
      trialEndsAt,
      limitsSnapshot: plan?.limits ?? null,
      featuresSnapshot: plan?.features ?? null,
      managedByUserId: actorId,
    });

    return { company };
  });

  app.get('/platform/companies/:id', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [company] = await db.select().from(companies).where(eq(companies.id, params.id));
    if (!company) return reply.status(404).send({ message: 'Company tidak ditemukan.' });
    const [sub] = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.companyId, params.id)).orderBy(desc(tenantSubscriptions.createdAt)).limit(1);
    const userCount = await db.select().from(users).where(and(eq(users.companyId, params.id), isNull(users.deletedAt)));
    return { company, subscription: sub ?? null, userCount: userCount.length };
  });

  app.patch('/platform/companies/:id', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = companyUpdateSchema.parse(request.body);
    const [existing] = await db.select().from(companies).where(eq(companies.id, params.id));
    if (!existing) return reply.status(404).send({ message: 'Company tidak ditemukan.' });
    const [updated] = await db.update(companies).set({ ...body, updatedAt: new Date() }).where(eq(companies.id, params.id)).returning();
    return { company: updated };
  });

  app.delete('/platform/companies/:id', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [existing] = await db.select().from(companies).where(eq(companies.id, params.id));
    if (!existing) return reply.status(404).send({ message: 'Company tidak ditemukan.' });
    await db.update(companies).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(companies.id, params.id));
    return { success: true };
  });

  // ─── Company Users & Stats ──────────────────────────────────────────────────

  app.get('/platform/companies/:id/users', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const rows = await db.select({
      id: users.id, name: users.name, email: users.email, phone: users.phone,
      status: users.status, roleCode: roles.code, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
    }).from(users).innerJoin(roles, eq(users.roleId, roles.id)).where(eq(users.companyId, params.id)).orderBy(desc(users.createdAt));
    return { users: rows };
  });

  app.get('/platform/companies/:id/stats', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [company] = await db.select().from(companies).where(eq(companies.id, params.id));
    if (!company) return reply.status(404).send({ message: 'Company tidak ditemukan.' });
    const [sub] = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.companyId, params.id)).orderBy(desc(tenantSubscriptions.createdAt)).limit(1);
    const userRows = await db.select().from(users).where(eq(users.companyId, params.id));
    return { company, subscription: sub ?? null, stats: { totalUsers: userRows.length, activeUsers: userRows.filter(u => u.status === 'active').length } };
  });

  // ─── Company Lifecycle ──────────────────────────────────────────────────────

  app.post('/platform/companies/:id/suspend', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = suspendSchema.parse(request.body);
    const [company] = await db.select().from(companies).where(eq(companies.id, params.id));
    if (!company) return reply.status(404).send({ message: 'Company tidak ditemukan.' });
    await db.update(companies).set({ status: 'suspended', updatedAt: new Date() }).where(eq(companies.id, params.id));
    await db.update(tenantSubscriptions).set({ status: 'suspended', suspendedAt: new Date(), suspendReason: body.reason, updatedAt: new Date() }).where(eq(tenantSubscriptions.companyId, params.id));
    return { success: true, message: `Company "${company.name}" telah disuspend.` };
  });

  app.post('/platform/companies/:id/activate', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [company] = await db.select().from(companies).where(eq(companies.id, params.id));
    if (!company) return reply.status(404).send({ message: 'Company tidak ditemukan.' });
    await db.update(companies).set({ status: 'active', updatedAt: new Date() }).where(eq(companies.id, params.id));
    await db.update(tenantSubscriptions).set({ status: 'active', suspendedAt: undefined, suspendReason: undefined, updatedAt: new Date() }).where(eq(tenantSubscriptions.companyId, params.id));
    return { success: true, message: `Company "${company.name}" telah diaktifkan kembali.` };
  });

  app.post('/platform/companies/:id/cancel', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ reason: z.string().optional() }).parse(request.body ?? {});
    const [company] = await db.select().from(companies).where(eq(companies.id, params.id));
    if (!company) return reply.status(404).send({ message: 'Company tidak ditemukan.' });
    await db.update(companies).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(companies.id, params.id));
    await db.update(tenantSubscriptions).set({ status: 'cancelled', cancelledAt: new Date(), cancellationReason: body.reason, updatedAt: new Date() }).where(eq(tenantSubscriptions.companyId, params.id));
    return { success: true };
  });

  // ─── Subscription Feature Catalog ──────────────────────────────────────────

  app.get('/platform/subscriptions/features', superAdminHook(), async () => {
    const features = await db.select().from(subscriptionFeatures).orderBy(asc(subscriptionFeatures.category), asc(subscriptionFeatures.label));
    return { features };
  });

  app.post('/platform/subscriptions/features', superAdminHook(), async (request, reply) => {
    const body = subscriptionFeatureSchema.parse(request.body);
    const [existing] = await db.select().from(subscriptionFeatures).where(eq(subscriptionFeatures.key, body.key)).limit(1);
    if (existing) return reply.status(409).send({ message: 'Feature key sudah digunakan.' });
    const [feature] = await db.insert(subscriptionFeatures).values(body).returning();
    return { feature };
  });

  app.patch('/platform/subscriptions/features/:id', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = subscriptionFeatureSchema.partial().parse(request.body);
    const [existing] = await db.select().from(subscriptionFeatures).where(eq(subscriptionFeatures.id, params.id)).limit(1);
    if (!existing) return reply.status(404).send({ message: 'Feature tidak ditemukan.' });
    if (body.key && body.key !== existing.key) {
      const [duplicate] = await db.select().from(subscriptionFeatures).where(eq(subscriptionFeatures.key, body.key)).limit(1);
      if (duplicate) return reply.status(409).send({ message: 'Feature key sudah digunakan.' });
    }
    const [feature] = await db.update(subscriptionFeatures).set({ ...body, updatedAt: new Date() }).where(eq(subscriptionFeatures.id, params.id)).returning();
    return { feature };
  });

  app.delete('/platform/subscriptions/features/:id', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [existing] = await db.select().from(subscriptionFeatures).where(eq(subscriptionFeatures.id, params.id)).limit(1);
    if (!existing) return reply.status(404).send({ message: 'Feature tidak ditemukan.' });
    await db.update(subscriptionFeatures).set({ status: 'inactive', updatedAt: new Date() }).where(eq(subscriptionFeatures.id, params.id));
    return { success: true };
  });

  // ─── Subscription Plans ─────────────────────────────────────────────────────

  app.get('/platform/subscriptions/plans', superAdminHook(), async () => {
    const plans = await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.level), asc(subscriptionPlans.priceMonthly));
    return { plans };
  });

  app.post('/platform/subscriptions/plans', superAdminHook(), async (request) => {
    const body = planCreateSchema.parse(request.body);
    const [plan] = await db.insert(subscriptionPlans).values({
      ...body,
      priceMonthly: String(body.priceMonthly),
      priceYearly: String(body.priceYearly),
      limits: body.limits ?? null,
      features: body.features ?? null,
    }).returning();
    return { plan };
  });

  app.patch('/platform/subscriptions/plans/:id', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = planCreateSchema.partial().parse(request.body);
    const [existing] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, params.id));
    if (!existing) return reply.status(404).send({ message: 'Plan tidak ditemukan.' });
    const [updated] = await db.update(subscriptionPlans).set({
      ...body,
      priceMonthly: body.priceMonthly !== undefined ? String(body.priceMonthly) : undefined,
      priceYearly: body.priceYearly !== undefined ? String(body.priceYearly) : undefined,
      updatedAt: new Date(),
    }).where(eq(subscriptionPlans.id, params.id)).returning();
    return { plan: updated };
  });

  // ─── Company Subscription Management ───────────────────────────────────────

  app.post('/platform/companies/:id/subscription', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = subscriptionUpdateSchema.parse(request.body);
    const [company] = await db.select().from(companies).where(eq(companies.id, params.id));
    if (!company) return reply.status(404).send({ message: 'Company tidak ditemukan.' });
    const trialEndsAt = body.trialDays !== undefined ? new Date(Date.now() + body.trialDays * 86400000) : undefined;
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, body.planCode)).limit(1);
    const [sub] = await db.insert(tenantSubscriptions).values({
      companyId: params.id,
      planId: plan?.id,
      planCode: body.planCode,
      billingCycle: body.billingCycle ?? 'monthly',
      status: body.status ?? 'active',
      trialEndsAt,
      invoiceRef: body.invoiceRef,
      amountPaid: body.amountPaid !== undefined ? String(body.amountPaid) : undefined,
      paidAt: body.paidAt ?? (body.amountPaid !== undefined ? new Date() : undefined),
      limitsSnapshot: plan?.limits ?? null,
      featuresSnapshot: plan?.features ?? null,
      managedByUserId: request.user!.id,
    }).returning();
    return { subscription: sub };
  });

  app.patch('/platform/companies/:id/subscription', superAdminHook(), async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = subscriptionUpdateSchema.partial().parse(request.body);
    const [sub] = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.companyId, params.id)).orderBy(desc(tenantSubscriptions.createdAt)).limit(1);
    if (!sub) return reply.status(404).send({ message: 'Subscription tidak ditemukan.' });
    const nextPlan = body.planCode
      ? (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, body.planCode)).limit(1))[0]
      : undefined;
    const billingCycle = body.billingCycle ?? sub.billingCycle;
    const currentPeriodStart = body.currentPeriodStart === null ? null : body.currentPeriodStart ?? sub.currentPeriodStart ?? new Date();
    const periodCalculationStart = currentPeriodStart ?? new Date();
    const currentPeriodEnd = body.currentPeriodEnd === null
      ? null
      : body.currentPeriodEnd ?? (body.autoCalculatePeriodEnd ? calculatePeriodEnd(periodCalculationStart, billingCycle) : undefined);
    const [updated] = await db.update(tenantSubscriptions).set({
      ...(body.planCode && { planCode: body.planCode, planId: nextPlan?.id, limitsSnapshot: nextPlan?.limits ?? null, featuresSnapshot: nextPlan?.features ?? null }),
      ...(body.billingCycle && { billingCycle: body.billingCycle }),
      ...(body.status && { status: body.status }),
      ...(body.trialEndsAt !== undefined && { trialEndsAt: body.trialEndsAt }),
      ...(body.currentPeriodStart !== undefined && { currentPeriodStart: body.currentPeriodStart }),
      ...(currentPeriodEnd !== undefined && { currentPeriodEnd }),
      ...(body.invoiceRef && { invoiceRef: body.invoiceRef }),
      ...(body.amountPaid !== undefined && { amountPaid: String(body.amountPaid) }),
      ...(body.paidAt !== undefined && { paidAt: body.paidAt }),
      managedByUserId: request.user!.id,
      updatedAt: new Date(),
    }).where(eq(tenantSubscriptions.id, sub.id)).returning();
    return { subscription: updated };
  });
}
