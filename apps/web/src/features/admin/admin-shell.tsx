import { Link, Outlet, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Bell,
  LogOut,
  Menu,
  UserCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  const isMobile = useIsMobile(820);

  const [open, setOpen] = useState(!isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setOpen(!isMobile);
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

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


      {!isMobile && (
        <aside className={`${open ? 'admin-workspace-open' : 'admin-workspace-closed'} admin-workspace`}>
          <div className="admin-sidebar-brand">
            <h2>Mahasura</h2>
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
      )}

      <main className={`admin-main ${open ? 'admin-main-open' : 'admin-main-closed'}`}>
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isMobile && (
              <button onClick={() => setMobileMenuOpen(true)} className="admin-icon-button" type="button">
                <Menu size={18} />
              </button>
            )}
            <div>
              <h1>{currentTitle}</h1>
              <span>Admin Portal</span>
            </div>
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
              <div className="admin-user-copy hidden sm:block">
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

      {/* DEDICATED MOBILE MENU OVERLAY */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex w-4/5 max-w-xs flex-col bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-left">
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Mahasura Mobile</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <span className="sr-only">Close menu</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
              {navSections.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{section.title}</h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.handle.icon;
                      const href = item.index ? '/admin' : (item.path?.startsWith('/') ? item.path : `/admin/${item.path}`);
                      const active = location.pathname === href;
                      return (
                        <li key={href}>
                          <Link 
                            to={href} 
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                              active 
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Icon size={18} className={active ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400'} />
                            {item.handle.label}
                            {item.handle.badge && (
                              <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                {item.handle.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
