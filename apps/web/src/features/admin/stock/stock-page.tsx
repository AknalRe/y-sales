import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRightLeft, Boxes, Edit3, History, Image as ImageIcon, Package,
  RefreshCw, RotateCcw, Save, Trash2, Upload, Warehouse as WarehouseIcon, X,
  BarChart3, ShoppingCart, Truck, ClipboardList, UserCircle, Send, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import {
  adjustInventory, createProduct, createWarehouse, deleteProduct, deleteWarehouse,
  ensureSalesWarehouse, getProducts, getWarehouses, resetInventory, transferInventory,
  updateProduct, updateWarehouse, type Product, type Warehouse,
} from '@/lib/api/tenant';
import { apiRequest, createMediaUpload, finalizeMediaUpload, uploadToStorageUrl } from '@/lib/api/client';
import { EmptyState } from '@/components/ui';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

type InventoryBalance = {
  id: string; warehouseId: string; warehouseCode: string; warehouseName: string;
  warehouseType: string; warehouseTypeLabel?: string; productId: string;
  productSku: string; productName: string; quantity: string; reservedQuantity: string; updatedAt: string;
};

type InventoryMovement = {
  id: string; warehouseCode: string; productSku: string; productName: string;
  movementType: string; movementLabel?: string; quantityDelta: string; notes?: string | null; createdAt: string;
};

type ProductForm = {
  id?: string; sku: string; name: string; description: string; imageUrl: string;
  imageFile?: File | null; imagePreviewUrl?: string; unit: string; priceDefault: string; initialStock: string; status: Product['status'];
};

type WarehouseForm = { id?: string; code: string; name: string; address: string; type: Warehouse['type'] };

type SectionKey = 'stock' | 'products' | 'warehouses' | 'actions' | 'movements' | 'transfer';

type Section = { key: SectionKey; title: string; eyebrow: string; icon: LucideIcon };

type SalesUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  roleCode: string;
  status: string;
};

const emptyProduct: ProductForm = { sku: '', name: '', description: '', imageUrl: '', imageFile: null, imagePreviewUrl: '', unit: 'pcs', priceDefault: '0', initialStock: '', status: 'active' };
const emptyWarehouse: WarehouseForm = { code: '', name: '', address: '', type: 'main' };

const sections: Section[] = [
  { key: 'stock', title: 'Stok', eyebrow: 'Saldo inventory', icon: Boxes },
  { key: 'products', title: 'Produk', eyebrow: 'Master SKU', icon: Package },
  { key: 'warehouses', title: 'Gudang', eyebrow: 'Lokasi stok', icon: WarehouseIcon },
  { key: 'transfer', title: 'Distribusi Sales', eyebrow: 'Gudang utama ke sales', icon: Truck },
  { key: 'actions', title: 'Operasi', eyebrow: 'Transfer & adjusment', icon: ArrowRightLeft },
  { key: 'movements', title: 'Mutasi', eyebrow: 'Riwayat stok', icon: History },
];

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
  const words = value.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().split(/[\s_-]+/).filter(Boolean);
  const segment = words.length > 1 ? words.map((w) => w[0]).join('').slice(0, 4).toUpperCase() : (words[0] ?? '').slice(0, 4).toUpperCase();
  return segment || fallback;
}

function generateSku(name: string) { return `PRD-${codeSegment(name, 'ITEM')}`; }

