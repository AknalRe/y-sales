import { Link, useLocation } from 'react-router-dom';
import { Building2, Menu } from 'lucide-react';

interface AdminDesktopSidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  navSections: {
    title: string;
    items: any[];
  }[];
  companyName?: string;
}

export function AdminDesktopSidebar({ open, setOpen, navSections, companyName = 'Company' }: AdminDesktopSidebarProps) {
  const location = useLocation();

  return (
    <aside className={`${open ? 'admin-workspace-open' : 'admin-workspace-closed'} admin-workspace`}>
      <div className="admin-sidebar-brand">
        <div className="admin-sidebar-logo">
          <span><Building2 size={18} /></span>
          <div>
            <h2>{companyName}</h2>
            <p>Sales Operations</p>
          </div>
        </div>
        <button id="admin-sidebar-toggle" onClick={() => setOpen(!open)} className="admin-icon-button" type="button">
          <Menu size={18} />
        </button>
      </div>

      <nav className="admin-nav" aria-label="Administrator navigation">
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
  );
}
