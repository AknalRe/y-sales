import { useEffect, useState } from 'react';
import { ReceiptText, CheckCircle2, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { getSalesTransactions, approveSalesTransaction, rejectSalesTransaction, getTenantUsers, type SalesTransaction, type TenantUser } from '@/lib/api/tenant';

function formatRp(v: string | number) {
  return `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
}

const statusColor: Record<string, string> = {
  submitted: '#fbbf24', pending_approval: '#f97316',
  approved: '#60a5fa', validated: '#a3e635',
  rejected: '#f87171', cancelled: '#6b7280', closed: '#34d399', draft: '#94a3b8',
};

export function InvoiceReviewPage() {
  const { accessToken } = useAuth();
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [saving, setSaving] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<SalesTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [txRes, userRes] = await Promise.all([
        getSalesTransactions(accessToken, { status: statusFilter || undefined }),
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

  useEffect(() => { load(); }, [accessToken, statusFilter]);

  async function handleApprove(tx: SalesTransaction) {
    if (!accessToken) return;
    setSaving(tx.id);
    setError('');
    try {
      await approveSalesTransaction(accessToken, tx.id);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal approve.');
    } finally {
      setSaving(null);
    }
  }

  async function handleReject() {
    if (!accessToken || !rejectModal) return;
    setSaving(rejectModal.id);
    setError('');
    try {
      await rejectSalesTransaction(accessToken, rejectModal.id, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal reject.');
    } finally {
      setSaving(null);
    }
  }

  function getUser(id: string) {
    return users.find(u => u.id === id)?.name ?? '—';
  }

  const pending = transactions.filter(t => ['submitted', 'pending_approval'].includes(t.status)).length;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><ReceiptText size={22} /> Verifikasi Nota</h1>
          <p className="admin-page-subtitle">Review nota/foto invoice dan closing transaksi sales.</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          {pending > 0 && (
            <span style={{ background: '#f97316', color: '#fff', borderRadius: 999, padding: '.2rem .7rem', fontSize: '.78rem', fontWeight: 700 }}>
              {pending} Menunggu
            </span>
          )}
          <button onClick={load} className="admin-btn-ghost" type="button"><RefreshCw size={15} /></button>

        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error"><AlertCircle size={15} /> {error}</div>}

      <div className="admin-filter-row">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="admin-select">
          <option value="">Semua Status</option>
          <option value="submitted">Submitted</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="validated">Validated</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">
            <RefreshCw size={18} className="spin" />
            <span>Memuat data transaksi...</span>
          </div>
        ) : (

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>No Transaksi</th>
                  <th>Sales</th>
                  <th>Tipe</th>
                  <th>Pembayaran</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td><strong style={{ fontSize: '.8rem' }}>{tx.transactionNo}</strong></td>
                    <td>{getUser(tx.salesUserId)}</td>
                    <td>{tx.customerType}</td>
                    <td>{tx.paymentMethod}</td>
                    <td><strong>{formatRp(tx.totalAmount)}</strong></td>
                    <td>
                      <span className="admin-badge" style={{ background: `${statusColor[tx.status] ?? '#6b7280'}20`, color: statusColor[tx.status] ?? '#6b7280', border: `1px solid ${statusColor[tx.status] ?? '#6b7280'}40` }}>
                        {tx.status}
                      </span>
                    </td>
                    <td>{tx.createdAt.slice(0, 10)}</td>
                    <td>
                      {['submitted', 'pending_approval'].includes(tx.status) ? (
                        <div style={{ display: 'flex', gap: '.4rem' }}>
                          <button
                            onClick={() => handleApprove(tx)}
                            disabled={saving === tx.id}
                            className="admin-btn-sm admin-btn-success"
                            type="button"
                          >
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button
                            onClick={() => { setRejectModal(tx); setRejectReason(''); }}
                            disabled={saving === tx.id}
                            className="admin-btn-sm admin-btn-danger"
                            type="button"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--admin-subtle)', fontSize: '.78rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!transactions.length && (
                  <tr><td colSpan={8} className="admin-empty">Tidak ada transaksi dengan status ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="admin-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Reject Transaksi</h2>
              <button onClick={() => setRejectModal(null)} className="admin-modal-close">×</button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: '#64748b', marginBottom: '.75rem' }}>
                Transaksi <strong style={{ color: '#0f172a' }}>{rejectModal.transactionNo}</strong> akan ditolak.
              </p>

              <label style={{ color: '#475569', fontSize: '.82rem', display: 'block', marginBottom: '.35rem', fontWeight: 700 }}>Alasan Penolakan</label>

              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="admin-input"
                rows={3}
                placeholder="Tuliskan alasan penolakan..."
              />
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setRejectModal(null)} className="admin-btn admin-btn-ghost" type="button">Batal</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || saving === rejectModal.id}
                className="admin-btn admin-btn-danger"
                type="button"
              >
                {saving === rejectModal.id ? 'Menyimpan...' : 'Konfirmasi Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
