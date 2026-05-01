import { useMemo } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-provider';
import { RequireAuth } from '@/features/auth/require-auth';
import { LoginPage } from '@/features/auth/login-page';
import { AdminShell } from '@/features/admin/admin-shell';
import { SalesShell } from '@/features/sales/sales-shell';
import { mainRoutes, standaloneRoutes, salesRoutes } from './pages';
import { playgroundRoutes } from './playground';
import type { RouteConfig } from './types';

export function AppRouter() {
  const { permissions, user } = useAuth();

  const canSee = (permission?: string) => {
    if (!permission) return true;
    return permissions.includes(permission) || user?.roleCode === 'ADMINISTRATOR';
  };

  // Filter routes based on permissions
  const filteredAdminRoutes = useMemo(() => {
    const allAdmin = [...mainRoutes, ...playgroundRoutes.filter(r => !r.handle.mobile)];
    return allAdmin.filter(route => canSee(route.handle.permission));
  }, [permissions, user]);

  const filteredSalesRoutes = useMemo(() => {
    const allSales = [...salesRoutes, ...playgroundRoutes.filter(r => r.handle.mobile)];
    // Sales routes usually don't have granular permissions in this app yet, 
    // but we can filter if needed.
    return allSales;
  }, [permissions, user]);

  const filteredStandaloneRoutes = useMemo(() => {
    return standaloneRoutes.filter(route => canSee(route.handle.permission));
  }, [permissions, user]);

  // Transform RouteConfig to React Router format
  const transform = (routes: RouteConfig[], isChild = false) => {
    return routes
      .filter(r => !isChild || !r.path?.startsWith('/')) // Skip absolute paths if we are in children
      .map(r => ({
        index: r.index,
        path: r.path,
        element: r.element,
        children: r.children ? transform(r.children, true) : undefined
      }));
  };

  const standaloneFromAdmin = mainRoutes.filter(r => r.path?.startsWith('/') && canSee(r.handle.permission));

  return useRoutes([
    { path: '/login', element: <LoginPage /> },
    {
      path: '/admin',
      element: <RequireAuth><AdminShell /></RequireAuth>,
      children: transform(filteredAdminRoutes, true)
    },
    {
      path: '/sales',
      element: <RequireAuth><SalesShell /></RequireAuth>,
      children: transform(filteredSalesRoutes, true)
    },
    ...transform(filteredStandaloneRoutes),
    ...transform(standaloneFromAdmin),
    { path: '*', element: <Navigate to="/admin" replace /> }
  ]);
}

// Export for sidebar use
export { mainRoutes, playgroundRoutes, salesRoutes };
