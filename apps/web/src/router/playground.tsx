import { FlaskConical, Box, Layout, ShieldCheck, Zap } from 'lucide-react';
import { Placeholder, type RouteConfig } from './types';
import Component from "@/features/playground/ui-component";
import SamplePage from "@/features/playground/samples";
// Playground routes for testing and samples (Similar to favorite.tsx in Clarice)
export const playgroundRoutes: RouteConfig[] = [
  {
    path: 'playground/sample',
    element: <SamplePage />,
    handle: {
      label: 'Samples',
      icon: FlaskConical,
      section: 'Development',
      badge: 'Dev'
    },
    children: [
      {
        path: 'fnb',
        element: <Placeholder title="Sample FNB" description="Contoh UI untuk flow Food & Beverage." />,
        handle: {
          label: 'FNB Flow',
          icon: Zap,
        }
      },
      {
        path: 'template',
        element: <Placeholder title="Sample Template" description="Koleksi template layout siap pakai." />,
        handle: {
          label: 'Layout Templates',
          icon: Layout,
        }
      },
      {
        path: 'permission',
        element: <Placeholder title="Sample Permission" description="Demo cara kerja RBAC di level komponen." />,
        handle: {
          label: 'RBAC Demo',
          icon: ShieldCheck,
        }
      }
    ]
  },
  {
    path: 'playground/components',
    element: <Component />,
    handle: {
      label: 'UI Components',
      icon: Box,
      section: 'Development',
      badge: 'UI'
    }
  }
];