function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function nextSequentialCode(prefix: string, existingCodes: string[]) {
  const matcher = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
  const max = existingCodes.reduce((m, code) => { const match = matcher.exec(code); return match ? Math.max(m, Number(match[1])) : m; }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

function generateNextSku(name: string, products: Product[]) {
  return nextSequentialCode(generateSku(name), products.map((p) => p.sku));
}

function generateWarehouseCode(form: Pick<WarehouseForm, 'type'>) {
  const prefix = form.type === 'sales_van' ? 'GS' : form.type === 'outlet_consignment' ? 'KO' : 'GD';
  return `WH-${prefix}`;
}

function generateNextWarehouseCode(form: Pick<WarehouseForm, 'type'>, warehouses: Warehouse[]) {
  return nextSequentialCode(generateWarehouseCode(form), warehouses.map((w) => w.code));
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
  const [activeSection, setActiveSection] = useState<SectionKey>('stock');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [warehouseForm, setWarehouseForm] = useState<WarehouseForm>(emptyWarehouse);
  const [stockAction, setStockAction] = useState({ mode: 'adjustment' as 'adjustment' | 'reset' | 'transfer', warehouseId: '', toWarehouseId: '', productId: '', quantity: '', notes: '' });
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [transferForm, setTransferForm] = useState({ sourceWarehouseId: '', salesUserId: '', warehouseId: '', productId: '', quantity: '', notes: '' });

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const q = selectedWH ? `?warehouseId=${selectedWH}` : '';
      const [pRes, whRes, balRes, movRes, usersRes] = await Promise.all([
        getProducts(accessToken), getWarehouses(accessToken),
        apiReq<{ balances: InventoryBalance[] }>(`/inventory/balances${q}`, accessToken),
        apiReq<{ movements: InventoryMovement[] }>('/inventory/movements', accessToken),
        apiReq<{ users: SalesUser[] }>('/users', accessToken),
      ]);
      setProducts(pRes.products ?? []);
      setWarehouses(whRes.warehouses ?? []);
      setBalances(balRes.balances ?? []);
      setMovements(movRes.movements ?? []);
      setSalesUsers((usersRes.users ?? []).filter((u) => u.roleCode === 'SALES_AGENT' && u.status === 'active'));
    } catch (e: any) { setError(e.message ?? 'Gagal memuat data inventory.'); }
    finally { setLoading(false); }
  }, [accessToken, selectedWH]);

  useEffect(() => { void load(); }, [load]);

  const filteredBalances = useMemo(() => {
    if (!searchProduct) return balances;
    const q = searchProduct.toLowerCase();
    return balances.filter((b) => b.productName.toLowerCase().includes(q) || b.productSku.toLowerCase().includes(q));
  }, [balances, searchProduct]);

  const stats = useMemo(() => ({
    products: products.length,
    warehouses: warehouses.filter((w) => w.status === 'active').length,
    lowStock: balances.filter((b) => Number(b.quantity) < 10 && Number(b.quantity) > 0).length,
    outOfStock: balances.filter((b) => Number(b.quantity) === 0).length,
  }), [balances, products, warehouses]);

  function startEditProduct(product: Product) {
    setActiveSection('products');
    setProductForm({ id: product.id, sku: product.sku, name: product.name, description: product.description ?? '', imageUrl: product.imageUrl ?? '', imageFile: null, imagePreviewUrl: product.imageUrl ?? '', unit: product.unit, priceDefault: product.priceDefault, initialStock: '', status: product.status });
  }

  function startEditWarehouse(warehouse: Warehouse) {
    setActiveSection('warehouses');
    setWarehouseForm({ id: warehouse.id, code: warehouse.code, name: warehouse.name, address: (warehouse as any).address ?? '', type: warehouse.type });
  }

  async function saveProduct() {
    if (!accessToken) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const uploadImage = async (productId: string) => {
        if (!productForm.imageFile) return productForm.imageUrl || null;
        const compressed = await compressProductImage(productForm.imageFile);
        const { uploadUrl, objectKey } = await createMediaUpload(accessToken, { ownerType: 'product', ownerId: productId, fileName: compressed.name, mimeType: compressed.type });
        await uploadToStorageUrl(uploadUrl, compressed);
        const { media } = await finalizeMediaUpload(accessToken, { ownerType: 'product', ownerId: productId, objectKey, mimeType: compressed.type, sizeBytes: compressed.size });
        return media.fileUrl;
      };
      if (productForm.id) {
        const imageUrl = await uploadImage(productForm.id);
        await updateProduct(accessToken, productForm.id, { sku: productForm.sku.trim() || undefined, name: productForm.name, description: productForm.description, imageUrl, unit: productForm.unit, priceDefault: productForm.priceDefault, status: productForm.status });
        setMessage('Produk berhasil diperbarui.');
      } else {
        const created = await createProduct(accessToken, { sku: productForm.sku.trim() || undefined, name: productForm.name, description: productForm.description, unit: productForm.unit, priceDefault: productForm.priceDefault, initialStock: productForm.initialStock || undefined });
        const imageUrl = await uploadImage(created.product.id);
        if (imageUrl) await updateProduct(accessToken, created.product.id, { imageUrl });
        setMessage('Produk baru berhasil dibuat.');
      }
      setProductForm(emptyProduct); await load();
    } catch (e: any) { setError(e.message ?? 'Gagal menyimpan produk.'); }
    finally { setSaving(false); }
  }

  async function removeProduct(product: Product) {
    if (!accessToken || !confirm(`Nonaktifkan/hapus produk ${product.name}?`)) return;
    setSaving(true);
    try { await deleteProduct(accessToken, product.id); setMessage('Produk berhasil diproses.'); await load(); }
    catch (e: any) { setError(e.message ?? 'Gagal menghapus produk.'); }
    finally { setSaving(false); }
  }

  async function saveWarehouse() {
    if (!accessToken) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const payload = { code: warehouseForm.code.trim() || undefined, name: warehouseForm.name, address: warehouseForm.address, type: warehouseForm.type };
      if (warehouseForm.id) { await updateWarehouse(accessToken, warehouseForm.id, payload); setMessage('Gudang berhasil diperbarui.'); }
      else { await createWarehouse(accessToken, payload); setMessage('Gudang baru berhasil dibuat.'); }
      setWarehouseForm(emptyWarehouse); await load();
    } catch (e: any) { setError(e.message ?? 'Gagal menyimpan gudang.'); }
    finally { setSaving(false); }
  }

  async function removeWarehouse(warehouse: Warehouse) {
    if (!accessToken || !confirm(`Nonaktifkan gudang ${warehouse.name}?`)) return;
    setSaving(true);
    try { await deleteWarehouse(accessToken, warehouse.id); setMessage('Gudang berhasil dinonaktifkan.'); await load(); }
    catch (e: any) { setError(e.message ?? 'Gagal menonaktifkan gudang.'); }
    finally { setSaving(false); }
  }

  async function submitStockAction() {
    if (!accessToken) return;
    setSaving(true); setError(''); setMessage('');
    try {
      if (stockAction.mode === 'adjustment') await adjustInventory(accessToken, { warehouseId: stockAction.warehouseId, productId: stockAction.productId, quantityDelta: stockAction.quantity, notes: stockAction.notes });
      else if (stockAction.mode === 'reset') await resetInventory(accessToken, { warehouseId: stockAction.warehouseId, productId: stockAction.productId, targetQuantity: stockAction.quantity, notes: stockAction.notes });
      else await transferInventory(accessToken, { fromWarehouseId: stockAction.warehouseId, toWarehouseId: stockAction.toWarehouseId, notes: stockAction.notes, items: [{ productId: stockAction.productId, quantity: stockAction.quantity }] });
      setMessage('Operasi stok berhasil diproses.');
      setStockAction({ mode: stockAction.mode, warehouseId: '', toWarehouseId: '', productId: '', quantity: '', notes: '' });
      await load();
    } catch (e: any) { setError(e.message ?? 'Gagal memproses stok.'); }
    finally { setSaving(false); }
  }

  async function submitSalesTransfer() {
    if (!accessToken) return;
    if (!transferForm.salesUserId) { setError('Pilih sales terlebih dahulu.'); return; }
    if (!transferForm.productId) { setError('Pilih produk yang akan dikirim.'); return; }
    if (!transferForm.quantity || Number(transferForm.quantity) <= 0) { setError('Masukkan jumlah yang valid.'); return; }
    const fallbackMainWH = warehouses.find((w) => w.type === 'main' && w.status === 'active');
    const sourceWH = warehouses.find((w) => w.id === (transferForm.sourceWarehouseId || fallbackMainWH?.id) && w.status === 'active');
    if (!sourceWH) { setError('Pilih gudang sumber terlebih dahulu.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      const targetWarehouseId = transferForm.warehouseId || (await ensureSalesWarehouse(accessToken, transferForm.salesUserId)).warehouse.id;
      if (sourceWH.id === targetWarehouseId) {
        setError('Gudang sumber dan gudang tujuan tidak boleh sama.');
        return;
      }
      await transferInventory(accessToken, {
        fromWarehouseId: sourceWH.id,
        toWarehouseId: targetWarehouseId,
        notes: transferForm.notes || `Distribusi dari ${sourceWH.name} ke sales`,
        items: [{ productId: transferForm.productId, quantity: transferForm.quantity }],
      });
      setMessage(`Stok berhasil dikirim ke sales.`);
      setTransferForm({ sourceWarehouseId: transferForm.sourceWarehouseId, salesUserId: '', warehouseId: '', productId: '', quantity: '', notes: '' });
      await load();
    } catch (e: any) { setError(e.message ?? 'Gagal transfer stok ke sales.'); }
    finally { setSaving(false); }
  }

  async function createSalesWarehouse(salesUserId: string) {
    if (!accessToken) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await ensureSalesWarehouse(accessToken, salesUserId);
      setMessage(result.created ? 'Gudang sales berhasil dibuat.' : 'Gudang sales sudah tersedia.');
      setTransferForm((current) => current.salesUserId === salesUserId ? { ...current, warehouseId: result.warehouse.id } : current);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal membuat gudang sales.');
    } finally {
      setSaving(false);
    }
  }

  const activeSectionDef = sections.find((s) => s.key === activeSection) ?? sections[0];
  const ActiveIcon = activeSectionDef.icon;

  return (
    <main className="admin-page">
      {/* Sticky Header */}
      <div className="settings-sticky-header">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title"><Boxes size={24} className="text-admin-accent" /> Inventory</h1>
            <p className="admin-page-subtitle">CRUD produk, gudang, stok, transfer, adjustment, dan riwayat mutasi.</p>
          </div>
          <button onClick={load} className="admin-btn-ghost" disabled={loading} type="button">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {message && <div className="admin-alert admin-alert-success"><Save size={15} /> {message} <button onClick={() => setMessage('')} className="admin-alert-close">×</button></div>}
        {error && <div className="admin-alert admin-alert-error"><AlertTriangle size={15} /> {error} <button onClick={() => setError('')} className="admin-alert-close">×</button></div>}

        <section className="settings-summary-grid">
          <div className="settings-summary-card accent">
            <span><Package size={17} /> Total Produk</span>
            <strong>{stats.products}</strong>
            <small>SKU aktif</small>
          </div>
          <div className="settings-summary-card">
            <span><WarehouseIcon size={17} /> Gudang Aktif</span>
            <strong>{stats.warehouses}</strong>
            <small>Lokasi penyimpanan</small>
          </div>
          <div className="settings-summary-card">
            <span><AlertTriangle size={17} /> Stok Rendah</span>
            <strong>{stats.lowStock}</strong>
            <small>Di bawah 10 unit</small>
          </div>
          <div className="settings-summary-card">
            <span><Boxes size={17} /> Stok Habis</span>
            <strong>{stats.outOfStock}</strong>
            <small>Perlu restock</small>
          </div>
        </section>
      </div>

      {/* Layout: Side Nav + Content */}
      <section className="settings-layout">
        <aside className="settings-side-nav" aria-label="Kategori inventory">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = section.key === activeSection;
            return (
              <button key={section.key} type="button" className={`settings-side-button ${active ? 'active' : ''}`} onClick={() => setActiveSection(section.key)}>
                <span className="settings-side-icon"><Icon size={18} /></span>
                <span><strong>{section.title}</strong><small>{section.eyebrow}</small></span>
              </button>
            );
          })}
        </aside>

        <div className="settings-section-panel">
          <div className="settings-section-header">
            <span className="settings-section-icon"><ActiveIcon size={22} /></span>
            <div>
              <small>{activeSectionDef.eyebrow}</small>
              <h2>{activeSectionDef.title}</h2>
            </div>
          </div>

          {/* Warehouse filter for stock tab */}
          {activeSection === 'stock' && (
            <div className="inventory-filter-row">
              <select value={selectedWH} onChange={(e) => setSelectedWH(e.target.value)} className="admin-select">
                <option value="">Semua Gudang</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
              </select>
              <input value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)} className="admin-input" placeholder="Cari SKU / produk..." />
            </div>
          )}

          {/* Stock Table */}
          {activeSection === 'stock' && (
            <div className="inventory-section-body inventory-section-body--topless">
              {loading ? (
                <div className="admin-card text-center text-admin-muted" style={{ padding: '3rem' }}>Memuat stok...</div>
              ) : (
                <div className="inventory-table-shell">
                  <Table className="admin-table">
                    <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Gudang</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Reserved</TableHead><TableHead className="text-right">Tersedia</TableHead><TableHead>Update</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredBalances.map((b) => {
                        const available = Number(b.quantity) - Number(b.reservedQuantity);
                        return (
                          <TableRow key={b.id}>
                            <TableCell><strong>{b.productName}</strong><br /><code>{b.productSku}</code></TableCell>
                            <TableCell>{b.warehouseName}<br /><small>{b.warehouseTypeLabel ?? b.warehouseType}</small></TableCell>
                            <TableCell className="text-right font-bold">{formatQty(b.quantity)}</TableCell>
                            <TableCell className="text-right">{formatQty(b.reservedQuantity)}</TableCell>
                            <TableCell className="text-right font-bold">{formatQty(available)}</TableCell>
                            <TableCell>{new Date(b.updatedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
                          </TableRow>
                        );
                      })}
                      {!filteredBalances.length && <EmptyState colSpan={6} icon="📦" title="Stok kosong" description="Belum ada balance stok untuk filter ini." />}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Products */}
          {activeSection === 'products' && (
            <div className="settings-form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
                <ProductFormCard form={productForm} saving={saving} products={products} onChange={setProductForm} onSubmit={saveProduct} onCancel={() => setProductForm(emptyProduct)} />
                <ProductTable products={products} onEdit={startEditProduct} onDelete={removeProduct} />
              </div>
            </div>
          )}

          {/* Warehouses */}
          {activeSection === 'warehouses' && (
            <div className="settings-form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
                <WarehouseFormCard form={warehouseForm} saving={saving} warehouses={warehouses} onChange={setWarehouseForm} onSubmit={saveWarehouse} onCancel={() => setWarehouseForm(emptyWarehouse)} />
                <WarehouseTable warehouses={warehouses} onEdit={startEditWarehouse} onDelete={removeWarehouse} />
              </div>
            </div>
          )}

          {/* Stock Actions */}
          {activeSection === 'actions' && (
            <div className="inventory-section-body">
              <StockActionCard action={stockAction} saving={saving} warehouses={warehouses.filter((w) => w.status === 'active')} products={products.filter((p) => p.status === 'active')} onChange={setStockAction} onSubmit={submitStockAction} />
            </div>
          )}

          {/* Movements */}
          {activeSection === 'movements' && (
            <div className="inventory-section-body inventory-section-body--topless">
              <MovementTable movements={movements} />
            </div>
          )}

          {/* Transfer to Sales */}
          {activeSection === 'transfer' && (
            <div className="inventory-section-body">
              <SalesTransferSection
                salesUsers={salesUsers}
                warehouses={warehouses}
                products={products.filter((p) => p.status === 'active')}
                balances={balances}
                transferForm={transferForm}
                saving={saving}
                onChange={setTransferForm}
                onSubmit={submitSalesTransfer}
                onCreateWarehouse={createSalesWarehouse}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-admin-muted font-bold" style={{ fontSize: '.78rem' }}>{label}</span>{children}</label>;
}

function ProductFormCard({ form, saving, products, onChange, onSubmit, onCancel }: { form: ProductForm; saving: boolean; products: Product[]; onChange: (f: ProductForm) => void; onSubmit: () => void; onCancel: () => void }) {
  return (
    <div className="admin-card" style={{ margin: 0 }}>
      <h3 className="font-extrabold text-admin-foreground mb-4">{form.id ? 'Edit Produk' : 'Tambah Produk'}</h3>
      <div className="grid gap-3">
        <Field label="Gambar Produk">
          <div className="flex gap-3 items-center">
            <div className="flex items-center justify-center overflow-hidden border border-admin-border-subtle bg-admin-bg" style={{ width: 78, height: 78, borderRadius: 16 }}>
              {form.imagePreviewUrl || form.imageUrl ? <img src={form.imagePreviewUrl || form.imageUrl} alt={form.name || 'Gambar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={28} className="text-admin-muted" />}
            </div>
            <div className="flex gap-2 flex-wrap">
              <label className="admin-btn-ghost cursor-pointer"><Upload size={14} /> Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; onChange({ ...form, imageFile: file, imagePreviewUrl: URL.createObjectURL(file) }); e.currentTarget.value = ''; }} /></label>
              {(form.imagePreviewUrl || form.imageUrl) && <button className="admin-btn-ghost" type="button" onClick={() => onChange({ ...form, imageUrl: '', imageFile: null, imagePreviewUrl: '' })}><X size={14} /> Hapus</button>}
            </div>
          </div>
        </Field>
        <Field label="SKU"><div className="flex gap-2"><input className="admin-input w-full" value={form.sku} onChange={(e) => onChange({ ...form, sku: e.target.value.toUpperCase() })} placeholder="PRD-KR-001" /><button className="admin-btn-ghost" type="button" onClick={() => onChange({ ...form, sku: generateNextSku(form.name, products) })}>Generate</button></div></Field>
        <Field label="Nama Produk"><input className="admin-input w-full" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></Field>
        <Field label="Deskripsi"><textarea className="admin-input w-full" value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit"><input className="admin-input w-full" value={form.unit} onChange={(e) => onChange({ ...form, unit: e.target.value })} /></Field>
          <Field label="Harga"><input type="number" className="admin-input w-full" value={form.priceDefault} onChange={(e) => onChange({ ...form, priceDefault: e.target.value })} /></Field>
        </div>
        {!form.id && <Field label="Stok Awal Gudang Utama"><input type="number" className="admin-input w-full" value={form.initialStock} onChange={(e) => onChange({ ...form, initialStock: e.target.value })} /></Field>}
        {form.id && <Field label="Status"><select className="admin-select w-full" value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as Product['status'] })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>}
        <div className="flex gap-2">
          <button className="admin-btn-primary" type="button" disabled={saving || !form.name} onClick={onSubmit}><Save size={15} /> Simpan</button>
          {form.id && <button className="admin-btn-ghost" type="button" onClick={onCancel}>Batal</button>}
        </div>
      </div>
    </div>
  );
}

function WarehouseFormCard({ form, saving, warehouses, onChange, onSubmit, onCancel }: { form: WarehouseForm; saving: boolean; warehouses: Warehouse[]; onChange: (f: WarehouseForm) => void; onSubmit: () => void; onCancel: () => void }) {
  return (
    <div className="admin-card" style={{ margin: 0 }}>
      <h3 className="font-extrabold text-admin-foreground mb-4">{form.id ? 'Edit Gudang' : 'Tambah Gudang'}</h3>
      <div className="grid gap-3">
        <Field label="Kode"><div className="flex gap-2"><input className="admin-input w-full" value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value.toUpperCase() })} placeholder="WH-GD-001" /><button className="admin-btn-ghost" type="button" onClick={() => onChange({ ...form, code: generateNextWarehouseCode(form, warehouses) })}>Generate</button></div></Field>
        <Field label="Nama Gudang"><input className="admin-input w-full" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></Field>
        <Field label="Tipe"><select className="admin-select w-full" value={form.type} onChange={(e) => onChange({ ...form, type: e.target.value as Warehouse['type'] })}><option value="main">Gudang Utama</option><option value="sales_van">Gudang Sales</option><option value="outlet_consignment">Konsinyasi Outlet</option></select></Field>
        <Field label="Alamat"><textarea className="admin-input w-full" value={form.address} onChange={(e) => onChange({ ...form, address: e.target.value })} /></Field>
        <div className="flex gap-2">
          <button className="admin-btn-primary" type="button" disabled={saving || !form.name} onClick={onSubmit}><Save size={15} /> Simpan</button>
          {form.id && <button className="admin-btn-ghost" type="button" onClick={onCancel}>Batal</button>}
        </div>
      </div>
    </div>
  );
}

