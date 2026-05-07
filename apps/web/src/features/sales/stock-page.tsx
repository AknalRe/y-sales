import { useEffect, useMemo, useState } from 'react';
import { Boxes, RefreshCw, Package, Warehouse as WarehouseIcon, ArrowUpDown, AlertTriangle, Info, History, Filter } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { getWarehouses, type Warehouse } from '@/lib/api/tenant';
import { getPlatformCompanyView } from '@/lib/api/client';
import { EmptyState } from '@/components/ui';

type InventoryBalance = {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: string;
  warehouseTypeLabel?: string;
  productId: string;
  productSku: string;
  productName: string;
  quantity: string;
  reservedQuantity: string;
  updatedAt: string;
};

type InventoryMovement = {
  id: string;
  warehouseCode: string;
  productSku: string;
  productName: string;
  movementType: string;
  movementLabel?: string;
  quantityDelta: string;
  notes?: string | null;
  createdAt: string;
};

function formatQty(v: string | number) {
  const n = Number(v ?? 0);
  return n % 1 === 0 ? n.toLocaleString('id-ID') : n.toLocaleString('id-ID', { minimumFractionDigits: 2 });
}

function apiReq<T>(path: string, token: string): Promise<T> {
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  const companyView = getPlatformCompanyView();
  const headers: Record<string, string> = { 
    Authorization: `Bearer ${token}`, 
    'Content-Type': 'application/json' 
  };
  
  if (companyView?.companyId) {
    headers['X-Company-Id'] = companyView.companyId;
  }

  return fetch(`${base}${path}`, {
    headers,
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message ?? 'Error') }));
}

