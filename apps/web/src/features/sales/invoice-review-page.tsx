import { useEffect, useState } from 'react';
import { ReceiptText, CheckCircle2, XCircle, RefreshCw, AlertCircle, Eye, Calendar, User, ShoppingBag, ShoppingCart } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { getSalesTransactions, approveSalesTransaction, rejectSalesTransaction, getTenantUsers, type SalesTransaction, type TenantUser } from '@/lib/api/tenant';

function formatRp(v: string | number) {
  return `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
}

const statusColor: Record<string, string> = {
  submitted: '#fbbf24',
  pending_approval: '#f97316',
  approved: '#3b82f6',
  validated: '#10b981',
  rejected: '#ef4444',
  cancelled: '#64748b',
  closed: '#059669',
  draft: '#94a3b8',
};

// Add photoUrl to the type locally since we just updated the API
type ExtendedTransaction = SalesTransaction & { photoUrl?: string };

export function InvoiceReviewPage() {
  const { accessToken } = useAuth();
  const [transactions, setTransactions] = useState<ExtendedTransaction[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [saving, setSaving] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<ExtendedTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [txRes, userRes] = await Promise.all([
        getSalesTransactions(accessToken, { status: statusFilter || undefined }),
        getTenantUsers(accessToken),
      ]);
      setTransactions(txRes.orders as ExtendedTransaction[] ?? []);
      setUsers(userRes.users ?? []);
    } catch (e) {
      console.error(e);
      setError('Gagal memuat data transaksi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken, statusFilter]);

  async function handleApprove(tx: ExtendedTransaction) {
    if (!accessToken || !confirm(`Approve transaksi ${tx.transactionNo}? Stok akan langsung dipotong.`)) return;
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
          <h1 className="admin-page-title">
            <ReceiptText size={24} style={{ color: '#b55925' }} />
            Verifikasi Nota
          </h1>
          <p className="admin-page-subtitle">Review bukti transaksi dan validasi order dari sales lapangan.</p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          {pending > 0 && (
            <div style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', borderRadius: 12, padding: '.4rem .8rem', fontSize: '.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <div style={{ width: 6, height: 6, background: '#f97316', borderRadius: '50%' }} />
              {pending} Perlu Review
            </div>
          )}
          <button 
            onClick={load} 
            className="admin-btn-ghost" 
            style={{ padding: '.5rem', borderRadius: 12 }}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: '1.5rem', borderRadius: 16 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="admin-filter-row" style={{ background: '#fff', padding: '1rem', borderRadius: 20, marginBottom: '1.5rem', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#64748b' }}>Filter Status:</span>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            className="admin-select"
            style={{ width: 'auto', minWidth: 180, borderRadius: 12 }}
          >
            <option value="">Semua Status</option>
            <option value="submitted">Submitted (Baru)</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="closed">Closed (Selesai)</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>Memuat data transaksi...</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Detail Transaksi</th>
                  <th>Sales & Outlet</th>
                  <th>Metode</th>
                  <th>Total Tagihan</th>
                  <th>Bukti Nota</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div style={{ background: '#f8fafc', padding: '.6rem', borderRadius: 12 }}>
                          <ReceiptText size={18} style={{ color: '#64748b' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '.9rem' }}>{tx.transactionNo}</div>
                          <div style={{ fontSize: '.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '.3rem', marginTop: '.1rem' }}>
                            <Calendar size={12} /> {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: '#334155', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                          <User size={12} /> {getUser(tx.salesUserId)}
                        </div>
                        <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: '.2rem' }}>
                          Tipe: <span style={{ textTransform: 'capitalize' }}>{tx.customerType}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: '#f1f5f9', padding: '.3rem .6rem', borderRadius: 8, fontSize: '.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                        {tx.paymentMethod}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#b55925', fontSize: '1rem' }}>{formatRp(tx.totalAmount)}</div>
                    </td>
                    <td>
                      {tx.photoUrl ? (
                        <button 
                          onClick={() => setViewPhoto(tx.photoUrl!)}
                          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', position: 'relative' }}
                        >
                          <img 
                            src={tx.photoUrl} 
                            alt="Nota" 
                            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '2px solid #f1f5f9' }} 
                          />
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                            <Eye size={14} color="#fff" />
                          </div>
                        </button>
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                          <ShoppingCart size={16} />
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge" style={{ background: `${statusColor[tx.status] ?? '#6b7280'}15`, color: statusColor[tx.status] ?? '#6b7280', border: `1px solid ${statusColor[tx.status] ?? '#6b7280'}30`, fontWeight: 800, padding: '.3rem .6rem' }}>
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {['submitted', 'pending_approval'].includes(tx.status) ? (
                        <div style={{ display: 'flex', gap: '.5rem' }}>
                          <button
                            onClick={() => handleApprove(tx)}
                            disabled={saving === tx.id}
                            className="admin-btn-primary"
                            style={{ padding: '.4rem .75rem', fontSize: '.75rem', borderRadius: 10, background: '#10b981', borderColor: '#10b981' }}
                            type="button"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectModal(tx); setRejectReason(''); }}
                            disabled={saving === tx.id}
                            className="admin-btn-ghost"
                            style={{ padding: '.4rem .75rem', fontSize: '.75rem', borderRadius: 10, color: '#ef4444' }}
                            type="button"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '.75rem', fontStyle: 'italic' }}>No Action</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!transactions.length && (
                  <tr>
                    <td colSpan={7} style={{ padding: '4rem', textAlign: 'center' }}>
                      <div style={{ opacity: 0.2, marginBottom: '1rem' }}><ShoppingBag size={48} style={{ margin: '0 auto' }} /></div>
                      <p style={{ color: '#64748b', fontWeight: 600 }}>Tidak ada transaksi untuk direview.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="admin-modal-overlay" onClick={() => setRejectModal(null)} style={{ backdropFilter: 'blur(4px)', background: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ borderRadius: 24, padding: '1.5rem' }}>
            <div className="admin-modal-header" style={{ border: 'none', padding: 0, marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Reject Transaksi</h2>
              <button onClick={() => setRejectModal(null)} className="admin-modal-close">×</button>
            </div>
            <div className="admin-modal-body" style={{ padding: 0 }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '1rem', borderRadius: 16, marginBottom: '1.5rem' }}>
                <p style={{ color: '#991b1b', fontSize: '.875rem', lineHeight: 1.5 }}>
                  Anda akan menolak transaksi <strong>{rejectModal.transactionNo}</strong>. Sales akan menerima notifikasi penolakan.
                </p>
              </div>

              <label style={{ color: '#475569', fontSize: '.85rem', display: 'block', marginBottom: '.5rem', fontWeight: 800 }}>Alasan Penolakan (Wajib)</label>

              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="admin-input"
                rows={4}
                style={{ borderRadius: 16, padding: '1rem', fontSize: '.9rem' }}
                placeholder="Tulis alasan jelas agar sales bisa memperbaikinya..."
              />
            </div>
            <div className="admin-modal-footer" style={{ border: 'none', padding: '1.5rem 0 0', gap: '1rem' }}>
              <button onClick={() => setRejectModal(null)} className="admin-btn-ghost" style={{ flex: 1, borderRadius: 14 }}>Batal</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || saving === rejectModal.id}
                className="admin-btn-primary"
                style={{ flex: 1, borderRadius: 14, background: '#ef4444', borderColor: '#ef4444' }}
                type="button"
              >
                {saving === rejectModal.id ? 'Memproses...' : 'Konfirmasi Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo View Modal */}
      {viewPhoto && (
        <div className="admin-modal-overlay" onClick={() => setViewPhoto(null)} style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.8)', zIndex: 1000 }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ background: 'transparent', boxShadow: 'none', maxWidth: '90vw', maxHeight: '90vh', padding: 0 }}>
            <button 
              onClick={() => setViewPhoto(null)} 
              style={{ position: 'absolute', top: -40, right: 0, background: '#fff', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
            >
              ×
            </button>
            <img 
              src={viewPhoto} 
              alt="Bukti Nota" 
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 12, display: 'block', margin: '0 auto' }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
