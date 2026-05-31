import {
  LayoutDashboard,
  ShieldCheck,
  Map,
  BarChart3,
  Boxes,
  CreditCard,
  ReceiptText,
  ShoppingCart,
  Inbox,
  UserCircle,
  Users,
  Shield,
  SlidersHorizontal,
  CalendarPlus,
  Store,
  Clock,
} from 'lucide-react';
import { DashboardPage } from '@/features/admin/dashboard/dashboard-page';
import { AttendancePage } from '@/features/standalone/attendance-page';
import { AttendanceReviewPage } from '@/features/admin/attendance/attendance-review-page';
import { SalesHomePage } from '@/features/sales/home/sales-home-page';
import { TrackingPage } from '@/features/admin/tracking/tracking-page';
import { ReportsPage } from '@/features/admin/reports/reports-page';
import { InvoiceReviewPage } from '@/features/admin/invoice-review/invoice-review-page';
import { StockPage } from '@/features/admin/stock/stock-page';
import { ReceivablesPage } from '@/features/admin/receivables/receivables-page';
import { SubscriptionPage } from '@/features/admin/subscription/subscription-page';
import { SalesProfilePage } from '@/features/sales/profile/sales-profile-page';
import { VisitPage } from '@/features/sales/visit/visit-page';
import { TransactionsPage } from '@/features/sales/transactions/transactions-page';
import { InvoicesPage } from '@/features/sales/invoices/invoices-page';
import { UsersPage } from '@/features/admin/users/users-page';
import { RolesPage } from '@/features/admin/roles/roles-page';
import { OperationalSettingsPage } from '@/features/admin/settings/operational-settings-page';
import { SalesSchedulePage } from '@/features/admin/schedule/sales-schedule-page';
import { OutletsPage } from '@/features/admin/outlets/outlets-page';
import { SalesAccountsPage } from '@/features/admin/sales-accounts/sales-accounts-page';
import { type RouteConfig } from './types';

// --- ADMIN ROUTES ---
export const mainRoutes: RouteConfig[] = [
  {
    index: true,
    element: <DashboardPage />,
    handle: {
      label: 'Dashboard',
      icon: LayoutDashboard,
      section: 'Dashboard',
      badge: 'Live'
    }
  },
  {
    path: 'tracking',
    element: <TrackingPage />,
    handle: {
      label: 'Tracking Kunjungan',
      icon: Map,
      permission: 'visits.review',
      section: 'Operasional Sales',
      badge: 'GPS'
    }
  },
  {
    path: 'receivables',
    element: <ReceivablesPage />,
    handle: {
      label: 'Piutang Usaha',
      icon: CreditCard,
      permission: 'receivables.view',
      section: 'Approval & Keuangan',
      badge: 'AR'
    }
  },
  {
    path: 'invoice-review',
    element: <InvoiceReviewPage />,
    handle: {
      label: 'Verifikasi Nota',
      icon: ReceiptText,
      permission: 'invoice.review',
      section: 'Approval & Keuangan',
      badge: 'Review'
    }
  },
  {
    path: 'outlets',
    element: <OutletsPage />,
    handle: {
      label: 'Outlet',
      icon: Store,
      permission: 'outlets.manage',
      section: 'Master Data',
      badge: 'Master'
    }
  },
  {
    path: 'sales-schedules',
    element: <SalesSchedulePage />,
    handle: {
      label: 'Jadwalkan Sales',
      icon: CalendarPlus,
      permission: 'visits.review',
      section: 'Operasional Sales',
      badge: 'Plan'
    }
  },
  {
    path: 'reports',
    element: <ReportsPage />,
    handle: {
      label: 'Laporan Penjualan',
      icon: BarChart3,
      permission: 'reports.view',
      section: 'Laporan',
      badge: 'KPI'
    }
  },
  {
    path: 'stock',
    element: <StockPage />,
    handle: {
      label: 'Inventory',
      icon: Boxes,
      permissions: ['products.manage', 'inventory.manage'],
      section: 'Inventory',
      badge: 'Stock'
    }
  },
  {
    path: 'attendance/review', // Relative to /admin
    element: <AttendanceReviewPage />,
    handle: {
      label: 'Review Absensi',
      icon: ShieldCheck,
      permission: 'attendance.review',
      section: 'Operasional Sales',
      badge: 'HR'
    }
  },
  {
    path: 'sales-accounts',
    element: <SalesAccountsPage />,
    handle: {
      label: 'Akun Sales',
      icon: Users,
      permission: 'users.manage',
      section: 'Akses',
      badge: 'Sales'
    }
  },
  {
    path: 'users',
    element: <UsersPage />,
    handle: {
      label: 'User',
      icon: Users,
      permission: 'users.manage',
      section: 'Akses',
    }
  },
  {
    path: 'roles',
    element: <RolesPage />,
    handle: {
      label: 'Role & Permission',
      icon: Shield,
      permission: 'roles.manage',
      section: 'Akses',
    }
  },
  {
    path: 'subscription',
    element: <SubscriptionPage />,
    handle: {
      label: 'Subscription',
      icon: CreditCard,
      permission: 'settings.manage',
      section: 'Pengaturan',
    }
  },
  {
    path: 'settings',
    element: <OperationalSettingsPage />,
    handle: {
      label: 'Operasional',
      icon: SlidersHorizontal,
      permission: 'settings.manage',
      section: 'Pengaturan',
    }
  }
];

// --- STANDALONE ROUTES ---
export const standaloneRoutes: RouteConfig[] = [
  {
    path: '/attendance',
    element: <AttendancePage mode="sales" />,
    handle: {
      label: 'Absensi',
      icon: ShieldCheck,
    }
  }
  // Standalone review is removed because it's now part of standalone filtering in index.tsx
];

// --- SALES ROUTES ---
export const salesRoutes: RouteConfig[] = [
  {
    index: true,
    element: <SalesHomePage />,
    handle: {
      label: 'Home',
      icon: LayoutDashboard,
    }
  },
  {
    path: 'attendance',
    element: <AttendancePage mode="sales" />,
    handle: {
      label: 'Absensi',
      icon: Clock,
      mobile: true
    }
  },
  {
    path: 'visit',
    element: <VisitPage />,
    handle: {
      label: 'Check-In Kunjungan',
      icon: Map,
      mobile: true
    }
  },
  {
    path: 'transactions',
    element: <TransactionsPage />,
    handle: {
      label: 'Buat Transaksi',
      icon: ShoppingCart,
      mobile: true
    }
  },
  {
    path: 'invoices',
    element: <InvoicesPage />,
    handle: {
      label: 'Riwayat Nota',
      icon: Inbox,
      mobile: true
    }
  },
  {
    path: 'profile',
    element: <SalesProfilePage />,
    handle: {
      label: 'Profil Sales',
      icon: UserCircle,
      mobile: true
    }
  }
];
