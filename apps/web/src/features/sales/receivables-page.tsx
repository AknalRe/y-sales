import { useEffect, useMemo, useState } from 'react';
import { CreditCard, RefreshCw, AlertCircle, CheckCircle2, Clock, TrendingDown, Banknote } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { TableSkeleton, EmptyState } from '@/components/ui';

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

const receivableStatusColor: Record<string, string> = {
  open: '#60a5fa',
  partial: '#fbbf24',
  paid: '#34d399',
  overdue: '#f87171',
  written_off: '#6b7280',
};

const consignmentStatusColor: Record<string, string> = {
  active: '#60a5fa',
  paid: '#34d399',
  overdue: '#f87171',
  withdrawal_required: '#f97316',
  withdrawn: '#6b7280',
  extended: '#a78bfa',
  reset_stock: '#94a3b8',
};

function formatRp(v: string | number) {
  return `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
}

function apiReq<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message ?? 'Error') }));
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
        <button onClick={load} className="admin-btn admin-btn-ghost" type="button"><RefreshCw size={15} /> Refresh</button>
      </div>

      {error && <div className="admin-alert admin-alert-error"><AlertCircle size={15} /> {error}</div>}

      {/* Stats */}
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#f87171' }}><TrendingDown size={18} /></div>
          <div><span>Total Piutang</span><strong>{formatRp(stats.totalOutstanding)}</strong></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#fbbf24' }}><Clock size={18} /></div>
          <div><span>Open</span><strong>{stats.open}</strong></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#f87171' }}><AlertCircle size={18} /></div>
          <div><span>Overdue</span><strong>{stats.overdue}</strong></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#f87171' }}><Banknote size={18} /></div>
          <div><span>Overdue Amount</span><strong>{formatRp(stats.totalOverdue)}</strong></div>
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

      <div className="admin-card">
        {loading ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Tipe</th><th>Pokok</th><th>Terbayar</th><th>Outstanding</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody><TableSkeleton rows={5} cols={7} /></tbody>
            </table>
          </div>
        ) : tab === 'receivables' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tipe Customer</th>
                  <th style={{ textAlign: 'right' }}>Pokok</th>
                  <th style={{ textAlign: 'right' }}>Terbayar</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th>Jatuh Tempo</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const overdue = isOverdue(r.dueDate) && ['open', 'partial'].includes(r.status);
                  return (
                    <tr key={r.id} style={{ background: overdue ? 'rgba(239,68,68,.04)' : undefined }}>
                      <td>
                        <span className="admin-badge" style={{ background: 'rgba(99,179,237,.12)', color: '#93c5fd', border: '1px solid rgba(99,179,237,.2)' }}>
                          {r.customerType}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatRp(r.principalAmount)}</td>
                      <td style={{ textAlign: 'right', color: '#34d399' }}>{formatRp(r.paidAmount)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: Number(r.outstandingAmount) > 0 ? '#f87171' : '#34d399' }}>
                          {formatRp(r.outstandingAmount)}
                        </strong>
                      </td>
                      <td>
                        <span style={{ color: overdue ? '#f87171' : '#94a3b8', fontSize: '.85rem' }}>
                          {overdue && '⚠ '}{new Date(r.dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td>
                        <span className="admin-badge" style={{
                          background: `${receivableStatusColor[r.status] ?? '#6b7280'}20`,
                          color: receivableStatusColor[r.status] ?? '#6b7280',
                          border: `1px solid ${receivableStatusColor[r.status] ?? '#6b7280'}40`,
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {['open', 'partial', 'overdue'].includes(r.status) ? (
                          <button
                            onClick={() => { setPayModal(r); setPayAmount(r.outstandingAmount); }}
                            className="admin-btn-sm admin-btn-success"
                            type="button"
                          >
                            <CheckCircle2 size={13} /> Bayar
                          </button>
                        ) : (
                          <span style={{ color: 'var(--admin-subtle)', fontSize: '.78rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <EmptyState colSpan={7} icon="💳" title="Tidak ada piutang" description="Belum ada piutang dengan filter yang dipilih." />
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Start</th>
                  <th>Jatuh Tempo</th>
                  <th>Status</th>
                  <th>Diperpanjang s/d</th>
                  <th>Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {filteredCons.map(c => (
                  <tr key={c.id}>
                    <td>{new Date(c.startDate).toLocaleDateString('id-ID')}</td>
                    <td>
                      <span style={{ color: isOverdue(c.dueDate) ? '#f87171' : '#94a3b8', fontSize: '.85rem' }}>
                        {isOverdue(c.dueDate) && '⚠ '}
                        {new Date(c.dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td>
                      <span className="admin-badge" style={{
                        background: `${consignmentStatusColor[c.status] ?? '#6b7280'}20`,
                        color: consignmentStatusColor[c.status] ?? '#6b7280',
                        border: `1px solid ${consignmentStatusColor[c.status] ?? '#6b7280'}40`,
                      }}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8' }}>
                      {c.extendedUntil ? new Date(c.extendedUntil).toLocaleDateString('id-ID') : '—'}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '.82rem' }}>{c.createdAt.slice(0, 10)}</td>
                  </tr>
                ))}
                {!filteredCons.length && (
                  <EmptyState colSpan={5} icon="📦" title="Tidak ada konsinyasi" description="Belum ada data konsinyasi dengan filter yang dipilih." />
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div className="admin-modal-overlay" onClick={() => setPayModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Rekam Pembayaran Piutang</h2>
              <button onClick={() => setPayModal(null)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <div className="receivable-pay-info">
                <div>
                  <span>Pokok</span><strong>{formatRp(payModal.principalAmount)}</strong>
                </div>
                <div>
                  <span>Terbayar</span><strong style={{ color: '#34d399' }}>{formatRp(payModal.paidAmount)}</strong>
                </div>
                <div>
                  <span>Outstanding</span><strong style={{ color: '#f87171' }}>{formatRp(payModal.outstandingAmount)}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '.65rem', marginTop: '1rem' }}>
                <div>
                  <label className="admin-field-label">Jumlah Pembayaran (Rp)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="admin-input"
                    style={{ width: '100%', marginTop: '.3rem' }}
                    min="0"
                    max={payModal.outstandingAmount}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="admin-field-label">Metode Pembayaran</label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value as 'cash' | 'qris' | 'credit')}
                    className="admin-select"
                    style={{ width: '100%', marginTop: '.3rem' }}
                  >
                    <option value="cash">Cash</option>
                    <option value="qris">QRIS</option>
                    <option value="credit">Transfer</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setPayModal(null)} className="admin-btn admin-btn-ghost" type="button">Batal</button>
              <button
                onClick={handlePay}
                disabled={!payAmount || Number(payAmount) <= 0 || saving}
                className="admin-btn admin-btn-primary"
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
