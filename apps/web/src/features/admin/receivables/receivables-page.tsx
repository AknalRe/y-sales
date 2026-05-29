import { useEffect, useMemo, useState } from 'react';
import { CreditCard, RefreshCw, AlertCircle, CheckCircle2, Clock, TrendingDown, Banknote } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { EmptyState } from '@/components/ui';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { apiRequest } from '@/lib/api/client';

type Receivable = {
  id: string;
  transactionId: string;
  outletId?: string | null;
  customerType: 'store' | 'agent' | 'end_user';
  principalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  dueDate: string;
  status: 'open' | 'partial' | 'paid' | 'overdue' | 'written_off';
  createdAt: string;
  updatedAt: string;
};

type Consignment = {
  id: string;
  transactionId: string;
  outletId: string;
  salesUserId: string;
  startDate: string;
  dueDate: string;
  status: 'active' | 'paid' | 'overdue' | 'withdrawal_required' | 'withdrawn' | 'extended' | 'reset_stock';
  extendedUntil?: string | null;
  createdAt: string;
};

function getReceivableStatusStyle(status: string) {
  switch (status) {
    case 'open':
      return 'bg-admin-accent-shadow text-admin-accent-light border border-admin-border';
    case 'partial':
      return 'bg-admin-accent-shadow text-admin-accent border border-admin-border';
    case 'paid':
      return 'bg-admin-success-soft text-admin-success border border-admin-border';
    case 'overdue':
      return 'bg-admin-danger-soft text-admin-danger border border-admin-border';
    case 'written_off':
      return 'bg-admin-bg text-admin-muted-dim border border-admin-border';
    default:
      return 'bg-admin-bg text-admin-muted border border-admin-border';
  }
}

function getConsignmentStatusStyle(status: string) {
  switch (status) {
    case 'active':
      return 'bg-admin-accent-shadow text-admin-accent-light border border-admin-border';
    case 'paid':
      return 'bg-admin-success-soft text-admin-success border border-admin-border';
    case 'overdue':
      return 'bg-admin-danger-soft text-admin-danger border border-admin-border';
    case 'withdrawal_required':
      return 'bg-admin-accent-shadow text-admin-accent border border-admin-border-strong';
    case 'withdrawn':
      return 'bg-admin-bg text-admin-muted-dim border border-admin-border';
    case 'extended':
      return 'bg-admin-accent-shadow text-admin-focus-ring border border-admin-border';
    case 'reset_stock':
      return 'bg-admin-bg text-admin-muted border border-admin-border';
    default:
      return 'bg-admin-bg text-admin-muted border border-admin-border';
  }
}

