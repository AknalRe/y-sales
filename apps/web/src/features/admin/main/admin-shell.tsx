import { Outlet, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/hooks/use-theme';
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/auth-provider';

import { mainRoutes, playgroundRoutes } from '@/router/index';
import { getPlatformCompanyView } from '@/lib/api/client';
import { PlatformCompanyViewBanner } from '@/features/platform/utility/company-view-banner';
import { AdminDesktopSidebar } from './admin-desktop-sidebar';
import { AdminMobileSidebar } from './admin-mobile-sidebar';

// Helper to group routes by section
const getNavSections = (permissions: string[], user: any, isSuperAdmin: boolean) => {
  const allRoutes = [...mainRoutes, ...playgroundRoutes.filter(r => !r.handle.mobile && !r.handle.hidden)];

  const canSee = (permission?: string) => {
    if (!permission) return true;
    if (isSuperAdmin) return true;
    return permissions.includes(permission) || user?.roleCode === 'ADMINISTRATOR';
  };

  const visibleRoutes = allRoutes.filter((route) => {
    if (isSuperAdmin || user?.roleCode === 'ADMINISTRATOR') return true;
    const required = route.handle.permissions ?? (route.handle.permission ? [route.handle.permission] : []);
    if (!required.length) return true;
    return required.some(canSee);
  });

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

  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (isMobile) {
      setOpen(false);
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  const navSections = useMemo(() => getNavSections(permissions, user, isSuperAdmin), [permissions, user, isSuperAdmin]);

  const resolvedCompanyName = useMemo(() => {
    if (user?.company?.name) return user.company.name;
    const cv = getPlatformCompanyView();
    return cv?.name ?? 'Company';
  }, [user]);

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

      {/* Sidebar Desktop */}
      {!isMobile && <AdminDesktopSidebar open={open} setOpen={setOpen} navSections={navSections} companyName={resolvedCompanyName} />}

      <main className={`admin-main ${open ? 'admin-main-open' : 'admin-main-closed'}`}>
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isMobile && (
              <button onClick={() => setMobileMenuOpen(true)} className="grid place-items-center w-[2.65rem] h-[2.65rem] rounded-2xl bg-white text-slate-500 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.07)]" type="button">
                <Menu size={18} />
              </button>
            )}
            <div className='flex flex-col'>
              <h1 className='!text-[16px] sm:!text-xl'>{currentTitle}</h1>
              <span className='!text-[14px] sm:!text-base'>Admin Portal</span>
            </div>
          </div>
          <div className="admin-user-zone">
            <button onClick={toggleTheme} className="admin-icon-button" type="button" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </button>
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

        <div className="admin-content">
          <PlatformCompanyViewBanner />
          <Outlet />
        </div>
      </main>

      {/* Sidebar Mobile */}
      {isMobile && (
        <AdminMobileSidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          navSections={navSections}
          companyName={resolvedCompanyName}
        />
      )}
    </div>
  );
}
