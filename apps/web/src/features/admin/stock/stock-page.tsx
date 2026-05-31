import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Boxes, Edit3, History, Image as ImageIcon, Package, RefreshCw, RotateCcw, Save, Trash2, Upload, Warehouse as WarehouseIcon, X } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import {
  adjustInventory,
  createProduct,
  createWarehouse,
  deleteProduct,
  deleteWarehouse,
  getProducts,
  getWarehouses,
  resetInventory,
  transferInventory,
  updateProduct,
  updateWarehouse,
  type Product,
  type Warehouse,
} from '@/lib/api/tenant';
import { apiRequest, createMediaUpload, finalizeMediaUpload, uploadToStorageUrl } from '@/lib/api/client';
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

type ProductForm = {
  id?: string;
  sku: string;
  name: string;
  description: string;
  imageUrl: string;
  imageFile?: File | null;
  imagePreviewUrl?: string;
  unit: string;
  priceDefault: string;
  initialStock: string;
  status: Product['status'];
};

type WarehouseForm = {
  id?: string;
  code: string;
  name: string;
  address: string;
  type: Warehouse['type'];
};

const emptyProduct: ProductForm = { sku: '', name: '', description: '', imageUrl: '', imageFile: null, imagePreviewUrl: '', unit: 'pcs', priceDefault: '0', initialStock: '', status: 'active' };
const emptyWarehouse: WarehouseForm = { code: '', name: '', address: '', type: 'main' };

function formatQty(value: string | number) {
  const n = Number(value ?? 0);
  return n % 1 === 0 ? n.toLocaleString('id-ID') : n.toLocaleString('id-ID', { minimumFractionDigits: 2 });
}

function formatRp(value: string | number) {
  return Number(value ?? 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
}

async function compressProductImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxSize = 720;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung kompresi gambar.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Gagal mengompres gambar.')), 'image/jpeg', 0.78);
  });
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

function codeSegment(value: string, fallback: string) {
  const words = value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean);
  const segment = words.length > 1
    ? words.map((word) => word[0]).join('').slice(0, 4).toUpperCase()
    : (words[0] ?? '').slice(0, 4).toUpperCase();
  return segment || fallback;
}

