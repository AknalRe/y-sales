import { Link, useLocation } from 'react-router-dom';
import { Building2, X } from 'lucide-react';

interface AdminMobileSidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  navSections: {
    title: string;
    items: any[];
  }[];
  companyName?: string;
}

export function AdminMobileSidebar({ mobileMenuOpen, setMobileMenuOpen, navSections, companyName = 'Company' }: AdminMobileSidebarProps) {
  const location = useLocation();

  if (!mobileMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="fixed inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setMobileMenuOpen(false)} />
      <div className="relative flex w-4/5 max-w-xs flex-col h-full shadow-2xl animate-in slide-in-from-left admin-mobile-drawer">
        <div className="flex items-center justify-between p-4 admin-mobile-drawer-brand">
          <div className="admin-sidebar-logo">
            <span><Building2 size={18} /></span>
            <div>
              <h2>{companyName}</h2>
              <p>Sales Operations</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-full admin-mobile-close"
            type="button"
          >
            <span className="sr-only">Close menu</span>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <h3
                className="mb-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--admin-muted)' }}
              >
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.handle.icon;
                  const href = item.index ? '/admin' : (item.path?.startsWith('/') ? item.path : `/admin/${item.path}`);
                  const active = location.pathname === href || (!item.index && location.pathname.startsWith(`${href}/`));
                  return (
                    <li key={href}>
                      <Link
                        to={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`admin-nav-link ${active ? 'admin-nav-active' : ''}`}
                      >
                        <span className="admin-nav-icon"><Icon size={18} /></span>
                        <span className="admin-nav-text">{item.handle.label}</span>
                        {item.handle.badge && <span className="admin-nav-badge">{item.handle.badge}</span>}
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
  );
}
