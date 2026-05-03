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

export type PlanFeatureDefinition = {
  key: PlanFeatureKey;
  label: string;
  description: string;
  category: 'Operasional' | 'Sales' | 'Reporting' | 'Integrasi' | 'Support';
};

export type PlanLimitDefinition = {
  key: PlanLimitKey;
  label: string;
  description: string;
  unit: string;
};

export const PLAN_FEATURES: PlanFeatureDefinition[] = [
  { key: 'attendance', label: 'Attendance', description: 'Absensi user tenant.', category: 'Operasional' },
  { key: 'visits', label: 'Customer Visits', description: 'Pencatatan kunjungan outlet/customer.', category: 'Sales' },
  { key: 'route_tracking', label: 'Route Tracking', description: 'Tracking rute dan aktivitas sales lapangan.', category: 'Sales' },
  { key: 'face_recognition', label: 'Face Recognition', description: 'Validasi wajah untuk absensi/kunjungan.', category: 'Operasional' },
  { key: 'offline_sync', label: 'Offline Sync', description: 'Sinkronisasi data saat koneksi kembali online.', category: 'Operasional' },
  { key: 'order_taking', label: 'Order Taking', description: 'Pembuatan order penjualan dari aplikasi.', category: 'Sales' },
  { key: 'stock_management', label: 'Stock Management', description: 'Manajemen stok, gudang, dan produk.', category: 'Operasional' },
  { key: 'advanced_reports', label: 'Advanced Reports', description: 'Laporan lanjutan dan insight performa.', category: 'Reporting' },
  { key: 'export_excel', label: 'Export Excel', description: 'Export data operasional ke Excel.', category: 'Reporting' },
  { key: 'r2_storage', label: 'Cloud Storage', description: 'Penyimpanan file/foto berbasis object storage.', category: 'Integrasi' },
  { key: 'api_access', label: 'API Access', description: 'Akses integrasi API untuk sistem eksternal.', category: 'Integrasi' },
  { key: 'priority_support', label: 'Priority Support', description: 'Prioritas support untuk tenant enterprise.', category: 'Support' },
];

export const PLAN_LIMITS: PlanLimitDefinition[] = [
  { key: 'users', label: 'User', description: 'Jumlah maksimum user tenant.', unit: 'user' },
  { key: 'outlets', label: 'Outlet', description: 'Jumlah maksimum outlet/customer.', unit: 'outlet' },
  { key: 'products', label: 'Produk', description: 'Jumlah maksimum produk/SKU.', unit: 'produk' },
  { key: 'warehouses', label: 'Gudang', description: 'Jumlah maksimum gudang.', unit: 'gudang' },
  { key: 'sales_reps', label: 'Sales Rep', description: 'Jumlah maksimum sales lapangan.', unit: 'sales' },
  { key: 'monthly_visits', label: 'Visit Bulanan', description: 'Kuota kunjungan per bulan.', unit: 'visit/bulan' },
  { key: 'monthly_orders', label: 'Order Bulanan', description: 'Kuota order penjualan per bulan.', unit: 'order/bulan' },
  { key: 'storage_gb', label: 'Storage', description: 'Kuota penyimpanan file dan foto.', unit: 'GB' },
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
