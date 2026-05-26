import { Link, useLocation } from 'react-router-dom';

interface AdminMobileSidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  navSections: {
    title: string;
    items: any[];
  }[];
}

export function AdminMobileSidebar({ mobileMenuOpen, setMobileMenuOpen, navSections }: AdminMobileSidebarProps) {
  const location = useLocation();

  if (!mobileMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="fixed inset-0  backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
      <div className="relative flex w-4/5 max-w-xs flex-col bg-[#3B1F1A] h-full shadow-2xl animate-in slide-in-from-left">
        <div className="flex items-center justify-between p-4 border-b border-b-[#4e2b25]">
          <h2 className="text-lg font-bold text-white">Mahasura Mobile</h2>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <span className="sr-only">Close menu</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white">{section.title}</h3>
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
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active
                          ? 'text-white bg-[#B55925]'
                          : 'text-white'
                          }`}
                      >
                        <Icon size={18} className={active ? 'text-white' : 'text-white'} />
                        {item.handle.label}
                        {/* {item.handle.badge && (
                          <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                            {item.handle.badge}
                          </span>
                        )} */}
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
