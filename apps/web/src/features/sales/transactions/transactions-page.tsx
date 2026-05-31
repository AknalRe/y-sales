import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Plus, Search, Send, CheckCircle2, Trash2, RefreshCw, Loader2, WifiOff } from 'lucide-react';
import { getProducts, createOrder, getTodayVisitPlan, type TodayVisitSchedule } from '../../../lib/api/tenant';
import { useAuth } from '../../auth/auth-provider';
import { EmptyState, Spinner } from '../../../components/ui';
import { enqueueTransaction, getTransactionQueueCount } from '../../../lib/offline/transaction-queue';
import { syncTransactionQueue } from '../../../lib/offline/sync-transactions';

const activeVisitStorageKey = 'yuksales.sales.activeVisit';

type CartItem = {
  product: any;
  quantity: number;
};

export function TransactionsPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<TodayVisitSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [activeOutletName, setActiveOutletName] = useState('');
  const [activeVisitId, setActiveVisitId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'credit' | 'consignment'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineMessage, setOfflineMessage] = useState('');

  useEffect(() => {
    refreshQueueCount();
    const handleOnline = async () => {
      setOnline(true);
      await handleSyncQueue();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(activeVisitStorageKey);
    if (raw) {
      try {
        const activeVisit = JSON.parse(raw) as { id: string; outletId: string; outletName?: string };
        setActiveVisitId(activeVisit.id);
        setSelectedOutlet(activeVisit.outletId);
        setActiveOutletName(activeVisit.outletName ?? '');
      } catch {
        localStorage.removeItem(activeVisitStorageKey);
      }
    }

    if (accessToken) {
      Promise.all([
        getProducts(accessToken),
        getTodayVisitPlan(accessToken)
      ]).then(([pRes, visitPlan]) => {
        setProducts(pRes.products);
        setSchedules(visitPlan.schedules);
        if (!activeOutletName && selectedOutlet) {
          const activeSchedule = visitPlan.schedules.find((schedule) => schedule.outletId === selectedOutlet);
          setActiveOutletName(activeSchedule?.outlet.name ?? '');
        }
      }).finally(() => setLoading(false));
    }
  }, [accessToken, activeOutletName, selectedOutlet]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.product.priceDefault) * item.quantity), 0);
  }, [cart]);

  async function refreshQueueCount() {
    const count = await getTransactionQueueCount();
    setQueueCount(count);
  }

  async function handleSyncQueue() {
    setSyncing(true);
    try {
      const result = await syncTransactionQueue();
      await refreshQueueCount();
      if (result.synced || result.failed) {
        setOfflineMessage(`Sync transaksi selesai. Berhasil: ${result.synced}, gagal: ${result.failed}`);
      }
    } finally {
      setSyncing(false);
    }
  }

  function addToCart(product: any) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  async function handleSubmit() {
    if (!accessToken || !selectedOutlet || !activeVisitId || cart.length === 0) return;
    setSubmitting(true);
    setError('');

    const orderPayload = {
      clientRequestId: crypto.randomUUID(),
      outletId: selectedOutlet,
      visitSessionId: activeVisitId,
      customerType: 'store' as const,
      paymentMethod,
      items: cart.map(i => ({
        productId: i.product.id,
        quantity: String(i.quantity),
        unitPrice: String(i.product.priceDefault)
      }))
    };

    try {
      if (!navigator.onLine) throw new Error('offline');
      await createOrder(accessToken, orderPayload);
      setSuccess(true);
      setCart([]);
    } catch (e: any) {
      if (!navigator.onLine || e.message === 'offline') {
        await enqueueTransaction({ type: 'create-order', accessToken, payload: orderPayload });
        await refreshQueueCount();
        setSuccess(true);
        setCart([]);
        setOfflineMessage('Transaksi disimpan offline dan akan tersinkron saat online.');
      } else {
        setError(e.message || 'Gagal mengirim transaksi.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Cancel checkout and reset state
  function handleBatal() {
    setCart([]);
    setSelectedOutlet('');
    setPaymentMethod('cash');
    setError('');
    setOfflineMessage('');
  }

  if (success) {
    return (
      <main className="sales-home" >
        <div className="sales-card" style={{ padding: '3rem 2rem', textAlign: 'center', marginTop: '2rem' }}>
          <CheckCircle2 size={64} className="text-sales-emerald" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>Transaksi Terkirim!</h2>
          <p className="text-sales-muted mb-8">
            {offlineMessage || 'Order telah dikirim ke admin untuk verifikasi. Lanjutkan perjalanan Anda.'}
          </p>
          <button onClick={() => navigate('/sales/invoices')} className="sales-btn sales-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginBottom: '.75rem' }}>
            Upload Foto Nota
          </button>
          <button onClick={() => setSuccess(false)} className="sales-btn sales-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
            Buat Transaksi Lagi
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="sales-home" style={{ paddingBottom: cart.length > 0 ? '12rem' : '6rem', position: "relative" }}>
      <div className="sales-home-greeting">
        <div>
          <p className="sales-greeting-label">Order Taking</p>
          <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>Buat Transaksi</h1>
        </div>
        {!online && <span className="flex items-center gap-1 text-sales-red" style={{ fontSize: '.75rem' }}><WifiOff size={14} /> Offline</span>}
      </div>

      {queueCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-sales-accent-bg bg-sales-bg px-3 py-2 mb-2">
          <span className="text-sales-accent" style={{ fontSize: '.8rem' }}>{queueCount} transaksi menunggu sync</span>
          <button onClick={handleSyncQueue} disabled={syncing || !navigator.onLine} className="flex items-center gap-1 text-sales-accent" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync
          </button>
        </div>
      )}

      {offlineMessage && (
        <div className="sales-message" style={{ marginBottom: '.5rem' }}>{offlineMessage}</div>
      )}

      <div className="sales-card" style={{ margin: 0, padding: 0, borderRadius: 15 }}>
        <div className="flex items-center gap-2 border border-sales-border-brand bg-sales-surface-input px-4 py-2.5 rounded-2xl">
          <Search size={18} className="text-sales-brand-muted" />
          <input
            type="text"
            placeholder="Cari produk SKU atau nama..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none text-sales-foreground outline-none w-full"
            style={{ fontSize: '.9rem' }}
          />
        </div>
      </div>

      <div className='grid grid-cols-3 gap-1'>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}><Spinner /></div> :
          filteredProducts.map(p => (
            <div key={p.id} className="sales-card" style={{ margin: 0, borderRadius: 15, padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              <div className="flex items-center justify-center rounded-2xl bg-sales-bg" style={{ width: '100%', aspectRatio: '1' }}>
                <Package size={32} className="text-sales-accent" />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong>
                <span className="text-sales-muted" style={{ fontSize: '.75rem' }}>{p.sku}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <span className="text-sales-accent" style={{ fontSize: '.85rem', fontWeight: 700 }}>Rp {Number(p.priceDefault).toLocaleString('id-ID')}</span>
                <button
                  onClick={() => addToCart(p)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg border border-sales-accent-bg bg-sales-bg text-sales-accent"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        {!loading && filteredProducts.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState icon={<Package size={44} />} title="Produk tidak ditemukan" />
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed left-0 right-0 mx-auto border-t border-sales-border-brand bg-sales-surface z-50" style={{ maxWidth: '28rem', bottom: 64, padding: '1rem', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', boxShadow: '0 -10px 28px var(--sales-shadow-cart)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sales-text-muted" style={{ fontSize: '.9rem' }}><ShoppingCart size={16} className="inline mr-1" /> {cart.reduce((s, i) => s + i.quantity, 0)} Items</span>
            <strong className="text-sales-accent" style={{ fontSize: '1.25rem' }}>Rp {totalAmount.toLocaleString('id-ID')}</strong>
          </div>

          {error && <div className="sales-alert sales-alert-error" style={{ marginBottom: '1rem', padding: '.5rem', fontSize: '.8rem' }}>{error}</div>}
          {!activeVisitId && <div className="sales-alert sales-alert-error" style={{ marginBottom: '1rem', padding: '.5rem', fontSize: '.8rem' }}>Check-in outlet terlebih dahulu sebelum membuat transaksi.</div>}

          <div style={{ display: 'grid', gap: '.5rem', gridTemplateColumns: '1fr', marginBottom: '1rem' }}>
            <select value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)} disabled={!!activeVisitId} className="sales-select" style={{ width: '100%', fontSize: '.85rem' }}>
              <option value="">-- Pilih Outlet Tujuan --</option>
              {activeVisitId && selectedOutlet ? (
                <option value={selectedOutlet}>{activeOutletName || 'Outlet visit aktif'}</option>
              ) : schedules.map(schedule => (
                <option key={schedule.outlet.id} value={schedule.outlet.id}>{schedule.outlet.name}</option>
              ))}
            </select>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="sales-select" style={{ width: '100%', fontSize: '.85rem' }}>
              <option value="cash">Tunai (Cash)</option>
              <option value="qris">QRIS</option>
              <option value="credit">Tempo (Kredit)</option>
              <option value="consignment">Titip Jual (Konsinyasi)</option>
            </select>
          </div>

          <button onClick={handleSubmit} disabled={submitting || !selectedOutlet || !activeVisitId} className="sales-btn sales-btn-primary" style={{ width: '100%', padding: '1rem', justifyContent: 'center', borderRadius: '1rem', fontSize: '1rem' }}>
            {submitting ? <Spinner size={20} /> : <Send size={20} />} {submitting ? 'Mengirim...' : 'Kirim Order Sekarang'}
          </button>
          <button onClick={handleBatal} className="sales-btn sales-btn-primary mt-2.5" style={{ width: '100%', padding: '1rem', justifyContent: 'center', borderRadius: '1rem', fontSize: '1rem' }}>
            <Trash2 size={20} /> Batal
          </button>

        </div>
      )}
    </div>
  );
}
