import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, MapPin, ReceiptText, ShoppingCart, UserRound } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';

const bottomNav = [
  { name: 'Beranda', href: '/sales', icon: Home },
  { name: 'Kunjungan', href: '/sales/visit', icon: MapPin },
  { name: 'Transaksi', href: '/sales/transactions', icon: ShoppingCart },
  { name: 'Nota', href: '/sales/invoices', icon: ReceiptText },
  { name: 'Profil', href: '/sales/profile', icon: UserRound },
];

export function SalesShell() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen justify-center bg-[#2a1714] text-slate-900">
      <div className="mobile-shell relative flex flex-col overflow-hidden">
        <header className="sticky top-0 z-20 bg-[#4a2922] p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#d8b6aa]">YukSales</p>
              <h1 className="text-lg font-black">{user?.name ?? 'Sales'}</h1>
              <p className="text-xs text-white/60">Area operasional aktif</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/20 bg-[#b55925] font-black text-white">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'SL'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-24">
          <Outlet />
        </main>

        <nav className="absolute bottom-0 left-0 right-0 z-20 flex h-16 items-center justify-around border-t border-slate-200 bg-white px-1 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link key={item.href} id={`sales-nav-${item.name.toLowerCase()}`} to={item.href} className={`relative flex h-full w-16 flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${active ? 'text-[#b55925]' : 'text-slate-400 hover:text-slate-700'}`}>
                <Icon size={20} />
                {item.name}
                {active ? <span className="absolute bottom-0 h-1 w-8 rounded-t-full bg-[#b55925]" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}


