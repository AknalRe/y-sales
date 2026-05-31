import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, ShoppingCart, Package, Plus, Search, Send, CheckCircle2, Trash2, RefreshCw, Loader2, WifiOff, Store, X, XCircle } from 'lucide-react';
import { getProducts, createOrder } from '../../../lib/api/tenant';
import { useAuth } from '../../auth/auth-provider';
import { EmptyState, Spinner } from '../../../components/ui';
import { enqueueTransaction, getTransactionQueueCount } from '../../../lib/offline/transaction-queue';
import { syncTransactionQueue } from '../../../lib/offline/sync-transactions';
import { useScrollToTop } from '../../../hooks/use-scroll-to-top';

const activeVisitStorageKey = 'yuksales.sales.activeVisit';
const transactionDraftStorageKey = 'yuksales.sales.transactionDraft';

type CartItem = {
  product: any;
  quantity: number;
};

type ActiveVisit = {
  id: string;
  outletId: string;
  outletName?: string;
  scheduleId?: string;
};

type TransactionDraft = {
  visitId: string;
  outletId: string;
  paymentMethod: 'cash' | 'qris' | 'credit' | 'consignment';
  cart: CartItem[];
};

export function TransactionsPage() {
  useScrollToTop();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const cartSheetRef = useRef<HTMLDivElement | null>(null);
  const productGridRef = useRef<HTMLDivElement | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeVisit, setActiveVisit] = useState<ActiveVisit | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'credit' | 'consignment'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineMessage, setOfflineMessage] = useState('');
  const [cartExpanded, setCartExpanded] = useState(false);
  const [cartSheetHeight, setCartSheetHeight] = useState(0);
  const [productGridMaxHeight, setProductGridMaxHeight] = useState<number | null>(null);
  const [draftReady, setDraftReady] = useState(false);

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
        const visit = JSON.parse(raw) as ActiveVisit;
        setActiveVisit(visit);
        const draftRaw = localStorage.getItem(transactionDraftStorageKey);
        if (draftRaw) {
          const draft = JSON.parse(draftRaw) as TransactionDraft;
          if (draft.visitId === visit.id && draft.outletId === visit.outletId) {
            setCart(draft.cart ?? []);
            setPaymentMethod(draft.paymentMethod ?? 'cash');
          } else {
            localStorage.removeItem(transactionDraftStorageKey);
          }
        }
      } catch {
        localStorage.removeItem(activeVisitStorageKey);
        localStorage.removeItem(transactionDraftStorageKey);
      }
    } else {
      localStorage.removeItem(transactionDraftStorageKey);
    }
    setDraftReady(true);

    if (accessToken) {
      getProducts(accessToken)
        .then(res => setProducts(res.products))
        .catch(e => setError(e.message || 'Gagal memuat produk.'))
        .finally(() => setLoading(false));
    }
  }, [accessToken]);

  useEffect(() => {
    if (!draftReady) return;
    if (!activeVisit || cart.length === 0) {
      localStorage.removeItem(transactionDraftStorageKey);
      return;
    }
    const draft: TransactionDraft = {
      visitId: activeVisit.id,
      outletId: activeVisit.outletId,
      paymentMethod,
      cart,
    };
    localStorage.setItem(transactionDraftStorageKey, JSON.stringify(draft));
  }, [activeVisit, cart, draftReady, paymentMethod]);

  useEffect(() => {
    if (!cartSheetRef.current) {
      setCartSheetHeight(0);
      return;
    }
    const element = cartSheetRef.current;
    const updateHeight = () => setCartSheetHeight(element.getBoundingClientRect().height);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [cart.length, cartExpanded, error, paymentMethod, submitting]);

  useEffect(() => {
    const updateGridHeight = () => {
      if (!productGridRef.current || cart.length === 0 || cartSheetHeight <= 0) {
        setProductGridMaxHeight(null);
        return;
      }
      const gridTop = productGridRef.current.getBoundingClientRect().top;
      const cartTop = window.innerHeight - 64 - cartSheetHeight;
      const nextHeight = Math.max(160, Math.floor(cartTop - gridTop - 8));
      setProductGridMaxHeight(nextHeight);
    };

    updateGridHeight();
    window.addEventListener('resize', updateGridHeight);
    window.visualViewport?.addEventListener('resize', updateGridHeight);
    return () => {
      window.removeEventListener('resize', updateGridHeight);
      window.visualViewport?.removeEventListener('resize', updateGridHeight);
    };
  }, [cart.length, cartSheetHeight, cartExpanded, products.length, search]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.product.priceDefault) * item.quantity), 0);
  }, [cart]);

  function getSalesAvailableStock(product: any) {
    return Number(product.salesAvailableQuantity ?? product.salesStockQuantity ?? 0);
  }

  const productGridStyle = cart.length > 0
    ? {
        maxHeight: productGridMaxHeight ? `${productGridMaxHeight}px` : undefined,
        overflowY: 'auto' as const,
        paddingBottom: '.5rem',
        overscrollBehavior: 'contain' as const,
      }
    : undefined;

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
      const available = getSalesAvailableStock(product);
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= available) return prev;
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (available <= 0) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const newQty = i.quantity + delta;
      if (delta > 0 && newQty > getSalesAvailableStock(i.product)) return i;
      return newQty <= 0 ? null : { ...i, quantity: newQty };
    }).filter(Boolean) as CartItem[]);
  }

  async function handleSubmit() {
    if (!accessToken || !activeVisit || cart.length === 0) return;
    setSubmitting(true);
    setError('');

    const orderPayload = {
      clientRequestId: crypto.randomUUID(),
      outletId: activeVisit.outletId,
      visitSessionId: activeVisit.id,
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
      localStorage.removeItem(transactionDraftStorageKey);
      setSuccess(true);
      setCart([]);
    } catch (e: any) {
      if (!navigator.onLine || e.message === 'offline') {
        await enqueueTransaction({ type: 'create-order', accessToken, payload: orderPayload });
        await refreshQueueCount();
        localStorage.removeItem(transactionDraftStorageKey);
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

  function handleBatal() {
    localStorage.removeItem(transactionDraftStorageKey);
    setCart([]);
    setPaymentMethod('cash');
    setError('');
    setOfflineMessage('');
  }

  if (success) {
    return (
      <main className="sales-home">
        <div className="sales-card" style={{ padding: '3rem 2rem', textAlign: 'center', marginTop: '2rem' }}>
          <CheckCircle2 size={64} className="text-sales-emerald" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>Transaksi Terkirim!</h2>
          <p className="text-sales-muted mb-8">
            {offlineMessage || 'Order telah dikirim ke admin untuk verifikasi. Lanjutkan perjalanan Anda.'}
          </p>
          <button onClick={() => navigate('/sales/invoices')} className="sales-btn sales-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginBottom: '.75rem' }}>
            Lihat Riwayat Nota
          </button>
          <button onClick={() => setSuccess(false)} className="sales-btn sales-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
            Buat Transaksi Lagi
          </button>
        </div>
      </main>
    );
  }

  // No active visit → show gate popup
  if (!activeVisit) {
    return (
      <main className="sales-home">
        <div className="sales-home-greeting">
          <div>
            <p className="sales-greeting-label">Order Taking</p>
            <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>Buat Transaksi</h1>
          </div>
          {!online && <span className="flex items-center gap-1 text-sales-red" style={{ fontSize: '.75rem' }}><WifiOff size={14} /> Offline</span>}
        </div>

        <div className="sales-step-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sales-amber-bg text-sales-amber-deep">
              <XCircle size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <strong className="text-sales-text-heading" style={{ fontSize: '.85rem' }}>Belum Ada Visit Aktif</strong>
              <p className="text-sales-muted" style={{ fontSize: '.75rem', marginTop: 2 }}>
                Anda harus check-in visit outlet terlebih dahulu sebelum bisa membuat transaksi.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/sales/visit')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sales-accent text-sales-surface border-none"
            style={{ marginTop: '.75rem', padding: '.7rem', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Buka Halaman Visit
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="sales-home" style={{ paddingBottom: '6rem', position: 'relative' }}>
      <style>{`
        .sales-modern-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(181, 89, 37, .45) transparent;
        }
        .sales-modern-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .sales-modern-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .sales-modern-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(181, 89, 37, .42);
          border-radius: 999px;
        }
        .sales-modern-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(181, 89, 37, .68);
        }
      `}</style>
      {/* Header */}
      <div className="sales-home-greeting">
        <div>
          <p className="sales-greeting-label">Order Taking</p>
          <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>Buat Transaksi</h1>
        </div>
        {!online && <span className="flex items-center gap-1 text-sales-red" style={{ fontSize: '.75rem' }}><WifiOff size={14} /> Offline</span>}
      </div>

      {/* Active Outlet Card */}
      <div className="flex items-center gap-3 rounded-2xl border border-sales-accent-bg bg-sales-bg p-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sales-accent text-sales-surface">
          <Store size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="text-sales-muted" style={{ fontSize: '.65rem', margin: 0 }}>Outlet Aktif</p>
          <p className="font-extrabold text-sales-text-heading truncate" style={{ fontSize: '.85rem', margin: 0 }}>
            {activeVisit.outletName || 'Outlet Kunjungan'}
          </p>
        </div>
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

      {/* Search */}
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
          {search && (
            <button
              type="button"
              aria-label="Bersihkan pencarian"
              onClick={() => setSearch('')}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-none bg-sales-surface-muted text-sales-muted"
              style={{ cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div ref={productGridRef} className="sales-modern-scrollbar grid grid-cols-3 gap-1" style={productGridStyle}>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}><Spinner /></div> :
          filteredProducts.map(p => {
            const availableStock = getSalesAvailableStock(p);
            const cartQty = cart.find(item => item.product.id === p.id)?.quantity ?? 0;
            const canAdd = availableStock > 0 && cartQty < availableStock;
            return (
              <div key={p.id} className="sales-card" style={{ margin: 0, borderRadius: 15, padding: '.65rem', display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
                <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-sales-bg" style={{ width: '100%', aspectRatio: '1' }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Package size={32} className="text-sales-accent" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong>
                  <span className="text-sales-muted" style={{ display: 'block', fontSize: '.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.sku}</span>
                  <span className={availableStock > 0 ? 'text-sales-success-light' : 'text-sales-red'} style={{ display: 'block', fontSize: '.68rem', fontWeight: 800, marginTop: '.15rem' }}>
                    Stok: {availableStock.toLocaleString('id-ID')} {p.unit}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: '.35rem' }}>
                  <span className="text-sales-accent" style={{ fontSize: '.78rem', fontWeight: 800, lineHeight: 1.15 }}>Rp {Number(p.priceDefault).toLocaleString('id-ID')}</span>
                  <button
                    onClick={() => addToCart(p)}
                    disabled={!canAdd}
                    className="flex items-center justify-center w-7 h-7 rounded-lg border border-sales-accent-bg bg-sales-bg text-sales-accent"
                    style={{ opacity: canAdd ? 1 : 0.45, cursor: canAdd ? 'pointer' : 'not-allowed' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        {!loading && filteredProducts.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState icon={<Package size={44} />} title="Produk tidak ditemukan" />
          </div>
        )}
      </div>

      {/* Cart Bottom Sheet */}
      {cart.length > 0 && (
        <div ref={cartSheetRef} className="fixed left-0 right-0 mx-auto border-t border-sales-border-brand bg-sales-surface z-50" style={{ maxWidth: '28rem', bottom: 64, borderTopLeftRadius: '24px', borderTopRightRadius: '24px', boxShadow: '0 -10px 28px var(--sales-shadow-cart)' }}>
          <button
            type="button"
            onClick={() => setCartExpanded((value) => !value)}
            className="flex w-full items-center justify-between border-none bg-transparent"
            style={{ padding: '.8rem 1rem .65rem', cursor: 'pointer' }}
            aria-expanded={cartExpanded}
          >
            <span className="flex items-center gap-2 text-sales-muted" style={{ fontSize: '.82rem', fontWeight: 700 }}>
              <ShoppingCart size={15} /> {cart.reduce((s, i) => s + i.quantity, 0)} Items
            </span>
            <span className="flex items-center gap-2">
              <strong className="text-sales-accent" style={{ fontSize: '1rem' }}>Rp {totalAmount.toLocaleString('id-ID')}</strong>
              {cartExpanded ? <ChevronDown size={18} className="text-sales-muted" /> : <ChevronUp size={18} className="text-sales-muted" />}
            </span>
          </button>

          {cartExpanded && (
            <div className="sales-modern-scrollbar" style={{ maxHeight: 'clamp(132px, 28vh, 210px)', overflowY: 'auto', padding: '0 1rem', overscrollBehavior: 'contain' }}>
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3" style={{ padding: '.45rem 0', borderBottom: '1px solid var(--sales-border, #f1f5f9)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="text-sales-text-heading truncate" style={{ fontSize: '.8rem', fontWeight: 600, margin: 0 }}>{item.product.name}</p>
                    <p className="text-sales-muted" style={{ fontSize: '.7rem', margin: 0 }}>Rp {Number(item.product.priceDefault).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product.id, -1)} className="flex items-center justify-center w-6 h-6 rounded-md bg-sales-surface-muted text-sales-text-label border-none" style={{ cursor: 'pointer', fontSize: '.9rem', fontWeight: 700 }}>-</button>
                    <span className="text-sales-text-heading" style={{ fontSize: '.85rem', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} disabled={item.quantity >= getSalesAvailableStock(item.product)} className="flex items-center justify-center w-6 h-6 rounded-md bg-sales-accent text-sales-surface border-none" style={{ cursor: item.quantity >= getSalesAvailableStock(item.product) ? 'not-allowed' : 'pointer', fontSize: '.9rem', fontWeight: 700, opacity: item.quantity >= getSalesAvailableStock(item.product) ? 0.45 : 1 }}>+</button>
                  </div>
                  <span className="text-sales-accent" style={{ fontSize: '.8rem', fontWeight: 700, minWidth: 70, textAlign: 'right' }}>
                    Rp {(Number(item.product.priceDefault) * item.quantity).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Cart Footer */}
          <div style={{ padding: cartExpanded ? '.75rem 1rem 1rem' : '0 1rem 1rem' }}>
            {/* Payment Method */}
            {cartExpanded && (
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="sales-select" style={{ width: '100%', fontSize: '.85rem', marginBottom: '.75rem' }}>
                <option value="cash">Tunai (Cash)</option>
                <option value="qris">QRIS</option>
                <option value="credit">Tempo (Kredit)</option>
                <option value="consignment">Titip Jual (Konsinyasi)</option>
              </select>
            )}

            {error && <div className="sales-alert sales-alert-error" style={{ marginBottom: '.75rem', padding: '.5rem', fontSize: '.8rem' }}>{error}</div>}

            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleBatal} className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-sales-surface text-sales-text-label" style={{ padding: '.7rem', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer' }}>
                <Trash2 size={16} /> Batal
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center justify-center gap-1.5 rounded-xl bg-sales-accent text-sales-surface border-none" style={{ padding: '.7rem', fontSize: '.85rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1 }}>
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                {submitting ? 'Mengirim...' : 'Kirim Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
