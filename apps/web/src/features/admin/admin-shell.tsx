import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  PackageCheck,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Warehouse,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-provider';

import { mainRoutes, playgroundRoutes } from '@/router/index';

// Helper to group routes by section
const getNavSections = (permissions: string[], user: any) => {
  const allRoutes = [...mainRoutes, ...playgroundRoutes.filter(r => !r.handle.mobile && !r.handle.hidden)];
  
  const canSee = (permission?: string) => {
    if (!permission) return true;
    return permissions.includes(permission) || user?.roleCode === 'ADMINISTRATOR';
  };

  const visibleRoutes = allRoutes.filter(r => canSee(r.handle.permission));
  
  const sections: Record<string, any[]> = {};
  visibleRoutes.forEach(route => {
    const sectionName = route.handle.section || 'General';
    if (!sections[sectionName]) sections[sectionName] = [];
    sections[sectionName].push(route);
  });

  return Object.entries(sections).map(([title, items]) => ({ title, items }));
};



export function AdminShell() {
  const location = useLocation();
  const { user, permissions, signOut } = useAuth();
  const [open, setOpen] = useState(true);
  
  const navSections = useMemo(() => getNavSections(permissions, user), [permissions, user]);
  
  const currentTitle = useMemo(() => {
    const allRoutes = [...mainRoutes, ...playgroundRoutes];
    const path = location.pathname === '/admin' ? '/admin' : location.pathname;
    // Special check for index route
    if (location.pathname === '/admin') {
       return mainRoutes.find(r => r.index)?.handle.label || 'Admin Dashboard';
    }
    return allRoutes.find(r => `/admin/${r.path}` === location.pathname || r.path === location.pathname)?.handle.label ?? 'Admin Command Center';
  }, [location.pathname]);

  return (
    <div className="admin-command-shell">


      <aside className={`${open ? 'admin-workspace-open' : 'admin-workspace-closed'} admin-workspace`}>
        <div className="admin-sidebar-brand">
          <h2>YukSales HQ</h2>
          <button id="admin-sidebar-toggle" onClick={() => setOpen(!open)} className="admin-icon-button" type="button">
            <Menu size={18} />
          </button>
        </div>

        <div className="admin-search-mini">
          <Search size={16} />
          <span>Search stock, invoice, route...</span>
        </div>

        <nav className="admin-nav" aria-label="Administrator navigation">
          {navSections.map((section) => (
            <section key={section.title} className="admin-nav-section">
              <p>{section.title}</p>
              <ul>
                {section.items.map((item) => {
                  const Icon = item.handle.icon;
                  const href = item.index ? '/admin' : (item.path?.startsWith('/') ? item.path : `/admin/${item.path}`);
                  const active = location.pathname === href;
                  return (
                    <li key={href}>
                      <Link id={`admin-nav-${item.handle.label.toLowerCase().replaceAll(' ', '-')}`} to={href} className={`admin-nav-link ${active ? 'admin-nav-active' : ''}`}>
                        <span className="admin-nav-icon"><Icon size={19} /></span>
                        <span className="admin-nav-text">{item.handle.label}</span>
                        {item.handle.badge && <span className="admin-nav-badge">{item.handle.badge}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>

        <div className="admin-sync-card">
          <div className="admin-sync-orb"><Activity size={18} /></div>
          <div>
            <strong>Field sync healthy</strong>
            <span>GPS, invoice, stock ledger online</span>
          </div>
        </div>

        <div className="admin-nav-footer">
          <button id="admin-signout-main" onClick={signOut} className="admin-nav-link admin-nav-danger" type="button">
            <span className="admin-nav-icon"><LogOut size={19} /></span>
            <span className="admin-nav-text">Keluar dari Sesi</span>
          </button>
        </div>
      </aside>

      <main className={`admin-main ${open ? 'admin-main-open' : 'admin-main-closed'}`}>
        <header className="admin-topbar">
          <div>
            <h1>{currentTitle}</h1>
          </div>
          <div className="admin-user-zone">
            <button id="admin-notification-button" className="admin-icon-button admin-notification" type="button">
              <Bell size={18} />
              <span />
            </button>
            <div className="admin-avatar">{user?.name?.slice(0, 2).toUpperCase() ?? 'AD'}</div>
            <div className="admin-user-copy">
              <strong>{user?.name ?? 'Admin Utama'}</strong>
              <span>{user?.email ?? 'admin@yuksales.local'}</span>
            </div>
          </div>
        </header>

        <div className="admin-content-grid">
          <section className="admin-outlet-surface">
            <Outlet />
          </section>

        </div>
      </main>
    </div>
  );
}
