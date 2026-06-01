import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  TrendingUp,
  Users,
  Warehouse,
} from 'lucide-react';

import { useAuth } from '../../auth/auth-provider';
import { apiRequest, getPlatformCompanyView } from '@/lib/api/client';

type DashboardActivity = {
  id: string;
  type: 'order' | 'visit';
  title: string;
  description: string;
  status: string;
  createdAt: string;
};

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
  monthSalesAmount?: string;
  monthOrders?: number;
  totalOutlets?: number;
  activeOutlets?: number;
  pendingOutletVerification?: number;
  activeSales?: number;
  todayAttendanceOpen?: number;
  todayAttendanceClosed?: number;
  pendingAttendanceReviews?: number;
  lowStockProducts?: number;
  outOfStockProducts?: number;
  totalStockQuantity?: number;
  recentActivities?: DashboardActivity[];
};

const roleMenus = [
  { permission: 'visits.review', title: 'Tracking Kunjungan', icon: MapPin, text: 'Pantau visit, lokasi check-in, dan outcome outlet.', href: '/admin/tracking' },
  { permission: 'attendance.review', title: 'Review Absensi', icon: ShieldCheck, text: 'Validasi foto wajah, GPS, dan status sesi sales.', href: '/admin/attendance/review' },
  { permission: 'invoice.review', title: 'Verifikasi Nota', icon: ShoppingCart, text: 'Approve atau reject nota transaksi outlet.', href: '/admin/invoice-review' },
  { permission: 'reports.view', title: 'Laporan Penjualan', icon: TrendingUp, text: 'KPI omset, transaksi, visit, dan export Excel.', href: '/admin/reports' },
  { permissions: ['products.manage', 'inventory.manage'], title: 'Inventory', icon: Package, text: 'Kelola produk, gudang, stok, dan mutasi.', href: '/admin/stock' },
  { permission: 'receivables.view', title: 'Piutang Usaha', icon: Clock, text: 'Pantau kredit dan jadwal penagihan outlet.', href: '/admin/receivables' },
  { permission: 'roles.manage', title: 'Role & Permission', icon: Users, text: 'Atur akses fitur dan permission role.', href: '/admin/roles' },
  { permission: 'settings.manage', title: 'Operasional', icon: SlidersHorizontal, text: 'Atur geofence, absensi, bukti foto, dan integrasi.', href: '/admin/settings' },
];