function generateSku(name: string) {
  return `PRD-${codeSegment(name, 'ITEM')}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nextSequentialCode(prefix: string, existingCodes: string[]) {
  const matcher = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
  const max = existingCodes.reduce((currentMax, code) => {
    const match = matcher.exec(code);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

function generateNextSku(name: string, products: Product[]) {
  return nextSequentialCode(generateSku(name), products.map((product) => product.sku));
}

function generateWarehouseCode(form: Pick<WarehouseForm, 'type'>) {
  const typePrefix = form.type === 'sales_van' ? 'GS' : form.type === 'outlet_consignment' ? 'KO' : 'GD';
  return `WH-${typePrefix}`;
}

function generateNextWarehouseCode(form: Pick<WarehouseForm, 'type'>, warehouses: Warehouse[]) {
  return nextSequentialCode(generateWarehouseCode(form), warehouses.map((warehouse) => warehouse.code));
}

function apiReq<T>(path: string, token: string): Promise<T> {
  return apiRequest<T>(path, { headers: { Authorization: `Bearer ${token}` } });
}

export function StockPage() {
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [selectedWH, setSelectedWH] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [tab, setTab] = useState<'stock' | 'products' | 'warehouses' | 'actions' | 'movements'>('stock');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [warehouseForm, setWarehouseForm] = useState<WarehouseForm>(emptyWarehouse);
  const [stockAction, setStockAction] = useState({ mode: 'adjustment' as 'adjustment' | 'reset' | 'transfer', warehouseId: '', toWarehouseId: '', productId: '', quantity: '', notes: '' });

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const q = selectedWH ? `?warehouseId=${selectedWH}` : '';
      const [productRes, whRes, balRes, movRes] = await Promise.all([
        getProducts(accessToken),
        getWarehouses(accessToken),
        apiReq<{ balances: InventoryBalance[] }>(`/inventory/balances${q}`, accessToken),
        apiReq<{ movements: InventoryMovement[] }>('/inventory/movements', accessToken),
      ]);
      setProducts(productRes.products ?? []);
      setWarehouses(whRes.warehouses ?? []);
      setBalances(balRes.balances ?? []);
      setMovements(movRes.movements ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data inventory.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedWH]);

  useEffect(() => { void load(); }, [load]);

  const filteredBalances = useMemo(() => {
    if (!searchProduct) return balances;
    const q = searchProduct.toLowerCase();
    return balances.filter((b) => b.productName.toLowerCase().includes(q) || b.productSku.toLowerCase().includes(q));
  }, [balances, searchProduct]);

  const stats = useMemo(() => {
    const lowStock = balances.filter((b) => Number(b.quantity) < 10 && Number(b.quantity) > 0).length;
    const outOfStock = balances.filter((b) => Number(b.quantity) === 0).length;
    return {
      products: products.length,
      warehouses: warehouses.filter((w) => w.status === 'active').length,
      lowStock,
      outOfStock,
    };
  }, [balances, products, warehouses]);

  function startEditProduct(product: Product) {
    setTab('products');
    setProductForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
      imageFile: null,
      imagePreviewUrl: product.imageUrl ?? '',
      unit: product.unit,
      priceDefault: product.priceDefault,
      initialStock: '',
      status: product.status,
    });
  }

  function startEditWarehouse(warehouse: Warehouse) {
    setTab('warehouses');
    setWarehouseForm({
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      address: (warehouse as any).address ?? '',
      type: warehouse.type,
    });
  }

  async function saveProduct() {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const uploadImage = async (productId: string) => {
        if (!productForm.imageFile) return productForm.imageUrl || null;
        const compressed = await compressProductImage(productForm.imageFile);
        const { uploadUrl, objectKey } = await createMediaUpload(accessToken, {
          ownerType: 'product',
          ownerId: productId,
          fileName: compressed.name,
          mimeType: compressed.type,
        });
        await uploadToStorageUrl(uploadUrl, compressed);
        const { media } = await finalizeMediaUpload(accessToken, {
          ownerType: 'product',
          ownerId: productId,
          objectKey,
          mimeType: compressed.type,
          sizeBytes: compressed.size,
        });
        return media.fileUrl;
      };

      if (productForm.id) {
        const imageUrl = await uploadImage(productForm.id);
        await updateProduct(accessToken, productForm.id, {
          sku: productForm.sku.trim() || undefined,
          name: productForm.name,
          description: productForm.description,
          imageUrl,
          unit: productForm.unit,
          priceDefault: productForm.priceDefault,
          status: productForm.status,
        });
        setMessage('Produk berhasil diperbarui.');
      } else {
        const created = await createProduct(accessToken, {
          sku: productForm.sku.trim() || undefined,
          name: productForm.name,
          description: productForm.description,
          unit: productForm.unit,
          priceDefault: productForm.priceDefault,
          initialStock: productForm.initialStock || undefined,
        });
        const imageUrl = await uploadImage(created.product.id);
        if (imageUrl) await updateProduct(accessToken, created.product.id, { imageUrl });
        setMessage('Produk baru berhasil dibuat.');
      }
      setProductForm(emptyProduct);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan produk.');
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(product: Product) {
    if (!accessToken) return;
    if (!confirm(`Nonaktifkan/hapus produk ${product.name}?`)) return;
    setSaving(true);
    try {
      await deleteProduct(accessToken, product.id);
      setMessage('Produk berhasil diproses.');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal menghapus produk.');
    } finally {
      setSaving(false);
    }
  }

  async function saveWarehouse() {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = { code: warehouseForm.code.trim() || undefined, name: warehouseForm.name, address: warehouseForm.address, type: warehouseForm.type };
      if (warehouseForm.id) {
        await updateWarehouse(accessToken, warehouseForm.id, payload);
        setMessage('Gudang berhasil diperbarui.');
      } else {
        await createWarehouse(accessToken, payload);
        setMessage('Gudang baru berhasil dibuat.');
      }
      setWarehouseForm(emptyWarehouse);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan gudang.');
    } finally {
      setSaving(false);
    }
  }

  async function removeWarehouse(warehouse: Warehouse) {
    if (!accessToken) return;
    if (!confirm(`Nonaktifkan gudang ${warehouse.name}?`)) return;
    setSaving(true);
    try {
      await deleteWarehouse(accessToken, warehouse.id);
      setMessage('Gudang berhasil dinonaktifkan.');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal menonaktifkan gudang.');
    } finally {
      setSaving(false);
    }
  }

  async function submitStockAction() {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (stockAction.mode === 'adjustment') {
        await adjustInventory(accessToken, { warehouseId: stockAction.warehouseId, productId: stockAction.productId, quantityDelta: stockAction.quantity, notes: stockAction.notes });
      } else if (stockAction.mode === 'reset') {
        await resetInventory(accessToken, { warehouseId: stockAction.warehouseId, productId: stockAction.productId, targetQuantity: stockAction.quantity, notes: stockAction.notes });
      } else {
        await transferInventory(accessToken, {
          fromWarehouseId: stockAction.warehouseId,
          toWarehouseId: stockAction.toWarehouseId,
          notes: stockAction.notes,
          items: [{ productId: stockAction.productId, quantity: stockAction.quantity }],
        });
      }
      setMessage('Operasi stok berhasil diproses.');
      setStockAction({ mode: stockAction.mode, warehouseId: '', toWarehouseId: '', productId: '', quantity: '', notes: '' });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal memproses stok.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><Boxes size={24} className="text-admin-accent" /> Inventory</h1>
          <p className="admin-page-subtitle">CRUD produk, gudang, stok, transfer, adjustment, dan riwayat mutasi.</p>
        </div>
        <button onClick={load} className="admin-btn-ghost" disabled={loading} type="button">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {error && <div className="admin-alert admin-alert-error mb-4"><AlertTriangle size={18} /> {error}</div>}
      {message && <div className="admin-alert admin-alert-success mb-4"><Save size={16} /> {message}</div>}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        <StatCard icon={<Package size={20} />} label="Produk" value={stats.products} />
        <StatCard icon={<WarehouseIcon size={20} />} label="Gudang Aktif" value={stats.warehouses} />
        <StatCard icon={<AlertTriangle size={20} />} label="Stok Rendah" value={stats.lowStock} />
        <StatCard icon={<Boxes size={20} />} label="Stok Habis" value={stats.outOfStock} danger />
      </div>

      <div className="admin-filter-row bg-admin-bg-card border border-admin-border-subtle" style={{ padding: '1rem', borderRadius: 20, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="flex gap-3 items-center flex-wrap">
          <select value={selectedWH} onChange={(event) => setSelectedWH(event.target.value)} className="admin-select">
            <option value="">Semua Gudang</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}
          </select>
          {tab === 'stock' && (
            <input value={searchProduct} onChange={(event) => setSearchProduct(event.target.value)} className="admin-input" placeholder="Cari SKU / produk..." />
          )}
        </div>
        <div className="admin-tab-group bg-admin-bg" style={{ padding: '.3rem', borderRadius: 14 }}>
          <TabButton active={tab === 'stock'} onClick={() => setTab('stock')} icon={<Boxes size={14} />} label="Stok" />
          <TabButton active={tab === 'products'} onClick={() => setTab('products')} icon={<Package size={14} />} label="Produk" />
          <TabButton active={tab === 'warehouses'} onClick={() => setTab('warehouses')} icon={<WarehouseIcon size={14} />} label="Gudang" />
          <TabButton active={tab === 'actions'} onClick={() => setTab('actions')} icon={<ArrowRightLeft size={14} />} label="Operasi" />
          <TabButton active={tab === 'movements'} onClick={() => setTab('movements')} icon={<History size={14} />} label="Mutasi" />
        </div>
      </div>

      {tab === 'stock' && <StockTable loading={loading} balances={filteredBalances} />}
      {tab === 'products' && (
        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <ProductFormCard form={productForm} saving={saving} products={products} onChange={setProductForm} onSubmit={saveProduct} onCancel={() => setProductForm(emptyProduct)} />
          <ProductTable products={products} onEdit={startEditProduct} onDelete={removeProduct} />
        </div>
      )}
      {tab === 'warehouses' && (
        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <WarehouseFormCard form={warehouseForm} saving={saving} warehouses={warehouses} onChange={setWarehouseForm} onSubmit={saveWarehouse} onCancel={() => setWarehouseForm(emptyWarehouse)} />
          <WarehouseTable warehouses={warehouses} onEdit={startEditWarehouse} onDelete={removeWarehouse} />
        </div>
      )}
      {tab === 'actions' && (
        <StockActionCard action={stockAction} saving={saving} warehouses={warehouses.filter((warehouse) => warehouse.status === 'active')} products={products.filter((product) => product.status === 'active')} onChange={setStockAction} onSubmit={submitStockAction} />
      )}
      {tab === 'movements' && <MovementTable movements={movements} />}
    </div>
  );
}

function StatCard({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: number; danger?: boolean }) {
  return (
    <div className="admin-stat-card" style={{ padding: '1.25rem' }}>
      <div className={`admin-stat-icon ${danger ? 'bg-admin-danger-soft text-admin-danger' : 'bg-admin-accent-shadow text-admin-accent'}`}>{icon}</div>
      <div>
        <span className="text-admin-muted font-semibold uppercase tracking-wide" style={{ fontSize: '.75rem' }}>{label}</span>
        <strong className="text-admin-foreground" style={{ fontSize: '1.5rem' }}>{value}</strong>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button onClick={onClick} className={`admin-tab ${active ? 'active' : ''}`} style={{ borderRadius: 11, fontSize: '.85rem' }} type="button">{icon} {label}</button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-admin-muted font-bold" style={{ fontSize: '.78rem' }}>{label}</span>{children}</label>;
}

function ProductFormCard({ form, saving, products, onChange, onSubmit, onCancel }: { form: ProductForm; saving: boolean; products: Product[]; onChange: (form: ProductForm) => void; onSubmit: () => void; onCancel: () => void }) {
  return (
    <div className="admin-card" style={{ margin: 0 }}>
      <h3 className="font-extrabold text-admin-foreground mb-4">{form.id ? 'Edit Produk' : 'Tambah Produk'}</h3>
      <div className="grid gap-3">
        <Field label="Gambar Produk">
          <div className="flex gap-3 items-center">
            <div className="flex items-center justify-center overflow-hidden border border-admin-border-subtle bg-admin-bg" style={{ width: 78, height: 78, borderRadius: 16 }}>
              {form.imagePreviewUrl || form.imageUrl ? (
                <img src={form.imagePreviewUrl || form.imageUrl} alt={form.name || 'Gambar produk'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ImageIcon size={28} className="text-admin-muted" />
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <label className="admin-btn-ghost cursor-pointer">
                <Upload size={14} /> Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    onChange({
                      ...form,
                      imageFile: file,
                      imagePreviewUrl: URL.createObjectURL(file),
                    });
                    event.currentTarget.value = '';
                  }}
                />
              </label>
              {(form.imagePreviewUrl || form.imageUrl) && (
                <button className="admin-btn-ghost" type="button" onClick={() => onChange({ ...form, imageUrl: '', imageFile: null, imagePreviewUrl: '' })}>
                  <X size={14} /> Hapus
                </button>
              )}
            </div>
          </div>
        </Field>
        <Field label="SKU">
          <div className="flex gap-2">
            <input className="admin-input w-full" value={form.sku} onChange={(e) => onChange({ ...form, sku: e.target.value.toUpperCase() })} placeholder="Contoh PRD-KR-001" />
            <button className="admin-btn-ghost" type="button" onClick={() => onChange({ ...form, sku: generateNextSku(form.name, products) })}>Generate</button>
          </div>
        </Field>
        <Field label="Nama Produk"><input className="admin-input w-full" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></Field>
        <Field label="Deskripsi"><textarea className="admin-input w-full" value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit"><input className="admin-input w-full" value={form.unit} onChange={(e) => onChange({ ...form, unit: e.target.value })} /></Field>
          <Field label="Harga"><input type="number" className="admin-input w-full" value={form.priceDefault} onChange={(e) => onChange({ ...form, priceDefault: e.target.value })} /></Field>
        </div>
        {!form.id && <Field label="Stok Awal Gudang Utama"><input type="number" className="admin-input w-full" value={form.initialStock} onChange={(e) => onChange({ ...form, initialStock: e.target.value })} /></Field>}
        {form.id && (
          <Field label="Status">
            <select className="admin-select w-full" value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as Product['status'] })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        )}
        <div className="flex gap-2">
          <button className="admin-btn-primary" type="button" disabled={saving || !form.name} onClick={onSubmit}><Save size={15} /> Simpan</button>
          {form.id && <button className="admin-btn-ghost" type="button" onClick={onCancel}>Batal</button>}
        </div>
      </div>
    </div>
  );
}

function WarehouseFormCard({ form, saving, warehouses, onChange, onSubmit, onCancel }: { form: WarehouseForm; saving: boolean; warehouses: Warehouse[]; onChange: (form: WarehouseForm) => void; onSubmit: () => void; onCancel: () => void }) {
  return (
    <div className="admin-card" style={{ margin: 0 }}>
      <h3 className="font-extrabold text-admin-foreground mb-4">{form.id ? 'Edit Gudang' : 'Tambah Gudang'}</h3>
      <div className="grid gap-3">
        <Field label="Kode">
          <div className="flex gap-2">
            <input className="admin-input w-full" value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value.toUpperCase() })} placeholder="Contoh WH-GD-001" />
            <button className="admin-btn-ghost" type="button" onClick={() => onChange({ ...form, code: generateNextWarehouseCode(form, warehouses) })}>Generate</button>
          </div>
        </Field>
        <Field label="Nama Gudang"><input className="admin-input w-full" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></Field>
        <Field label="Tipe">
          <select className="admin-select w-full" value={form.type} onChange={(e) => onChange({ ...form, type: e.target.value as Warehouse['type'] })}>
            <option value="main">Gudang Utama</option>
            <option value="sales_van">Gudang Sales</option>
            <option value="outlet_consignment">Konsinyasi Outlet</option>
          </select>
        </Field>
        <Field label="Alamat"><textarea className="admin-input w-full" value={form.address} onChange={(e) => onChange({ ...form, address: e.target.value })} /></Field>
        <div className="flex gap-2">
          <button className="admin-btn-primary" type="button" disabled={saving || !form.name} onClick={onSubmit}><Save size={15} /> Simpan</button>
          {form.id && <button className="admin-btn-ghost" type="button" onClick={onCancel}>Batal</button>}
        </div>
      </div>
    </div>
  );
}

function ProductTable({ products, onEdit, onDelete }: { products: Product[]; onEdit: (product: Product) => void; onDelete: (product: Product) => void }) {
  return (
    <div className="admin-card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
      <Table className="admin-table">
        <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Unit</TableHead><TableHead>Harga</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center overflow-hidden bg-admin-bg" style={{ width: 42, height: 42, borderRadius: 12 }}>
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} className="text-admin-muted" />}
                  </div>
                  <div><strong>{product.name}</strong><br /><code>{product.sku}</code></div>
                </div>
              </TableCell>
              <TableCell>{product.unit}</TableCell>
              <TableCell>{formatRp(product.priceDefault)}</TableCell>
              <TableCell>{product.status}</TableCell>
              <TableCell className="text-right"><button className="admin-btn-ghost" onClick={() => onEdit(product)} type="button"><Edit3 size={14} /></button><button className="admin-btn-ghost" onClick={() => onDelete(product)} type="button"><Trash2 size={14} /></button></TableCell>
            </TableRow>
          ))}
          {!products.length && <EmptyState colSpan={5} icon="📦" title="Belum ada produk" description="Tambahkan SKU pertama untuk mulai mengelola stok." />}
        </TableBody>
      </Table>
    </div>
  );
}

function WarehouseTable({ warehouses, onEdit, onDelete }: { warehouses: Warehouse[]; onEdit: (warehouse: Warehouse) => void; onDelete: (warehouse: Warehouse) => void }) {
  return (
    <div className="admin-card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
      <Table className="admin-table">
        <TableHeader><TableRow><TableHead>Gudang</TableHead><TableHead>Tipe</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>
          {warehouses.map((warehouse) => (
            <TableRow key={warehouse.id}>
              <TableCell><strong>{warehouse.name}</strong><br /><code>{warehouse.code}</code></TableCell>
              <TableCell>{warehouse.type}</TableCell>
              <TableCell>{warehouse.status}</TableCell>
              <TableCell className="text-right"><button className="admin-btn-ghost" onClick={() => onEdit(warehouse)} type="button"><Edit3 size={14} /></button><button className="admin-btn-ghost" onClick={() => onDelete(warehouse)} type="button"><Trash2 size={14} /></button></TableCell>
            </TableRow>
          ))}
          {!warehouses.length && <EmptyState colSpan={4} icon="🏬" title="Belum ada gudang" description="Tambahkan gudang utama atau gudang sales." />}
        </TableBody>
      </Table>
    </div>
  );
}

function StockActionCard({ action, saving, warehouses, products, onChange, onSubmit }: { action: { mode: 'adjustment' | 'reset' | 'transfer'; warehouseId: string; toWarehouseId: string; productId: string; quantity: string; notes: string }; saving: boolean; warehouses: Warehouse[]; products: Product[]; onChange: (action: any) => void; onSubmit: () => void }) {
  return (
    <div className="admin-card" style={{ maxWidth: 760 }}>
      <h3 className="font-extrabold text-admin-foreground mb-4">Operasi Stok</h3>
      <div className="grid gap-3">
        <Field label="Jenis Operasi">
          <select className="admin-select w-full" value={action.mode} onChange={(e) => onChange({ ...action, mode: e.target.value })}>
            <option value="adjustment">Adjustment +/-</option>
            <option value="reset">Reset Qty</option>
            <option value="transfer">Transfer Gudang</option>
          </select>
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={action.mode === 'transfer' ? 'Gudang Asal' : 'Gudang'}>
            <select className="admin-select w-full" value={action.warehouseId} onChange={(e) => onChange({ ...action, warehouseId: e.target.value })}>
              <option value="">Pilih gudang</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}
            </select>
          </Field>
          {action.mode === 'transfer' && (
            <Field label="Gudang Tujuan">
              <select className="admin-select w-full" value={action.toWarehouseId} onChange={(e) => onChange({ ...action, toWarehouseId: e.target.value })}>
                <option value="">Pilih tujuan</option>
                {warehouses.filter((warehouse) => warehouse.id !== action.warehouseId).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}
              </select>
            </Field>
          )}
        </div>
        <Field label="Produk">
          <select className="admin-select w-full" value={action.productId} onChange={(e) => onChange({ ...action, productId: e.target.value })}>
            <option value="">Pilih produk</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
          </select>
        </Field>
        <Field label={action.mode === 'reset' ? 'Target Quantity' : 'Quantity'}>
          <input type="number" className="admin-input w-full" value={action.quantity} onChange={(e) => onChange({ ...action, quantity: e.target.value })} />
        </Field>
        <Field label="Catatan"><textarea className="admin-input w-full" value={action.notes} onChange={(e) => onChange({ ...action, notes: e.target.value })} /></Field>
        <button className="admin-btn-primary" type="button" disabled={saving || !action.warehouseId || !action.productId || !action.quantity || (action.mode === 'transfer' && !action.toWarehouseId)} onClick={onSubmit}>
          {action.mode === 'reset' ? <RotateCcw size={15} /> : <ArrowRightLeft size={15} />} Proses
        </button>
      </div>
    </div>
  );
}

function StockTable({ loading, balances }: { loading: boolean; balances: InventoryBalance[] }) {
  if (loading) return <div className="admin-card text-center text-admin-muted" style={{ padding: '3rem' }}>Memuat stok...</div>;
  return (
    <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
      <Table className="admin-table">
        <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Gudang</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Reserved</TableHead><TableHead className="text-right">Tersedia</TableHead><TableHead>Update</TableHead></TableRow></TableHeader>
        <TableBody>
          {balances.map((balance) => {
            const available = Number(balance.quantity) - Number(balance.reservedQuantity);
            return (
              <TableRow key={balance.id}>
                <TableCell><strong>{balance.productName}</strong><br /><code>{balance.productSku}</code></TableCell>
                <TableCell>{balance.warehouseName}<br /><small>{balance.warehouseTypeLabel ?? balance.warehouseType}</small></TableCell>
                <TableCell className="text-right font-bold">{formatQty(balance.quantity)}</TableCell>
                <TableCell className="text-right">{formatQty(balance.reservedQuantity)}</TableCell>
                <TableCell className="text-right font-bold">{formatQty(available)}</TableCell>
                <TableCell>{new Date(balance.updatedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
              </TableRow>
            );
          })}
          {!balances.length && <EmptyState colSpan={6} icon="📦" title="Stok kosong" description="Belum ada balance stok untuk filter ini." />}
        </TableBody>
      </Table>
    </div>
  );
}

function MovementTable({ movements }: { movements: InventoryMovement[] }) {
  return (
    <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
      <Table className="admin-table">
        <TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>Produk</TableHead><TableHead>Gudang</TableHead><TableHead>Mutasi</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Catatan</TableHead></TableRow></TableHeader>
        <TableBody>
          {movements.map((movement) => {
            const delta = Number(movement.quantityDelta);
            return (
              <TableRow key={movement.id}>
                <TableCell>{new Date(movement.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
                <TableCell><strong>{movement.productName}</strong><br /><code>{movement.productSku}</code></TableCell>
                <TableCell>{movement.warehouseCode}</TableCell>
                <TableCell>{movement.movementLabel ?? movement.movementType}</TableCell>
                <TableCell className={`text-right font-bold ${delta < 0 ? 'text-admin-danger' : 'text-admin-success'}`}>{delta > 0 ? '+' : ''}{formatQty(delta)}</TableCell>
                <TableCell>{movement.notes ?? '-'}</TableCell>
              </TableRow>
            );
          })}
          {!movements.length && <EmptyState colSpan={6} icon="📋" title="Belum ada mutasi" description="Riwayat pergerakan stok akan muncul di sini." />}
        </TableBody>
      </Table>
    </div>
  );
}
