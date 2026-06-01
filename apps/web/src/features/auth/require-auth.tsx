import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './auth-provider';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-orange-500" size={32} />
        <p className="text-sm font-semibold text-gray-500">Memuat sesi...</p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken, initializing } = useAuth();
  if (initializing) return <LoadingScreen />;
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}

/** Protects routes that only Super Admin (isSuperAdmin = true) can access. */
export function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { accessToken, isSuperAdmin, initializing } = useAuth();
  if (initializing) return <LoadingScreen />;
  if (!accessToken) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/admin" replace />;
  return children;
}


