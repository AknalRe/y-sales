import { useMemo } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-provider';
import { RequireAuth, RequireSuperAdmin } from '@/features/auth/require-auth';
import { LoginPage } from '@/features/auth/login-page';
import { AdminShell } from '@/features/admin/admin-shell';
import { SalesShell } from '@/features/sales/sales-shell';
import { PlatformShell } from '@/features/platform/platform-shell';
import { PlatformDashboardPage } from '@/features/platform/platform-dashboard-page';
import { PlatformCompaniesPage } from '@/features/platform/companies-page';
import { PlatformPlansPage } from '@/features/platform/plans-page';
import { PlatformFeaturesPage } from '@/features/platform/features-page';
import { PlatformBillingPage } from '@/features/platform/billing-page';
import { PlatformInvoicePrintPage } from '@/features/platform/invoice-print-page';
import { mainRoutes, standaloneRoutes, salesRoutes } from './pages';
import { playgroundRoutes } from './playground';
import type { RouteConfig } from './types';

export function AppRouter() {
  const { permissions, user, isSuperAdmin } = useAuth();

  const canSee = (permission?: string) => {
    if (!permission) return true;
    if (isSuperAdmin) return true;
    return permissions.includes(permission) || user?.roleCode === 'ADMINISTRATOR';
  };

  // Filter routes based on permissions
  const filteredAdminRoutes = useMemo(() => {
    const allAdmin = [...mainRoutes, ...playgroundRoutes.filter(r => !r.handle.mobile)];
    return allAdmin.filter(route => canSee(route.handle.permission));
  }, [permissions, user, isSuperAdmin]);

  const filteredSalesRoutes = useMemo(() => {
    const allSales = [...salesRoutes, ...playgroundRoutes.filter(r => r.handle.mobile)];
    return allSales;
  }, [permissions, user]);

  const filteredStandaloneRoutes = useMemo(() => {
    return standaloneRoutes.filter(route => canSee(route.handle.permission));
  }, [permissions, user, isSuperAdmin]);

  // Transform RouteConfig to React Router format
  const transform = (routes: RouteConfig[], isChild = false): RouteObject[] => {
    return routes
      .filter(r => !isChild || !r.path?.startsWith('/')) // Skip absolute paths if we are in children
      .map((r): RouteObject => {
        if (r.index) {
          return { index: true, element: r.element };
        }
        return {
          path: r.path,
          element: r.element,
          children: r.children ? transform(r.children, true) : undefined,
        };
      });
  };

  const standaloneFromAdmin = mainRoutes.filter(r => r.path?.startsWith('/') && canSee(r.handle.permission));

  return useRoutes([
    { path: '/login', element: <LoginPage /> },
    // ─── Platform (Super Admin only) ────────────────────────────────────────
    {
      path: '/platform',
      element: <RequireSuperAdmin><PlatformShell /></RequireSuperAdmin>,
      children: [
        { index: true, element: <PlatformDashboardPage /> },
        { path: 'companies', element: <PlatformCompaniesPage /> },
        { path: 'plans', element: <PlatformPlansPage /> },
        { path: 'features', element: <PlatformFeaturesPage /> },
        { path: 'billing', element: <PlatformBillingPage /> },
      ]
    },
    // ─── Invoice Print (standalone — no shell, clean for print/PDF) ─────────
    {
      path: '/platform/billing/invoices/:id',
      element: <RequireSuperAdmin><PlatformInvoicePrintPage /></RequireSuperAdmin>,
    },
    // ─── Admin (Tenant) ─────────────────────────────────────────────────────
    {
      path: '/admin',
      element: <RequireAuth><AdminShell /></RequireAuth>,
      children: transform(filteredAdminRoutes, true)
    },
    // ─── Sales (Mobile) ─────────────────────────────────────────────────────
    {
      path: '/sales',
      element: <RequireAuth><SalesShell /></RequireAuth>,
      children: transform(filteredSalesRoutes, true)
    },
    ...transform(filteredStandaloneRoutes),
    ...transform(standaloneFromAdmin),
    {
      path: '*',
      element: isSuperAdmin
        ? <Navigate to="/platform" replace />
        : <Navigate to="/admin" replace />
    }
  ]);
}

// Export for sidebar use
export { mainRoutes, playgroundRoutes, salesRoutes };
