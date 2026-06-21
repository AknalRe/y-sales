import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { and, eq, isNull } from 'drizzle-orm';
import { createDb } from './client.js';
import { resolveDatabaseUrl } from './database-url.js';
import { appSettings, permissions, roles, subscriptionFeatures, subscriptionPlans } from './schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const db = createDb(resolveDatabaseUrl());

const permissionLabels: Record<string, { name: string; module: string }> = {
  'system.manage': { name: 'Kelola Sistem', module: 'system' },
  'roles.manage': { name: 'Kelola Role', module: 'access' },
  'permissions.manage': { name: 'Kelola Hak Akses', module: 'access' },
  'settings.manage': { name: 'Kelola Pengaturan', module: 'settings' },
  'users.manage': { name: 'Kelola User', module: 'users' },
  'attendance.review': { name: 'Review Absensi', module: 'attendance' },
  'attendance.execute': { name: 'Melakukan Absensi', module: 'attendance' },
  'outlets.manage': { name: 'Kelola Outlet', module: 'outlets' },
  'outlets.verify': { name: 'Verifikasi Outlet', module: 'outlets' },
  'visits.execute': { name: 'Melakukan Kunjungan', module: 'visits' },
  'visits.review': { name: 'Review Kunjungan', module: 'visits' },
  'transactions.execute': { name: 'Melakukan Transaksi', module: 'transactions' },
  'transactions.approve': { name: 'Approval Transaksi', module: 'transactions' },
  'inventory.manage': { name: 'Kelola Inventori', module: 'inventory' },
  'deposits.execute': { name: 'Buat Setoran', module: 'deposits' },
  'deposits.reconcile': { name: 'Rekonsiliasi Setoran', module: 'deposits' },
  'reports.view': { name: 'Lihat Laporan', module: 'reports' },
  'sales.view': { name: 'Lihat Sales', module: 'sales' },
  'sales.order.create': { name: 'Buat Order Sales', module: 'sales' },
  'sales.order.review': { name: 'Review Order Sales', module: 'sales' },
  'products.manage': { name: 'Kelola Produk', module: 'products' },
  'media.manage': { name: 'Kelola Media', module: 'media' },
  'receivables.view': { name: 'Lihat Piutang', module: 'receivables' },
  'receivables.manage': { name: 'Kelola Piutang', module: 'receivables' },
  'invoice.review': { name: 'Review Nota', module: 'invoices' },
};

const roleDescriptions: Record<string, string> = {
  ADMINISTRATOR: 'Akses penuh sistem termasuk manajemen role dan hak akses.',
  OWNER: 'Pemilik bisnis dengan akses eksekutif.',
  OPERATIONAL_MANAGER: 'Monitoring operasional dan validasi tingkat tinggi.',
  SUPERVISOR: 'Kontrol outlet, penjadwalan, approval, dan setoran.',
  ADMIN: 'Administrasi master data dan verifikasi operasional.',
  SALES_AGENT: 'Absensi, kunjungan, dan transaksi sales lapangan.',
};

const settingDescriptions: Record<string, string> = {
  default_geofence_radius_m: 'Radius geofence outlet default dalam meter.',
  max_gps_accuracy_m: 'Akurasi GPS maksimal yang diterima dalam meter.',
  daily_visit_target: 'Target kunjungan harian default untuk sales.',
  gps_log_interval_seconds: 'Interval pencatatan GPS saat aplikasi aktif.',
  face_detection_required: 'Wajib mendeteksi wajah untuk absensi.',
};

const featureLabels: Record<string, { label: string; description: string; category: string }> = {
  attendance: { label: 'Absensi', description: 'Absensi pengguna tenant.', category: 'Operasional' },
  visits: { label: 'Kunjungan Outlet', description: 'Pencatatan kunjungan outlet/pelanggan.', category: 'Penjualan' },
  basic_reports: { label: 'Laporan Dasar', description: 'Laporan dasar operasional dan aktivitas sales.', category: 'Laporan' },
  route_tracking: { label: 'Pelacakan Rute', description: 'Pelacakan rute dan aktivitas sales lapangan.', category: 'Penjualan' },
  face_recognition: { label: 'Pengenalan Wajah', description: 'Validasi wajah untuk absensi/kunjungan.', category: 'Operasional' },
  offline_sync: { label: 'Sinkronisasi Offline', description: 'Sinkronisasi data saat koneksi kembali online.', category: 'Operasional' },
  order_taking: { label: 'Pembuatan Order', description: 'Pembuatan order penjualan dari aplikasi.', category: 'Penjualan' },
  stock_management: { label: 'Manajemen Stok', description: 'Manajemen stok, gudang, dan produk.', category: 'Operasional' },
  advanced_reports: { label: 'Laporan Lanjutan', description: 'Laporan lanjutan dan insight performa.', category: 'Laporan' },
  export_excel: { label: 'Ekspor Excel', description: 'Ekspor data operasional ke Excel.', category: 'Laporan' },
  r2_storage: { label: 'Penyimpanan Cloud', description: 'Penyimpanan file/foto berbasis object storage.', category: 'Integrasi' },
  api_access: { label: 'Akses API', description: 'Akses integrasi API untuk sistem eksternal.', category: 'Integrasi' },
  priority_support: { label: 'Dukungan Prioritas', description: 'Prioritas dukungan untuk tenant enterprise.', category: 'Dukungan' },
};

const planDescriptions: Record<string, string> = {
  starter: 'Untuk bisnis kecil yang baru memulai.',
  pro: 'Untuk tim sales yang lebih besar dengan fitur lengkap.',
  enterprise: 'Akses penuh semua fitur platform tanpa batasan.',
};

let updated = 0;

for (const [code, label] of Object.entries(permissionLabels)) {
  const result = await db
    .update(permissions)
    .set({ name: label.name, module: label.module })
    .where(eq(permissions.code, code));
  updated += result.count;
}

for (const [code, description] of Object.entries(roleDescriptions)) {
  const result = await db
    .update(roles)
    .set({ description, updatedAt: new Date() })
    .where(eq(roles.code, code));
  updated += result.count;
}

const superAdminResult = await db
  .update(roles)
  .set({
    name: 'Super Admin Platform',
    description: 'Akses penuh platform untuk mengelola tenant, langganan, dan pengaturan sistem.',
    isSystemRole: true,
    updatedAt: new Date(),
  })
  .where(and(eq(roles.code, 'SUPER_ADMIN'), isNull(roles.companyId)));
updated += superAdminResult.count;

for (const [key, description] of Object.entries(settingDescriptions)) {
  const result = await db
    .update(appSettings)
    .set({ description })
    .where(eq(appSettings.key, key));
  updated += result.count;
}

for (const [key, feature] of Object.entries(featureLabels)) {
  const result = await db
    .update(subscriptionFeatures)
    .set({ ...feature, updatedAt: new Date() })
    .where(eq(subscriptionFeatures.key, key));
  updated += result.count;
}

for (const [code, description] of Object.entries(planDescriptions)) {
  const result = await db
    .update(subscriptionPlans)
    .set({ description, updatedAt: new Date() })
    .where(eq(subscriptionPlans.code, code));
  updated += result.count;
}

console.log(`Label dan deskripsi database berhasil dilokalkan. Baris terdampak: ${updated}`);
