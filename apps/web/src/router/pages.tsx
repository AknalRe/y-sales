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
} from 'lucide-react';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { AttendancePage } from '@/features/attendance/attendance-page';
import { AttendanceReviewPage } from '@/features/attendance/attendance-review-page';
import { SalesHomePage } from '@/features/sales/sales-home-page';
import { TrackingPage } from '@/features/sales/tracking-page';
import { ReportsPage } from '@/features/sales/reports-page';
import { InvoiceReviewPage } from '@/features/sales/invoice-review-page';
import { StockPage } from '@/features/sales/stock-page';
import { ReceivablesPage } from '@/features/sales/receivables-page';
import { SubscriptionPage } from '@/features/sales/subscription-page';
import { SalesProfilePage } from '@/features/sales/sales-profile-page';
import { VisitPage } from '@/features/sales/visit-page';
import { TransactionsPage } from '@/features/sales/transactions-page';
import { InvoicesPage } from '@/features/sales/invoices-page';
import { UsersPage } from '@/features/users/users-page';
import { RolesPage } from '@/features/users/roles-page';
import { type RouteConfig } from './types';

// --- ADMIN ROUTES ---
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
    path: 'tracking',
    element: <TrackingPage />,
    handle: {
      label: 'Tracking Penjualan',
      icon: Map,
      permission: 'visits.review',
      section: 'Command Center',
      badge: 'GPS'
    }
  },
  {
    path: 'reports',
    element: <ReportsPage />,
    handle: {
      label: 'Laporan Penjualan',
      icon: BarChart3,
      permission: 'reports.view',
      section: 'Sales Ops',
      badge: 'KPI'
    }
  },
  {
    path: 'stock',
    element: <StockPage />,
    handle: {
      label: 'Manajemen Stok',
      icon: Boxes,
      permission: 'products.manage',
      section: 'Inventory & POS',
      badge: 'Stock'
    }
  },
  {
    path: 'receivables',
    element: <ReceivablesPage />,
    handle: {
      label: 'Piutang Usaha',
      icon: CreditCard,
      permission: 'receivables.view',
      section: 'Inventory & POS',
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
      section: 'Sales Ops',
      badge: 'Review'
    }
  },
  {
    path: '/attendance/review', // This will be handled as absolute by AdminShell
    element: <AttendanceReviewPage />,
    handle: {
      label: 'Review Absensi',
      icon: ShieldCheck,
      permission: 'attendance.review',
      section: 'Compliance',
      badge: 'HR'
    }
  },
  {
    path: 'users',
    element: <UsersPage />,
    handle: {
      label: 'Manajemen User',
      icon: Users,
      permission: 'users.manage',
      section: 'Pengaturan',
    }
  },
  {
    path: 'roles',
    element: <RolesPage />,
    handle: {
      label: 'Manajemen Role',
      icon: Shield,
      permission: 'roles.manage',
      section: 'Pengaturan',
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
  }
];

// --- STANDALONE ROUTES ---
export const standaloneRoutes: RouteConfig[] = [
  {
    path: '/attendance',
    element: <AttendancePage />,
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
      label: 'Foto Nota',
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
