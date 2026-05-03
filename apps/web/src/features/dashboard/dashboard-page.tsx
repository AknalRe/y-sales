import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, MapPin, ShieldCheck, SlidersHorizontal, Users,
  TrendingUp, ShoppingCart, Package, Clock, RefreshCw,
  AlertCircle, ArrowUpRight, Activity
} from 'lucide-react';
import { useAuth } from '../auth/auth-provider';

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
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  return fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message ?? 'Error') }));
}

export function DashboardPage() {
  const { user, permissions, accessToken } = useAuth();
  const isAdministrator = user?.roleCode === 'ADMINISTRATOR';
  const visibleMenus = roleMenus.filter(m => isAdministrator || permissions.includes(m.permission));

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadSummary() {
    if (!accessToken || !permissions.includes('reports.view')) return;
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

  useEffect(() => { loadSummary(); }, [accessToken]);

  const statCards = summary ? [
    {
      label: 'Omset Hari Ini',
      value: formatRp(summary.todaySalesAmount, true),
      sub: `${summary.todayOrders} transaksi`,
      icon: TrendingUp,
      color: '#34d399',
      href: '/admin/reports',
    },
    {
      label: 'Visit Hari Ini',
      value: String(summary.todayVisits),
      sub: `${summary.totalVisits} total`,
      icon: MapPin,
      color: '#60a5fa',
      href: '/admin/tracking',
    },
    {
      label: 'Pending Approval',
      value: String(summary.pendingApprovals),
      sub: 'nota menunggu review',
      icon: Clock,
      color: summary.pendingApprovals > 0 ? '#f97316' : '#94a3b8',
      href: '/admin/invoice-review',
    },
    {
      label: 'Total Produk',
      value: String(summary.totalProducts),
      sub: `${summary.activeUsers} user aktif`,
      icon: Package,
      color: '#a78bfa',
      href: '/admin/stock',
    },
  ] : [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: '#e2e8f0', padding: '0 .5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: '#fff', letterSpacing: '-.03em' }}>
            Dashboard Utama
          </h1>
          <p style={{ margin: '.3rem 0 0', color: '#64748b', fontSize: '.875rem' }}>
            Selamat datang, <strong style={{ color: '#a78bfa' }}>{user?.name}</strong>
            {lastUpdated && <span style={{ marginLeft: '.5rem', color: '#475569' }}>· Update: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {permissions.includes('invoice.review') && summary && summary.pendingApprovals > 0 && (
            <Link to="/admin/invoice-review" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: 'rgba(249,115,22,.15)', border: '1px solid rgba(249,115,22,.3)', color: '#fb923c', borderRadius: 10, padding: '.5rem .85rem', fontSize: '.82rem', fontWeight: 700, textDecoration: 'none' }}>
              <AlertCircle size={14} /> {summary.pendingApprovals} Nota Pending
            </Link>
          )}
          <button onClick={loadSummary} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#e2e8f0', borderRadius: 10, padding: '.5rem .85rem', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : undefined }} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', color: '#fca5a5', borderRadius: 12, padding: '.75rem 1rem', marginBottom: '1rem', fontSize: '.875rem' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* KPI Cards */}
      {statCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
          {statCards.map(s => (
            <Link key={s.label} to={s.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '1.25rem', transition: 'all .2s', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor = `${s.color}40`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.08)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.85rem' }}>
                  <div style={{ background: `${s.color}18`, border: `1px solid ${s.color}30`, borderRadius: 12, padding: '.5rem', display: 'flex' }}>
                    <s.icon size={18} style={{ color: s.color }} />
                  </div>
                  <ArrowUpRight size={14} style={{ color: '#475569' }} />
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '.3rem' }}>{s.value}</div>
                <div style={{ fontSize: '.78rem', color: '#64748b', fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: '.73rem', color: '#475569', marginTop: '.2rem' }}>{s.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Loading skeleton when no data yet */}
      {loading && !summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 20, padding: '1.25rem', minHeight: 120 }}>
              <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 8, height: 36, width: 36, marginBottom: '.85rem' }} />
              <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 6, height: 28, width: '60%', marginBottom: '.4rem' }} />
              <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 6, height: 14, width: '80%' }} />
            </div>
          ))}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem' }}>
        {/* Quick Access */}
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0' }}>Akses Cepat</h2>
            <span style={{ background: 'rgba(167,139,250,.15)', color: '#a78bfa', borderRadius: 999, padding: '.2rem .65rem', fontSize: '.73rem', fontWeight: 700 }}>
              {user?.roleCode}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '.65rem' }}>
            {visibleMenus.map(menu => (
              <Link key={menu.title} to={menu.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, padding: '1rem', transition: 'all .2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(167,139,250,.25)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.07)'; (e.currentTarget as HTMLElement).style.transform = ''; }}
                >
                  <menu.icon size={22} style={{ color: '#a78bfa', marginBottom: '.65rem' }} />
                  <h3 style={{ margin: '0 0 .3rem', fontSize: '.88rem', fontWeight: 700, color: '#e2e8f0' }}>{menu.title}</h3>
                  <p style={{ margin: 0, fontSize: '.75rem', color: '#64748b', lineHeight: 1.5 }}>{menu.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.25rem' }}>
            <Activity size={16} style={{ color: '#a78bfa' }} />
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0' }}>Ringkasan Platform</h2>
          </div>

          {summary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {[
                { label: 'Total Omset All-Time', value: formatRp(summary.totalSalesAmount, true), color: '#34d399' },
                { label: 'Total Order', value: String(summary.totalOrders), color: '#60a5fa' },
                { label: 'Total Visit', value: String(summary.totalVisits), color: '#a78bfa' },
                { label: 'Produk Terdaftar', value: String(summary.totalProducts), color: '#fbbf24' },
                { label: 'User Aktif', value: String(summary.activeUsers), color: '#fb7185' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.65rem .85rem', background: 'rgba(255,255,255,.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,.06)' }}>
                  <span style={{ fontSize: '.82rem', color: '#64748b' }}>{item.label}</span>
                  <strong style={{ fontSize: '.95rem', color: item.color }}>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: 12, height: 44 }} />
              ))}
            </div>
          )}

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <Link to="/admin/reports" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', background: 'rgba(167,139,250,.12)', border: '1px solid rgba(167,139,250,.25)', color: '#a78bfa', borderRadius: 12, padding: '.65rem', fontSize: '.82rem', fontWeight: 700, textDecoration: 'none', transition: 'all .2s' }}>
              <BarChart3 size={15} /> Lihat Laporan Lengkap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon missing in imports — add here
function BarChart3({ size, ...props }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 24} height={size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
