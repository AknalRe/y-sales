import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'yuksales.theme';

function getInitial(): boolean {
    // 1. Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    // 2. Fallback to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Reusable dark-mode hook.
 * Syncs the `dark` class on `<html>`, persists to localStorage, and exposes a toggle.
 */
export function useTheme() {
    const [isDark, setIsDark] = useState(getInitial);

    // Apply class on mount & whenever isDark changes
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    }, [isDark]);

    // Listen for cross-tab changes
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                setIsDark(e.newValue === 'dark');
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);

    return { isDark, toggleTheme } as const;
}