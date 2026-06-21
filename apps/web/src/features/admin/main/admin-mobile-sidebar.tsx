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
  companyLogo?: string | null;
}

export function AdminMobileSidebar({ mobileMenuOpen, setMobileMenuOpen, navSections, companyName = 'Company', companyLogo }: AdminMobileSidebarProps) {
  const location = useLocation();

  return (
    <div 
      className={`fixed inset-0 z-[100] flex transition-all duration-300 ${
        mobileMenuOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!mobileMenuOpen}
    >
      <div 
        className={`fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0'
        }`} 
        style={{ background: 'rgba(0,0,0,0.4)' }} 
        onClick={() => setMobileMenuOpen(false)} 
      />
      <div 
        className={`relative flex w-4/5 max-w-xs flex-col h-full shadow-2xl transition-transform duration-300 ease-in-out admin-mobile-drawer ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-logo">
            <span>
              {companyLogo ? (
                <img className='bg-[var(--admin-surface)]' src={companyLogo} alt={companyName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
              ) : (
                <Building2 size={18} />
              )}
            </span>
            <div>
              <h2>{companyName}</h2>
              <p>Sales Operations</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            id="admin-sidebar-toggle"
            className="admin-icon-button"
            type="button"
          >
            <span className="sr-only">Tutup menu</span>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto admin-nav">
          {navSections.map((section) => (
            <section key={section.title} className="admin-nav-section">
              <p>{section.title}</p>
              <ul>
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
            </section>
          ))}
        </nav>
      </div>
    </div>
  );
}
