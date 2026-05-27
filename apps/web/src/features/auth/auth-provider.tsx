import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearPlatformCompanyView, getMe, login, logout, refreshSession } from '../../lib/api/client';

type SessionUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  roleCode: string;
  isSuperAdmin: boolean;
  company: { id: string; name: string; slug: string } | null;
};

type AuthContextValue = {
  accessToken?: string;
  user?: SessionUser;
  permissions: string[];
  isSuperAdmin: boolean;
  initializing: boolean;
  signIn: (identifier: string, password: string) => Promise<SessionUser>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const profileStorageKey = 'yuksales.session.profile';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = readStoredProfile();
  const [initializing, setInitializing] = useState(true);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [user, setUser] = useState<SessionUser | undefined>(initial?.user);
  const [permissions, setPermissions] = useState<string[]>(initial?.permissions ?? []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(profileStorageKey);
    clearPlatformCompanyView();
    setAccessToken(undefined);
    setUser(undefined);
    setPermissions([]);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    accessToken,
    user,
    permissions,
    isSuperAdmin: user?.isSuperAdmin ?? false,
    initializing,
    async signIn(identifier, password) {
      const deviceId = getDeviceId();
      const result = await login({ identifier, password, deviceId });
      const me = await getMe(result.accessToken);
      const session = {
        accessToken: result.accessToken,
        user: me.user,
        permissions: me.permissions,
      };
      localStorage.setItem(profileStorageKey, JSON.stringify({ user: session.user, permissions: session.permissions }));
      setAccessToken(session.accessToken);
      setUser(session.user);
      setPermissions(session.permissions);
      return session.user;
    },
    signOut() {
      void logout().finally(clearSession);
    },
  }), [accessToken, user, permissions, initializing, clearSession]);

  // Global 401 handler — listen for auth:unauthorized event dispatched by apiRequest
  const handleUnauthorized = useCallback(() => {
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      try {
        const refreshed = await refreshSession();
        if (cancelled) return;
        const me = await getMe(refreshed.accessToken);
        if (cancelled) return;
        setAccessToken(refreshed.accessToken);
        setUser(me.user);
        setPermissions(me.permissions);
        localStorage.setItem(profileStorageKey, JSON.stringify({ user: me.user, permissions: me.permissions }));
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  useEffect(() => {
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [handleUnauthorized]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

function readStoredProfile() {
  const raw = localStorage.getItem(profileStorageKey);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Pick<AuthContextValue, 'user' | 'permissions'>;
  } catch {
    return undefined;
  }
}

function getDeviceId() {
  const key = 'yuksales.deviceId';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

