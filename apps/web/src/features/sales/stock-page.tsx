import { useEffect, useMemo, useState } from 'react';
import { Boxes, RefreshCw, Package, Warehouse as WarehouseIcon, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { getWarehouses, type Warehouse } from '@/lib/api/tenant';
import { TableSkeleton, EmptyState } from '@/components/ui';

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
  return fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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

      // Load balances & movements
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

  // warehouseMap not used directly — warehouse lookup is inline below

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><Boxes size={22} /> Manajemen Stok</h1>
          <p className="admin-page-subtitle">Monitor stok produk di semua gudang, transfer, dan riwayat pergerakan stok.</p>
        </div>
        <button onClick={load} className="admin-btn admin-btn-ghost" type="button"><RefreshCw size={15} /> Refresh</button>
      </div>

      {error && <div className="admin-alert admin-alert-error"><AlertTriangle size={15} /> {error}</div>}

      {/* Stats */}
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#60a5fa' }}><WarehouseIcon size={18} /></div>
          <div><span>Gudang Aktif</span><strong>{stats.totalWH}</strong></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#a78bfa' }}><Package size={18} /></div>
          <div><span>Total Produk</span><strong>{stats.totalProducts}</strong></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#fbbf24' }}><AlertTriangle size={18} /></div>
          <div><span>Stok Rendah</span><strong>{stats.lowStock}</strong></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#f87171' }}><Boxes size={18} /></div>
          <div><span>Habis</span><strong>{stats.outOfStock}</strong></div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filter-row">
        <div className="admin-filter-group">
          <WarehouseIcon size={14} />
          <select value={selectedWH} onChange={e => setSelectedWH(e.target.value)} className="admin-select">
            <option value="">Semua Gudang</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>
        </div>
        {tab === 'stock' && (
          <div className="admin-filter-group">
            <Package size={14} />
            <input
              type="text"
              placeholder="Cari produk/SKU..."
              value={searchProduct}
              onChange={e => setSearchProduct(e.target.value)}
              className="admin-input"
              style={{ minWidth: 200 }}
            />
          </div>
        )}
        <div className="admin-tab-group">
          <button onClick={() => setTab('stock')} className={`admin-tab ${tab === 'stock' ? 'active' : ''}`}>Stok Saat Ini</button>
          <button onClick={() => setTab('movements')} className={`admin-tab ${tab === 'movements' ? 'active' : ''}`}>Riwayat Mutasi</button>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Produk</th><th>SKU</th><th>Gudang</th><th>Tipe</th><th>Qty</th><th>Reserved</th><th>Tersedia</th><th>Update</th></tr></thead>
              <tbody><TableSkeleton rows={6} cols={8} /></tbody>
            </table>
          </div>
        ) : tab === 'stock' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>SKU</th>
                  <th>Gudang</th>
                  <th>Tipe Gudang</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          {isEmpty && <span title="Stok habis" style={{ color: '#f87171', fontSize: '.75rem' }}>●</span>}
                          {isLow && !isEmpty && <span title="Stok rendah" style={{ color: '#fbbf24', fontSize: '.75rem' }}>●</span>}
                          <strong style={{ color: isEmpty ? '#f87171' : isLow ? '#fbbf24' : '#e2e8f0' }}>
                            {b.productName}
                          </strong>
                        </div>
                      </td>
                      <td><code style={{ fontSize: '.78rem', color: '#94a3b8' }}>{b.productSku}</code></td>
                      <td>{b.warehouseName}</td>
                      <td>
                        <span className="admin-badge" style={{ background: 'rgba(99,179,237,.12)', color: '#93c5fd', border: '1px solid rgba(99,179,237,.2)' }}>
                          {b.warehouseTypeLabel ?? b.warehouseType}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: isEmpty ? '#f87171' : '#e2e8f0' }}>{formatQty(b.quantity)}</strong>
                      </td>
                      <td style={{ textAlign: 'right', color: '#94a3b8' }}>{formatQty(b.reservedQuantity)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: available <= 0 ? '#f87171' : '#4ade80' }}>{formatQty(available)}</strong>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '.8rem' }}>
                        {new Date(b.updatedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
                {!filteredBalances.length && (
                  <EmptyState colSpan={8} icon="📦" title="Tidak ada data stok" description="Belum ada produk di gudang ini." />
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
                  <th>Jenis</th>
                  <th style={{ textAlign: 'right' }}>Delta Qty</th>
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
                        <strong>{m.productName}</strong>
                        <small style={{ display: 'block', color: '#64748b', fontSize: '.73rem' }}>{m.productSku}</small>
                      </td>
                      <td><code style={{ fontSize: '.78rem', color: '#94a3b8' }}>{m.warehouseCode}</code></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                          <ArrowUpDown size={13} style={{ color: isOut ? '#f87171' : '#4ade80' }} />
                          <span style={{ color: isOut ? '#f87171' : '#4ade80', fontSize: '.8rem' }}>
                            {m.movementLabel ?? m.movementType}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: isOut ? '#f87171' : '#4ade80', fontFamily: 'monospace' }}>
                          {isOut ? '' : '+'}{formatQty(m.quantityDelta)}
                        </strong>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '.82rem', maxWidth: 200 }}>{m.notes ?? '—'}</td>
                    </tr>
                  );
                })}
                {!movements.length && (
                  <EmptyState colSpan={6} icon="📋" title="Belum ada mutasi stok" description="Riwayat mutasi akan muncul setelah ada pergerakan stok." />
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warehouse Summary Cards */}
      {tab === 'stock' && warehouses.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '.75rem', marginTop: '.5rem' }}>
          {warehouses.filter(w => w.status === 'active').map(w => {
            const whBalances = balances.filter(b => b.warehouseId === w.id);
            const totalQty = whBalances.reduce((s, b) => s + Number(b.quantity), 0);
            const skuCount = whBalances.length;
            return (
              <div key={w.id} className="admin-card" style={{ margin: 0, padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                  <div>
                    <strong style={{ color: '#e2e8f0', fontSize: '.95rem' }}>{w.name}</strong>
                    <small style={{ display: 'block', color: '#64748b', fontSize: '.73rem' }}>{w.code} · {w.type}</small>
                  </div>
                  <WarehouseIcon size={20} style={{ color: '#60a5fa', opacity: .7 }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Total Qty</div>
                    <strong style={{ color: '#fff', fontSize: '1.1rem' }}>{formatQty(totalQty)}</strong>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>SKU</div>
                    <strong style={{ color: '#fff', fontSize: '1.1rem' }}>{skuCount}</strong>
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
