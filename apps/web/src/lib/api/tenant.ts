import { apiRequest } from './client';

// ─── Types ──────────────────────────────────────────────────────────────────

export type VisitSchedule = {
  id: string;
  companyId: string;
  salesUserId: string;
  outletId?: string | null;
  scheduledDate: string;
  plannedStartTime?: string | null;
  plannedEndTime?: string | null;
  targetOutletCount: number;
  targetClosingCount: number;
  targetRevenueAmount: string;
  priority: number;
  status: 'draft' | 'assigned' | 'approved' | 'in_progress' | 'completed' | 'missed' | 'cancelled';
  notes?: string | null;
  createdAt: string;
};

export type TodayVisitSchedule = VisitSchedule & {
  outlet: {
    id: string;
    code: string;
    name: string;
    address: string;
    latitude: string;
    longitude: string;
    geofenceRadiusM?: number | null;
    status: Outlet['status'];
  };
};

export type VisitSession = {
  id: string;
  companyId: string;
  salesUserId: string;
  outletId: string;
  scheduleId?: string | null;
  checkInAt?: string | null;
  checkInLatitude?: string | null;
  checkInLongitude?: string | null;
  checkOutAt?: string | null;
  outcome?: string | null;
  status: 'open' | 'completed' | 'invalid_location' | 'synced';
  createdAt: string;
};

export type TenantUser = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  employeeCode?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  roleId: string;
  roleCode: string;
  roleName: string;
  lastLoginAt?: string | null;
  createdAt: string;
};

export type Outlet = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  customerType: 'store' | 'agent';
  ownerName?: string | null;
  phone?: string | null;
  address: string;
  latitude: string;
  longitude: string;
  geofenceRadiusM?: number | null;
  status: 'draft' | 'pending_verification' | 'active' | 'rejected' | 'inactive';
  rejectionReason?: string | null;
  createdAt: string;
};

export type OutletPayload = {
  code: string;
  name: string;
  customerType: 'store' | 'agent';
  ownerName?: string;
  phone?: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadiusM?: number;
  status?: 'draft' | 'pending_verification' | 'active' | 'rejected' | 'inactive';
};

export type SalesTransaction = {
  id: string;
  companyId: string;
  transactionNo: string;
  salesUserId: string;
  outletId?: string | null;
  customerType: 'store' | 'agent' | 'end_user';
  paymentMethod: 'cash' | 'qris' | 'credit' | 'consignment';
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  status: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  submittedAt?: string | null;
  approvedAt?: string | null;
  createdAt: string;
};

export type SalesTransactionItem = {
  id: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  lineTotal: string;
};

export type Product = {
  id: string;
  companyId: string;
  sku: string;
  name: string;
  unit: string;
  priceDefault: string;
  status: 'active' | 'inactive';
  createdAt: string;
};

export type Warehouse = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: 'main' | 'sales_van' | 'outlet_consignment';
  status: 'active' | 'inactive';
};

export type InventoryBalance = {
  warehouseId: string;
  productId: string;
  quantity: string;
  reservedQuantity: string;
};

export type DashboardSummary = {
  todaySales: number;
  todayVisits: number;
  activeUsers: number;
  totalOutlets: number;
};

export type GeneralSettings = {
  defaultGeofenceRadiusM: number;
  maxGpsAccuracyM: number;
  requireFaceForAttendance: boolean;
  requireFaceForVisit: boolean;
  requireTransactionProofPhoto: boolean;
  requireFaceIdentityMatchForVisit: boolean;
  faceMatchThreshold: number;
  requireLivenessForVisit: boolean;
  rejectVisitOnFaceMismatch: boolean;
  faceIntegration: {
    enabled: boolean;
    provider: 'mock' | 'custom_http' | 'aws_rekognition' | 'azure_face' | 'google_vertex';
    baseUrl: string;
    apiKey: string;
    projectId: string;
    region: string;
    model: string;
    mode: 'verify' | 'detect_and_verify';
    timeoutMs: number;
  };
};

// ─── Visit APIs ─────────────────────────────────────────────────────────────

export function getVisitSchedules(token: string, params?: { date?: string; salesUserId?: string }) {
  const q = new URLSearchParams();
  if (params?.date) q.set('date', params.date);
  if (params?.salesUserId) q.set('salesUserId', params.salesUserId);
  return apiRequest<{ schedules: VisitSchedule[] }>(`/visits/schedules?${q}`, { headers: { Authorization: `Bearer ${token}` } });
}

export type CreateVisitSchedulePayload = {
  salesUserId: string;
  outletIds: string[];
  scheduledDate: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  targetOutletCount: number;
  targetDurationMinutes?: number;
  targetClosingCount: number;
  targetRevenueAmount: string;
  priority: number;
  notes?: string;
};

