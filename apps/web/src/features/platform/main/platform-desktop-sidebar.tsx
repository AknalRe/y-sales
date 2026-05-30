import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, Shield, UserCircle } from 'lucide-react';

export interface PlatformNavItem {
    path: string;
    label: string;
    icon: React.ElementType;
    exact?: boolean;
}

interface PlatformDesktopSidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    platformNav: PlatformNavItem[];
    initials: string;
    userName: string;
    userEmail: string;
    profileOpen: boolean;
    setProfileOpen: (open: boolean) => void;
    signOut: () => void;
}

export function PlatformDesktopSidebar({
    sidebarOpen,
    setSidebarOpen,
    platformNav,
    initials,
    userName,
    userEmail,
    profileOpen,
    setProfileOpen,
    signOut,
}: PlatformDesktopSidebarProps) {
    const location = useLocation();

    return (
        <aside className={`platform-sidebar ${sidebarOpen ? 'platform-sidebar-open' : 'platform-sidebar-closed'}`}>
            <div className="platform-brand">
                <div className="platform-brand-icon">
                    <Shield size={20} />
                </div>
                {sidebarOpen && (
                    <div className="platform-brand-text">
                        <span className="platform-brand-name">Yuksales</span>
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
                            <strong>{userName}</strong>
                            <span>{userEmail}</span>
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
    );
}