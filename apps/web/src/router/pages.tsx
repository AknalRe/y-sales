import { LayoutDashboard, ShieldCheck } from 'lucide-react';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { AttendancePage } from '@/features/attendance/attendance-page';
import { AttendanceReviewPage } from '@/features/attendance/attendance-review-page';
import { SalesHomePage } from '@/features/sales/sales-home-page';
import type { RouteConfig } from './types';

export const mainRoutes: RouteConfig[] = [
  {
    index: true,
    element: <DashboardPage />,
    handle: {
      label: 'Dashboard',
      icon: LayoutDashboard,
      permission: 'attendance.review',
      section: 'Command Center',
      badge: 'Live'
    }
  },
  {
    path: 'attendance-review-real', // Temporary path to distinguish from dummy
    element: <AttendanceReviewPage />,
    handle: {
      label: 'Review Absensi',
      icon: ShieldCheck,
      permission: 'attendance.review',
      section: 'Compliance',
      badge: 'HR'
    }
  }
];

export const standaloneRoutes: RouteConfig[] = [
  {
    path: '/attendance',
    element: <AttendancePage />,
    handle: {
      label: 'Absensi',
      icon: ShieldCheck,
    }
  },
  {
    path: '/attendance/review',
    element: <AttendanceReviewPage />,
    handle: {
      label: 'Review Absensi',
      icon: ShieldCheck,
      permission: 'attendance.review'
    }
  }
];

export const salesRoutes: RouteConfig[] = [
  {
    index: true,
    element: <SalesHomePage />,
    handle: {
      label: 'Home',
      icon: LayoutDashboard,
    }
  }
];
