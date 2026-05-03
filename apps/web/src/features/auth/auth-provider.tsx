import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login } from '../../lib/api/client';

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
  refreshToken?: string;
  user?: SessionUser;
  permissions: string[];
  isSuperAdmin: boolean;
  signIn: (identifier: string, password: string) => Promise<SessionUser>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const storageKey = 'yuksales.session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = readStoredSession();
  const [accessToken, setAccessToken] = useState<string | undefined>(initial?.accessToken);
  const [refreshToken, setRefreshToken] = useState<string | undefined>(initial?.refreshToken);
  const [user, setUser] = useState<SessionUser | undefined>(initial?.user);
  const [permissions, setPermissions] = useState<string[]>(initial?.permissions ?? []);

  const value = useMemo<AuthContextValue>(() => ({
    accessToken,
    refreshToken,
    user,
    permissions,
    isSuperAdmin: user?.isSuperAdmin ?? false,
    async signIn(identifier, password) {
      const deviceId = getDeviceId();
      const result = await login({ identifier, password, deviceId });
      const me = await getMe(result.accessToken);
      const session = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: {
          ...me.user,
          isSuperAdmin: result.user.isSuperAdmin ?? false,
          company: result.user.company ?? null,
        },
        permissions: me.permissions,
      };
      localStorage.setItem(storageKey, JSON.stringify(session));
      setAccessToken(session.accessToken);
      setRefreshToken(session.refreshToken);
      setUser(session.user);
      setPermissions(session.permissions);
      return session.user;
    },
    signOut() {
      localStorage.removeItem(storageKey);
      setAccessToken(undefined);
      setRefreshToken(undefined);
      setUser(undefined);
      setPermissions([]);
    },
  }), [accessToken, refreshToken, user, permissions]);

  // Global 401 handler — listen for auth:unauthorized event dispatched by apiRequest
  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem(storageKey);
    setAccessToken(undefined);
    setRefreshToken(undefined);
    setUser(undefined);
    setPermissions([]);
  }, []);

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

function readStoredSession() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Pick<AuthContextValue, 'accessToken' | 'refreshToken' | 'user' | 'permissions'>;
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


