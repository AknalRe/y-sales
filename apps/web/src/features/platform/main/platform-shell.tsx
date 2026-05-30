import { Outlet, Navigate } from 'react-router-dom';
import { Banknote, Building2, CreditCard, LayoutDashboard, Layers3, Menu } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '../../auth/auth-provider';
import { PlatformDesktopSidebar } from './platform-desktop-sidebar';
import { PlatformMobileSidebar } from './platform-mobile-sidebar';

const platformNav = [
  { path: '/platform', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/platform/companies', label: 'Companies', icon: Building2 },
  { path: '/platform/plans', label: 'Subscription Plans', icon: CreditCard },
  { path: '/platform/features', label: 'Feature Catalog', icon: Layers3 },
  { path: '/platform/billing', label: 'Billing', icon: Banknote },
];

export function PlatformShell() {
  const { user, isSuperAdmin, signOut } = useAuth();
  const isMobile = useIsMobile(820);

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(!isMobile);
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  const initials = useMemo(() =>
    user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'SA',
    [user]
  );

  if (!isSuperAdmin) return <Navigate to="/admin" replace />;

  return (
    <div className="platform-shell">
      {/* Sidebar Desktop */}
      {!isMobile && (
        <PlatformDesktopSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          platformNav={platformNav}
          initials={initials}
          userName={user?.name ?? 'Super Admin'}
          userEmail={user?.email ?? ''}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
          signOut={signOut}
        />
      )}

      <main className={`platform-main ${sidebarOpen ? 'platform-main-open' : 'platform-main-closed'}`}>
        {/* Mobile menu button */}
        {isMobile && (
          <header className="platform-topbar">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="platform-toggle-btn"
              type="button"
            >
              <Menu size={18} />
            </button>
            <span className="platform-brand-name">Yuksales</span>
          </header>
        )}
        <Outlet />
      </main>

      {/* Sidebar Mobile */}
      {isMobile && (
        <PlatformMobileSidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          platformNav={platformNav}
          initials={initials}
          userName={user?.name ?? 'Super Admin'}
          userEmail={user?.email ?? ''}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
          signOut={signOut}
        />
      )}
    </div>
  );
}