function formatRp(v: string | number, compact = false) {
  const n = Number(v || 0);
  if (compact) {
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}Jt`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  }
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function formatNumber(v?: number) {
  return Number(v ?? 0).toLocaleString('id-ID');
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function apiReq<T>(path: string, token: string): Promise<T> {
  return apiRequest<T>(path, { headers: { Authorization: `Bearer ${token}` } });
}

export function DashboardPage() {
  const { user, permissions, accessToken, isSuperAdmin } = useAuth();
  const isAdministrator = user?.roleCode === 'ADMINISTRATOR' || user?.roleCode === 'SUPER_ADMIN';
  const canSeeSummary = isSuperAdmin || permissions.includes('reports.view');
  const visibleMenus = roleMenus.filter((menu) => {
    if (isSuperAdmin || isAdministrator) return true;
    const required = (menu as any).permissions ?? [(menu as any).permission];
    return required.some((permission: string) => permissions.includes(permission));
  });

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const companyView = getPlatformCompanyView();

  async function loadSummary() {
    if (!accessToken || !canSeeSummary) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiReq<{ summary: ReportSummary }>('/reports/summary', accessToken);
      setSummary(res.summary);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, [accessToken, canSeeSummary, companyView?.companyId]);

  const kpis = useMemo(() => [
    {
      label: 'Omset Hari Ini',
      value: formatRp(summary?.todaySalesAmount ?? 0, true),
      sub: `${formatNumber(summary?.todayOrders)} transaksi hari ini`,
      icon: TrendingUp,
      tone: 'emerald',
      href: '/admin/reports',
    },
    {
      label: 'Visit Hari Ini',
      value: formatNumber(summary?.todayVisits),
      sub: `${formatNumber(summary?.totalVisits)} total visit`,
      icon: MapPin,
      tone: 'blue',
      href: '/admin/tracking',
    },
    {
      label: 'Pending Approval',
      value: formatNumber(summary?.pendingApprovals),
      sub: 'nota menunggu verifikasi',
      icon: Clock,
      tone: Number(summary?.pendingApprovals ?? 0) > 0 ? 'orange' : 'emerald',
      href: '/admin/invoice-review',
    },
    {
      label: 'Stok Rendah',
      value: formatNumber((summary?.lowStockProducts ?? 0) + (summary?.outOfStockProducts ?? 0)),
      sub: `${formatNumber(summary?.totalProducts)} produk aktif`,
      icon: Warehouse,
      tone: Number((summary?.lowStockProducts ?? 0) + (summary?.outOfStockProducts ?? 0)) > 0 ? 'orange' : 'purple',
      href: '/admin/stock',
    },
  ], [summary]);

  const operationalStats = [
    { label: 'Sales Aktif', value: formatNumber(summary?.activeSales), icon: Users },
    { label: 'Outlet Aktif', value: `${formatNumber(summary?.activeOutlets)} / ${formatNumber(summary?.totalOutlets)}`, icon: Package },
    { label: 'Absensi Open', value: formatNumber(summary?.todayAttendanceOpen), icon: Camera },
    { label: 'Absensi Perlu Review', value: formatNumber(summary?.pendingAttendanceReviews), icon: ShieldCheck },
    { label: 'Outlet Pending', value: formatNumber(summary?.pendingOutletVerification), icon: AlertCircle },
    { label: 'Order Bulan Ini', value: formatNumber(summary?.monthOrders), icon: ShoppingCart },
  ];

  return (
    <div className="admin-page dashboard-page">
      <div className="admin-page-header dashboard-page-heading">
        <div>
          <h1 className="admin-page-title">Dashboard Utama</h1>
          <p className="dashboard-welcome">
            Ringkasan performa penjualan dan aktivitas operasional hari ini.
            {lastUpdated && <span className="dashboard-update-time">Update {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div className="dashboard-header-actions">
          {summary && summary.pendingApprovals > 0 && (
            <Link to="/admin/invoice-review" className="dashboard-review-badge">
              <Clock size={14} /> Review Nota ({summary.pendingApprovals})
            </Link>
          )}
          <button onClick={loadSummary} disabled={loading || !canSeeSummary} className="admin-btn-ghost" type="button">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {!canSeeSummary && (
        <div className="dashboard-error">
          <AlertCircle size={15} /> Role Anda belum memiliki akses `reports.view`, sehingga ringkasan angka dashboard tidak ditampilkan.
        </div>
      )}

      <section className="dashboard-kpi-grid">
        {kpis.map((item) => (
          <Link key={item.label} to={item.href} className="dashboard-kpi-link">
            <div className={`admin-card dashboard-kpi-card kpi-${item.tone}`}>
              <div className="dashboard-kpi-top">
                <div className="dashboard-kpi-icon-box">
                  <item.icon size={20} />
                </div>
                <ArrowUpRight size={14} className="dashboard-kpi-arrow" />
              </div>
              <div className="dashboard-kpi-value">{loading && !summary ? '-' : item.value}</div>
              <div className="dashboard-kpi-label">{item.label}</div>
              <div className="dashboard-kpi-sub">{item.sub}</div>
            </div>
          </Link>
        ))}
      </section>

      <section className="dashboard-main-grid">
        <article className="admin-card dashboard-revenue-card">
          <div className="admin-card-header">
            <div>
              <h2>Penjualan</h2>
              <p className="dashboard-card-subtitle">Performa transaksi company aktif</p>
            </div>
            <BarChart3 size={18} />
          </div>
          <div className="dashboard-revenue-value">{formatRp(summary?.monthSalesAmount ?? 0, true)}</div>
          <p className="dashboard-revenue-caption">Omset bulan ini dari {formatNumber(summary?.monthOrders)} order.</p>
          <div className="dashboard-progress-list">
            <ProgressLine label="Hari ini" value={Number(summary?.todayOrders ?? 0)} max={Math.max(Number(summary?.monthOrders ?? 0), 1)} />
            <ProgressLine label="Total order" value={Number(summary?.totalOrders ?? 0)} max={Math.max(Number(summary?.totalOrders ?? 0), 1)} />
            <ProgressLine label="Visit" value={Number(summary?.totalVisits ?? 0)} max={Math.max(Number(summary?.totalVisits ?? 0), 1)} />
          </div>
        </article>

        <article className="admin-card dashboard-ops-card">
          <div className="admin-card-header">
            <div>
              <h2>Operasional</h2>
              <p className="dashboard-card-subtitle">Kondisi sales, outlet, absensi, dan stok</p>
            </div>
            <Activity size={18} />
          </div>
          <div className="dashboard-ops-grid">
            {operationalStats.map((item) => (
              <div key={item.label} className="dashboard-ops-item">
                <item.icon size={16} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card dashboard-activity-card">
          <div className="admin-card-header">
            <div>
              <h2>Aktivitas Terbaru</h2>
              <p className="dashboard-card-subtitle">Order dan visit terakhir</p>
            </div>
            <Link to="/admin/tracking" className="dashboard-mini-link">Lihat semua</Link>
          </div>
          <div className="dashboard-activity-list">
            {(summary?.recentActivities ?? []).map((activity, index) => (
              <div key={`${activity.type}-${activity.id}`} className="dashboard-activity-item">
                {index < (summary?.recentActivities?.length ?? 0) - 1 && <span className="dashboard-activity-line" />}
                <div className={`dashboard-activity-icon ${activity.type}`}>
                  {activity.type === 'order' ? <ShoppingCart size={15} /> : <MapPin size={15} />}
                </div>
                <div className="min-w-0">
                  <p>{activity.title}</p>
                  <span>{activity.description}</span>
                  <small>{formatTime(activity.createdAt)}</small>
                </div>
              </div>
            ))}
            {!summary?.recentActivities?.length && (
              <div className="dashboard-empty-activity">
                <CheckCircle2 size={30} />
                <strong>Belum ada aktivitas terbaru</strong>
                <span>Order atau visit akan muncul di sini.</span>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="admin-card dashboard-shortcut-card">
        <div className="admin-card-header">
          <div>
            <h2>Akses Cepat</h2>
            <p className="dashboard-card-subtitle">Menu yang sesuai dengan role {user?.roleCode}</p>
          </div>
          <span className="dashboard-role-badge">{user?.roleCode}</span>
        </div>
        <div className="dashboard-quick-access-grid compact">
          {visibleMenus.map((menu) => (
            <Link key={menu.title} to={menu.href} className="dashboard-quick-access-card">
              <menu.icon size={20} />
              <h3>{menu.title}</h3>
              <p>{menu.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProgressLine({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(5, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="dashboard-progress-line">
      <div>
        <span>{label}</span>
        <strong>{formatNumber(value)}</strong>
      </div>
      <div className="dashboard-progress-track">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
