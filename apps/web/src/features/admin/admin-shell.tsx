import { Link, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Boxes, CreditCard, LayoutDashboard, LogOut, Map, Menu, ReceiptText, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/auth-provider';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'attendance.review' },
  { name: 'Tracking Penjualan', href: '/admin/tracking', icon: Map, permission: 'visits.review' },
  { name: 'Laporan Penjualan', href: '/admin/reports', icon: BarChart3, permission: 'reports.view' },
  { name: 'Manajemen Stok', href: '/admin/stock', icon: Boxes, permission: 'products.manage' },
  { name: 'Piutang Usaha', href: '/admin/receivables', icon: CreditCard, permission: 'receivables.view' },
  { name: 'Verifikasi Nota', href: '/admin/invoice-review', icon: ReceiptText, permission: 'invoice.review' },
  { name: 'Review Absensi', href: '/attendance/review', icon: ShieldCheck, permission: 'attendance.review' },
];

export function AdminShell() {
  const location = useLocation();
  const { user, permissions, signOut } = useAuth();
  const [open, setOpen] = useState(true);
  const visibleItems = navItems.filter((item) => permissions.includes(item.permission) || user?.roleCode === 'ADMINISTRATOR');

  return (
    <div className="min-h-screen bg-[#f6f2ef] text-slate-900">
      <aside className={`${open ? 'w-72' : 'w-24'} fixed inset-y-0 left-0 z-30 flex flex-col bg-[#4a2922] text-white shadow-2xl transition-all duration-300`}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <div className={`${open ? 'opacity-100' : 'hidden opacity-0'} transition-opacity`}>
            <p className="text-xl font-black tracking-wider">YukSales</p>
            <p className="text-xs text-[#d8b6aa]">Admin Portal</p>
          </div>
          <button id="admin-sidebar-toggle" onClick={() => setOpen(!open)} className="rounded-xl p-2 transition hover:bg-white/10">
            <Menu />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <ul className="space-y-1.5">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.href;
              return (
                <li key={item.href}>
                  <Link id={`admin-nav-${item.name.toLowerCase().replaceAll(' ', '-')}`} to={item.href} className={`flex items-center rounded-2xl px-4 py-3 transition ${active ? 'bg-[#b55925] text-white shadow-lg shadow-black/20' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                    <Icon size={21} />
                    <span className={`${open ? 'ml-3 block' : 'hidden'} font-semibold`}>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-4">
          <button id="admin-signout-button" onClick={signOut} className="flex w-full items-center rounded-2xl px-4 py-3 text-white/70 transition hover:bg-white/10 hover:text-white">
            <LogOut size={21} />
            <span className={`${open ? 'ml-3 block' : 'hidden'} font-semibold`}>Keluar</span>
          </button>
        </div>
      </aside>

      <main className={`${open ? 'pl-72' : 'pl-24'} min-h-screen transition-all duration-300`}>
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#4a2922]/10 bg-white/85 px-8 shadow-sm backdrop-blur-xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b55925]">YukSales</p>
            <h1 className="text-xl font-black text-[#40231e]">Admin Portal</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#b55925] font-black text-white shadow-lg">{user?.name?.slice(0, 2).toUpperCase() ?? 'AD'}</div>
            <div className="hidden text-right md:block">
              <p className="text-sm font-bold text-slate-900">{user?.name ?? 'Admin Utama'}</p>
              <p className="text-xs text-slate-500">{user?.email ?? 'admin@yuksales.local'}</p>
            </div>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}


