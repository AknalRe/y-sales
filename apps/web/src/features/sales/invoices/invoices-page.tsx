import { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, ChevronDown, ChevronUp, Eye, ReceiptText } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { apiRequest, createMediaUpload, uploadToStorageUrl, finalizeMediaUpload } from '../../../lib/api/client';
import { EmptyState, Spinner } from '../../../components/ui';
import { useScrollToTop } from '../../../hooks/use-scroll-to-top';
import { showSalesAlertToast } from '../ui/sales-alert';

const orderStatusLabel: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Menunggu Review',
  pending_approval: 'Menunggu Approval',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  closed: 'Selesai',
};

const paymentMethodLabel: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  credit: 'Piutang',
  consignment: 'Konsinyasi',
};

type OrderListItem = {
  id: string;
  transactionNo: string;
  outletName?: string | null;
  paymentMethod: string;
  totalAmount: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  photoUrl?: string | null;
  proofPhotoCount?: number;
  hasInvoice?: boolean;
};

type OrderDetail = OrderListItem & {
  subtotalAmount: string;
  discountAmount: string;
  rejectionReason?: string | null;
  items: Array<{
    id: string;
    productName: string;
    productSku: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  }>;
  photos: Array<{
    id: string;
    fileUrl: string;
    verificationStatus: string;
    capturedAt: string;
  }>;
};

