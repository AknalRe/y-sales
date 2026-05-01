import { FlaskConical, Box, Layout, ShieldCheck, Zap } from 'lucide-react';
import { Placeholder, type RouteConfig } from './types';

// Playground routes for testing and samples (Similar to favorite.tsx in Clarice)
export const playgroundRoutes: RouteConfig[] = [
  {
    path: 'playground/sample',
    element: <Placeholder title="Sample Master" description="Kumpulan contoh implementasi fitur-fitur kompleks." />,
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
    element: <Placeholder title="UI Showroom" description="Katalog semua komponen UI: Button, Input, Card, dll." />,
    handle: {
      label: 'UI Components',
      icon: Box,
      section: 'Development',
      badge: 'UI'
    }
  }
];
