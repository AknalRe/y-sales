import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Package, Plus, Search, Send, CheckCircle2 } from 'lucide-react';
import { getOutlets, getProducts, createOrder } from '../../lib/api/client';
import { useAuth } from '../auth/auth-provider';
import { EmptyState, Spinner } from '../../components/ui';

type CartItem = {
  product: any;
  quantity: number;
};

export function TransactionsPage() {
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'credit' | 'consignment'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accessToken) {
      Promise.all([
        getProducts(accessToken),
        getOutlets(accessToken)
      ]).then(([pRes, oRes]) => {
        setProducts(pRes.products);
        setOutlets(oRes.outlets);
      }).finally(() => setLoading(false));
    }
  }, [accessToken]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.product.basePrice) * item.quantity), 0);
  }, [cart]);

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
    if (!accessToken || !selectedOutlet || cart.length === 0) return;
    setSubmitting(true);
    setError('');
    
    try {
      await createOrder(accessToken, {
        clientRequestId: crypto.randomUUID(),
        outletId: selectedOutlet,
        customerType: 'store',
        paymentMethod,
        items: cart.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.product.basePrice
        }))
      });
      setSuccess(true);
      setCart([]);
    } catch (e: any) {
      setError(e.message || 'Gagal mengirim transaksi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="sales-home">
        <div className="admin-card" style={{ padding: '3rem 2rem', textAlign: 'center', marginTop: '2rem' }}>
          <CheckCircle2 size={64} color="#34d399" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>Transaksi Terkirim!</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Order telah dikirim ke admin untuk verifikasi. Lanjutkan perjalanan Anda.</p>
          <button onClick={() => setSuccess(false)} className="admin-btn admin-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
            Buat Transaksi Lagi
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="sales-home" style={{ paddingBottom: cart.length > 0 ? '12rem' : '6rem' }}>
      <div className="sales-home-greeting">
        <div>
          <p className="sales-greeting-label">Order Taking</p>
          <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>Buat Transaksi</h1>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', background: 'rgba(255,255,255,.05)', padding: '.5rem 1rem', borderRadius: '1rem' }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Cari produk SKU atau nama..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '.9rem' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}><Spinner /></div> : 
         filteredProducts.map(p => (
          <div key={p.id} className="admin-card" style={{ padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <div style={{ width: '100%', aspectRatio: '1', background: 'rgba(255,255,255,.03)', borderRadius: '.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={32} color="#64748b" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong>
              <span style={{ fontSize: '.75rem', color: '#94a3b8' }}>{p.sku}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
              <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#34d399' }}>Rp {Number(p.basePrice).toLocaleString('id-ID')}</span>
              <button 
                onClick={() => addToCart(p)}
                style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(167,139,250,.15)', border: 'none', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        ))}
        {!loading && filteredProducts.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState icon="📦" title="Produk tidak ditemukan" />
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0f172a', borderTop: '1px solid rgba(255,255,255,.1)', padding: '1rem', zIndex: 50, maxWidth: '480px', margin: '0 auto', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', boxShadow: '0 -10px 25px rgba(0,0,0,.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '.9rem', color: '#94a3b8' }}><ShoppingCart size={16} style={{ display: 'inline', marginRight: '4px' }} /> {cart.reduce((s,i)=>s+i.quantity, 0)} Items</span>
            <strong style={{ fontSize: '1.25rem', color: '#34d399' }}>Rp {totalAmount.toLocaleString('id-ID')}</strong>
          </div>
          
          {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: '1rem', padding: '.5rem', fontSize: '.8rem' }}>{error}</div>}

          <div style={{ display: 'grid', gap: '.5rem', gridTemplateColumns: '1fr', marginBottom: '1rem' }}>
            <select value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)} className="admin-select" style={{ width: '100%', fontSize: '.85rem' }}>
              <option value="">-- Pilih Outlet Tujuan --</option>
              {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="admin-select" style={{ width: '100%', fontSize: '.85rem' }}>
              <option value="cash">Tunai (Cash)</option>
              <option value="qris">QRIS</option>
              <option value="credit">Tempo (Kredit)</option>
              <option value="consignment">Titip Jual (Konsinyasi)</option>
            </select>
          </div>

          <button onClick={handleSubmit} disabled={submitting || !selectedOutlet} className="admin-btn admin-btn-primary" style={{ width: '100%', padding: '1rem', justifyContent: 'center', borderRadius: '1rem', fontSize: '1rem' }}>
            {submitting ? <Spinner size={20} /> : <Send size={20} />} {submitting ? 'Mengirim...' : 'Kirim Order Sekarang'}
          </button>
        </div>
      )}
    </main>
  );
}
