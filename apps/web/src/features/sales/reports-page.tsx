import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, RefreshCw, TrendingUp, ShoppingCart, MapPin, Users } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { getSalesTransactions, getTenantUsers, type SalesTransaction, type TenantUser } from '@/lib/api/tenant';

const statusLabel: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', pending_approval: 'Pending',
  approved: 'Approved', validated: 'Validated', rejected: 'Rejected',
  cancelled: 'Cancelled', closed: 'Closed',
};
const statusColor: Record<string, string> = {
  closed: '#34d399', approved: '#60a5fa', validated: '#a3e635',
  submitted: '#fbbf24', pending_approval: '#f97316',
  rejected: '#f87171', cancelled: '#6b7280', draft: '#94a3b8',
};

function formatRp(value: string | number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function thisMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export function ReportsPage() {
  const { accessToken } = useAuth();
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const range = thisMonthRange();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [txRes, userRes] = await Promise.all([
        getSalesTransactions(accessToken, { status: statusFilter || undefined, from, to }),
        getTenantUsers(accessToken),
      ]);
      setTransactions(txRes.transactions ?? []);
      setUsers(userRes.users ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken, from, to, statusFilter]);

  const stats = useMemo(() => {
    const closed = transactions.filter(t => ['closed', 'approved', 'validated'].includes(t.status));
    const totalRevenue = closed.reduce((s, t) => s + Number(t.totalAmount || 0), 0);
    const avgOrder = closed.length ? totalRevenue / closed.length : 0;

    // by sales user
    const byUser: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const t of closed) {
      const user = users.find(u => u.id === t.salesUserId);
      if (!byUser[t.salesUserId]) byUser[t.salesUserId] = { name: user?.name ?? 'Unknown', count: 0, revenue: 0 };
      byUser[t.salesUserId].count++;
      byUser[t.salesUserId].revenue += Number(t.totalAmount || 0);
    }
    const leaderboard = Object.values(byUser).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return { totalRevenue, avgOrder, closed: closed.length, total: transactions.length, leaderboard };
  }, [transactions, users]);

  function downloadCSV() {
    const header = 'No Transaksi,Sales,Outlet,Total,Status,Tanggal\n';
    const rows = transactions.map(t =>
      `${t.transactionNo},${users.find(u => u.id === t.salesUserId)?.name ?? ''},${t.outletId ?? ''},${t.totalAmount},${t.status},${t.createdAt.slice(0, 10)}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `laporan_${from}_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><BarChart3 size={22} /> Laporan Penjualan</h1>
          <p className="admin-page-subtitle">Ringkasan omset, produk terjual, visit, dan performa sales.</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={downloadCSV} className="admin-btn admin-btn-ghost" type="button"><Download size={15} /> CSV</button>
          <button onClick={load} className="admin-btn-ghost" type="button"><RefreshCw size={15} /></button>

        </div>
      </div>

      {/* KPI Stats */}
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#10b981' }}><TrendingUp size={18} /></div>
          <div>
            <span>Total Revenue</span>
            {loading ? <div style={{ background: '#f1f5f9', height: 22, width: 100, borderRadius: 4, marginTop: '.25rem' }} /> : <strong>{formatRp(stats.totalRevenue)}</strong>}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#3b82f6' }}><ShoppingCart size={18} /></div>
          <div>
            <span>Transaksi Closed</span>
            {loading ? <div style={{ background: '#f1f5f9', height: 22, width: 30, borderRadius: 4, marginTop: '.25rem' }} /> : <strong>{stats.closed}</strong>}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#f59e0b' }}><MapPin size={18} /></div>
          <div>
            <span>Total Transaksi</span>
            {loading ? <div style={{ background: '#f1f5f9', height: 22, width: 30, borderRadius: 4, marginTop: '.25rem' }} /> : <strong>{stats.total}</strong>}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#8b5cf6' }}><Users size={18} /></div>
          <div>
            <span>Avg Order</span>
            {loading ? <div style={{ background: '#f1f5f9', height: 22, width: 100, borderRadius: 4, marginTop: '.25rem' }} /> : <strong>{formatRp(stats.avgOrder)}</strong>}
          </div>
        </div>
      </div>



      {/* Filters */}
      <div className="admin-filter-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ color: 'var(--admin-subtle)', fontSize: '.8rem' }}>Periode:</label>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="admin-input" style={{ width: 'auto' }} />
        <span style={{ color: 'var(--admin-subtle)' }}>—</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="admin-input" style={{ width: 'auto' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="admin-select" style={{ width: 'auto' }}>
          <option value="">Semua Status</option>
          {Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="admin-content-grid-half">
        {/* Leaderboard */}
        <div className="admin-card">
          <div className="admin-card-header"><h2>🏆 Leaderboard Sales</h2></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>#</th><th>Sales</th><th>Transaksi</th><th>Revenue</th></tr></thead>
              <tbody>
                {stats.leaderboard.map((s, i) => (
                  <tr key={s.name}>
                    <td><strong style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : undefined }}>{i + 1}</strong></td>
                    <td>{s.name}</td>
                    <td>{s.count}</td>
                    <td><strong>{formatRp(s.revenue)}</strong></td>
                  </tr>
                ))}
                {!stats.leaderboard.length && <tr><td colSpan={4} className="admin-empty">Belum ada data.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction List */}
        <div className="admin-card">
          <div className="admin-card-header"><h2>Transaksi ({transactions.length})</h2></div>
          {loading ? <div className="admin-loading">Memuat...</div> : (
            <div className="admin-table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table className="admin-table">
                <thead><tr><th>No</th><th>Sales</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id}>
                      <td><strong style={{ fontSize: '.75rem' }}>{t.transactionNo}</strong></td>
                      <td>{users.find(u => u.id === t.salesUserId)?.name ?? '—'}</td>
                      <td>{formatRp(t.totalAmount)}</td>
                      <td>
                        <span className="admin-badge" style={{ background: `${statusColor[t.status] ?? '#6b7280'}20`, color: statusColor[t.status] ?? '#6b7280', border: `1px solid ${statusColor[t.status] ?? '#6b7280'}40` }}>
                          {statusLabel[t.status] ?? t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!transactions.length && <tr><td colSpan={4} className="admin-empty">Tidak ada transaksi.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
