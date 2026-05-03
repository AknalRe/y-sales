import { apiRequest } from './client';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Company = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'trialing' | 'suspended' | 'cancelled';
  email?: string;
  phone?: string;
  city?: string;
  province?: string;
  country?: string;
  createdAt: string;
  subscriptionSummary?: CompanySubscriptionSummary | null;
};

export type CompanySubscriptionSummary = {
  id: string;
  planCode: string;
  planName: string;
  planLevel?: number | null;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
  trialEndsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  priceMonthly?: string | null;
  priceYearly?: string | null;
  amountPaid?: string | null;
  paidAt?: string | null;
  invoiceRef?: string | null;
};

export type TenantSubscription = {
  id: string;
  companyId: string;
  planCode: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
  trialEndsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  suspendedAt?: string;
  suspendReason?: string;
  cancelledAt?: string;
  createdAt: string;
  amountPaid?: string | null;
  paidAt?: string | null;
  invoiceRef?: string | null;
};

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description?: string;
  level: number;
  priceMonthly: string;
  priceYearly: string;
  limits?: Record<string, number>;
  features?: string[];
  isPublic: boolean;
  status: string;
};

export type SubscriptionFeature = {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PlatformInvoice = {
  id: string;
  companyId: string;
  companyName?: string | null;
  subscriptionId?: string | null;
  invoiceNumber: string;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'void' | 'cancelled';
  billingReason: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  planCode?: string | null;
  planName?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  dueAt?: string | null;
  issuedAt: string;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type PlatformPayment = {
  id: string;
  companyId: string;
  companyName?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  subscriptionId?: string | null;
  paymentRef?: string | null;
  provider: string;
  method: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  amount: string;
  currency: string;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type PlatformInvoiceDetail = PlatformInvoice & {
  company?: Company | null;
  subscription?: TenantSubscription | null;
  payments?: PlatformPayment[];
};

export type TenantUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  status: 'active' | 'inactive' | 'suspended';
  roleCode: string;
  roleName: string;
  lastLoginAt?: string;
  createdAt: string;
};

export type Role = {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  companyId?: string;
  createdAt: string;
};

// ─── Platform: Companies ─────────────────────────────────────────────────────

export function platformGetCompanies(token: string, page = 1) {
  return apiRequest<{ companies: Company[]; page: number; limit: number }>(
    `/platform/companies?page=${page}&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformGetCompany(token: string, id: string) {
  return apiRequest<{ company: Company; subscription: TenantSubscription | null; userCount: number }>(
    `/platform/companies/${id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformCreateCompany(token: string, data: {
  name: string; slug: string; email?: string; phone?: string;
  city?: string; province?: string; planCode?: string; trialDays?: number;
}) {
  return apiRequest<{ company: Company }>(
    '/platform/companies',
    { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformUpdateCompany(token: string, id: string, data: Partial<Company>) {
  return apiRequest<{ company: Company }>(
    `/platform/companies/${id}`,
    { method: 'PATCH', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformSuspendCompany(token: string, id: string, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/platform/companies/${id}/suspend`,
    { method: 'POST', body: JSON.stringify({ reason }), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformActivateCompany(token: string, id: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/platform/companies/${id}/activate`,
    { method: 'POST', body: JSON.stringify({}), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformCancelCompany(token: string, id: string, reason?: string) {
  return apiRequest<{ success: boolean }>(
    `/platform/companies/${id}/cancel`,
    { method: 'POST', body: JSON.stringify({ reason }), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformGetCompanyUsers(token: string, id: string) {
  return apiRequest<{ users: TenantUser[] }>(
    `/platform/companies/${id}/users`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformUpdateSubscription(token: string, companyId: string, data: {
  planCode?: string; billingCycle?: string; status?: string; invoiceRef?: string;
  trialEndsAt?: string | null; currentPeriodStart?: string | null; currentPeriodEnd?: string | null;
  autoCalculatePeriodEnd?: boolean;
  amountPaid?: number; paidAt?: string | null;
}) {
  return apiRequest<{ subscription: TenantSubscription }>(
    `/platform/companies/${companyId}/subscription`,
    { method: 'PATCH', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

// ─── Platform: Billing ───────────────────────────────────────────────────────

export function platformGetInvoices(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<{ invoices: PlatformInvoice[] }>(
    `/platform/billing/invoices${query}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformGetInvoice(token: string, id: string) {
  return apiRequest<{ invoice: PlatformInvoiceDetail }>(
    `/platform/billing/invoices/${id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformCreateInvoice(token: string, data: {
  companyId: string; subscriptionId?: string; invoiceNumber?: string; status?: string;
  billingReason?: string; billingCycle?: string;
  planCode?: string;
  periodStart?: string | null; periodEnd?: string | null;
  subtotalAmount: number; discountAmount?: number; taxAmount?: number; totalAmount?: number;
  currency?: string; dueAt?: string | null; notes?: string;
}) {
  return apiRequest<{ invoice: PlatformInvoice }>(
    '/platform/billing/invoices',
    { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformUpdateInvoice(token: string, id: string, data: Partial<PlatformInvoice>) {
  return apiRequest<{ invoice: PlatformInvoice }>(
    `/platform/billing/invoices/${id}`,
    { method: 'PATCH', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformRecordInvoicePayment(token: string, invoiceId: string, data: {
  paymentRef?: string; provider?: string; method?: string; status?: string; amount: number;
  currency?: string; paidAt?: string | null; notes?: string;
}) {
  return apiRequest<{ payment: PlatformPayment }>(
    `/platform/billing/invoices/${invoiceId}/payments`,
    { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformGetPayments(token: string) {
  return apiRequest<{ payments: PlatformPayment[] }>(
    '/platform/billing/payments',
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// ─── Platform: Plans ─────────────────────────────────────────────────────────

export function platformGetPlans(token: string) {
  return apiRequest<{ plans: SubscriptionPlan[] }>(
    '/platform/subscriptions/plans',
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformGetFeatures(token: string) {
  return apiRequest<{ features: SubscriptionFeature[] }>(
    '/platform/subscriptions/features',
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformCreateFeature(token: string, data: Pick<SubscriptionFeature, 'key' | 'label' | 'category'> & { description?: string; status?: string }) {
  return apiRequest<{ feature: SubscriptionFeature }>(
    '/platform/subscriptions/features',
    { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformUpdateFeature(token: string, id: string, data: Partial<Pick<SubscriptionFeature, 'key' | 'label' | 'description' | 'category' | 'status'>>) {
  return apiRequest<{ feature: SubscriptionFeature }>(
    `/platform/subscriptions/features/${id}`,
    { method: 'PATCH', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformDeleteFeature(token: string, id: string) {
  return apiRequest<{ success: boolean }>(
    `/platform/subscriptions/features/${id}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformCreatePlan(token: string, data: Partial<SubscriptionPlan> & { code: string; name: string; level?: number }) {
  return apiRequest<{ plan: SubscriptionPlan }>(
    '/platform/subscriptions/plans',
    { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function platformUpdatePlan(token: string, id: string, data: Partial<SubscriptionPlan>) {
  return apiRequest<{ plan: SubscriptionPlan }>(
    `/platform/subscriptions/plans/${id}`,
    { method: 'PATCH', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

// ─── Tenant: Users ───────────────────────────────────────────────────────────

export function getUsers(token: string) {
  return apiRequest<{ users: TenantUser[] }>(
    '/users',
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function createUser(token: string, data: {
  roleId: string; name: string; email?: string; phone?: string;
  employeeCode?: string; password: string; supervisorId?: string;
}) {
  return apiRequest<{ user: TenantUser }>(
    '/users',
    { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function updateUser(token: string, id: string, data: Partial<TenantUser> & { roleId?: string; status?: string }) {
  return apiRequest<{ user: TenantUser }>(
    `/users/${id}`,
    { method: 'PATCH', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function deleteUser(token: string, id: string) {
  return apiRequest<{ success: boolean }>(
    `/users/${id}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
}

export function resetPassword(token: string, id: string, newPassword: string) {
  return apiRequest<{ success: boolean }>(
    `/users/${id}/reset-password`,
    { method: 'POST', body: JSON.stringify({ newPassword }), headers: { Authorization: `Bearer ${token}` } }
  );
}

// ─── Tenant: Roles ───────────────────────────────────────────────────────────

export function getRoles(token: string) {
  return apiRequest<{ roles: Role[] }>(
    '/roles',
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function createRole(token: string, data: { code: string; name: string; description?: string }) {
  return apiRequest<{ role: Role }>(
    '/roles',
    { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }
  );
}

export function deleteRole(token: string, id: string) {
  return apiRequest<{ success: boolean }>(
    `/roles/${id}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
}

// ─── Tenant: Subscription ─────────────────────────────────────────────────

export function getMySubscription(token: string) {
  return apiRequest<{ subscription: TenantSubscription | null }>(
    '/company/subscription',
    { headers: { Authorization: `Bearer ${token}` } }
  );
}
