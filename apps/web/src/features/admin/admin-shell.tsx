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

const railItems = [
  { icon: LayoutDashboard, label: 'Command' },
  { icon: ShoppingCart, label: 'POS' },
  { icon: Warehouse, label: 'Warehouse' },
  { icon: Truck, label: 'Route' },
  { icon: ClipboardCheck, label: 'Approval' },
];

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
      <aside className="admin-rail" aria-label="Administrator quick rail">
        <div className="admin-rail-logo">
          <PackageCheck size={24} />
        </div>
        <div className="admin-rail-stack">
          {railItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} id={`admin-rail-${item.label.toLowerCase()}`} className="admin-rail-button" title={item.label} type="button">
                <Icon size={19} />
              </button>
            );
          })}
        </div>
        <button id="admin-rail-signout" onClick={signOut} className="admin-rail-button admin-rail-danger" title="Keluar" type="button">
          <LogOut size={19} />
        </button>
      </aside>

      <aside className={`${open ? 'admin-workspace-open' : 'admin-workspace-closed'} admin-workspace`}>
        <div className="admin-company-card">
          <div>
            <p className="admin-kicker">Currently controlling</p>
            <h2>YukSales HQ</h2>
            <span>Sales Tracking · POS Inventory</span>
          </div>
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
      </aside>

      <main className={`admin-main ${open ? 'admin-main-open' : 'admin-main-closed'}`}>
        <header className="admin-topbar">
          <div>
            <p className="admin-kicker">Administrator Console</p>
            <h1>{currentTitle}</h1>
          </div>
          <div className="admin-command-search">
            <Search size={18} />
            <input id="admin-command-search" placeholder="Search SKU, gudang, sales, outlet, invoice..." aria-label="Search admin command center" />
            <kbd>Ctrl K</kbd>
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
            <div className="admin-surface-header">
              <div>
                <p className="admin-kicker">Operational Workspace</p>
                <h2>Sales, POS & Inventory Control</h2>
              </div>
              <div className="admin-live-pill"><span /> Live Stock Ledger</div>
            </div>
            <Outlet />
          </section>

          <aside className="admin-ops-panel" aria-label="Inventory operations panel">
            <div className="admin-panel-profile">
              <div className="admin-panel-avatar"><Warehouse size={28} /></div>
              <h3>Warehouse Ops</h3>
              <p>POS inventory, canvas stock, transfer approval</p>
              <div className="admin-panel-score">98.4%</div>
              <span>Stock accuracy today</span>
            </div>

            <div className="admin-panel-block">
              <div className="admin-panel-title">
                <h4>Inventory Health</h4>
                <Zap size={16} />
              </div>
              <div className="admin-metric-row">
                <span>WH-MAIN</span>
                <strong>Ready</strong>
              </div>
              <div className="admin-progress"><span style={{ width: '82%' }} /></div>
              <div className="admin-metric-row">
                <span>Sales Van Stock</span>
                <strong>72%</strong>
              </div>
              <div className="admin-progress admin-progress-amber"><span style={{ width: '72%' }} /></div>
            </div>

            <div className="admin-panel-block">
              <div className="admin-panel-title">
                <h4>Transfer Queue</h4>
                <Truck size={16} />
              </div>
              <div className="admin-queue-item">
                <span className="admin-dot admin-dot-blue" />
                <div><strong>WH-MAIN → SALES-001</strong><small>12 SKU waiting picklist</small></div>
              </div>
              <div className="admin-queue-item">
                <span className="admin-dot admin-dot-orange" />
                <div><strong>POS Outlet Restock</strong><small>3 outlet below min stock</small></div>
              </div>
            </div>

            <div className="admin-alert-card">
              <AlertTriangle size={18} />
              <div>
                <strong>Stock Guard Active</strong>
                <span>Gudang tidak bisa dinonaktifkan jika masih ada stok.</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
