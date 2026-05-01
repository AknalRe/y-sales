import { Camera, MapPin, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-provider';

const roleMenus = [
  { permission: 'attendance.execute', title: 'Absensi Wajah', icon: Camera, text: 'Check-in kamera depan dan validasi GPS.', href: '/attendance' },
  { permission: 'visits.execute', title: 'Visit Outlet', icon: MapPin, text: 'Geofence outlet dan durasi kunjungan.', href: '/sales/visit' },
  { permission: 'attendance.review', title: 'Review Absensi', icon: ShieldCheck, text: 'Validasi foto wajah dan lokasi sales.', href: '/attendance/review' },
  { permission: 'roles.manage', title: 'Role & Permission', icon: Users, text: 'Atur akses fitur per role secara fleksibel.', href: '/admin' },
  { permission: 'settings.manage', title: 'Pengaturan Radius', icon: SlidersHorizontal, text: 'Custom radius geofence dan aturan GPS.', href: '/admin' },
];

const stats = [
  { name: 'Total Transaksi', value: '1,284', change: '+12.5%', positive: true },
  { name: 'Omset Penjualan', value: 'Rp 45.2M', change: '+8.2%', positive: true },
  { name: 'Visit Hari Ini', value: '156', change: '-2.4%', positive: false },
  { name: 'Barang Terjual', value: '14,230', change: '+18.1%', positive: true },
];

export function DashboardPage() {
  const { user, permissions } = useAuth();
  const isAdministrator = user?.roleCode === 'ADMINISTRATOR';
  const visibleMenus = roleMenus.filter((menu) => isAdministrator || permissions.includes(menu.permission));

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-[#40231e]">Dashboard Utama</h1>
          <p className="mt-1 text-slate-500">Ringkasan performa penjualan dan aktivitas hari ini.</p>
        </div>
        <Link to="/admin/reports" className="rounded-xl border border-[#4a2922]/10 bg-white px-4 py-2 text-sm font-bold text-[#40231e] shadow-sm transition hover:bg-orange-50">
          Unduh Laporan
        </Link>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.name} className="brand-card group relative overflow-hidden rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-2xl">
            <div className="absolute right-[-1rem] top-[-1rem] h-24 w-24 rounded-bl-full bg-[#b55925]/10 transition group-hover:scale-110" />
            <p className="text-sm font-semibold text-slate-500">{stat.name}</p>
            <h2 className="mt-2 text-3xl font-black text-[#40231e]">{stat.value}</h2>
            <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${stat.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {stat.positive ? '?' : '?'} {stat.change} dari bulan lalu
            </span>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="brand-card rounded-3xl p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Akses Cepat</h2>
            <span className="rounded-full bg-[#b55925]/10 px-3 py-1 text-xs font-bold text-[#b55925]">{user?.roleCode}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {visibleMenus.map((menu) => (
              <Link to={menu.href} key={menu.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-[#b55925]/30 hover:bg-orange-50">
                <menu.icon className="mb-4 text-[#b55925]" size={28} />
                <h3 className="font-black text-slate-900">{menu.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{menu.text}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="brand-card rounded-3xl p-6">
          <h2 className="mb-6 text-lg font-black text-slate-900">Aktivitas Sales Terbaru</h2>
          <div className="space-y-5">
            {['Budi Santoso visit Toko Jaya Abadi', 'Sari membuat order Rp 2.500.000', 'Admin memverifikasi nota INV-2401', 'Stok Kopi Robusta ditambah'].map((item, index) => (
              <div key={item} className="relative flex gap-4">
                {index !== 3 ? <div className="absolute left-4 top-9 h-8 w-px bg-slate-200" /> : null}
                <div className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#966556]/15 text-[#966556] ring-4 ring-white">??</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{item}</p>
                  <p className="mt-1 text-xs text-slate-400">{10 + index * 8} menit yang lalu</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


