import { useEffect, useMemo, useState } from 'react';
import { Boxes, RefreshCw, Package, Warehouse as WarehouseIcon, ArrowUpDown, AlertTriangle, History } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { getWarehouses, type Warehouse } from '@/lib/api/tenant';
import { apiRequest } from '@/lib/api/client';
import { EmptyState } from '@/components/ui';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

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
  return apiRequest<T>(path, { headers: { Authorization: `Bearer ${token}` } });
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
            <Boxes size={24} className="text-admin-accent" />
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
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon bg-admin-accent-shadow text-admin-accent">
            <WarehouseIcon size={20} />
          </div>
          <div>
            <span className="text-admin-muted font-semibold uppercase tracking-wide" style={{ fontSize: '.75rem' }}>Gudang Aktif</span>
            <strong className="text-admin-foreground" style={{ fontSize: '1.5rem' }}>{stats.totalWH}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon bg-admin-accent-shadow text-admin-focus-ring">
            <Package size={20} />
          </div>
          <div>
            <span className="text-admin-muted font-semibold uppercase tracking-wide" style={{ fontSize: '.75rem' }}>Total Produk</span>
            <strong className="text-admin-foreground" style={{ fontSize: '1.5rem' }}>{stats.totalProducts}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon bg-admin-accent-shadow text-admin-accent-light">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="text-admin-muted font-semibold uppercase tracking-wide" style={{ fontSize: '.75rem' }}>Stok Rendah</span>
            <strong className="text-admin-foreground" style={{ fontSize: '1.5rem' }}>{stats.lowStock}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon bg-admin-danger-soft text-admin-danger">
            <Boxes size={20} />
          </div>
          <div>
            <span className="text-admin-muted font-semibold uppercase tracking-wide" style={{ fontSize: '.75rem' }}>Stok Habis</span>
            <strong className="text-admin-foreground" style={{ fontSize: '1.5rem' }}>{stats.outOfStock}</strong>
          </div>
        </div>
      </div>

      {/* Premium Filter Row */}
      <div className="admin-filter-row bg-admin-surface border border-admin-border-subtle" style={{ padding: '1rem', borderRadius: 20, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex gap-4 items-center">
          <div className="admin-filter-group bg-admin-bg" style={{ padding: '.25rem .75rem', borderRadius: 12 }}>
            <WarehouseIcon size={16} className="text-admin-muted" />
            <select value={selectedWH} onChange={e => setSelectedWH(e.target.value)} className="admin-select" style={{ border: 'none', background: 'transparent' }}>
              <option value="">Semua Gudang</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
          {tab === 'stock' && (
            <div className="admin-filter-group bg-admin-bg" style={{ padding: '.25rem .75rem', borderRadius: 12 }}>
              <Package size={16} className="text-admin-muted" />
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
        <div className="admin-tab-group bg-admin-bg" style={{ padding: '.3rem', borderRadius: 14 }}>
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
            <RefreshCw size={32} className="spin text-admin-muted" style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p className="text-admin-muted font-semibold">Menghitung inventaris...</p>
          </div>
        ) : tab === 'stock' ? (
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Informasi Produk</TableHead>
                  <TableHead>Gudang</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Tersedia</TableHead>
                  <TableHead>Update Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.map(b => {
                  const qty = Number(b.quantity);
                  const reserved = Number(b.reservedQuantity);
                  const available = qty - reserved;
                  const isLow = qty > 0 && qty < 10;
                  const isEmpty = qty === 0;
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-xl border border-admin-border-subtle flex items-center justify-center font-extrabold ${isEmpty ? 'bg-admin-danger-soft text-admin-danger' : isLow ? 'bg-admin-accent-shadow text-admin-accent-light' : 'bg-admin-bg text-admin-accent'}`}
                            style={{ width: 36, height: 36 }}
                          >
                            {b.productName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-admin-foreground font-extrabold" style={{ fontSize: '.9rem' }}>{b.productName}</div>
                            <code className="text-admin-subtle" style={{ fontSize: '.72rem' }}>{b.productSku}</code>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-admin-text font-semibold">{b.warehouseName}</div>
                        <div className="text-admin-subtle" style={{ fontSize: '.72rem' }}>{b.warehouseTypeLabel ?? b.warehouseType}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <strong className={isEmpty ? 'text-admin-danger' : 'text-admin-foreground'} style={{ fontSize: '1rem' }}>{formatQty(b.quantity)}</strong>
                      </TableCell>
                      <TableCell className="text-right text-admin-subtle">{formatQty(b.reservedQuantity)}</TableCell>
                      <TableCell className="text-right">
                        <div className={`inline-block font-extrabold rounded-lg ${available <= 0 ? 'bg-admin-danger-soft text-admin-danger' : 'bg-admin-success-soft text-admin-success'}`} style={{ padding: '.25rem .5rem' }}>
                          {formatQty(available)}
                        </div>
                      </TableCell>
                      <TableCell className="text-admin-muted" style={{ fontSize: '.8rem' }}>
                        {new Date(b.updatedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredBalances.length && (
                  <EmptyState colSpan={6} icon="📦" title="Stok Kosong" description="Tidak ada data produk yang ditemukan untuk kriteria ini." />
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Gudang</TableHead>
                  <TableHead>Tipe Mutasi</TableHead>
                  <TableHead className="text-right">Perubahan</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map(m => {
                  const delta = Number(m.quantityDelta);
                  const isOut = delta < 0;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-admin-muted whitespace-nowrap" style={{ fontSize: '.8rem' }}>
                        {new Date(m.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        <div className="text-admin-foreground font-bold">{m.productName}</div>
                        <code className="text-admin-subtle" style={{ fontSize: '.72rem' }}>{m.productSku}</code>
                      </TableCell>
                      <TableCell className="text-admin-text font-semibold">{m.warehouseCode}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 font-bold ${isOut ? 'text-admin-danger' : 'text-admin-success'}`} style={{ fontSize: '.8rem' }}>
                          <ArrowUpDown size={13} />
                          {m.movementLabel ?? m.movementType}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <strong className={`font-mono ${isOut ? 'text-admin-danger' : 'text-admin-success'}`} style={{ fontSize: '1.1rem' }}>
                          {isOut ? '' : '+'}{formatQty(m.quantityDelta)}
                        </strong>
                      </TableCell>
                      <TableCell className="text-admin-muted" style={{ fontSize: '.82rem', maxWidth: 200 }}>{m.notes ?? '—'}</TableCell>
                    </TableRow>
                  );
                })}
                {!movements.length && (
                  <EmptyState colSpan={6} icon="📋" title="Belum ada Mutasi" description="Riwayat pergerakan stok akan muncul di sini." />
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Warehouse Summary Cards (Only in Stock Tab) */}
      {tab === 'stock' && warehouses.length > 0 && (
        <div className="grid gap-4 mt-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {warehouses.filter(w => w.status === 'active').map(w => {
            const whBalances = balances.filter(b => b.warehouseId === w.id);
            const totalQty = whBalances.reduce((s, b) => s + Number(b.quantity), 0);
            const skuCount = whBalances.length;
            return (
              <div key={w.id} className="admin-card border border-admin-border-subtle relative overflow-hidden" style={{ margin: 0, padding: '1.5rem' }}>
                <div className="absolute opacity-5" style={{ top: '-10px', right: '-10px' }}>
                  <WarehouseIcon size={80} />
                </div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <strong className="text-admin-foreground block" style={{ fontSize: '1.1rem' }}>{w.name}</strong>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="admin-badge bg-admin-bg text-admin-muted" style={{ fontSize: '.65rem' }}>{w.code}</span>
                      <span className="admin-badge bg-admin-bg text-admin-muted" style={{ fontSize: '.65rem' }}>{w.type.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-8">
                  <div>
                    <div className="text-admin-subtle font-bold uppercase mb-1" style={{ fontSize: '.7rem', letterSpacing: '.05em' }}>Total Kuantitas</div>
                    <strong className="text-admin-foreground" style={{ fontSize: '1.4rem' }}>{formatQty(totalQty)}</strong>
                  </div>
                  <div>
                    <div className="text-admin-subtle font-bold uppercase mb-1" style={{ fontSize: '.7rem', letterSpacing: '.05em' }}>Item SKU</div>
                    <strong className="text-admin-foreground" style={{ fontSize: '1.4rem' }}>{skuCount}</strong>
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