import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Banknote, Building2, CreditCard, LayoutDashboard, Layers3, LogOut, Menu, Shield, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/auth-provider';

const platformNav = [
  { path: '/platform', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/platform/companies', label: 'Companies', icon: Building2 },
  { path: '/platform/plans', label: 'Subscription Plans', icon: CreditCard },
  { path: '/platform/features', label: 'Feature Catalog', icon: Layers3 },
  { path: '/platform/billing', label: 'Billing', icon: Banknote },
];

export function PlatformShell() {
  const { user, isSuperAdmin, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!isSuperAdmin) return <Navigate to="/admin" replace />;

  const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'SA';

  return (
    <div className="platform-shell">
      <aside className={`platform-sidebar ${sidebarOpen ? 'platform-sidebar-open' : 'platform-sidebar-closed'}`}>
        <div className="platform-brand">
          <div className="platform-brand-icon">
            <Shield size={20} />
          </div>
          {sidebarOpen && (
            <div className="platform-brand-text">
              <span className="platform-brand-name">YukSales</span>
              <span className="platform-brand-role">Platform Admin</span>
            </div>
          )}
          <button
            id="platform-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="platform-toggle-btn"
            type="button"
          >
            <Menu size={16} />
          </button>
        </div>

        <nav className="platform-nav">
          {platformNav.map(item => {
            const Icon = item.icon;
            const active = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && item.path !== '/platform';
            return (
              <Link
                key={item.path}
                id={`platform-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                to={item.path}
                className={`platform-nav-link ${active ? 'platform-nav-active' : ''}`}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="platform-sidebar-footer">
          <div className="platform-user-area" onClick={() => setProfileOpen(!profileOpen)}>
            <div className="platform-avatar">{initials}</div>
            {sidebarOpen && (
              <div className="platform-user-info">
                <strong>{user?.name ?? 'Super Admin'}</strong>
                <span>{user?.email ?? ''}</span>
              </div>
            )}
          </div>
          {profileOpen && (
            <div className="platform-profile-menu">
              <button className="platform-profile-item" type="button">
                <UserCircle size={15} />
                <span>Profil</span>
              </button>
              <button onClick={signOut} className="platform-profile-item platform-profile-danger" type="button">
                <LogOut size={15} />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className={`platform-main ${sidebarOpen ? 'platform-main-open' : 'platform-main-closed'}`}>
        <Outlet />
      </main>
    </div>
  );
}
