import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, ShoppingCart, Package, Plus, Search, Send, CheckCircle2, Trash2, RefreshCw, Loader2, WifiOff, Store, X, XCircle, UserCheck, User, Phone, MapPin, Compass } from 'lucide-react';
import { getProducts, createOrder } from '../../../lib/api/tenant';
import { getActiveVisitSession } from '../../../lib/api/client';
import { useAuth } from '../../auth/auth-provider';
import { EmptyState, Spinner } from '../../../components/ui';
import { enqueueTransaction, getTransactionQueueCount } from '../../../lib/offline/transaction-queue';
import { syncTransactionQueue } from '../../../lib/offline/sync-transactions';
import { useScrollToTop } from '../../../hooks/use-scroll-to-top';
import { SalesAlert, showSalesAlertToast } from '../ui/sales-alert';

const activeVisitStorageKey = 'yuksales.sales.activeVisit';
const transactionDraftStorageKey = 'yuksales.sales.transactionDraft';
const endUserInfoStorageKey = 'yuksales.sales.endUserInfo';

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

type EndUserInfo = {
  name: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
};

type TransactionDraft = {
  visitId?: string;
  outletId?: string;
  paymentMethod: 'cash' | 'qris' | 'credit' | 'consignment';
  cart: CartItem[];
};

