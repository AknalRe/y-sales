import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { BarChart3, Download, RefreshCw, TrendingUp, ShoppingCart, MapPin, Users, AlertTriangle, Activity } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { getSalesTransactions, getTenantUsers, getReportSummary, type SalesTransaction, type TenantUser, type ReportSummary } from '@/lib/api/tenant';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

const statusLabel: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', pending_approval: 'Pending',
  approved: 'Approved', validated: 'Validated', rejected: 'Rejected',
  cancelled: 'Cancelled', closed: 'Closed',
};

function getStatusStyle(status: string) {
  switch (status) {
    case 'closed':
      return 'bg-admin-success-soft text-admin-success border border-admin-border';
    case 'approved':
      return 'bg-admin-accent-shadow text-admin-accent border border-admin-border';
    case 'validated':
      return 'bg-admin-success-soft text-admin-success border border-admin-border';
    case 'submitted':
      return 'bg-admin-accent-shadow text-admin-accent-light border border-admin-border';
    case 'pending_approval':
      return 'bg-admin-accent-shadow text-admin-accent border border-admin-border-strong';
    case 'rejected':
      return 'bg-admin-danger-soft text-admin-danger border border-admin-border';
    case 'cancelled':
      return 'bg-admin-bg text-admin-muted-dim border border-admin-border';
    case 'draft':
      return 'bg-admin-bg text-admin-muted border border-admin-border';
    default:
      return 'bg-admin-bg text-admin-muted border border-admin-border';
  }
}

function formatRp(value: string | number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function thisMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

const excelHeaderStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: 'C75A18' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: 'E5E7EB' } },
    bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
    left: { style: 'thin', color: { rgb: 'E5E7EB' } },
    right: { style: 'thin', color: { rgb: 'E5E7EB' } },
  },
};

const excelBodyStyle = {
  alignment: { vertical: 'top', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: 'E5E7EB' } },
    bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
    left: { style: 'thin', color: { rgb: 'E5E7EB' } },
    right: { style: 'thin', color: { rgb: 'E5E7EB' } },
  },
};

const excelTitleStyle = {
  font: { bold: true, sz: 16, color: { rgb: '0F172A' } },
  alignment: { vertical: 'center' },
};

function styleWorksheet(sheet: XLSX.WorkSheet, headerRowIndex = 0) {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (!cell) continue;
      cell.s = row === headerRowIndex ? excelHeaderStyle : excelBodyStyle;
    }
  }
  sheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: range.s.c },
      e: { r: range.e.r, c: range.e.c },
    }),
  };
}

