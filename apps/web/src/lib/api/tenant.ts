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
  productName?: string;
  productSku?: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  lineTotal: string;
};

export type SalesTransactionDetail = SalesTransaction & {
  outletName?: string | null;
  rejectionReason?: string | null;
  items: SalesTransactionItem[];
  photos: Array<{
    id: string;
    fileUrl: string;
    verificationStatus: string;
    capturedAt: string;
  }>;
};

export type Product = {
  id: string;
  companyId: string;
  sku: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  unit: string;
  priceDefault: string;
  status: 'active' | 'inactive';
  createdAt: string;
  salesStockQuantity?: string;
  salesReservedQuantity?: string;
  salesAvailableQuantity?: string;
};

export type ProductPayload = {
  sku?: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  unit: string;
  priceDefault: string;
  initialStock?: string;
};

export type Warehouse = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: 'main' | 'sales_van' | 'outlet_consignment';
  status: 'active' | 'inactive';
  ownerUserId?: string;
};

export type WarehousePayload = {
  code?: string;
  name: string;
  address?: string;
  type: Warehouse['type'];
  ownerUserId?: string;
  outletId?: string;
};

export type ConsignmentItem = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  quantity: string;
  paidQuantity: string;
  remainingQuantity: string;
};

export type Consignment = {
  id: string;
  transactionId: string;
  outletId: string;
  salesUserId: string;
  startDate: string;
  dueDate: string;
  status: 'active' | 'paid' | 'overdue' | 'withdrawal_required' | 'withdrawn' | 'extended' | 'reset_stock';
  extendedUntil?: string | null;
  createdAt: string;
  items?: ConsignmentItem[];
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
  allowMultipleAttendanceSessionsPerDay: boolean;
  requireAttendanceAtOffice: boolean;
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

export type CompanyProfile = {
  id: string;
  name: string;
  code?: string | null;
  slug: string;
  status: 'active' | 'trialing' | 'suspended' | 'cancelled';
  logoUrl?: string | null;
  coverPhotoUrl?: string | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  taxNumber?: string | null;
  websiteUrl?: string | null;
  timezone: string;
};

export type CompanyProfilePayload = Partial<{
  name: string;
  code: string | null;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  taxNumber: string | null;
  websiteUrl: string | null;
  timezone: string;
}>;

export type CompanyIntegration = {
  id: string;
  companyId: string;
  type: 'storage' | 'face_recognition' | 'payment' | 'notification';
  provider: 'cloudflare_r2' | 's3' | 'custom_http' | 'aws_rekognition' | 'azure_face' | 'google_vertex' | 'mock';
  name: string;
  status: 'active' | 'inactive';
  config?: Record<string, unknown> | null;
  secretConfig?: Record<string, unknown> | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanyIntegrationPayload = {
  type: CompanyIntegration['type'];
  provider: CompanyIntegration['provider'];
  name: string;
  status?: CompanyIntegration['status'];
  config?: Record<string, unknown>;
  secretConfig?: Record<string, unknown>;
  description?: string;
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

export function getSalesTransactionDetail(token: string, id: string) {
  return apiRequest<{ order: SalesTransactionDetail }>(`/sales/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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

export function createProduct(token: string, payload: ProductPayload) {
  return apiRequest<{ product: Product }>('/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateProduct(token: string, id: string, payload: Partial<ProductPayload> & { status?: Product['status'] }) {
  return apiRequest<{ product: Product }>(`/products/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(token: string, id: string) {
  return apiRequest<{ product?: Product; success?: true }>(`/products/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getWarehouses(token: string) {
  return apiRequest<{ warehouses: Warehouse[] }>('/inventory/warehouses', { headers: { Authorization: `Bearer ${token}` } });
}

export function createWarehouse(token: string, payload: WarehousePayload) {
  return apiRequest<{ warehouse: Warehouse }>('/inventory/warehouses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateWarehouse(token: string, id: string, payload: Partial<WarehousePayload>) {
  return apiRequest<{ warehouse: Warehouse }>(`/inventory/warehouses/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteWarehouse(token: string, id: string) {
  return apiRequest<{ warehouse: Warehouse }>(`/inventory/warehouses/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getInventoryBalances(token: string, warehouseId: string) {
  return apiRequest<{ balances: InventoryBalance[] }>(`/inventory/balances?warehouseId=${warehouseId}`, { headers: { Authorization: `Bearer ${token}` } });
}

export function adjustInventory(token: string, payload: { warehouseId: string; productId: string; quantityDelta: string; notes?: string }) {
  return apiRequest<{ balance: InventoryBalance }>('/inventory/adjustments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function resetInventory(token: string, payload: { warehouseId: string; productId: string; targetQuantity: string; notes?: string }) {
  return apiRequest<{ balance: InventoryBalance }>('/inventory/resets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function transferInventory(token: string, payload: { fromWarehouseId: string; toWarehouseId: string; notes?: string; items: Array<{ productId: string; quantity: string }> }) {
  return apiRequest<{ success: true; transferReferenceId: string }>('/inventory/transfers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function ensureSalesWarehouse(token: string, salesUserId: string) {
  return apiRequest<{ warehouse: Warehouse; created: boolean }>('/inventory/sales-warehouses/ensure', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ salesUserId }),
  });
}

export function getSalesConsignments(token: string, outletId: string) {
  return apiRequest<{ consignments: Consignment[] }>(`/sales/consignments?outletId=${outletId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function submitSalesConsignmentAction(token: string, consignmentId: string, payload: { actionType: 'report_sold' | 'withdraw' | 'collect_payment'; productId?: string; quantity?: string; amount?: string; notes?: string }) {
  return apiRequest<{ action: unknown }>(`/sales/consignments/${consignmentId}/actions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
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

export function getCompanyProfile(token: string) {
  return apiRequest<{ company: CompanyProfile | null }>('/company/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateCompanyProfile(token: string, payload: CompanyProfilePayload) {
  return apiRequest<{ company: CompanyProfile }>('/company/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function getCompanyIntegrations(token: string, type?: CompanyIntegration['type']) {
  const q = type ? `?type=${encodeURIComponent(type)}` : '';
  return apiRequest<{ integrations: CompanyIntegration[] }>(`/integrations${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createCompanyIntegration(token: string, payload: CompanyIntegrationPayload) {
  return apiRequest<{ integration: CompanyIntegration }>('/integrations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateCompanyIntegration(token: string, id: string, payload: Partial<CompanyIntegrationPayload>) {
  return apiRequest<{ integration: CompanyIntegration }>(`/integrations/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export type CreateOrderPayload = {
  clientRequestId: string;
  outletId: string;
  visitSessionId: string;
  customerType: 'store' | 'agent' | 'end_user';
  paymentMethod: 'cash' | 'qris' | 'credit' | 'consignment';
  items: Array<{ productId: string; quantity: string; unitPrice: string }>;
};

export function createOrder(token: string, payload: CreateOrderPayload) {
  return apiRequest<{ order: { id: string; transactionNo: string; status: string } }>('/sales/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