function formatCurrency(value: string | number) {
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InvoicesPage() {
  useScrollToTop();
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [details, setDetails] = useState<Record<string, OrderDetail>>({});
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetailFor, setLoadingDetailFor] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [error, setError] = useState('');

  const expandedOrder = useMemo(() => expandedOrderId ? details[expandedOrderId] : null, [details, expandedOrderId]);

  async function fetchOrders() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ orders: OrderListItem[] }>('/sales/orders', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setOrders(res.orders.map((order) => ({
        ...order,
        hasInvoice: Boolean(order.photoUrl) || Number(order.proofPhotoCount ?? 0) > 0,
      })));
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrderDetail(orderId: string, force = false) {
    if (!accessToken) return;
    if (!force && details[orderId]) return;
    setLoadingDetailFor(orderId);
    try {
      const res = await apiRequest<{ order: OrderDetail }>(`/sales/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setDetails((prev) => ({ ...prev, [orderId]: res.order }));
    } finally {
      setLoadingDetailFor(null);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, [accessToken]);

  useEffect(() => {
    showSalesAlertToast(error, 'error');
  }, [error]);

  async function toggleDetail(orderId: string) {
    const nextOrderId = expandedOrderId === orderId ? null : orderId;
    setExpandedOrderId(nextOrderId);
    if (nextOrderId) await fetchOrderDetail(nextOrderId);
  }

  async function handleFileSelected(orderId: string, file: File) {
    if (!accessToken || !file) return;
    setUploadingFor(orderId);
    setError('');

    try {
      const { uploadUrl, objectKey } = await createMediaUpload(accessToken, {
        ownerType: 'transaction',
        ownerId: orderId,
        fileName: file.name,
        mimeType: file.type,
      });

      await uploadToStorageUrl(uploadUrl, file);
      await finalizeMediaUpload(accessToken, {
        ownerType: 'transaction',
        ownerId: orderId,
        objectKey,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      setOrders((prev) => prev.map((order) => (
        order.id === orderId ? { ...order, hasInvoice: true, proofPhotoCount: Number(order.proofPhotoCount ?? 0) + 1 } : order
      )));
      await fetchOrderDetail(orderId, true);
      showSalesAlertToast('Foto bukti nota berhasil diunggah.', 'success');
    } catch (e: any) {
      setError(e.message || 'Gagal mengunggah foto nota.');
    } finally {
      setUploadingFor(null);
    }
  }

  return (
    <main className="sales-home" style={{ paddingBottom: '6rem' }}>
      <div className="sales-home-greeting">
        <div>
          <p className="sales-greeting-label">Riwayat Transaksi</p>
          <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>Nota Outlet</h1>
        </div>
      </div>

      {error && <div className="sales-alert sales-alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginTop: '1rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div>
        ) : orders.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          const canUploadProof = order.status === 'pending_approval';

          return (
            <article key={order.id} className="sales-note-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <strong className="block text-sales-foreground" style={{ fontSize: '.95rem' }}>{order.transactionNo}</strong>
                  <span className="text-sales-text-muted" style={{ display: 'block', fontSize: '.75rem', marginTop: '.15rem' }}>
                    {order.outletName || 'Outlet'} • {formatDate(order.createdAt)}
                  </span>
                </div>
                <span className={`platform-status-dot platform-status-${order.status}`}>{orderStatusLabel[order.status] ?? order.status}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '.75rem', alignItems: 'end', marginTop: '1rem' }}>
                <div>
                  <span className="text-sales-text-muted" style={{ fontSize: '.72rem', fontWeight: 700 }}>
                    {paymentMethodLabel[order.paymentMethod] ?? order.paymentMethod}
                  </span>
                  <strong className="text-sales-accent" style={{ display: 'block', fontSize: '1.1rem', marginTop: '.15rem' }}>
                    {formatCurrency(order.totalAmount)}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => toggleDetail(order.id)}
                    className="inline-flex items-center gap-1.5 border border-sales-line bg-white text-sales-foreground rounded-xl px-3 py-2"
                    style={{ fontSize: '.78rem', fontWeight: 800 }}
                  >
                    <Eye size={15} />
                    Detail
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>

                  {canUploadProof && (
                    <label
                      className="inline-flex items-center gap-1.5 border border-sales-accent-bg bg-sales-bg text-sales-accent rounded-xl px-3 py-2 cursor-pointer"
                      style={{ fontSize: '.78rem', fontWeight: 800, opacity: uploadingFor === order.id ? 0.7 : 1 }}
                    >
                      {uploadingFor === order.id ? <Spinner size={15} /> : <Camera size={15} />}
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        disabled={uploadingFor === order.id}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) handleFileSelected(order.id, file);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.75rem', color: order.hasInvoice ? 'var(--sales-success-light)' : 'var(--sales-text-muted)', fontSize: '.78rem', fontWeight: 800 }}>
                {order.hasInvoice ? <CheckCircle2 size={15} /> : <ReceiptText size={15} />}
                {order.hasInvoice ? `${order.proofPhotoCount ?? 1} bukti nota tersimpan` : 'Belum ada bukti nota'}
              </div>

              {isExpanded && (
                <section style={{ borderTop: '1px solid var(--sales-line)', marginTop: '1rem', paddingTop: '1rem' }}>
                  {loadingDetailFor === order.id && !expandedOrder ? (
                    <div style={{ padding: '1rem', textAlign: 'center' }}><Spinner /></div>
                  ) : expandedOrder ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
                        {expandedOrder.items.map((item) => (
                          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '.75rem', alignItems: 'start' }}>
                            <div>
                              <strong className="text-sales-foreground" style={{ display: 'block', fontSize: '.84rem' }}>{item.productName}</strong>
                              <span className="text-sales-text-muted" style={{ fontSize: '.72rem' }}>
                                {item.productSku} • {Number(item.quantity).toLocaleString('id-ID')} x {formatCurrency(item.unitPrice)}
                              </span>
                            </div>
                            <strong className="text-sales-accent" style={{ fontSize: '.84rem' }}>{formatCurrency(item.lineTotal)}</strong>
                          </div>
                        ))}
                      </div>

                      {expandedOrder.photos.length > 0 && (
                        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '.5rem' }}>
                          {expandedOrder.photos.map((photo) => (
                            <a key={photo.id} href={photo.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--sales-line)', aspectRatio: '1 / 1', background: 'var(--sales-bg)' }}>
                              <img src={photo.fileUrl} alt="Bukti nota transaksi" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  ) : null}
                </section>
              )}
            </article>
          );
        })}

        {!loading && orders.length === 0 && (
          <EmptyState icon={<ReceiptText size={48} />} title="Belum ada transaksi" description="Transaksi yang Anda buat akan muncul di sini." />
        )}
      </div>
    </main>
  );
}