function formatRp(v: string | number) {
  return `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
}

function apiReq<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers as any ?? {})
    }
  });
}

export function ReceivablesPage() {
  const { accessToken } = useAuth();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'receivables' | 'consignments'>('receivables');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [payModal, setPayModal] = useState<Receivable | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'qris' | 'credit'>('cash');
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [recRes, conRes] = await Promise.all([
        apiReq<{ receivables: Receivable[] }>('/receivables', accessToken),
        apiReq<{ consignments: Consignment[] }>('/consignments', accessToken),
      ]);
      setReceivables(recRes.receivables ?? []);
      setConsignments(conRes.consignments ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data piutang.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  const filtered = useMemo(() => {
    if (!statusFilter) return receivables;
    return receivables.filter(r => r.status === statusFilter);
  }, [receivables, statusFilter]);

  const filteredCons = useMemo(() => {
    if (!statusFilter) return consignments;
    return consignments.filter(c => c.status === statusFilter);
  }, [consignments, statusFilter]);

  const stats = useMemo(() => {
    const open = receivables.filter(r => r.status === 'open');
    const overdue = receivables.filter(r => r.status === 'overdue');
    const totalOutstanding = receivables.reduce((s, r) => s + Number(r.outstandingAmount || 0), 0);
    const totalOverdue = overdue.reduce((s, r) => s + Number(r.outstandingAmount || 0), 0);
    return { open: open.length, overdue: overdue.length, totalOutstanding, totalOverdue };
  }, [receivables]);

  async function handlePay() {
    if (!accessToken || !payModal) return;
    setSaving(true);
    setError('');
    try {
      await apiReq(`/receivables/${payModal.id}/payments`, accessToken, {
        method: 'POST',
        body: JSON.stringify({ amount: payAmount, paymentMethod: payMethod, paidAt: new Date().toISOString() }),
      });
      setPayModal(null);
      setPayAmount('');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal merekam pembayaran.');
    } finally {
      setSaving(false);
    }
  }

  function isOverdue(dueDate: string) {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><CreditCard size={22} /> Piutang Usaha</h1>
          <p className="admin-page-subtitle">Daftar order unpaid/partial, konsinyasi, dan jadwal penagihan.</p>
        </div>
        <button onClick={load} className="admin-btn-ghost" type="button"><RefreshCw size={15} /></button>
      </div>

      {error && <div className="admin-alert admin-alert-error"><AlertCircle size={15} /> {error}</div>}

      {/* Stats */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        <div className="admin-stat-card">
          <div className="admin-stat-icon bg-admin-danger-soft text-admin-danger"><TrendingDown size={18} /></div>
          <div>
            <span>Total Piutang</span>
            {loading ? <div className="bg-admin-bg rounded mt-1" style={{ height: 22, width: 100 }} /> : <strong>{formatRp(stats.totalOutstanding)}</strong>}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon bg-admin-accent-shadow text-admin-accent"><Clock size={18} /></div>
          <div>
            <span>Open</span>
            {loading ? <div className="bg-admin-bg rounded mt-1" style={{ height: 22, width: 30 }} /> : <strong>{stats.open}</strong>}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon bg-admin-danger-soft text-admin-danger"><AlertCircle size={18} /></div>
          <div>
            <span>Overdue</span>
            {loading ? <div className="bg-admin-bg rounded mt-1" style={{ height: 22, width: 30 }} /> : <strong>{stats.overdue}</strong>}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon bg-admin-danger-soft text-admin-danger"><Banknote size={18} /></div>
          <div>
            <span>Overdue Amount</span>
            {loading ? <div className="bg-admin-bg rounded mt-1" style={{ height: 22, width: 100 }} /> : <strong>{formatRp(stats.totalOverdue)}</strong>}
          </div>
        </div>
      </div>

      {/* Tab + Filter */}
      <div className="admin-filter-row">
        <div className="admin-tab-group">
          <button onClick={() => { setTab('receivables'); setStatusFilter(''); }} className={`admin-tab ${tab === 'receivables' ? 'active' : ''}`}>Piutang (Kredit)</button>
          <button onClick={() => { setTab('consignments'); setStatusFilter(''); }} className={`admin-tab ${tab === 'consignments' ? 'active' : ''}`}>Konsinyasi</button>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="admin-select">
          <option value="">Semua Status</option>
          {tab === 'receivables' ? (
            <>
              <option value="open">Open</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
              <option value="written_off">Written Off</option>
            </>
          ) : (
            <>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
              <option value="withdrawal_required">Withdrawal Required</option>
              <option value="extended">Extended</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="paid">Paid</option>
            </>
          )}
        </select>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <RefreshCw size={32} className="spin text-admin-muted" style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p className="text-admin-muted font-semibold">Memuat data piutang...</p>
          </div>
        ) : tab === 'receivables' ? (
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe Customer</TableHead>
                  <TableHead className="text-right">Pokok</TableHead>
                  <TableHead className="text-right">Terbayar</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const overdue = isOverdue(r.dueDate) && ['open', 'partial'].includes(r.status);
                  return (
                    <TableRow key={r.id} className={overdue ? 'bg-admin-danger-bg' : undefined}>
                      <TableCell>
                        <span className="admin-badge bg-admin-accent-shadow text-admin-accent-light border border-admin-border">
                          {r.customerType}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatRp(r.principalAmount)}</TableCell>
                      <TableCell className="text-right text-admin-success">{formatRp(r.paidAmount)}</TableCell>
                      <TableCell className="text-right">
                        <strong className={Number(r.outstandingAmount) > 0 ? 'text-admin-danger' : 'text-admin-success'}>
                          {formatRp(r.outstandingAmount)}
                        </strong>
                      </TableCell>
                      <TableCell>
                        <span className={`${overdue ? 'text-admin-danger' : 'text-admin-subtle'}`} style={{ fontSize: '.85rem' }}>
                          {overdue && '⚠ '}{new Date(r.dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`admin-badge font-extrabold px-2 py-1 rounded-full ${getReceivableStatusStyle(r.status)}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {['open', 'partial', 'overdue'].includes(r.status) ? (
                          <button
                            onClick={() => { setPayModal(r); setPayAmount(r.outstandingAmount); }}
                            className="admin-btn-sm admin-btn-success"
                            type="button"
                          >
                            <CheckCircle2 size={13} /> Bayar
                          </button>
                        ) : (
                          <span className="text-admin-subtle" style={{ fontSize: '.78rem' }}>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filtered.length && (
                  <EmptyState colSpan={7} icon="💳" title="Tidak ada piutang" description="Belum ada piutang dengan filter yang dipilih." />
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Start</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Diperpanjang s/d</TableHead>
                  <TableHead>Dibuat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCons.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{new Date(c.startDate).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>
                      <span className={isOverdue(c.dueDate) ? 'text-admin-danger' : 'text-admin-subtle'} style={{ fontSize: '.85rem' }}>
                        {isOverdue(c.dueDate) && '⚠ '}
                        {new Date(c.dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`admin-badge font-extrabold px-2 py-1 rounded-full ${getConsignmentStatusStyle(c.status)}`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-admin-subtle">
                      {c.extendedUntil ? new Date(c.extendedUntil).toLocaleDateString('id-ID') : '—'}
                    </TableCell>
                    <TableCell className="text-admin-muted" style={{ fontSize: '.82rem' }}>{c.createdAt.slice(0, 10)}</TableCell>
                  </TableRow>
                ))}
                {!filteredCons.length && (
                  <EmptyState colSpan={5} icon="📦" title="Tidak ada konsinyasi" description="Belum ada data konsinyasi dengan filter yang dipilih." />
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div className="admin-modal-overlay" onClick={() => setPayModal(null)} style={{ backdropFilter: 'blur(4px)', background: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ borderRadius: 24, padding: '1.5rem' }}>
            <div className="admin-modal-header border-none p-0 mb-6">
              <h2 className="text-lg font-extrabold text-admin-foreground">Rekam Pembayaran Piutang</h2>
              <button onClick={() => setPayModal(null)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body p-0">
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-admin-bg rounded-xl p-3 text-center">
                  <span className="text-admin-subtle text-xs font-bold block mb-1">Pokok</span>
                  <strong className="text-admin-foreground text-sm">{formatRp(payModal.principalAmount)}</strong>
                </div>
                <div className="bg-admin-bg rounded-xl p-3 text-center">
                  <span className="text-admin-subtle text-xs font-bold block mb-1">Terbayar</span>
                  <strong className="text-admin-success text-sm">{formatRp(payModal.paidAmount)}</strong>
                </div>
                <div className="bg-admin-danger-bg rounded-xl p-3 text-center">
                  <span className="text-admin-subtle text-xs font-bold block mb-1">Outstanding</span>
                  <strong className="text-admin-danger text-sm">{formatRp(payModal.outstandingAmount)}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '.65rem', marginTop: '1rem' }}>
                <div>
                  <label className="text-admin-muted-dim text-sm font-extrabold block mb-1">Jumlah Pembayaran (Rp)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="admin-input"
                    style={{ width: '100%' }}
                    min="0"
                    max={payModal.outstandingAmount}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-admin-muted-dim text-sm font-extrabold block mb-1">Metode Pembayaran</label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value as 'cash' | 'qris' | 'credit')}
                    className="admin-select"
                    style={{ width: '100%' }}
                  >
                    <option value="cash">Cash</option>
                    <option value="qris">QRIS</option>
                    <option value="credit">Transfer</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer border-none pt-6" style={{ gap: '1rem' }}>
              <button onClick={() => setPayModal(null)} className="admin-btn admin-btn-ghost flex-1" style={{ borderRadius: 14 }} type="button">Batal</button>
              <button
                onClick={handlePay}
                disabled={!payAmount || Number(payAmount) <= 0 || saving}
                className="admin-btn admin-btn-primary flex-1 bg-admin-success border-admin-success"
                style={{ borderRadius: 14 }}
                type="button"
              >
                {saving ? 'Menyimpan...' : <><Banknote size={15} /> Rekam Pembayaran</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}