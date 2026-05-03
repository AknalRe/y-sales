import { Navigate } from 'react-router-dom';
import { useAuth } from './auth-provider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}

/** Protects routes that only Super Admin (isSuperAdmin = true) can access. */
export function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { accessToken, isSuperAdmin } = useAuth();
  if (!accessToken) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/admin" replace />;
  return children;
}



