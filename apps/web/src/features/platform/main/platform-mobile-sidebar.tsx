import { Link, useLocation } from 'react-router-dom';
import { LogOut, Moon, Sun, UserCircle } from 'lucide-react';
import type { PlatformNavItem } from './platform-desktop-sidebar';
import { useTheme } from '@/hooks/use-theme';

interface PlatformMobileSidebarProps {
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
    platformNav: PlatformNavItem[];
    initials: string;
    userName: string;
    userEmail: string;
    profileOpen: boolean;
    setProfileOpen: (open: boolean) => void;
    signOut: () => void;
}

export function PlatformMobileSidebar({
    mobileMenuOpen,
    setMobileMenuOpen,
    platformNav,
    initials,
    userName,
    userEmail,
    profileOpen,
    setProfileOpen,
    signOut,
}: PlatformMobileSidebarProps) {
    const location = useLocation();
    const { isDark, toggleTheme } = useTheme();

    if (!mobileMenuOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex">
            <div
                className="fixed inset-0 backdrop-blur-sm"
                style={{ background: "rgba(0,0,0,0.4)" }}
                onClick={() => setMobileMenuOpen(false)}
            />
            <div
                className="relative flex w-4/5 max-w-xs flex-col h-full shadow-2xl animate-in slide-in-from-left"
                style={{ background: "var(--platform-gradient-sidebar)", backdropFilter: "blur(22px)" }}
            >
                <div
                    className="flex items-center justify-between p-4"
                    style={{ borderBottom: "1px solid var(--platform-border)" }}
                >
                    <h2 className="text-lg font-bold" style={{ color: "var(--platform-text)" }}>
                        Yuksales
                    </h2>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 rounded-full"
                        style={{ color: "var(--platform-muted)" }}
                    >
                        <span className="sr-only">Close menu</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                    <ul className="space-y-1">
                        {platformNav.map(item => {
                            const Icon = item.icon;
                            const active = item.exact
                                ? location.pathname === item.path
                                : location.pathname.startsWith(item.path) && item.path !== "/platform";
                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                                        style={{
                                            color: active ? "#ffffff" : "var(--platform-subtle)",
                                            background: active ? "linear-gradient(135deg, var(--platform-violet-shadow-md), var(--platform-info-shadow-glow))" : "transparent",
                                        }}
                                    >
                                        <Icon size={18} style={{ color: active ? "#ffffff" : "var(--platform-subtle)" }} />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div
                    className="p-4"
                    style={{ borderTop: "1px solid var(--platform-border)" }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="platform-avatar">{initials}</div>
                        <div>
                            <strong className="text-sm" style={{ color: "var(--platform-text)" }}>{userName}</strong>
                            <span className="block text-xs" style={{ color: "var(--platform-subtle)" }}>{userEmail}</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <button onClick={toggleTheme} className="platform-profile-item w-full" type="button">
                            {isDark ? <Sun size={15} /> : <Moon size={15} />}
                            <span>{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>
                        </button>
                        <button className="platform-profile-item w-full" type="button">
                            <UserCircle size={15} />
                            <span>Profil</span>
                        </button>
                        <button
                            onClick={signOut}
                            className="platform-profile-item platform-profile-danger w-full"
                            type="button"
                        >
                            <LogOut size={15} />
                            <span>Keluar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}