export function ReportsPage() {
  const { accessToken } = useAuth();
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const range = thisMonthRange();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [statusFilter, setStatusFilter] = useState('');
  const [salesFilter, setSalesFilter] = useState('');
  const [kpiTab, setKpiTab] = useState<'penjualan' | 'kunjungan'>('penjualan');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [txRes, userRes, summaryRes] = await Promise.all([
        getSalesTransactions(accessToken, { status: statusFilter || undefined, from, to, salesUserId: salesFilter || undefined }),
        getTenantUsers(accessToken),
        getReportSummary(accessToken),
      ]);
      setTransactions(txRes.orders ?? []);
      setUsers(userRes.users ?? []);
      setSummary(summaryRes.summary);
      setError('');
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken, from, to, statusFilter, salesFilter]);

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

  function downloadExcel() {
    const workbook = XLSX.utils.book_new();
    workbook.Props = {
      Title: 'Laporan Penjualan',
      Subject: 'Ringkasan omset dan transaksi sales',
      Author: 'YukSales',
      CreatedDate: new Date(),
    };

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['Laporan Penjualan'],
      ['Periode', `${from} s/d ${to}`],
      ['Status Filter', statusFilter ? statusLabel[statusFilter] ?? statusFilter : 'Semua Status'],
      ['Total Revenue', stats.totalRevenue],
      ['Transaksi Closed', stats.closed],
      ['Total Transaksi', stats.total],
      ['Average Order', stats.avgOrder],
    ]);
    summarySheet.A1.s = excelTitleStyle;
    summarySheet['!cols'] = [{ wch: 24 }, { wch: 28 }];
    summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    const leaderboardSheet = XLSX.utils.aoa_to_sheet([
      ['Peringkat', 'Sales', 'Jumlah Transaksi', 'Revenue'],
      ...stats.leaderboard.map((row, index) => [
        index + 1,
        row.name,
        row.count,
        row.revenue,
      ]),
    ]);
    leaderboardSheet['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 18 }];
    styleWorksheet(leaderboardSheet);

    const transactionSheet = XLSX.utils.aoa_to_sheet([
      ['No Transaksi', 'Sales', 'Outlet ID', 'Customer Type', 'Payment Method', 'Payment Status', 'Subtotal', 'Diskon', 'Total', 'Status', 'Submitted At', 'Approved At', 'Tanggal Dibuat'],
      ...transactions.map((transaction) => [
        transaction.transactionNo,
        users.find((user) => user.id === transaction.salesUserId)?.name ?? '-',
        transaction.outletId ?? '-',
        transaction.customerType,
        transaction.paymentMethod,
        transaction.paymentStatus,
        Number(transaction.subtotalAmount || 0),
        Number(transaction.discountAmount || 0),
        Number(transaction.totalAmount || 0),
        statusLabel[transaction.status] ?? transaction.status,
        transaction.submittedAt ? new Date(transaction.submittedAt).toLocaleString('id-ID') : '-',
        transaction.approvedAt ? new Date(transaction.approvedAt).toLocaleString('id-ID') : '-',
        new Date(transaction.createdAt).toLocaleString('id-ID'),
      ]),
    ]);
    transactionSheet['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 38 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
    ];
    styleWorksheet(transactionSheet);

    for (const sheet of [summarySheet, leaderboardSheet, transactionSheet]) {
      const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
      for (let row = range.s.r; row <= range.e.r; row += 1) {
        for (let col = range.s.c; col <= range.e.c; col += 1) {
          const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
          if (cell && typeof cell.v === 'number') cell.z = '#,##0';
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
    XLSX.utils.book_append_sheet(workbook, leaderboardSheet, 'Leaderboard');
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transaksi');
    XLSX.writeFile(workbook, `laporan-penjualan-${from}-${to}.xlsx`, { compression: true });
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><BarChart3 size={22} /> Laporan Penjualan</h1>
          <p className="admin-page-subtitle">Ringkasan omset, kunjungan, dan performa sales.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadExcel} className="admin-btn-ghost" type="button" disabled={!transactions.length}><Download size={15} /> Excel</button>
          <button onClick={load} className="admin-btn-ghost" type="button"><RefreshCw size={15} className={loading ? 'spin' : ''} /></button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* ─── KPI Tabs ───────────────────────────────────── */}
      <div className="admin-tab-group mb-4 w-fit">
        <button type="button" onClick={() => setKpiTab('penjualan')} className={`admin-tab flex-1 ${kpiTab === 'penjualan' ? 'active' : ''}`}>Penjualan</button>
        <button type="button" onClick={() => setKpiTab('kunjungan')} className={`admin-tab flex-1 ${kpiTab === 'kunjungan' ? 'active' : ''}`}>Kunjungan</button>
      </div>

      {kpiTab === 'penjualan' && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 mb-5">
          <div className="admin-stat-card">
            <div className="admin-stat-icon bg-admin-success-soft text-admin-success"><TrendingUp size={18} /></div>
            <div>
              <span className="text-xs text-admin-muted font-semibold">Total Omset</span>
              {loading ? <div className="bg-admin-bg rounded mt-1" style={{ height: 22, width: 100 }} /> : <strong className="text-lg">{formatRp(stats.totalRevenue)}</strong>}
              <p className="text-[11px] text-admin-muted-dim mt-0.5">Bulan ini</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon bg-admin-accent-shadow text-admin-accent"><ShoppingCart size={18} /></div>
            <div>
              <span className="text-xs text-admin-muted font-semibold">Pesanan Selesai</span>
              {loading ? <div className="bg-admin-bg rounded mt-1" style={{ height: 22, width: 30 }} /> : <strong className="text-lg">{stats.closed}</strong>}
              <p className="text-[11px] text-admin-muted-dim mt-0.5">dari {stats.total} transaksi</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon bg-admin-accent-shadow text-admin-accent-light"><Users size={18} /></div>
            <div>
              <span className="text-xs text-admin-muted font-semibold">Rata-rata per Pesanan</span>
              {loading ? <div className="bg-admin-bg rounded mt-1" style={{ height: 22, width: 100 }} /> : <strong className="text-lg">{formatRp(stats.avgOrder)}</strong>}
              <p className="text-[11px] text-admin-muted-dim mt-0.5">Bulan ini</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon bg-admin-accent-shadow text-admin-focus-ring"><BarChart3 size={18} /></div>
            <div>
              <span className="text-xs text-admin-muted font-semibold">Total Transaksi</span>
              {loading ? <div className="bg-admin-bg rounded mt-1" style={{ height: 22, width: 30 }} /> : <strong className="text-lg">{stats.total}</strong>}
              <p className="text-[11px] text-admin-muted-dim mt-0.5">Semua status</p>
            </div>
          </div>
        </div>
      )}

      {kpiTab === 'kunjungan' && (
        <div className="grid gap-2 sm:grid-cols-2 mb-5">
          <div className="admin-stat-card">
            <div className="admin-stat-icon bg-admin-accent-shadow text-admin-accent"><MapPin size={18} /></div>
            <div>
              <span className="text-xs text-admin-muted font-semibold">Total Kunjungan</span>
              {loading || !summary ? <div className="bg-admin-bg rounded mt-1" style={{ height: 22, width: 30 }} /> : <strong className="text-lg">{summary.totalVisits}</strong>}
              <p className="text-[11px] text-admin-muted-dim mt-0.5">Keseluruhan</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon bg-admin-success-soft text-admin-success"><Activity size={18} /></div>
            <div>
              <span className="text-xs text-admin-muted font-semibold">Kunjungan Hari Ini</span>
              {loading || !summary ? <div className="bg-admin-bg rounded mt-1" style={{ height: 22, width: 30 }} /> : <strong className="text-lg">{summary.todayVisits}</strong>}
              <p className="text-[11px] text-admin-muted-dim mt-0.5">Hari ini</p>
            </div>
          </div>
        </div>
      )}

      {kpiTab === 'penjualan' && (
        <>
          {/* ─── Filters ────────────────────────────────────── */}
          <div className="admin-filter-row !flex-nowrap !justify-between">
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="admin-input" />
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="admin-input" />
            </div>
            <div className="flex items-center gap-2">
              <select value={salesFilter} onChange={e => setSalesFilter(e.target.value)} className="admin-select">
                <option value="">Semua Sales</option>
                {users.filter(u => u.status === 'active').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="admin-select">
                <option value="">Semua Status</option>
                {Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <span className="admin-count-badge">{transactions.length} transaksi</span>
            </div>
          </div>

          <div className="admin-content-grid-half">
            {/* ─── Leaderboard ────────────────────────────────── */}
            <div className="admin-card">
              <div className="admin-card-header"><h2>Leaderboard Sales</h2></div>
              <div className="admin-table-wrap">
                <Table className="admin-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Transaksi</TableHead>
                      <TableHead>Omset</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.leaderboard.map((s, i) => (
                      <TableRow key={s.name}>
                        <TableCell>
                          <strong className={i === 0 ? 'text-admin-accent' : i === 1 ? 'text-admin-muted' : i === 2 ? 'text-admin-accent-light' : 'text-admin-foreground'}>
                            {i + 1}
                          </strong>
                        </TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.count}</TableCell>
                        <TableCell><strong>{formatRp(s.revenue)}</strong></TableCell>
                      </TableRow>
                    ))}
                    {!stats.leaderboard.length && (
                      <TableRow>
                        <TableCell colSpan={4} className="admin-empty">Belum ada data.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* ─── Transaction List ───────────────────────────── */}
            <div className="admin-card">
              <div className="admin-card-header"><h2>Daftar Transaksi ({transactions.length})</h2></div>
              {loading ? <div className="admin-loading">Memuat...</div> : (
                <div className="admin-table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
                  <Table className="admin-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>Outlet</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map(t => {
                        return (
                          <TableRow key={t.id}>
                            <TableCell><strong style={{ fontSize: '.75rem' }}>{t.transactionNo}</strong></TableCell>
                            <TableCell>{users.find(u => u.id === t.salesUserId)?.name ?? '—'}</TableCell>
                            <TableCell>{t.outletName ?? '—'}</TableCell>
                            <TableCell>{formatRp(t.totalAmount)}</TableCell>
                            <TableCell>
                              <span className={`admin-badge font-extrabold px-2 py-1 rounded-full ${getStatusStyle(t.status)}`}>
                                {statusLabel[t.status] ?? t.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!transactions.length && (
                        <TableRow>
                          <TableCell colSpan={5} className="admin-empty">Tidak ada transaksi.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
