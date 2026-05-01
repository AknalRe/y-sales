import { 
  Map, 
  BarChart3, 
  ReceiptText, 
  Boxes, 
  CreditCard, 
  ShoppingCart,
  Inbox,
  UserCircle
} from 'lucide-react';
import { Placeholder, type RouteConfig } from './types';

export const playgroundRoutes: RouteConfig[] = [
  {
    path: 'tracking',
    element: <Placeholder title="Tracking Penjualan" description="Monitoring visit outlet, lokasi sales, dan aktivitas lapangan." />,
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
    element: <Placeholder title="Laporan Penjualan" description="Ringkasan omset, produk terjual, visit, dan performa sales." />,
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
    element: <Placeholder title="Manajemen Stok" description="Input stok utama dari admin dan kontrol mutasi stok." />,
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
    element: <Placeholder title="Piutang Usaha" description="Daftar order unpaid/partial dan jadwal penagihan." />,
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
    element: <Placeholder title="Verifikasi Nota" description="Review nota/foto invoice dan closing transaksi sales." />,
    handle: {
      label: 'Verifikasi Nota',
      icon: ReceiptText,
      permission: 'invoice.review',
      section: 'Sales Ops',
      badge: 'Review'
    }
  },
  // Sales Side Dummies
  {
    path: 'visit',
    element: <Placeholder title="Check-In Kunjungan" description="Pilih outlet, validasi GPS/geofence, dan kirim visit log." mobile />,
    handle: {
      label: 'Check-In Kunjungan',
      icon: Map,
      mobile: true
    }
  },
  {
    path: 'transactions',
    element: <Placeholder title="Buat Transaksi" description="Pilih outlet, pilih produk, tambah keranjang, lalu kirim untuk verifikasi admin." mobile />,
    handle: {
      label: 'Buat Transaksi',
      icon: ShoppingCart,
      mobile: true
    }
  },
  {
    path: 'invoices',
    element: <Placeholder title="Foto Nota" description="Upload nota atau bukti transaksi untuk proses approval closing." mobile />,
    handle: {
      label: 'Foto Nota',
      icon: Inbox,
      mobile: true
    }
  },
  {
    path: 'profile',
    element: <Placeholder title="Profil Sales" description="Informasi sales, area, perangkat, dan status sinkronisasi." mobile />,
    handle: {
      label: 'Profil Sales',
      icon: UserCircle,
      mobile: true
    }
  }
];