export function TransactionsPage() {
  useScrollToTop();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const cartSheetRef = useRef<HTMLDivElement | null>(null);
  const productGridRef = useRef<HTMLDivElement | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  const categories = useMemo(() => {
    const catSet = new Set<string>();
    products.forEach((p) => {
      catSet.add(p.category || 'Umum'); // null/undefined → 'Umum'
    });
    return ['Semua', ...Array.from(catSet).sort()];
  }, [products]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Semua: products.length };
    products.forEach((p) => {
      const cat = p.category || 'Umum';
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return counts;
  }, [products]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeVisit, setActiveVisit] = useState<ActiveVisit | null>(null);
  const [transactionMode, setTransactionMode] = useState<'store' | 'end_user'>('store');
  const [endUserInfo, setEndUserInfo] = useState<EndUserInfo | null>(null);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showEndUserFormModal, setShowEndUserFormModal] = useState(false);
  const [endUserNameInput, setEndUserNameInput] = useState('');
  const [endUserPhoneInput, setEndUserPhoneInput] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
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
    showSalesAlertToast(offlineMessage);
  }, [offlineMessage]);

  useEffect(() => {
    showSalesAlertToast(error, 'error');
  }, [error]);

  useEffect(() => {
    let cancelled = false;

    async function syncActiveVisit() {
      const rawEndUser = localStorage.getItem(endUserInfoStorageKey);
      let parsedEndUser: EndUserInfo | null = null;
      if (rawEndUser) {
        try {
          parsedEndUser = JSON.parse(rawEndUser) as EndUserInfo;
          if (parsedEndUser?.name) {
            setEndUserInfo(parsedEndUser);
          }
        } catch {
          localStorage.removeItem(endUserInfoStorageKey);
        }
      }

      const raw = localStorage.getItem(activeVisitStorageKey);
      if (raw) {
        try {
          const visit = JSON.parse(raw) as ActiveVisit;
          if (!cancelled) {
            setActiveVisit(visit);
            setTransactionMode('store');
          }
        } catch {
          localStorage.removeItem(activeVisitStorageKey);
          if (!cancelled) {
            setActiveVisit(null);
            if (parsedEndUser) setTransactionMode('end_user');
          }
        }
      } else if (accessToken) {
        try {
          const res = await getActiveVisitSession(accessToken);
          if (!cancelled) {
            if (res.activeVisit) {
              const visit: ActiveVisit = {
                id: res.activeVisit.id,
                outletId: res.activeVisit.outletId,
                outletName: res.activeVisit.outletName ?? undefined,
                scheduleId: res.activeVisit.scheduleId ?? undefined,
              };
              localStorage.setItem(activeVisitStorageKey, JSON.stringify(visit));
              setActiveVisit(visit);
              setTransactionMode('store');
            } else {
              setActiveVisit(null);
              if (parsedEndUser) setTransactionMode('end_user');
            }
          }
        } catch {
          if (!cancelled) {
            setActiveVisit(null);
            if (parsedEndUser) setTransactionMode('end_user');
          }
        }
      } else {
        if (!cancelled) {
          setActiveVisit(null);
          if (parsedEndUser) setTransactionMode('end_user');
        }
      }

      // Unconditionally restore draft cart & payment method if present
      const draftRaw = localStorage.getItem(transactionDraftStorageKey);
      if (draftRaw) {
        try {
          const draft = JSON.parse(draftRaw) as TransactionDraft;
          if (Array.isArray(draft.cart) && draft.cart.length > 0 && !cancelled) {
            setCart(draft.cart);
          }
          if (draft.paymentMethod && !cancelled) {
            setPaymentMethod(draft.paymentMethod);
          }
        } catch {
          localStorage.removeItem(transactionDraftStorageKey);
        }
      }

      if (!cancelled) setDraftReady(true);
    }

    syncActiveVisit();

    if (accessToken) {
      getProducts(accessToken)
        .then(res => setProducts(res.products))
        .catch(e => setError(e.message || 'Gagal memuat produk.'))
        .finally(() => setLoading(false));
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === activeVisitStorageKey) {
        if (e.newValue) {
          try {
            const visit = JSON.parse(e.newValue) as ActiveVisit;
            setActiveVisit(visit);
            setTransactionMode('store');
          } catch { /* invalid json */ }
        } else {
          setActiveVisit(null);
        }
      }
      if (e.key === endUserInfoStorageKey) {
        if (e.newValue) {
          try {
            const info = JSON.parse(e.newValue) as EndUserInfo;
            setEndUserInfo(info);
          } catch { /* invalid json */ }
        } else {
          setEndUserInfo(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [accessToken, location.pathname]);

  useEffect(() => {
    if (!draftReady) return;
    if (cart.length === 0) {
      localStorage.removeItem(transactionDraftStorageKey);
      return;
    }
    const draft: TransactionDraft = {
      visitId: activeVisit?.id,
      outletId: activeVisit?.outletId,
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
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const productCat = p.category || 'Umum';
      const matchesCategory = selectedCategory === 'Semua' || productCat === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

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

  function handleSaveEndUser(name: string, phone: string) {
    if (!name.trim()) return;
    setGettingLocation(true);
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    const saveAndClose = (latitude?: number, longitude?: number, accuracy?: number) => {
      const info: EndUserInfo = {
        name: trimmedName,
        phone: trimmedPhone || undefined,
        latitude,
        longitude,
        accuracy,
      };
      setEndUserInfo(info);
      localStorage.setItem(endUserInfoStorageKey, JSON.stringify(info));
      setTransactionMode('end_user');
      setShowEndUserFormModal(false);
      setShowChoiceModal(false);
      setGettingLocation(false);
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => saveAndClose(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        (err) => {
          console.warn('[EndUser] Geolocation position error:', err);
          saveAndClose();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      saveAndClose();
    }
  }

  async function handleSubmit() {
    if (!accessToken || cart.length === 0) return;

    if (transactionMode === 'store' && !activeVisit) {
      setError('Sesi visit outlet belum aktif. Silakan check-in kunjungan toko terlebih dahulu.');
      return;
    }

    if (transactionMode === 'end_user' && !endUserInfo) {
      setError('Data konsumen (end user) belum diisi.');
      return;
    }

    setSubmitting(true);
    setError('');

    const orderPayload = transactionMode === 'end_user'
      ? {
          clientRequestId: crypto.randomUUID(),
          customerType: 'end_user' as const,
          endUserName: endUserInfo!.name,
          endUserPhone: endUserInfo!.phone || undefined,
          latitude: endUserInfo!.latitude,
          longitude: endUserInfo!.longitude,
          paymentMethod,
          items: cart.map(i => ({
            productId: i.product.id,
            quantity: String(i.quantity),
            unitPrice: String(i.product.priceDefault)
          }))
        }
      : {
          clientRequestId: crypto.randomUUID(),
          outletId: activeVisit!.outletId,
          visitSessionId: activeVisit!.id,
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
      if (transactionMode === 'end_user') {
        localStorage.removeItem(endUserInfoStorageKey);
        setEndUserInfo(null);
      }
      setSuccess(true);
      setCart([]);
    } catch (e: any) {
      if (!navigator.onLine || e.message === 'offline') {
        await enqueueTransaction({ type: 'create-order', accessToken, payload: orderPayload });
        await refreshQueueCount();
        localStorage.removeItem(transactionDraftStorageKey);
        if (transactionMode === 'end_user') {
          localStorage.removeItem(endUserInfoStorageKey);
          setEndUserInfo(null);
        }
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

  if (loading) {
    return (
      <main className="sales-home" style={{ minHeight: '65vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '.75rem', padding: '2rem', textAlign: 'center' }}>
          <Loader2 size={36} className="animate-spin text-sales-accent" />
          <span style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--sales-muted)' }}>Memuat data transaksi...</span>
        </div>
      </main>
    );
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

  // Gate Choice Screen if no active visit AND no active End User session
  if (!activeVisit && (!endUserInfo || transactionMode !== 'end_user')) {
    return (
      <main className="sales-home">
        <div className="sales-home-greeting">
          <div>
            <p className="sales-greeting-label">Buat Order</p>
            <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>Pilih Jenis Transaksi</h1>
          </div>
          {!online && <span className="flex items-center gap-1 text-sales-red" style={{ fontSize: '.75rem' }}><WifiOff size={14} /> Offline</span>}
        </div>

        <p className="text-sales-muted mb-4" style={{ fontSize: '.8rem', lineHeight: 1.4 }}>
          Silakan pilih kategori transaksi penjualan yang ingin Anda proses saat ini:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
          {/* Option 1: Transaksi Outlet (Store) */}
          <div
            onClick={() => navigate('/sales/visit')}
            className="sales-card flex items-center gap-3.5 p-4 rounded-2xl border border-sales-accent-bg bg-sales-surface cursor-pointer hover:border-sales-accent transition-all shadow-sm"
            style={{ cursor: 'pointer' }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sales-accent text-sales-surface">
              <Store size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 className="font-extrabold text-sales-text-heading" style={{ fontSize: '.95rem', margin: 0 }}>
                1. Transaksi Outlet (Toko / Agen)
              </h3>
              <p className="text-sales-muted" style={{ fontSize: '.75rem', marginTop: 4, marginBottom: 0, lineHeight: 1.3 }}>
                Wajib absen visit toko terlebih dahulu. Pilih dari jadwal atau buat toko baru.
              </p>
            </div>
          </div>

          {/* Option 2: Transaksi End User */}
          <div
            onClick={() => {
              setEndUserNameInput('');
              setEndUserPhoneInput('');
              setShowEndUserFormModal(true);
            }}
            className="sales-card flex items-center gap-3.5 p-4 rounded-2xl border border-sales-emerald/40 bg-sales-surface cursor-pointer hover:border-sales-emerald transition-all shadow-sm"
            style={{ cursor: 'pointer' }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sales-emerald-bg text-sales-emerald">
              <UserCheck size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 className="font-extrabold text-sales-text-heading" style={{ fontSize: '.95rem', margin: 0 }}>
                2. Transaksi Pengguna Langsung (End User)
              </h3>
              <p className="text-sales-muted" style={{ fontSize: '.75rem', marginTop: 4, marginBottom: 0, lineHeight: 1.3 }}>
                Penjualan langsung ke konsumen akhir tanpa melalui sesi visit outlet toko.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Input Data End User */}
        {showEndUserFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-3xl bg-sales-surface p-5 shadow-2xl border border-sales-accent-bg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sales-emerald-bg text-sales-emerald">
                    <UserCheck size={18} />
                  </div>
                  <h3 className="font-extrabold text-sales-text-heading" style={{ fontSize: '1rem', margin: 0 }}>Data Konsumen / End User</h3>
                </div>
                <button onClick={() => setShowEndUserFormModal(false)} className="text-sales-muted bg-transparent border-none p-1 cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="block text-xs font-bold text-sales-muted mb-1">Nama Konsumen / Pembeli *</label>
                  <div className="flex items-center gap-2 rounded-xl border border-sales-border-brand bg-sales-surface-input px-3 py-2.5">
                    <User size={18} className="text-sales-brand-muted shrink-0" />
                    <input
                      type="text"
                      placeholder="Masukkan nama konsumen..."
                      value={endUserNameInput}
                      onChange={(e) => setEndUserNameInput(e.target.value)}
                      className="bg-transparent border-none text-sales-foreground outline-none w-full text-sm font-semibold"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-sales-muted mb-1">Nomor Telepon / WhatsApp (Opsional)</label>
                  <div className="flex items-center gap-2 rounded-xl border border-sales-border-brand bg-sales-surface-input px-3 py-2.5">
                    <Phone size={18} className="text-sales-brand-muted shrink-0" />
                    <input
                      type="tel"
                      placeholder="Contoh: 081234567890"
                      value={endUserPhoneInput}
                      onChange={(e) => setEndUserPhoneInput(e.target.value)}
                      className="bg-transparent border-none text-sales-foreground outline-none w-full text-sm"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-sales-accent-bg/40 p-3 text-xs text-sales-muted flex items-start gap-2">
                  <MapPin size={16} className="text-sales-accent shrink-0 mt-0.5" />
                  <span>Sistem akan otomatis mengabadikan koordinat lokasi GPS transaksi Anda untuk laporan admin.</span>
                </div>

                <button
                  disabled={!endUserNameInput.trim() || gettingLocation}
                  onClick={() => handleSaveEndUser(endUserNameInput, endUserPhoneInput)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-sales-accent text-sales-surface py-3 font-bold text-sm border-none cursor-pointer disabled:opacity-50"
                  style={{ marginTop: '.5rem' }}
                >
                  {gettingLocation ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Mengambil Lokasi GPS...
                    </>
                  ) : (
                    'Mulai Transaksi'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
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
        .sales-chips-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
        }
        .sales-chips-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Header */}
      <div className="sales-home-greeting">
        <div>
          <p className="sales-greeting-label">Buat Order</p>
          <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>Buat Transaksi</h1>
        </div>
        {!online && <span className="flex items-center gap-1 text-sales-red" style={{ fontSize: '.75rem' }}><WifiOff size={14} /> Offline</span>}
      </div>

      {/* Target Preview Banner (Store vs End User) */}
      {transactionMode === 'store' && activeVisit ? (
        <div className="flex flex-col rounded-3xl border border-sales-accent-bg bg-sales-surface p-3 mb-2.5 shadow-sm gap-2.5">
          {/* Top Row: Store Avatar & Store Name */}
          <div className="flex items-center gap-3 w-full" style={{ minWidth: 0 }}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sales-accent text-sales-surface shadow-xs">
              <Store size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="text-sales-accent font-extrabold text-[11px] block mb-0.5 leading-none">
                Outlet Kunjungan (Toko / Agen)
              </span>
              <h4 className="font-extrabold text-sales-text-heading text-sm margin-0 truncate" style={{ margin: 0 }}>
                {activeVisit.outletName || 'Outlet Kunjungan'}
              </h4>
            </div>
          </div>

          {/* Bottom Row: Equal 2-Button Row (Ubah Outlet & Ke End User) */}
          <div className="grid grid-cols-2 gap-2 w-full pt-1.5 border-t border-sales-border">
            <button
              type="button"
              onClick={() => navigate('/sales/visit')}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-sales-accent/40 bg-sales-surface py-2 px-3 text-sales-accent text-xs font-extrabold shadow-xs hover:bg-sales-accent-bg transition-all cursor-pointer"
            >
              <Store size={15} /> Ubah Outlet
            </button>
            <button
              type="button"
              onClick={() => {
                if (endUserInfo) {
                  setTransactionMode('end_user');
                } else {
                  setEndUserNameInput('');
                  setEndUserPhoneInput('');
                  setShowEndUserFormModal(true);
                }
              }}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-sales-emerald/40 bg-sales-emerald-bg/20 py-2 px-3 text-sales-emerald text-xs font-extrabold shadow-xs hover:bg-sales-emerald-bg transition-all cursor-pointer"
            >
              <UserCheck size={15} /> Ke End User
            </button>
          </div>
        </div>
      ) : transactionMode === 'end_user' && endUserInfo ? (
        <div className="flex flex-col rounded-3xl border border-sales-emerald/40 bg-sales-emerald-bg/20 p-3 mb-2.5 shadow-sm gap-2.5">
          {/* Top Row: Buyer Avatar & Information */}
          <div className="flex items-center gap-3 w-full" style={{ minWidth: 0 }}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sales-emerald text-sales-surface shadow-xs">
              <UserCheck size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="text-sales-emerald font-extrabold text-[11px] leading-none">
                  Pengguna Langsung (End User)
                </span>
                {endUserInfo.latitude && endUserInfo.longitude ? (
                  <span className="inline-flex items-center gap-0.5 text-sales-emerald font-extrabold text-[9px] bg-sales-emerald-bg px-2 py-0.5 rounded-full border border-sales-emerald/30">
                    <MapPin size={9} /> GPS: {endUserInfo.latitude.toFixed(3)}, {endUserInfo.longitude.toFixed(3)}
                  </span>
                ) : (
                  <span className="text-sales-amber-deep font-bold text-[9px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    GPS Pending
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sales-text-heading text-sm margin-0 truncate" style={{ margin: 0 }}>
                {endUserInfo.name} {endUserInfo.phone ? `(${endUserInfo.phone})` : ''}
              </h4>
            </div>
          </div>

          {/* Bottom Row: Equal 2-Button Row (Ubah & Ke Outlet) */}
          <div className="grid grid-cols-2 gap-2 w-full pt-1.5 border-t border-sales-emerald/20">
            <button
              type="button"
              onClick={() => {
                setEndUserNameInput(endUserInfo.name);
                setEndUserPhoneInput(endUserInfo.phone || '');
                setShowEndUserFormModal(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-sales-emerald/40 bg-sales-surface py-2 px-3 text-sales-emerald text-xs font-extrabold shadow-xs hover:bg-sales-emerald-bg transition-all cursor-pointer"
            >
              <User size={15} /> Ubah
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeVisit) {
                  setTransactionMode('store');
                } else {
                  navigate('/sales/visit');
                }
              }}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-sales-accent/40 bg-sales-accent-bg py-2 px-3 text-sales-accent text-xs font-extrabold shadow-xs hover:bg-sales-accent/20 transition-all cursor-pointer"
            >
              <Store size={15} /> Ke Outlet
            </button>
          </div>
        </div>
      ) : null}

      {/* End User Form Modal inside Transaction Page */}
      {showEndUserFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-sales-surface p-5 shadow-2xl border border-sales-accent-bg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sales-emerald-bg text-sales-emerald">
                  <UserCheck size={18} />
                </div>
                <h3 className="font-extrabold text-sales-text-heading" style={{ fontSize: '1rem', margin: 0 }}>Data Konsumen / End User</h3>
              </div>
              <button onClick={() => setShowEndUserFormModal(false)} className="text-sales-muted bg-transparent border-none p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="block text-xs font-bold text-sales-muted mb-1">Nama Konsumen / Pembeli *</label>
                <div className="flex items-center gap-2 rounded-xl border border-sales-border-brand bg-sales-surface-input px-3 py-2.5">
                  <User size={18} className="text-sales-brand-muted shrink-0" />
                  <input
                    type="text"
                    placeholder="Masukkan nama konsumen..."
                    value={endUserNameInput}
                    onChange={(e) => setEndUserNameInput(e.target.value)}
                    className="bg-transparent border-none text-sales-foreground outline-none w-full text-sm font-semibold"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sales-muted mb-1">Nomor Telepon / WhatsApp (Opsional)</label>
                <div className="flex items-center gap-2 rounded-xl border border-sales-border-brand bg-sales-surface-input px-3 py-2.5">
                  <Phone size={18} className="text-sales-brand-muted shrink-0" />
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={endUserPhoneInput}
                    onChange={(e) => setEndUserPhoneInput(e.target.value)}
                    className="bg-transparent border-none text-sales-foreground outline-none w-full text-sm"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-sales-accent-bg/40 p-3 text-xs text-sales-muted flex items-start gap-2">
                <MapPin size={16} className="text-sales-accent shrink-0 mt-0.5" />
                <span>Sistem akan otomatis merekam lokasi GPS transaksi Anda untuk pelaporan admin.</span>
              </div>

              <button
                disabled={!endUserNameInput.trim() || gettingLocation}
                onClick={() => handleSaveEndUser(endUserNameInput, endUserPhoneInput)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sales-accent text-sales-surface py-3 font-bold text-sm border-none cursor-pointer disabled:opacity-50"
                style={{ marginTop: '.5rem' }}
              >
                {gettingLocation ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Mengambil Lokasi GPS...
                  </>
                ) : (
                  'Simpan & Lanjutkan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {queueCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-sales-accent-bg bg-sales-bg px-3 py-2 mb-2">
          <span className="text-sales-accent" style={{ fontSize: '.8rem' }}>{queueCount} transaksi menunggu sync</span>
          <button onClick={handleSyncQueue} disabled={syncing || !navigator.onLine} className="flex items-center gap-1 text-sales-accent" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync
          </button>
        </div>
      )}

      <SalesAlert message={offlineMessage} onClose={() => setOfflineMessage('')} />

      {/* Search + Category Filter — single wrapper to avoid stacking context issues */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {/* Search */}
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

        {/* Category Filter Chips */}
        {categories.length > 1 && (
          <div
            className="sales-chips-scroll flex gap-2 overflow-x-auto"
            style={{ paddingBottom: '2px' }}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = categoryCounts[cat] ?? 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className="shrink-0 flex items-center gap-1.5 rounded-full font-bold transition-all"
                  style={{
                    padding: '.35rem .85rem',
                    fontSize: '.75rem',
                    backgroundColor: isSelected ? 'var(--sales-accent)' : 'var(--sales-surface)',
                    color: isSelected ? '#fff' : 'var(--sales-text-heading)',
                    border: isSelected ? '1.5px solid var(--sales-accent)' : '1.5px solid var(--sales-border-brand)',
                    boxShadow: isSelected ? '0 2px 8px rgba(181,89,37,.28)' : 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 18,
                      height: 18,
                      borderRadius: 99,
                      fontSize: '.65rem',
                      fontWeight: 800,
                      padding: '0 5px',
                      backgroundColor: isSelected ? 'rgba(255,255,255,.25)' : 'var(--sales-accent-bg)',
                      color: isSelected ? '#fff' : 'var(--sales-accent)',
                      lineHeight: 1,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
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
                  <span className="text-sales-accent" style={{ display: 'block', fontSize: '.65rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(p as any).category || 'Umum'}</span>
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
