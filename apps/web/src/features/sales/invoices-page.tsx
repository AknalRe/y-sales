import { useEffect, useState } from 'react';
import { Camera, CheckCircle2, ReceiptText } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { apiRequest } from '../../lib/api/client';
import { createMediaUpload, uploadToStorageUrl, finalizeMediaUpload } from '../../lib/api/client';
import { EmptyState, Spinner } from '../../components/ui';

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
      setOrders(res.orders);
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

      <div className="admin-card" style={{ marginTop: '1rem', padding: '1rem' }}>
        <p style={{ margin: 0, fontSize: '.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
          Daftar transaksi Anda. Gunakan tombol kamera untuk langsung menjepret bukti nota fisik agar diverifikasi oleh Admin.
        </p>
        {error && <div className="admin-alert admin-alert-error" style={{ marginTop: '1rem' }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginTop: '1rem' }}>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div> : 
         orders.map(order => (
          <div key={order.id} className="admin-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem' }}>
              <div>
                <strong style={{ display: 'block', color: '#e2e8f0' }}>{order.transactionNo}</strong>
                <span style={{ fontSize: '.75rem', color: '#94a3b8' }}>
                  {new Date(order.createdAt).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                </span>
              </div>
              <span className={`platform-status-dot platform-status-${order.status}`}>{order.status}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
              <strong style={{ color: '#34d399', fontSize: '1.1rem' }}>
                Rp {Number(order.totalAmount).toLocaleString('id-ID')}
              </strong>

              {order.hasInvoice ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', color: '#34d399', fontSize: '.8rem', fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> Nota Terkirim
                </span>
              ) : (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'rgba(167,139,250,.15)', color: '#a78bfa', padding: '.5rem 1rem', borderRadius: '.75rem', fontSize: '.8rem', fontWeight: 700, cursor: uploadingFor === order.id ? 'not-allowed' : 'pointer', opacity: uploadingFor === order.id ? 0.7 : 1 }}>
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