function ProductTable({ products, onEdit, onDelete }: { products: Product[]; onEdit: (p: Product) => void; onDelete: (p: Product) => void }) {
  return (
    <div className="inventory-table-shell">
      <Table className="admin-table">
        <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Unit</TableHead><TableHead>Harga</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell><div className="flex items-center gap-3"><div className="flex items-center justify-center overflow-hidden bg-admin-bg" style={{ width: 42, height: 42, borderRadius: 12 }}>{p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} className="text-admin-muted" />}</div><div><strong>{p.name}</strong><br /><code>{p.sku}</code></div></div></TableCell>
              <TableCell>{p.unit}</TableCell>
              <TableCell>{formatRp(p.priceDefault)}</TableCell>
              <TableCell><span className={`admin-badge ${p.status === 'active' ? 'admin-badge-success' : ''}`}>{p.status}</span></TableCell>
              <TableCell className="text-right"><button className="admin-btn-ghost" onClick={() => onEdit(p)} type="button"><Edit3 size={14} /></button><button className="admin-btn-ghost" onClick={() => onDelete(p)} type="button"><Trash2 size={14} /></button></TableCell>
            </TableRow>
          ))}
          {!products.length && <EmptyState colSpan={5} icon="📦" title="Belum ada produk" description="Tambahkan SKU pertama." />}
        </TableBody>
      </Table>
    </div>
  );
}

