import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, MapPin, ShieldCheck, SlidersHorizontal, Users,
  TrendingUp, ShoppingCart, Package, Clock, RefreshCw,
  AlertCircle, ArrowUpRight, Activity, BarChart3
} from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { getPlatformCompanyView, apiRequest } from '@/lib/api/client';

type ReportSummary = {
  totalSalesAmount: string;
  totalOrders: number;
  totalVisits: number;
  totalProducts: number;
  pendingApprovals: number;
  activeUsers: number;
  todaySalesAmount: string;
  todayOrders: number;
  todayVisits: number;
};

const roleMenus = [
  { permission: 'attendance.execute', title: 'Absensi Wajah', icon: Camera, text: 'Check-in kamera depan dan validasi GPS.', href: '/attendance' },
  { permission: 'visits.execute', title: 'Visit Outlet', icon: MapPin, text: 'Geofence outlet dan durasi kunjungan.', href: '/sales/visit' },
  { permission: 'attendance.review', title: 'Review Absensi', icon: ShieldCheck, text: 'Validasi foto wajah dan lokasi sales.', href: '/attendance/review' },
  { permission: 'invoice.review', title: 'Verifikasi Nota', icon: ShoppingCart, text: 'Approve / reject nota transaksi sales.', href: '/admin/invoice-review' },
  { permission: 'reports.view', title: 'Laporan Penjualan', icon: TrendingUp, text: 'KPI omset, leaderboard, dan export CSV.', href: '/admin/reports' },
  { permission: 'products.manage', title: 'Manajemen Stok', icon: Package, text: 'Monitor stok dan riwayat mutasi gudang.', href: '/admin/stock' },
  { permission: 'receivables.view', title: 'Piutang Usaha', icon: Clock, text: 'Pantau kredit dan jadwal penagihan.', href: '/admin/receivables' },
  { permission: 'roles.manage', title: 'Role & Permission', icon: Users, text: 'Atur akses fitur per role secara fleksibel.', href: '/admin/roles' },
  { permission: 'settings.manage', title: 'Pengaturan', icon: SlidersHorizontal, text: 'Custom radius geofence dan aturan GPS.', href: '/admin/settings' },
];

function formatRp(v: string | number, compact = false) {
  const n = Number(v || 0);
  if (compact) {
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}Jt`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
    return `Rp ${n.toLocaleString('id-ID')}`;
  }
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function apiReq<T>(path: string, token: string): Promise<T> {
  return apiRequest<T>(path, { headers: { Authorization: `Bearer ${token}` } });
}

export function DashboardPage() {
  const { user, permissions, accessToken, isSuperAdmin } = useAuth();
  const isAdministrator = user?.roleCode === 'ADMINISTRATOR' || user?.roleCode === 'SUPER_ADMIN';
  const visibleMenus = roleMenus.filter(m => isSuperAdmin || isAdministrator || permissions.includes(m.permission));

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadSummary() {
    if (!accessToken) return;
    if (!isSuperAdmin && !permissions.includes('reports.view')) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiReq<{ summary: ReportSummary }>('/reports/summary', accessToken);
      setSummary(res.summary);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  const companyView = getPlatformCompanyView();

  useEffect(() => {
    loadSummary();
  }, [accessToken, isSuperAdmin, companyView?.companyId]);

  const statCards = summary ? [
    {
      label: 'Omset Hari Ini',
      value: formatRp(summary.todaySalesAmount, true),
      sub: `${summary.todayOrders} transaksi`,
      icon: TrendingUp,
      color: 'kpi-emerald',
      href: '/admin/reports',
    },
    {
      label: 'Visit Hari Ini',
      value: String(summary.todayVisits),
      sub: `${summary.totalVisits} total`,
      icon: MapPin,
      color: 'kpi-blue',
      href: '/admin/tracking',
    },
    {
      label: 'Pending Approval',
      value: String(summary?.pendingApprovals ?? 0),
      sub: 'nota menunggu review',
      icon: Clock,
      color: (summary?.pendingApprovals ?? 0) > 0 ? 'kpi-orange' : '',
      href: '/admin/invoice-review',
    },
    {
      label: 'Total Produk',
      value: String(summary?.totalProducts ?? 0),
      sub: `${summary?.activeUsers ?? 0} user aktif`,
      icon: Package,
      color: 'kpi-purple',
      href: '/admin/stock',
    },
  ] : [];

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard Utama</h1>
          <p className="dashboard-welcome">
            Selamat datang kembali, <strong>{user?.name}</strong>
            {lastUpdated && <span className="dashboard-update-time">· Update: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div className="dashboard-header-actions">
          {permissions.includes('invoice.review') && summary && summary.pendingApprovals > 0 && (
            <Link to="/admin/invoice-review" className="dashboard-review-badge">
              <Clock size={14} /> Review Nota ({summary.pendingApprovals})
            </Link>
          )}
          <button
            onClick={loadSummary}
            disabled={loading}
            className="dashboard-refresh-btn"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* KPI Cards */}
      {statCards.length > 0 && (
        <div className="dashboard-kpi-grid">
          {statCards.map(s => (
            <Link key={s.label} to={s.href} className="dashboard-kpi-link">
              <div className={`admin-card dashboard-kpi-card ${s.color}`}>
                <div className="dashboard-kpi-top">
                  <div className="dashboard-kpi-icon-box">
                    <s.icon size={20} />
                  </div>
                  <ArrowUpRight size={14} className="dashboard-kpi-arrow" />
                </div>
                <div className="dashboard-kpi-value">{s.value}</div>
                <div className="dashboard-kpi-label">{s.label}</div>
                <div className="dashboard-kpi-sub">{s.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Loading skeleton when no data yet */}
      {loading && !summary && (
        <div className="dashboard-kpi-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="admin-card dashboard-skeleton-card">
              <div className="dashboard-skeleton-icon" />
              <div className="dashboard-skeleton-title" />
              <div className="dashboard-skeleton-text" />
            </div>
          ))}
        </div>
      )}

      {/* Main Grid */}
      <div className="flex flex-col">
        {/* Quick Access */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>Akses Cepat</h2>
            <span className="dashboard-role-badge">{user?.roleCode}</span>
          </div>
          <div className="dashboard-quick-access-grid">
            {visibleMenus.map(menu => (
              <Link key={menu.title} to={menu.href} className="dashboard-quick-access-card">
                <menu.icon size={24} />
                <h3>{menu.title}</h3>
                <p>{menu.text}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>
              <Activity size={16} />
              Ringkasan Platform
            </h2>
          </div>
          <div className="dashboard-summary-body">
            {summary ? (
              <div className="dashboard-summary-list">
                {[
                  { label: 'Total Omset All-Time', value: formatRp(summary.totalSalesAmount, true), cls: 'summary-emerald' },
                  { label: 'Total Order', value: String(summary.totalOrders), cls: 'summary-blue' },
                  { label: 'Total Visit', value: String(summary.totalVisits), cls: 'summary-violet' },
                  { label: 'Produk Terdaftar', value: String(summary.totalProducts), cls: 'summary-amber' },
                  { label: 'User Aktif', value: String(summary.activeUsers), cls: 'summary-red' },
                ].map(item => (
                  <div key={item.label} className={`dashboard-summary-item ${item.cls}`}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-summary-list">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="dashboard-summary-skeleton" />
                ))}
              </div>
            )}

            <div className="dashboard-summary-footer">
              <Link to="/admin/reports" className="dashboard-report-link">
                <BarChart3 size={16} /> Lihat Laporan Lengkap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}