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
import { useState } from 'react';
import { useAuth } from '../auth/auth-provider';

const navSections = [
  {
    title: 'Command Center',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'attendance.review', badge: 'Live' },
      { name: 'Tracking Penjualan', href: '/admin/tracking', icon: Map, permission: 'visits.review', badge: 'GPS' },
    ],
  },
  {
    title: 'Sales Ops',
    items: [
      { name: 'Laporan Penjualan', href: '/admin/reports', icon: BarChart3, permission: 'reports.view', badge: 'KPI' },
      { name: 'Verifikasi Nota', href: '/admin/invoice-review', icon: ReceiptText, permission: 'invoice.review', badge: 'Review' },
    ],
  },
  {
    title: 'Inventory & POS',
    items: [
      { name: 'Manajemen Stok', href: '/admin/stock', icon: Boxes, permission: 'products.manage', badge: 'Stock' },
      { name: 'Piutang Usaha', href: '/admin/receivables', icon: CreditCard, permission: 'receivables.view', badge: 'AR' },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { name: 'Review Absensi', href: '/attendance/review', icon: ShieldCheck, permission: 'attendance.review', badge: 'HR' },
    ],
  },
];

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
  const canSee = (permission: string) => permissions.includes(permission) || user?.roleCode === 'ADMINISTRATOR';
  const currentTitle = navSections.flatMap((section) => section.items).find((item) => item.href === location.pathname)?.name ?? 'Admin Command Center';

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
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => canSee(item.permission));
            if (!visibleItems.length) return null;
            return (
              <section key={section.title} className="admin-nav-section">
                <p>{section.title}</p>
                <ul>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link id={`admin-nav-${item.name.toLowerCase().replaceAll(' ', '-')}`} to={item.href} className={`admin-nav-link ${active ? 'admin-nav-active' : ''}`}>
                          <span className="admin-nav-icon"><Icon size={19} /></span>
                          <span className="admin-nav-text">{item.name}</span>
                          <span className="admin-nav-badge">{item.badge}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
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