function WarehouseTable({ warehouses, onEdit, onDelete }: { warehouses: Warehouse[]; onEdit: (w: Warehouse) => void; onDelete: (w: Warehouse) => void }) {
  return (
    <div className="inventory-table-shell">
      <Table className="admin-table">
        <TableHeader><TableRow><TableHead>Gudang</TableHead><TableHead>Tipe</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>
          {warehouses.map((w) => (
            <TableRow key={w.id}>
              <TableCell><strong>{w.name}</strong><br /><code>{w.code}</code></TableCell>
              <TableCell>{w.type === 'main' ? 'Utama' : w.type === 'sales_van' ? 'Sales' : 'Konsinyasi'}</TableCell>
              <TableCell><span className={`admin-badge ${w.status === 'active' ? 'admin-badge-success' : ''}`}>{w.status}</span></TableCell>
              <TableCell className="text-right"><button className="admin-btn-ghost" onClick={() => onEdit(w)} type="button"><Edit3 size={14} /></button><button className="admin-btn-ghost" onClick={() => onDelete(w)} type="button"><Trash2 size={14} /></button></TableCell>
            </TableRow>
          ))}
          {!warehouses.length && <EmptyState colSpan={4} icon="🏬" title="Belum ada gudang" description="Tambahkan gudang utama atau gudang sales." />}
        </TableBody>
      </Table>
    </div>
  );
}