export function createVisitSchedules(token: string, payload: CreateVisitSchedulePayload) {
  return apiRequest<{ schedules: VisitSchedule[]; simulation: unknown }>('/visits/schedules', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function approveVisitSchedule(token: string, id: string) {
  return apiRequest<{ schedule: VisitSchedule }>(`/visits/schedules/${id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export function cancelVisitSchedule(token: string, id: string) {
  return apiRequest<{ schedule: VisitSchedule }>(`/visits/schedules/${id}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export function getVisitSessions(token: string, params?: { date?: string; salesUserId?: string }) {
  const q = new URLSearchParams();
  if (params?.date) q.set('date', params.date);
  if (params?.salesUserId) q.set('salesUserId', params.salesUserId);
  return apiRequest<{ sessions: VisitSession[] }>(`/visits/sessions?${q}`, { headers: { Authorization: `Bearer ${token}` } });
}

export function getTodayVisitPlan(token: string) {
  return apiRequest<{ schedules: TodayVisitSchedule[]; target: unknown | null }>('/visits/today', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── Sales Transaction APIs ──────────────────────────────────────────────────

export function getSalesTransactions(token: string, params?: { status?: string; from?: string; to?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  return apiRequest<{ orders: SalesTransaction[] }>(`/sales/orders?${q}`, { headers: { Authorization: `Bearer ${token}` } });
}

export function approveSalesTransaction(token: string, id: string) {
  return apiRequest<{ transaction: SalesTransaction }>(`/sales/orders/${id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export function rejectSalesTransaction(token: string, id: string, reason: string) {
  return apiRequest<{ transaction: SalesTransaction }>(`/sales/orders/${id}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

// ─── Product & Inventory APIs ────────────────────────────────────────────────

export function getProducts(token: string, params?: { status?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  return apiRequest<{ products: Product[] }>(`/products?${q}`, { headers: { Authorization: `Bearer ${token}` } });
}

export function getWarehouses(token: string) {
  return apiRequest<{ warehouses: Warehouse[] }>('/inventory/warehouses', { headers: { Authorization: `Bearer ${token}` } });
}

export function getInventoryBalances(token: string, warehouseId: string) {
  return apiRequest<{ balances: InventoryBalance[] }>(`/inventory/balances?warehouseId=${warehouseId}`, { headers: { Authorization: `Bearer ${token}` } });
}

// ─── User APIs ────────────────────────────────────────────────────────────────

export function getTenantUsers(token: string, status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<{ users: TenantUser[] }>(`/users${q}`, { headers: { Authorization: `Bearer ${token}` } });
}

// ─── Outlet APIs ──────────────────────────────────────────────────────────────

export function getOutlets(token: string, params?: { status?: string; q?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.q) q.set('q', params.q);
  return apiRequest<{ outlets: Outlet[] }>(`/outlets?${q}`, { headers: { Authorization: `Bearer ${token}` } });
}

export function createOutlet(token: string, payload: OutletPayload) {
  return apiRequest<{ outlet: Outlet }>('/outlets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateOutlet(token: string, outletId: string, payload: Partial<OutletPayload>) {
  return apiRequest<{ outlet: Outlet }>(`/outlets/${outletId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function approveOutlet(token: string, outletId: string) {
  return apiRequest<{ outlet: Outlet }>(`/outlets/${outletId}/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'approve' }),
  });
}

export function rejectOutlet(token: string, outletId: string, reason: string) {
  return apiRequest<{ outlet: Outlet }>(`/outlets/${outletId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export function deleteOutlet(token: string, outletId: string) {
  return apiRequest<{ outlet: Outlet }>(`/outlets/${outletId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export function getMySubscription(token: string) {
  return apiRequest<{ subscription: TenantSubscriptionInfo | null }>('/company/subscription', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export type TenantSubscriptionInfo = {
  id: string;
  planCode: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
  trialEndsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  amountPaid?: string | null;
  paidAt?: string | null;
  limitsSnapshot?: Record<string, number> | null;
  featuresSnapshot?: string[] | null;
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function getDashboardSummary(token: string) {
  return apiRequest<DashboardSummary>('/dashboard/summary', { headers: { Authorization: `Bearer ${token}` } });
}

export function getGeneralSettings(token: string) {
  return apiRequest<{ settings: GeneralSettings; defaults: GeneralSettings }>('/settings/general', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateGeneralSettings(token: string, payload: Partial<GeneralSettings>) {
  return apiRequest<{ settings: GeneralSettings }>('/settings/general', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function createOrder(token: string, payload: any) {
  return apiRequest<{ order: any }>('/sales/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
