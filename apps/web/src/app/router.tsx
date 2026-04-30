import { Navigate, Route, Routes } from 'react-router-dom';
import { AttendancePage } from '../features/attendance/attendance-page';
import { AttendanceReviewPage } from '../features/attendance/attendance-review-page';
import { AdminShell } from '../features/admin/admin-shell';
import { LoginPage } from '../features/auth/login-page';
import { RequireAuth } from '../features/auth/require-auth';
import { DashboardPage } from '../features/dashboard/dashboard-page';
import { SalesHomePage } from '../features/sales/sales-home-page';
import { SalesShell } from '../features/sales/sales-shell';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<RequireAuth><AdminShell /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
      </Route>
      <Route path="/admin" element={<RequireAuth><AdminShell /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="tracking" element={<Placeholder title="Tracking Penjualan" description="Monitoring visit outlet, lokasi sales, dan aktivitas lapangan." />} />
        <Route path="reports" element={<Placeholder title="Laporan Penjualan" description="Ringkasan omset, produk terjual, visit, dan performa sales." />} />
        <Route path="stock" element={<Placeholder title="Manajemen Stok" description="Input stok utama dari admin dan kontrol mutasi stok." />} />
        <Route path="receivables" element={<Placeholder title="Piutang Usaha" description="Daftar order unpaid/partial dan jadwal penagihan." />} />
        <Route path="invoice-review" element={<Placeholder title="Verifikasi Nota" description="Review nota/foto invoice dan closing transaksi sales." />} />
      </Route>
      <Route path="/sales" element={<RequireAuth><SalesShell /></RequireAuth>}>
        <Route index element={<SalesHomePage />} />
        <Route path="visit" element={<Placeholder title="Check-In Kunjungan" description="Pilih outlet, validasi GPS/geofence, dan kirim visit log." mobile />} />
        <Route path="transactions" element={<Placeholder title="Buat Transaksi" description="Pilih outlet, pilih produk, tambah keranjang, lalu kirim untuk verifikasi admin." mobile />} />
        <Route path="invoices" element={<Placeholder title="Foto Nota" description="Upload nota atau bukti transaksi untuk proses approval closing." mobile />} />
        <Route path="profile" element={<Placeholder title="Profil Sales" description="Informasi sales, area, perangkat, dan status sinkronisasi." mobile />} />
      </Route>
      <Route path="/attendance" element={<RequireAuth><AttendancePage /></RequireAuth>} />
      <Route path="/attendance/review" element={<RequireAuth><AttendanceReviewPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function Placeholder({ title, description, mobile = false }: { title: string; description: string; mobile?: boolean }) {
  return (
    <section className={`${mobile ? 'rounded-3xl bg-white p-5 shadow-sm' : 'brand-card rounded-3xl p-8'} animate-float-in`}>
      <p className="text-xs font-black uppercase tracking-[0.28em] text-[#b55925]">Phase A</p>
      <h1 className="mt-3 text-3xl font-black text-[#40231e]">{title}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-500">{description}</p>
      <div className="mt-6 rounded-2xl border border-dashed border-[#b55925]/30 bg-[#b55925]/5 p-5 text-sm font-semibold text-[#7a3f22]">
        UI shell sudah siap. Logic detail halaman ini masuk Phase B/C sesuai plan.
      </div>
    </section>
  );
}