function StockActionCard({ action, saving, warehouses, products, onChange, onSubmit }: { action: { mode: 'adjustment' | 'reset' | 'transfer'; warehouseId: string; toWarehouseId: string; productId: string; quantity: string; notes: string }; saving: boolean; warehouses: Warehouse[]; products: Product[]; onChange: (a: any) => void; onSubmit: () => void }) {
  return (
    <div className="admin-card" style={{ margin: 0, maxWidth: 760 }}>
      <h3 className="font-extrabold text-admin-foreground mb-4">Operasi Stok</h3>
      <div className="grid gap-3">
        <Field label="Jenis Operasi"><select className="admin-select w-full" value={action.mode} onChange={(e) => onChange({ ...action, mode: e.target.value })}><option value="adjustment">Adjustment +/-</option><option value="reset">Reset Qty</option><option value="transfer">Transfer Gudang</option></select></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={action.mode === 'transfer' ? 'Gudang Asal' : 'Gudang'}><select className="admin-select w-full" value={action.warehouseId} onChange={(e) => onChange({ ...action, warehouseId: e.target.value })}><option value="">Pilih gudang</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}</select></Field>
          {action.mode === 'transfer' && <Field label="Gudang Tujuan"><select className="admin-select w-full" value={action.toWarehouseId} onChange={(e) => onChange({ ...action, toWarehouseId: e.target.value })}><option value="">Pilih tujuan</option>{warehouses.filter((w) => w.id !== action.warehouseId).map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}</select></Field>}
        </div>
        <Field label="Produk"><select className="admin-select w-full" value={action.productId} onChange={(e) => onChange({ ...action, productId: e.target.value })}><option value="">Pilih produk</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select></Field>
        <Field label={action.mode === 'reset' ? 'Target Quantity' : 'Quantity'}><input type="number" className="admin-input w-full" value={action.quantity} onChange={(e) => onChange({ ...action, quantity: e.target.value })} /></Field>
        <Field label="Catatan"><textarea className="admin-input w-full" value={action.notes} onChange={(e) => onChange({ ...action, notes: e.target.value })} /></Field>
        <button className="admin-btn-primary" type="button" disabled={saving || !action.warehouseId || !action.productId || !action.quantity || (action.mode === 'transfer' && !action.toWarehouseId)} onClick={onSubmit}>
          {action.mode === 'reset' ? <RotateCcw size={15} /> : <ArrowRightLeft size={15} />} Proses
        </button>
      </div>
    </div>
  );
}