export function StockPage() {
  const { accessToken } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [selectedWH, setSelectedWH] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [tab, setTab] = useState<'stock' | 'movements'>('stock');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [whRes] = await Promise.all([
        getWarehouses(accessToken),
      ]);
      setWarehouses(whRes.warehouses ?? []);

      const q = selectedWH ? `?warehouseId=${selectedWH}` : '';
      const [balRes, movRes] = await Promise.all([
        apiReq<{ balances: InventoryBalance[] }>(`/inventory/balances${q}`, accessToken),
        apiReq<{ movements: InventoryMovement[] }>('/inventory/movements', accessToken),
      ]);
      setBalances(balRes.balances ?? []);
      setMovements(movRes.movements ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data stok.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken, selectedWH]);

  const filteredBalances = useMemo(() => {
    if (!searchProduct) return balances;
    const q = searchProduct.toLowerCase();
    return balances.filter(b =>
      b.productName.toLowerCase().includes(q) ||
      b.productSku.toLowerCase().includes(q)
    );
  }, [balances, searchProduct]);

  const stats = useMemo(() => {
    const totalProducts = new Set(balances.map(b => b.productId)).size;
    const lowStock = balances.filter(b => Number(b.quantity) < 10 && Number(b.quantity) > 0).length;
    const outOfStock = balances.filter(b => Number(b.quantity) === 0).length;
    const totalWH = warehouses.filter(w => w.status === 'active').length;
    return { totalProducts, lowStock, outOfStock, totalWH };
  }, [balances, warehouses]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Boxes size={24} style={{ color: '#b55925' }} />
            Manajemen Stok
          </h1>
          <p className="admin-page-subtitle">Monitor ketersediaan produk, mutasi barang, dan performa gudang secara real-time.</p>
        </div>
        <button 
          onClick={load} 
          className="admin-btn-ghost" 
          style={{ padding: '.6rem', borderRadius: 14 }}
          disabled={loading}
        >
          <RefreshCw size={20} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: '1.5rem', borderRadius: 16 }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Modern Stats Row */}
      <div className="admin-stats-row" style={{ gap: '1rem', marginBottom: '2rem' }}>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><WarehouseIcon size={20} /></div>
          <div>
            <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Gudang Aktif</span>
            <strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{stats.totalWH}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}><Package size={20} /></div>
          <div>
            <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Total Produk</span>
            <strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{stats.totalProducts}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}><AlertTriangle size={20} /></div>
          <div>
            <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Stok Rendah</span>
            <strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{stats.lowStock}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><Boxes size={20} /></div>
          <div>
            <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Stok Habis</span>
            <strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{stats.outOfStock}</strong>
          </div>
        </div>
      </div>

      {/* Premium Filter Row */}
      <div className="admin-filter-row" style={{ background: '#fff', padding: '1rem', borderRadius: 20, marginBottom: '1.5rem', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="admin-filter-group" style={{ background: '#f8fafc', padding: '.25rem .75rem', borderRadius: 12 }}>
            <WarehouseIcon size={16} style={{ color: '#64748b' }} />
            <select value={selectedWH} onChange={e => setSelectedWH(e.target.value)} className="admin-select" style={{ border: 'none', background: 'transparent' }}>
              <option value="">Semua Gudang</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
          {tab === 'stock' && (
            <div className="admin-filter-group" style={{ background: '#f8fafc', padding: '.25rem .75rem', borderRadius: 12 }}>
              <Package size={16} style={{ color: '#64748b' }} />
              <input
                type="text"
                placeholder="Cari SKU atau nama produk..."
                value={searchProduct}
                onChange={e => setSearchProduct(e.target.value)}
                className="admin-input"
                style={{ border: 'none', background: 'transparent', minWidth: 200 }}
              />
            </div>
          )}
        </div>
        <div className="admin-tab-group" style={{ background: '#f1f5f9', padding: '.3rem', borderRadius: 14 }}>
          <button onClick={() => setTab('stock')} className={`admin-tab ${tab === 'stock' ? 'active' : ''}`} style={{ borderRadius: 11, fontSize: '.85rem' }}>
            <Boxes size={14} /> Stok Saat Ini
          </button>
          <button onClick={() => setTab('movements')} className={`admin-tab ${tab === 'movements' ? 'active' : ''}`} style={{ borderRadius: 11, fontSize: '.85rem' }}>
            <History size={14} /> Riwayat Mutasi
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p style={{ color: '#64748b', fontWeight: 600 }}>Menghitung inventaris...</p>
          </div>
        ) : tab === 'stock' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Informasi Produk</th>
                  <th>Gudang</th>
                  <th style={{ textAlign: 'right' }}>Total Qty</th>
                  <th style={{ textAlign: 'right' }}>Reserved</th>
                  <th style={{ textAlign: 'right' }}>Tersedia</th>
                  <th>Update Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map(b => {
                  const qty = Number(b.quantity);
                  const reserved = Number(b.reservedQuantity);
                  const available = qty - reserved;
                  const isLow = qty > 0 && qty < 10;
                  const isEmpty = qty === 0;
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                          <div style={{ width: 36, height: 36, background: isEmpty ? '#fef2f2' : isLow ? '#fffbeb' : '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#b55925', border: '1px solid #f1f5f9' }}>
                            {b.productName.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '.9rem' }}>{b.productName}</div>
                            <code style={{ fontSize: '.72rem', color: '#94a3b8' }}>{b.productSku}</code>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{b.warehouseName}</div>
                        <div style={{ fontSize: '.72rem', color: '#94a3b8' }}>{b.warehouseTypeLabel ?? b.warehouseType}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: isEmpty ? '#ef4444' : '#0f172a', fontSize: '1rem' }}>{formatQty(b.quantity)}</strong>
                      </td>
                      <td style={{ textAlign: 'right', color: '#94a3b8' }}>{formatQty(b.reservedQuantity)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ background: available <= 0 ? '#fef2f2' : '#ecfdf5', color: available <= 0 ? '#ef4444' : '#10b981', padding: '.25rem .5rem', borderRadius: 8, display: 'inline-block', fontWeight: 800 }}>
                          {formatQty(available)}
                        </div>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '.8rem' }}>
                        {new Date(b.updatedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
                {!filteredBalances.length && (
                  <EmptyState colSpan={6} icon="📦" title="Stok Kosong" description="Tidak ada data produk yang ditemukan untuk kriteria ini." />
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Produk</th>
                  <th>Gudang</th>
                  <th>Tipe Mutasi</th>
                  <th style={{ textAlign: 'right' }}>Perubahan</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => {
                  const delta = Number(m.quantityDelta);
                  const isOut = delta < 0;
                  return (
                    <tr key={m.id}>
                      <td style={{ color: '#64748b', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.productName}</div>
                        <code style={{ fontSize: '.72rem', color: '#94a3b8' }}>{m.productSku}</code>
                      </td>
                      <td><div style={{ fontWeight: 600, color: '#334155' }}>{m.warehouseCode}</div></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', color: isOut ? '#ef4444' : '#10b981', fontWeight: 700, fontSize: '.8rem' }}>
                          <ArrowUpDown size={13} />
                          {m.movementLabel ?? m.movementType}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: isOut ? '#ef4444' : '#10b981', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                          {isOut ? '' : '+'}{formatQty(m.quantityDelta)}
                        </strong>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '.82rem', maxWidth: 200 }}>{m.notes ?? '—'}</td>
                    </tr>
                  );
                })}
                {!movements.length && (
                  <EmptyState colSpan={6} icon="📋" title="Belum ada Mutasi" description="Riwayat pergerakan stok akan muncul di sini." />
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warehouse Summary Cards (Only in Stock Tab) */}
      {tab === 'stock' && warehouses.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
          {warehouses.filter(w => w.status === 'active').map(w => {
            const whBalances = balances.filter(b => b.warehouseId === w.id);
            const totalQty = whBalances.reduce((s, b) => s + Number(b.quantity), 0);
            const skuCount = whBalances.length;
            return (
              <div key={w.id} className="admin-card" style={{ margin: 0, padding: '1.5rem', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
                  <WarehouseIcon size={80} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div>
                    <strong style={{ color: '#0f172a', fontSize: '1.1rem', display: 'block' }}>{w.name}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', marginTop: '.2rem' }}>
                      <span className="admin-badge" style={{ background: '#f8fafc', color: '#64748b', fontSize: '.65rem' }}>{w.code}</span>
                      <span className="admin-badge" style={{ background: '#f8fafc', color: '#64748b', fontSize: '.65rem' }}>{w.type.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.25rem' }}>Total Kuantitas</div>
                    <strong style={{ color: '#0f172a', fontSize: '1.4rem' }}>{formatQty(totalQty)}</strong>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.25rem' }}>Item SKU</div>
                    <strong style={{ color: '#0f172a', fontSize: '1.4rem' }}>{skuCount}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
