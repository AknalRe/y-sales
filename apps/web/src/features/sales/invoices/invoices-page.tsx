import { useEffect, useState } from 'react';
import { Camera, CheckCircle2, ReceiptText } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { apiRequest } from '../../../lib/api/client';
import { createMediaUpload, uploadToStorageUrl, finalizeMediaUpload } from '../../../lib/api/client';
import { EmptyState, Spinner } from '../../../components/ui';

const orderStatusLabel: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Menunggu Review',
  pending_approval: 'Menunggu Approval',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  closed: 'Selesai',
};

export function InvoicesPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function fetchOrders() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ orders: any[] }>('/sales/orders', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setOrders(res.orders.map(order => ({ ...order, hasInvoice: Boolean(order.photoUrl) })));
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, [accessToken]);

  async function handleFileSelected(orderId: string, file: File) {
    if (!accessToken || !file) return;
    setUploadingFor(orderId);
    setError('');

    try {
      // 1. Get upload URL
      const { uploadUrl, objectKey } = await createMediaUpload(accessToken, {
        ownerType: 'transaction',
        ownerId: orderId,
        fileName: file.name,
        mimeType: file.type
      });

      // 2. Upload to S3/Storage directly
      await uploadToStorageUrl(uploadUrl, file);

      // 3. Finalize
      await finalizeMediaUpload(accessToken, {
        ownerType: 'transaction',
        ownerId: orderId,
        objectKey,
        mimeType: file.type,
        sizeBytes: file.size
      });

      // Soft update status in UI to reflect it has an invoice uploaded (simulate)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, hasInvoice: true } : o));

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
          <p className="sales-greeting-label">Bukti Transaksi</p>
          <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>Foto Nota</h1>
        </div>
      </div>

      <div className="sales-step-card">
        <p className="text-sales-text-muted" style={{ margin: 0, fontSize: '.85rem', lineHeight: 1.5 }}>
          Daftar transaksi Anda. Gunakan tombol kamera untuk langsung menjepret bukti nota fisik agar diverifikasi oleh Admin.
        </p>
        {error && <div className="sales-alert sales-alert-error" style={{ marginTop: '1rem' }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginTop: '1rem' }}>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div> :
          orders.map(order => (
            <div key={order.id} className="sales-note-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem' }}>
                <div>
                  <strong className="block text-sales-foreground">{order.transactionNo}</strong>
                  <span className="text-sales-text-muted" style={{ fontSize: '.75rem' }}>
                    {new Date(order.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className={`platform-status-dot platform-status-${order.status}`}>{orderStatusLabel[order.status] ?? order.status}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                <strong className="text-sales-accent" style={{ fontSize: '1.1rem' }}>
                  Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                </strong>

                {order.hasInvoice ? (
                  <span className="flex items-center gap-1 text-sales-success-light" style={{ fontSize: '.8rem', fontWeight: 700 }}>
                    <CheckCircle2 size={16} /> Nota Terkirim
                  </span>
                ) : order.status !== 'pending_approval' ? (
                  <span className="text-sales-muted" style={{ fontSize: '.8rem', fontWeight: 700 }}>
                    Tidak bisa upload
                  </span>
                ) : (
                  <label className="inline-flex items-center gap-1.5 border border-sales-accent-bg bg-sales-bg text-sales-accent rounded-xl px-4 py-2 cursor-pointer" style={{ fontSize: '.8rem', fontWeight: 800, opacity: uploadingFor === order.id ? 0.7 : 1 }}>
                    {uploadingFor === order.id ? <Spinner size={16} /> : <Camera size={16} />}
                    {uploadingFor === order.id ? 'Mengunggah...' : 'Jepret Nota'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment" // Force open back camera on mobile
                      style={{ display: 'none' }}
                      disabled={uploadingFor === order.id}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelected(order.id, e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        {!loading && orders.length === 0 && (
          <EmptyState icon={<ReceiptText size={48} />} title="Belum ada transaksi" description="Transaksi yang Anda buat akan muncul di sini." />
        )}
      </div>
    </main>
  );
}
