import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  LogOut,
  Menu,
  UserCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-provider';

import { mainRoutes, playgroundRoutes } from '@/router/index';
import { PlatformCompanyViewBanner } from '@/features/platform/company-view-banner';

// Helper to group routes by section
const getNavSections = (permissions: string[], user: any, isSuperAdmin: boolean) => {
  const allRoutes = [...mainRoutes, ...playgroundRoutes.filter(r => !r.handle.mobile && !r.handle.hidden)];
  
  const canSee = (permission?: string) => {
    if (!permission) return true;
    if (isSuperAdmin) return true;
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
  const { user, permissions, isSuperAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  
  const navSections = useMemo(() => getNavSections(permissions, user, isSuperAdmin), [permissions, user, isSuperAdmin]);
  
  const currentTitle = useMemo(() => {
    const allRoutes = [...mainRoutes, ...playgroundRoutes];
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
          <h2>Yuk Tracking Sales</h2>
          <button id="admin-sidebar-toggle" onClick={() => setOpen(!open)} className="admin-icon-button" type="button">
            <Menu size={18} />
          </button>
        </div>


        <nav className="admin-nav" aria-label="Administrator navigation">
          {navSections.map((section) => (
            <section key={section.title} className="admin-nav-section">
              {section.title === 'Development' && <p>{section.title}</p>}
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
            <div className="admin-profile-trigger" onClick={() => setProfileOpen(!profileOpen)}>
              <div className="admin-avatar">
                {(user?.name ?? 'AU').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="admin-user-copy">
                <strong>{user?.name ?? 'Administrator'}</strong>
                <span>{user?.company?.name ?? user?.email ?? user?.roleCode}</span>
              </div>
              
              {profileOpen && (
                <div className="admin-profile-dropdown animate-float-in">
                  <button className="admin-dropdown-item">
                    <UserCircle size={16} />
                    <span>Pengaturan Akun</span>
                  </button>
                  <button onClick={signOut} className="admin-dropdown-item admin-text-danger">
                    <LogOut size={16} />
                    <span>Keluar dari Sesi</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="admin-content-grid">
          <PlatformCompanyViewBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
