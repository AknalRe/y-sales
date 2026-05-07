import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, MapPin, ShieldCheck, SlidersHorizontal, Users,
  TrendingUp, ShoppingCart, Package, Clock, RefreshCw,
  AlertCircle, ArrowUpRight, Activity
} from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
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
  { permission: 'settings.manage', title: 'Pengaturan', icon: SlidersHorizontal, text: 'Custom radius geofence dan aturan GPS.', href: '/admin/users' },
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
    <div className="admin-page" style={{ padding: '0 .5rem' }}>
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            Dashboard Utama
          </h1>
          <p className="admin-page-subtitle">
            Selamat datang kembali, <strong style={{ color: '#7c3aed' }}>{user?.name}</strong>
            {lastUpdated && <span style={{ marginLeft: '.5rem', opacity: 0.7 }}>· Update: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {permissions.includes('invoice.review') && summary && summary.pendingApprovals > 0 && (
            <Link to="/admin/invoice-review" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: '#fff7ed', border: '1px solid #ffedd5', color: '#ea580c', borderRadius: 12, padding: '.5rem .85rem', fontSize: '.82rem', fontWeight: 700, textDecoration: 'none' }}>
              <Clock size={14} /> Review Nota ({summary.pendingApprovals})
            </Link>
          )}
          <button 
            onClick={loadSummary} 
            disabled={loading}
            className="admin-btn-ghost"
            style={{ padding: '.5rem .75rem', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', borderRadius: 12, padding: '.75rem 1rem', marginBottom: '1.5rem', fontSize: '.875rem' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* KPI Cards */}
      {statCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {statCards.map(s => {
            const themeColor = 
              s.color === 'kpi-emerald' ? '#10b981' : 
              s.color === 'kpi-blue' ? '#3b82f6' : 
              s.color === 'kpi-orange' ? '#f97316' : 
              s.color === 'kpi-purple' ? '#8b5cf6' : '#94a3b8';

            return (
              <Link key={s.label} to={s.href} style={{ textDecoration: 'none' }}>
                <div 
                  className="admin-card"
                  style={{ marginBottom: 0, padding: '1.25rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div style={{ background: `${themeColor}12`, border: `1px solid ${themeColor}20`, borderRadius: 12, padding: '.5rem', display: 'flex' }}>
                      <s.icon size={20} style={{ color: themeColor }} />
                    </div>
                    <ArrowUpRight size={14} style={{ color: '#94a3b8' }} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: '.35rem' }}>{s.value}</div>
                  <div style={{ fontSize: '.85rem', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: '.25rem' }}>{s.sub}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Loading skeleton when no data yet */}
      {loading && !summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="admin-card" style={{ minHeight: 140, marginBottom: 0 }}>
              <div style={{ background: '#f1f5f9', borderRadius: 10, height: 36, width: 36, marginBottom: '1.25rem' }} />
              <div style={{ background: '#f1f5f9', borderRadius: 6, height: 32, width: '60%', marginBottom: '.5rem' }} />
              <div style={{ background: '#f8fafc', borderRadius: 4, height: 14, width: '80%' }} />
            </div>
          ))}
        </div>
      )}



      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem' }}>
        {/* Quick Access */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>Akses Cepat</h2>
            <span style={{ background: '#f5f3ff', color: '#7c3aed', borderRadius: 999, padding: '.25rem .75rem', fontSize: '.75rem', fontWeight: 800 }}>
              {user?.roleCode}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {visibleMenus.map(menu => (
              <Link key={menu.title} to={menu.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 18, padding: '1.25rem', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed40'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 15px -3px rgba(124, 58, 237, 0.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.borderColor = '#f1f5f9'; (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
                >
                  <menu.icon size={24} style={{ color: '#7c3aed', marginBottom: '.75rem' }} />
                  <h3 style={{ margin: '0 0 .4rem', fontSize: '.95rem', fontWeight: 700, color: '#1e293b' }}>{menu.title}</h3>
                  <p style={{ margin: 0, fontSize: '.8rem', color: '#64748b', lineHeight: 1.5 }}>{menu.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <Activity size={16} style={{ color: '#7c3aed' }} />
              Ringkasan Platform
            </h2>
          </div>
          <div style={{ padding: '0 0.25rem' }}>
            {summary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {[
                  { label: 'Total Omset All-Time', value: formatRp(summary.totalSalesAmount, true), color: '#10b981' },
                  { label: 'Total Order', value: String(summary.totalOrders), color: '#3b82f6' },
                  { label: 'Total Visit', value: String(summary.totalVisits), color: '#8b5cf6' },
                  { label: 'Produk Terdaftar', value: String(summary.totalProducts), color: '#f59e0b' },
                  { label: 'User Aktif', value: String(summary.activeUsers), color: '#ef4444' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.75rem 1rem', background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '.85rem', color: '#64748b', fontWeight: 500 }}>{item.label}</span>
                    <strong style={{ fontSize: '1rem', color: item.color, fontWeight: 800 }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 16, height: 48 }} />
                ))}
              </div>
            )}

            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
              <Link to="/admin/reports" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', background: '#f5f3ff', color: '#7c3aed', borderRadius: 14, padding: '.75rem', fontSize: '.875rem', fontWeight: 800, textDecoration: 'none', transition: 'all 0.2s' }}>
                <BarChart3 size={16} /> Lihat Laporan Lengkap
              </Link>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

// Icon missing in imports — add here
function BarChart3({ size, ...props }: { size?: number; style?: any }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 24} height={size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