function MovementTable({ movements }: { movements: InventoryMovement[] }) {
  return (
    <div className="inventory-table-shell">
      <Table className="admin-table">
        <TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>Produk</TableHead><TableHead>Gudang</TableHead><TableHead>Mutasi</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Catatan</TableHead></TableRow></TableHeader>
        <TableBody>
          {movements.map((m) => {
            const delta = Number(m.quantityDelta);
            return (
              <TableRow key={m.id}>
                <TableCell>{new Date(m.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
                <TableCell><strong>{m.productName}</strong><br /><code>{m.productSku}</code></TableCell>
                <TableCell>{m.warehouseCode}</TableCell>
                <TableCell>{m.movementLabel ?? m.movementType}</TableCell>
                <TableCell className={`text-right font-bold ${delta < 0 ? 'text-admin-danger' : 'text-admin-success'}`}>{delta > 0 ? '+' : ''}{formatQty(delta)}</TableCell>
                <TableCell>{m.notes ?? '-'}</TableCell>
              </TableRow>
            );
          })}
          {!movements.length && <EmptyState colSpan={6} icon="📋" title="Belum ada mutasi" description="Riwayat pergerakan stok akan muncul di sini." />}
        </TableBody>
      </Table>
    </div>
  );
}

function SalesTransferSection({
  salesUsers, warehouses, products, balances, transferForm, saving, onChange, onSubmit, onCreateWarehouse,
}: {
  salesUsers: SalesUser[];
  warehouses: Warehouse[];
  products: Product[];
  balances: InventoryBalance[];
  transferForm: { sourceWarehouseId: string; salesUserId: string; warehouseId: string; productId: string; quantity: string; notes: string };
  saving: boolean;
  onChange: (f: any) => void;
  onSubmit: () => void;
  onCreateWarehouse: (salesUserId: string) => void;
}) {
  const activeWarehouses = warehouses.filter((w) => w.status === 'active');
  const salesWarehouses = warehouses.filter((w) => w.type === 'sales_van' && w.status === 'active');
  const mainWarehouse = warehouses.find((w) => w.type === 'main' && w.status === 'active');
  const sourceOptions = activeWarehouses.filter((warehouse) => warehouse.id !== transferForm.warehouseId);
  const selectedSourceWarehouseId = transferForm.sourceWarehouseId || sourceOptions.find((w) => w.type === 'main')?.id || sourceOptions[0]?.id || '';
  const selectedSourceWarehouse = sourceOptions.find((w) => w.id === selectedSourceWarehouseId);
  const sourceWarehouseBalances = selectedSourceWarehouse ? balances.filter((b) => b.warehouseId === selectedSourceWarehouse.id) : [];

  const salesWithWarehouses = salesUsers.map((user) => {
    const wh = salesWarehouses.find((w) => w.ownerUserId === user.id);
    const stockItems = wh ? balances.filter((b) => b.warehouseId === wh.id) : [];
    return { user, warehouse: wh ?? null, stockItems };
  });

  const selectedWHBalances = transferForm.warehouseId ? balances.filter((b) => b.warehouseId === transferForm.warehouseId) : [];
  const selectedSales = salesWithWarehouses.find(({ user }) => user.id === transferForm.salesUserId);
  const selectedSourceBalance = sourceWarehouseBalances.find((b) => b.productId === transferForm.productId);
  const selectedSourceAvailable = selectedSourceBalance ? Number(selectedSourceBalance.quantity) - Number(selectedSourceBalance.reservedQuantity) : 0;
  const selectedTargetBalance = selectedWHBalances.find((b) => b.productId === transferForm.productId);
  const selectedTargetAvailable = selectedTargetBalance ? Number(selectedTargetBalance.quantity) - Number(selectedTargetBalance.reservedQuantity) : 0;

  return (
    <div className="inventory-transfer-layout">
      {/* Transfer Form */}
      <div className="admin-card inventory-transfer-card">
        <div className="inventory-card-heading">
          <span><Truck size={18} /></span>
          <div>
            <h3>Distribusi Stok ke Sales</h3>
            <p>Admin mengirim stok dari gudang sumber ke gudang sales.</p>
          </div>
        </div>
        <div className="grid gap-3">
          <Field label="Tujuan sales">
            <select
              className="admin-select w-full"
              value={transferForm.salesUserId}
              onChange={(e) => {
                const uid = e.target.value;
                const wh = salesWarehouses.find((w) => w.ownerUserId === uid);
                const currentSourceId = transferForm.sourceWarehouseId || mainWarehouse?.id || '';
                onChange({
                  ...transferForm,
                  sourceWarehouseId: currentSourceId === wh?.id ? '' : transferForm.sourceWarehouseId,
                  salesUserId: uid,
                  warehouseId: wh?.id ?? '',
                });
              }}
            >
              <option value="">Pilih sales</option>
              {salesWithWarehouses.map(({ user, warehouse }) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.employeeCode ? `(${user.employeeCode})` : ''} — {warehouse ? warehouse.code : 'Belum ada gudang'}
                </option>
              ))}
            </select>
          </Field>

          {transferForm.salesUserId && selectedSales && !selectedSales.warehouse && (
            <div className="admin-alert admin-alert-warning" style={{ margin: 0, alignItems: 'center' }}>
              <AlertTriangle size={15} />
              <span style={{ flex: 1 }}>Sales ini belum memiliki gudang. Buat gudang sales agar stok bisa dikirim.</span>
              <button
                className="admin-btn-ghost"
                type="button"
                disabled={saving}
                onClick={() => onCreateWarehouse(selectedSales.user.id)}
              >
                <WarehouseIcon size={14} /> Buat Gudang
              </button>
            </div>
          )}

          <Field label="Sumber gudang">
            <select
              className="admin-select w-full"
              value={selectedSourceWarehouseId}
              onChange={(e) => onChange({ ...transferForm, sourceWarehouseId: e.target.value })}
              disabled={!transferForm.salesUserId}
            >
              <option value="">Pilih gudang sumber</option>
              {sourceOptions.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code}) — {warehouse.type === 'main' ? 'Gudang utama' : warehouse.type === 'sales_van' ? 'Gudang sales' : 'Konsinyasi outlet'}
                </option>
              ))}
            </select>
            {transferForm.salesUserId && selectedSourceWarehouse && (
              <span style={{ display: 'block', marginTop: 6, color: 'var(--admin-muted)', fontSize: '.75rem', fontWeight: 700 }}>
                Stok akan keluar dari {selectedSourceWarehouse.name}.
              </span>
            )}
            {transferForm.salesUserId && sourceOptions.length === 0 && (
              <span style={{ display: 'block', marginTop: 6, color: 'var(--admin-danger)', fontSize: '.75rem', fontWeight: 700 }}>
                Tidak ada gudang sumber lain yang bisa dipilih.
              </span>
            )}
          </Field>

          <Field label="Produk">
            <select className="admin-select w-full" value={transferForm.productId} onChange={(e) => onChange({ ...transferForm, productId: e.target.value })}>
              <option value="">Pilih produk</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            {transferForm.productId && selectedSourceWarehouse && (
              <span style={{ display: 'block', marginTop: 6, color: selectedSourceAvailable > 0 ? 'var(--admin-muted)' : 'var(--admin-danger)', fontSize: '.75rem', fontWeight: 700 }}>
                Stok tersedia di gudang sumber: {formatQty(selectedSourceAvailable)}
              </span>
            )}
          </Field>

          {transferForm.warehouseId && (
            <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: '.75rem' }}>
              <p style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--admin-muted)', marginBottom: '.35rem' }}>Gudang tujuan</p>
              {transferForm.productId ? (
                <p style={{ fontSize: '.8rem', color: 'var(--admin-foreground)', margin: 0, fontWeight: 800 }}>
                  Stok produk : {formatQty(selectedTargetAvailable)}
                </p>
              ) : (
                <p style={{ fontSize: '.78rem', color: 'var(--admin-muted)', margin: 0 }}>Pilih produk untuk melihat stok produk tersebut di gudang sales.</p>
              )}
            </div>
          )}

          <Field label="Jumlah">
            <input type="number" min="1" className="admin-input w-full" value={transferForm.quantity} onChange={(e) => onChange({ ...transferForm, quantity: e.target.value })} placeholder="0" />
          </Field>

          <Field label="Catatan (opsional)">
            <textarea className="admin-input w-full" value={transferForm.notes} onChange={(e) => onChange({ ...transferForm, notes: e.target.value })} rows={2} placeholder="Contoh: Restock mingguan" />
          </Field>

          <button
            className="admin-btn-primary"
            type="button"
            disabled={saving || !selectedSourceWarehouse}
            onClick={onSubmit}
          >
            {saving ? 'Mengirim...' : <><Send size={15} /> Kirim ke Gudang Sales</>}
          </button>
        </div>
      </div>

      {/* Sales Overview */}
      <div className="admin-card inventory-sales-panel">
        <div className="inventory-card-heading inventory-card-heading--compact">
          <span><UserCircle size={18} /></span>
          <div>
            <h3>Daftar Sales</h3>
            <p>Gudang sales dan status siap distribusi.</p>
          </div>
        </div>
        {salesWithWarehouses.length === 0 ? (
          <p className="text-admin-muted" style={{ fontSize: '.85rem' }}>Tidak ada sales aktif ditemukan.</p>
        ) : (
          <div className="inventory-sales-list">
            {salesWithWarehouses.map(({ user, warehouse, stockItems }) => (
              <div key={user.id} className="inventory-sales-card">
                <div className="inventory-sales-card-head">
                  <div className="inventory-sales-avatar">
                    {user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="inventory-sales-title">
                    <strong>{user.name}</strong>
                    <p>
                      {user.employeeCode ?? user.email ?? '-'} · {warehouse ? `Gudang: ${warehouse.code}` : 'Belum ada gudang'}
                    </p>
                  </div>
                  {warehouse && (
                    <button
                      className="admin-btn-ghost"
                      type="button"
                      onClick={() => {
                        onChange({
                          ...transferForm,
                          sourceWarehouseId: (transferForm.sourceWarehouseId || mainWarehouse?.id || '') === warehouse.id ? '' : transferForm.sourceWarehouseId,
                          salesUserId: user.id,
                          warehouseId: warehouse.id,
                        });
                      }}
                    >
                      <Truck size={14} /> Pilih Tujuan
                    </button>
                  )}
                  {!warehouse && (
                    <button
                      className="admin-btn-ghost"
                      type="button"
                      disabled={saving}
                      onClick={() => onCreateWarehouse(user.id)}
                    >
                      <WarehouseIcon size={14} /> Buat Gudang
                    </button>
                  )}
                </div>
                {warehouse && transferForm.productId ? (
                  <div className="inventory-stock-chip-list">
                    {(() => {
                      const item = stockItems.find((b) => b.productId === transferForm.productId);
                      const available = item ? Number(item.quantity) - Number(item.reservedQuantity) : 0;
                      return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: available > 0 ? 'var(--admin-success-soft)' : 'var(--admin-danger-bg)', color: available > 0 ? 'var(--admin-success)' : 'var(--admin-danger)', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700 }}>
                          Stok produk dipilih: {formatQty(available)}
                        </span>
                      );
                    })()}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
