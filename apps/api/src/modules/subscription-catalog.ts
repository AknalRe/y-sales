export type PlanFeatureKey =
  | 'attendance'
  | 'visits'
  | 'route_tracking'
  | 'face_recognition'
  | 'offline_sync'
  | 'order_taking'
  | 'stock_management'
  | 'advanced_reports'
  | 'export_excel'
  | 'r2_storage'
  | 'api_access'
  | 'priority_support';

export type PlanLimitKey =
  | 'users'
  | 'outlets'
  | 'products'
  | 'warehouses'
  | 'sales_reps'
  | 'monthly_visits'
  | 'monthly_orders'
  | 'storage_gb';

export const PLAN_FEATURE_KEYS: PlanFeatureKey[] = [
  'attendance',
  'visits',
  'route_tracking',
  'face_recognition',
  'offline_sync',
  'order_taking',
  'stock_management',
  'advanced_reports',
  'export_excel',
  'r2_storage',
  'api_access',
  'priority_support',
];

export const PLAN_LIMIT_KEYS: PlanLimitKey[] = [
  'users',
  'outlets',
  'products',
  'warehouses',
  'sales_reps',
  'monthly_visits',
  'monthly_orders',
  'storage_gb',
];

export const DEFAULT_PLAN_LIMITS: Record<PlanLimitKey, number> = {
  users: 10,
  outlets: 50,
  products: 200,
  warehouses: 1,
  sales_reps: 10,
  monthly_visits: 1000,
  monthly_orders: 500,
  storage_gb: 1,
};
