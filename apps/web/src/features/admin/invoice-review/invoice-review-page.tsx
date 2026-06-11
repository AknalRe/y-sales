import { Fragment, useEffect, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { ReceiptText, RefreshCw, AlertCircle, Eye, Calendar, User, ShoppingBag, ShoppingCart, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { getSalesTransactions, approveSalesTransaction, rejectSalesTransaction, settleSalesTransaction, getTenantUsers, getSalesTransactionDetail, type SalesTransaction, type SalesTransactionDetail, type TenantUser } from '@/lib/api/tenant';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

function formatRp(v: string | number) {
  return `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
}

const noteStatusLabel: Record<string, string> = {
  pending: 'Nota Pending',
  approved: 'Nota Approved',
  settlement: 'Nota Settlement',
  rejected: 'Nota Rejected',
};

function getNoteStatus(tx: SalesTransaction) {
  if (tx.noteStatus) return tx.noteStatus;
  if (['submitted', 'pending_approval'].includes(tx.status)) return 'pending';
  if (tx.status === 'approved') return 'approved';
  if (['validated', 'closed'].includes(tx.status)) return 'settlement';
  if (tx.status === 'rejected') return 'rejected';
  return tx.status;
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-admin-accent-shadow text-admin-accent border border-admin-border-strong';
    case 'approved':
      return 'bg-admin-accent-shadow text-admin-accent-light border border-admin-border';
    case 'settlement':
      return 'bg-admin-success-soft text-admin-success border border-admin-border';
    case 'rejected':
      return 'bg-admin-danger-soft text-admin-danger border border-admin-border';
    default:
      return 'bg-admin-bg text-admin-muted border border-admin-border';
  }
}

// Add photoUrl to the type locally since we just updated the API
type ExtendedTransaction = SalesTransaction & { photoUrl?: string; proofPhotoCount?: number };

export function InvoiceReviewPage() {
  const { accessToken } = useAuth();
  const [transactions, setTransactions] = useState<ExtendedTransaction[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'settlement' | 'rejected' | ''>('pending');
  const [saving, setSaving] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<ExtendedTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, SalesTransactionDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [txRes, userRes] = await Promise.all([
        getSalesTransactions(accessToken, { noteStatus: statusFilter || undefined }),
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
    if (!accessToken || !confirm(`Setujui nota ${tx.transactionNo}? Stok akan direlease dan nota masuk status approved.`)) return;
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

  async function handleSettlement(tx: ExtendedTransaction) {
    if (!accessToken || !confirm(`Selesaikan nota ${tx.transactionNo}? Nota akan masuk settlement/terlapor.`)) return;
    setSaving(tx.id);
    setError('');
    try {
      await settleSalesTransaction(accessToken, tx.id);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal settlement nota.');
    } finally {
      setSaving(null);
    }
  }

  async function toggleDetail(tx: ExtendedTransaction) {
    const nextId = expandedId === tx.id ? null : tx.id;
    setExpandedId(nextId);
    if (!accessToken || !nextId || details[nextId]) return;
    setLoadingDetail(nextId);
    try {
      const result = await getSalesTransactionDetail(accessToken, nextId);
      setDetails((current) => ({ ...current, [nextId]: result.order }));
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat detail transaksi.');
    } finally {
      setLoadingDetail(null);
    }
  }

  const pending = transactions.filter(t => getNoteStatus(t) === 'pending').length;

  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    const rows = transactions.map((tx) => ({
      'No Nota': tx.transactionNo,
      Sales: getUser(tx.salesUserId),
      Outlet: (tx as any).outletName ?? '-',
      'Customer Type': tx.customerType,
      'Metode Bayar': tx.paymentMethod,
      'Status Nota': noteStatusLabel[getNoteStatus(tx)] ?? getNoteStatus(tx),
      'Status Teknis': tx.status,
      'Bukti Foto': tx.proofPhotoCount ?? (tx.photoUrl ? 1 : 0),
      'Total Tagihan': Number(tx.totalAmount || 0),
      'Tanggal Dibuat': new Date(tx.createdAt).toLocaleString('id-ID'),
      'Tanggal Approved': tx.approvedAt ? new Date(tx.approvedAt).toLocaleString('id-ID') : '-',
    }));
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'No Nota': 'Tidak ada data' }]);
    sheet['!cols'] = [
      { wch: 24 }, { wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 16 },
      { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 22 },
    ];
    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (!cell) continue;
        cell.s = {
          font: row === 0 ? { bold: true, color: { rgb: 'FFFFFF' } } : {},
          fill: row === 0 ? { fgColor: { rgb: 'C75A18' } } : undefined,
          alignment: { vertical: 'top', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } },
          },
        };
      }
    }
    sheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    XLSX.utils.book_append_sheet(workbook, sheet, 'Verifikasi Nota');
    XLSX.writeFile(workbook, `verifikasi-nota-${statusFilter || 'semua'}-${new Date().toISOString().slice(0, 10)}.xlsx`, { compression: true });
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <ReceiptText size={24} className="text-admin-accent" />
            Verifikasi Nota
          </h1>
          <p className="admin-page-subtitle">Review bukti transaksi dan validasi order dari sales lapangan.</p>
        </div>
        <div className="flex gap-3 items-center">
          {pending > 0 && (
            <div className="bg-admin-accent-shadow text-admin-accent border border-admin-border flex items-center gap-1 font-extrabold" style={{ borderRadius: 12, padding: '.4rem .8rem', fontSize: '.8rem' }}>
              <div className="w-1.5 h-1.5 bg-admin-accent rounded-full" />
              {pending} Perlu Review
            </div>
          )}
          <button
            onClick={exportExcel}
            className="admin-btn-ghost"
            style={{ padding: '.5rem .75rem', borderRadius: 12 }}
            disabled={loading || !transactions.length}
            type="button"
          >
            <Download size={16} /> Excel
          </button>
          <button
            onClick={load}
            className="admin-btn-ghost"
            style={{ padding: '.5rem', borderRadius: 12 }}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: '1.5rem', borderRadius: 16 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="admin-filter-row bg-admin-bg-card border border-admin-border-subtle" style={{ padding: '1rem', borderRadius: 20, marginBottom: '1.5rem' }}>
        <div className="flex gap-4 items-center">
          <span className="text-admin-muted font-bold text-sm">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="admin-select"
            style={{ width: 'auto', minWidth: 180, borderRadius: 12 }}
          >
            <option value="">Semua Status</option>
            <option value="pending">Nota Pending</option>
            <option value="approved">Nota Approved</option>
            <option value="settlement">Nota Settlement</option>
            <option value="rejected">Nota Rejected</option>
          </select>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="text-admin-muted" style={{ padding: '4rem', textAlign: 'center' }}>
            <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p className="font-semibold">Memuat data transaksi...</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Detail Transaksi</TableHead>
                  <TableHead>Sales & Outlet</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Total Tagihan</TableHead>
                  <TableHead>Bukti Nota</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => {
                  const detail = details[tx.id];
                  const expanded = expandedId === tx.id;
                  const noteStatus = getNoteStatus(tx);
                  return (
                  <Fragment key={tx.id}>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="bg-admin-bg p-2.5 rounded-xl">
                          <ReceiptText size={18} className="text-admin-muted" />
                        </div>
                        <div>
                          <div className="text-admin-foreground font-extrabold text-sm">{tx.transactionNo}</div>
                          <div className="text-admin-subtle flex items-center gap-1 mt-0.5" style={{ fontSize: '.75rem' }}>
                            <Calendar size={12} /> {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-admin-text font-bold text-sm flex items-center gap-1">
                          <User size={12} /> {getUser(tx.salesUserId)}
                        </div>
                        <div className="text-admin-muted mt-1" style={{ fontSize: '.75rem' }}>
                          {(tx as any).outletName ? `${(tx as any).outletName} · ` : ''}Tipe: <span className="capitalize">{tx.customerType}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1 bg-admin-border-subtle text-admin-muted-dim font-bold uppercase rounded-lg" style={{ padding: '.3rem .6rem', fontSize: '.75rem' }}>
                        {tx.paymentMethod}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-admin-accent font-extrabold text-base">{formatRp(tx.totalAmount)}</div>
                    </TableCell>
                    <TableCell>
                      {tx.photoUrl ? (
                        <button
                          onClick={() => setViewPhoto(tx.photoUrl!)}
                          className="border-none bg-transparent p-0 cursor-pointer relative"
                        >
                          <img
                            src={tx.photoUrl}
                            alt="Nota"
                            className="rounded-lg border-2 border-admin-border-subtle"
                            style={{ width: 44, height: 44, objectFit: 'cover' }}
                          />
                          <div className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100" style={{ background: 'rgba(0,0,0,0.2)' }}>
                            <Eye size={14} color="#fff" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-admin-border-subtle flex items-center justify-center text-admin-border">
                          <ShoppingCart size={16} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`admin-badge font-extrabold px-2 py-1 rounded-full ${getStatusStyle(noteStatus)}`}>
                        {noteStatusLabel[noteStatus] ?? noteStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => toggleDetail(tx)}
                          disabled={loadingDetail === tx.id}
                          className="admin-btn-ghost"
                          style={{ padding: '.4rem .65rem', fontSize: '.75rem', borderRadius: 10 }}
                          type="button"
                        >
                          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          Detail
                        </button>
                      {noteStatus === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApprove(tx)}
                            disabled={saving === tx.id}
                            className="admin-btn-primary bg-admin-success border-admin-success"
                            style={{ padding: '.4rem .75rem', fontSize: '.75rem', borderRadius: 10 }}
                            type="button"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectModal(tx); setRejectReason(''); }}
                            disabled={saving === tx.id}
                            className="admin-btn-ghost text-admin-danger"
                            style={{ padding: '.4rem .75rem', fontSize: '.75rem', borderRadius: 10 }}
                            type="button"
                          >
                            Reject
                          </button>
                        </>
                      ) : noteStatus === 'approved' ? (
                        <button
                          onClick={() => handleSettlement(tx)}
                          disabled={saving === tx.id}
                          className="admin-btn-primary"
                          style={{ padding: '.4rem .75rem', fontSize: '.75rem', borderRadius: 10 }}
                          type="button"
                        >
                          Settlement
                        </button>
                      ) : (
                        <span className="text-admin-subtle text-xs italic">No Action</span>
                      )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow>
                      <TableCell colSpan={7} style={{ background: 'var(--admin-bg)' }}>
                        {loadingDetail === tx.id && !detail ? (
                          <div className="admin-loading"><RefreshCw size={16} className="spin" /> Memuat detail...</div>
                        ) : detail ? (
                          <div className="grid gap-4 lg:grid-cols-[1.5fr_.9fr]">
                            <div className="admin-card" style={{ margin: 0, padding: '1rem' }}>
                              <h3 className="font-extrabold text-admin-foreground mb-3">Item Transaksi</h3>
                              <div className="grid gap-2">
                                {detail.items.map((item) => (
                                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-admin-surface px-3 py-2">
                                    <div>
                                      <strong className="text-admin-foreground text-sm">{item.productName ?? item.productId}</strong>
                                      <p className="text-admin-muted text-xs m-0">{item.productSku ?? '-'} · {Number(item.quantity).toLocaleString('id-ID')} x {formatRp(item.unitPrice)}</p>
                                    </div>
                                    <strong className="text-admin-accent text-sm">{formatRp(item.lineTotal)}</strong>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="admin-card" style={{ margin: 0, padding: '1rem' }}>
                              <h3 className="font-extrabold text-admin-foreground mb-3">Bukti Nota</h3>
                              {detail.photos.length ? (
                                <div className="grid grid-cols-3 gap-2">
                                  {detail.photos.map((photo) => (
                                    <button key={photo.id} onClick={() => setViewPhoto(photo.fileUrl)} className="border-none bg-transparent p-0 cursor-pointer" type="button">
                                      <img src={photo.fileUrl} alt="Bukti nota" className="rounded-xl border border-admin-border" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-admin-muted text-sm">Belum ada bukti nota.</p>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                );
                })}
                {!transactions.length && (
                  <TableRow>
                    <TableCell colSpan={7} style={{ padding: '4rem', textAlign: 'center' }}>
                      <div className="opacity-20 mb-4"><ShoppingBag size={48} className="mx-auto" /></div>
                      <p className="text-admin-muted font-semibold">Tidak ada transaksi untuk direview.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="admin-modal-overlay" onClick={() => setRejectModal(null)} style={{ backdropFilter: 'blur(4px)', background: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ borderRadius: 24, padding: '1.5rem' }}>
            <div className="admin-modal-header border-none p-0 mb-6">
              <h2 className="text-lg font-extrabold">Reject Transaksi</h2>
              <button onClick={() => setRejectModal(null)} className="admin-modal-close">×</button>
            </div>
            <div className="admin-modal-body p-0">
              <div className="bg-admin-danger-bg border border-admin-border p-4 rounded-2xl mb-6">
                <p className="text-admin-danger text-sm leading-relaxed">
                  Anda akan menolak transaksi <strong>{rejectModal.transactionNo}</strong>. Sales akan menerima notifikasi penolakan.
                </p>
              </div>

              <label className="text-admin-muted-dim text-sm block mb-2 font-extrabold">Alasan Penolakan (Wajib)</label>

              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="admin-input"
                rows={4}
                style={{ borderRadius: 16, padding: '1rem', fontSize: '.9rem' }}
                placeholder="Tulis alasan jelas agar sales bisa memperbaikinya..."
              />
            </div>
            <div className="admin-modal-footer border-none pt-6 gap-4" style={{ padding: '1.5rem 0 0', gap: '1rem' }}>
              <button onClick={() => setRejectModal(null)} className="admin-btn-ghost flex-1" style={{ borderRadius: 14 }}>Batal</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || saving === rejectModal.id}
                className="admin-btn-primary flex-1 bg-admin-danger border-admin-danger"
                style={{ borderRadius: 14 }}
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
              className="absolute bg-admin-surface border-none rounded-full flex items-center justify-center text-admin-foreground cursor-pointer"
              style={{ top: -40, right: 0, width: 32, height: 32 }}
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
