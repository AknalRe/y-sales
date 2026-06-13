import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Edit3, MapPin, Plus, RefreshCw, Search, Store, Trash2, X, XCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';
import {
  approveOutlet,
  createOutlet,
  deleteOutlet,
  getOutlets,
  rejectOutlet,
  reverseGeocodeOutlet,
  searchMapAddress,
  updateOutlet,
  type Outlet,
  type OutletPayload,
} from '@/lib/api/tenant';
import { OutletMapPicker } from './outlet-map-picker';

type OutletForm = {
  code: string;
  name: string;
  customerType: 'store' | 'agent';
  ownerName: string;
  phone: string;
  address: string;
  latitude: string;
  longitude: string;
  geofenceRadiusM: string;
  status: 'draft' | 'pending_verification' | 'active' | 'rejected' | 'inactive';
};

const emptyForm: OutletForm = {
  code: '',
  name: '',
  customerType: 'store',
  ownerName: '',
  phone: '',
  address: '',
  latitude: '',
  longitude: '',
  geofenceRadiusM: '',
  status: 'pending_verification',
};

const statusTone: Record<Outlet['status'], { label: string; bg: string; color: string; border: string }> = {
  draft: { label: 'Draft', bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  pending_verification: { label: 'Menunggu Verifikasi', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  active: { label: 'Aktif', bg: '#ecfdf5', color: '#059669', border: '#bbf7d0' },
  rejected: { label: 'Ditolak', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  inactive: { label: 'Nonaktif', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
};

function toPayload(form: OutletForm): OutletPayload {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    customerType: form.customerType,
    ownerName: form.ownerName.trim() || undefined,
    phone: form.phone.trim() || undefined,
    address: form.address.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    geofenceRadiusM: form.geofenceRadiusM ? Number(form.geofenceRadiusM) : undefined,
    status: form.status,
  };
}

function toForm(outlet: Outlet): OutletForm {
  return {
    code: outlet.code,
    name: outlet.name,
    customerType: outlet.customerType,
    ownerName: outlet.ownerName ?? '',
    phone: outlet.phone ?? '',
    address: outlet.address,
    latitude: outlet.latitude,
    longitude: outlet.longitude,
    geofenceRadiusM: outlet.geofenceRadiusM ? String(outlet.geofenceRadiusM) : '',
    status: outlet.status,
  };
}

function toOptionalCoordinate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export function OutletsPage() {
  const { accessToken, user } = useAuth();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Outlet | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState<OutletForm>(emptyForm);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const reverseRequestId = useRef(0);
  const canApproveOutlet = Boolean(user?.isSuperAdmin || ['ADMINISTRATOR', 'OWNER', 'OPERATIONAL_MANAGER'].includes(user?.roleCode ?? ''));

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const result = await getOutlets(accessToken, {
        status: statusFilter || undefined,
        q: search || undefined,
      });
      setOutlets(result.outlets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat outlet');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, search.trim() ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [accessToken, statusFilter, search]);

  const stats = useMemo(() => ({
    total: outlets.length,
    active: outlets.filter((outlet) => outlet.status === 'active').length,
    pending: outlets.filter((outlet) => outlet.status === 'pending_verification').length,
    inactive: outlets.filter((outlet) => outlet.status === 'inactive').length,
  }), [outlets]);

  function openCreate() {
    setEditingOutlet(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError('');
    setSuccess('');
  }

  function openEdit(outlet: Outlet) {
    setEditingOutlet(outlet);
    setForm(toForm(outlet));
    setFormOpen(true);
    setError('');
    setSuccess('');
  }

  function closeForm() {
    setFormOpen(false);
    setEditingOutlet(null);
    setForm(emptyForm);
    setResolvingAddress(false);
  }

  async function syncAddressFromPoint(latitude: number, longitude: number, manual = false) {
    if (!accessToken || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const requestId = reverseRequestId.current + 1;
    reverseRequestId.current = requestId;
    setResolvingAddress(true);
    if (manual) setError('');
    try {
      const result = await reverseGeocodeOutlet(accessToken, latitude, longitude);
      if (reverseRequestId.current !== requestId) return;
      if (result.address) {
        setForm((current) => ({ ...current, address: result.address ?? current.address }));
      } else if (manual) {
        setError('Alamat tidak ditemukan dari titik maps tersebut.');
      }
    } catch (err) {
      if (manual) setError(err instanceof Error ? err.message : 'Gagal mengambil alamat dari titik maps.');
    } finally {
      if (reverseRequestId.current === requestId) setResolvingAddress(false);
    }
  }

  function handleMapPositionChange(position: { latitude: number; longitude: number; address?: string }) {
    setForm((current) => ({
      ...current,
      latitude: String(position.latitude),
      longitude: String(position.longitude),
      address: position.address ?? current.address,
    }));
    if (!position.address) void syncAddressFromPoint(position.latitude, position.longitude);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    const payload = toPayload(form);
    if (!canApproveOutlet) {
      if (editingOutlet) delete payload.status;
      else payload.status = 'pending_verification';
    }
    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError('Latitude dan longitude harus berupa angka valid.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingOutlet) {
        await updateOutlet(accessToken, editingOutlet.id, payload);
        setSuccess('Outlet berhasil diperbarui.');
      } else {
        await createOutlet(accessToken, payload);
        setSuccess('Outlet berhasil dibuat.');
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan outlet');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify(outlet: Outlet) {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await approveOutlet(accessToken, outlet.id);
      setSuccess('Outlet berhasil diaktifkan.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal verifikasi outlet');
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!accessToken || !rejectTarget) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await rejectOutlet(accessToken, rejectTarget.id, rejectReason);
      setSuccess('Outlet berhasil ditolak.');
      setRejectTarget(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal reject outlet');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(outlet: Outlet) {
    if (!accessToken) return;
    const confirmed = window.confirm(`Nonaktifkan outlet "${outlet.name}"?`);
    if (!confirmed) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await deleteOutlet(accessToken, outlet.id);
      setSuccess('Outlet berhasil dinonaktifkan.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menonaktifkan outlet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Store size={24} className="text-admin-accent" />
            Management Outlet
          </h1>
          <p className="admin-page-subtitle">Kelola master outlet, titik GPS, radius kunjungan, dan status verifikasi toko.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="admin-btn-ghost" type="button" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button onClick={openCreate} className="admin-btn-primary" type="button">
            <Plus size={15} />
            Tambah Outlet
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertTriangle size={15} />
          {error}
          <button onClick={() => setError('')} className="admin-alert-close">x</button>
        </div>
      )}
      {success && (
        <div className="admin-alert admin-alert-success">
          <CheckCircle2 size={15} />
          {success}
          <button onClick={() => setSuccess('')} className="admin-alert-close">x</button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Outlet" value={stats.total} />
        <StatCard label="Outlet Aktif" value={stats.active} tone="#059669" />
        <StatCard label="Menunggu Verifikasi" value={stats.pending} tone="#d97706" />
        <StatCard label="Nonaktif" value={stats.inactive} tone="#64748b" />
      </div>

      <section className="mt-5 rounded-[1.5rem] border border-admin-border bg-admin-bg-card p-5 shadow-sm">
        <div className="mb-4 grid gap-3 items-center xl:grid-cols-[minmax(260px,1fr)_220px_auto]">
          <div className="admin-search-box !mb-0 h-[42px] !py-0 px-3">
            <Search size={18} />
            <input
              className="h-full"
              placeholder="Cari kode, nama, PIC, alamat, atau HP..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search ? (
              <button className="admin-search-clear" type="button" onClick={() => setSearch('')} title="Bersihkan pencarian">
                <X size={14} />
              </button>
            ) : null}
          </div>
          <select className="admin-select w-full h-[42px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Semua status</option>
            <option value="pending_verification">Menunggu Verifikasi</option>
            <option value="active">Aktif</option>
            <option value="draft">Draft</option>
            <option value="rejected">Ditolak</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <button className="admin-btn-ghost justify-center h-[42px]" type="button" onClick={() => { setSearch(''); setStatusFilter(''); }}>
            Reset Filter
          </button>
        </div>
        <div className="mb-4 flex items-center justify-between gap-2 text-xs font-bold text-admin-muted">
          <span>{outlets.length} outlet ditemukan</span>
          {loading ? <span>Memuat data...</span> : null}
        </div>

        {loading ? (
          <div className="admin-loading">
            <RefreshCw size={18} className="spin" />
            <span>Memuat outlet...</span>
          </div>
        ) : outlets.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {outlets.map((outlet) => {
              const tone = statusTone[outlet.status];
              return (
                <article key={outlet.id} className="flex min-h-[12rem] flex-col rounded-2xl border border-admin-border bg-admin-bg-card p-3 transition hover:border-admin-accent hover:shadow-sm">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-lg bg-admin-accent-shadow px-2 py-0.5 text-[11px] font-black text-admin-accent">{outlet.code}</span>
                      <span className="rounded-lg px-2 py-0.5 text-[11px] font-black" style={{ background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}>
                        {tone.label}
                      </span>
                      <span className="rounded-lg bg-admin-bg px-2 py-0.5 text-[11px] font-black text-admin-muted">
                        {outlet.customerType === 'agent' ? 'Agent' : 'Toko'}
                      </span>
                    </div>
                    <h2 className="truncate text-base font-black text-admin-foreground">{outlet.name}</h2>
                    <p className="mt-1 truncate text-xs font-semibold text-admin-muted">{outlet.ownerName || 'Tanpa PIC'} {outlet.phone ? `- ${outlet.phone}` : ''}</p>
                    <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-admin-muted">
                      <MapPin size={13} className="mt-0.5 shrink-0 text-admin-muted" />
                      <span className="line-clamp-2">{outlet.address}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold text-admin-muted">
                      <span className="rounded-lg bg-admin-bg px-2 py-0.5">Lat {outlet.latitude}</span>
                      <span className="rounded-lg bg-admin-bg px-2 py-0.5">Lng {outlet.longitude}</span>
                      <span className="rounded-lg bg-admin-bg px-2 py-0.5">Radius {outlet.geofenceRadiusM ?? 'default'}m</span>
                      <a
                        href={`https://www.google.com/maps?q=${outlet.latitude},${outlet.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-admin-accent-shadow px-2 py-0.5 text-admin-accent"
                      >
                        Maps
                      </a>
                    </div>
                    {outlet.rejectionReason ? (
                      <p className="mt-2 rounded-lg bg-admin-danger-soft px-2 py-1.5 text-[11px] font-bold text-admin-danger">Alasan reject: {outlet.rejectionReason}</p>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-admin-border-subtle pt-3">
                    <button className="admin-btn-ghost px-2.5 py-1.5 text-xs" type="button" onClick={() => openEdit(outlet)}>
                      <Edit3 size={13} />
                      Edit
                    </button>
                    {canApproveOutlet && outlet.status !== 'active' ? (
                      <button className="admin-btn-ghost px-2.5 py-1.5 text-xs" type="button" disabled={saving} onClick={() => handleVerify(outlet)}>
                        <CheckCircle2 size={13} />
                        Aktifkan
                      </button>
                    ) : null}
                    {canApproveOutlet && outlet.status !== 'rejected' && outlet.status !== 'inactive' ? (
                      <button className="admin-btn-ghost px-2.5 py-1.5 text-xs" type="button" disabled={saving} onClick={() => { setRejectTarget(outlet); setRejectReason(''); }}>
                        <XCircle size={13} />
                        Reject
                      </button>
                    ) : null}
                    {outlet.status !== 'inactive' ? (
                      <button className="admin-btn-ghost px-2.5 py-1.5 text-xs" type="button" disabled={saving} onClick={() => handleDeactivate(outlet)}>
                        <Trash2 size={13} />
                        Nonaktif
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border-2 border-dashed border-admin-border py-16 text-center">
            <Store size={42} className="mx-auto mb-3 text-admin-border" />
            <p className="text-base font-black text-admin-foreground">Belum ada outlet</p>
            <p className="mt-1 text-sm font-medium text-admin-muted">Tambahkan outlet agar bisa dijadwalkan ke sales.</p>
          </div>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[1.5rem] bg-admin-surface p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-admin-foreground">{editingOutlet ? 'Edit Outlet' : 'Tambah Outlet'}</h2>
                <p className="text-sm font-medium text-admin-muted">Pastikan koordinat outlet sesuai lokasi toko untuk validasi radius visit.</p>
              </div>
              <button onClick={closeForm} className="admin-btn-ghost" type="button">Tutup</button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kode Outlet">
                <input className="admin-input" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required />
              </Field>
              <Field label="Nama Outlet">
                <input className="admin-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              </Field>
              <Field label="Tipe Customer">
                <select className="admin-select" value={form.customerType} onChange={(event) => setForm((current) => ({ ...current, customerType: event.target.value as OutletForm['customerType'] }))}>
                  <option value="store">Toko</option>
                  <option value="agent">Agent</option>
                </select>
              </Field>
              {canApproveOutlet ? (
                <Field label="Status">
                  <select className="admin-select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as OutletForm['status'] }))}>
                    <option value="pending_verification">Menunggu Verifikasi</option>
                    <option value="active">Aktif</option>
                    <option value="draft">Draft</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </Field>
              ) : (
                <div className="rounded-2xl border border-admin-border bg-admin-bg px-4 py-3 text-sm font-semibold text-admin-muted">
                  Outlet yang Anda buat akan masuk status <strong className="text-admin-foreground">Menunggu Verifikasi</strong> dan perlu approval Administrator, Owner, atau Operational Manager.
                </div>
              )}
              <Field label="Nama PIC / Owner">
                <input className="admin-input" value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
              </Field>
              <Field label="No. HP">
                <input className="admin-input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </Field>
              <div className="sm:col-span-2">
                <OutletMapPicker
                  latitude={toOptionalCoordinate(form.latitude)}
                  longitude={toOptionalCoordinate(form.longitude)}
                  onChange={handleMapPositionChange}
                  onSearch={accessToken ? (query) => searchMapAddress(accessToken, query).then((result) => result.results) : undefined}
                  description="Klik peta atau geser marker untuk mengisi koordinat. Alamat akan disesuaikan dari titik maps."
                />
              </div>
              <Field label="Latitude">
                <input className="admin-input" type="number" step="any" value={form.latitude} onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))} required />
              </Field>
              <Field label="Longitude">
                <input className="admin-input" type="number" step="any" value={form.longitude} onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))} required />
              </Field>
              <Field label="Radius Geofence (meter)">
                <input className="admin-input" type="number" min={1} placeholder="Kosongkan untuk default sistem" value={form.geofenceRadiusM} onChange={(event) => setForm((current) => ({ ...current, geofenceRadiusM: event.target.value }))} />
              </Field>
              <label className="grid gap-2 text-sm font-bold text-admin-text sm:col-span-2">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  Alamat
                  <button
                    className="admin-btn-ghost px-2.5 py-1.5 text-xs"
                    type="button"
                    disabled={resolvingAddress || toOptionalCoordinate(form.latitude) === null || toOptionalCoordinate(form.longitude) === null}
                    onClick={() => void syncAddressFromPoint(Number(form.latitude), Number(form.longitude), true)}
                  >
                    {resolvingAddress ? <RefreshCw size={13} className="spin" /> : <MapPin size={13} />}
                    Ambil alamat dari titik
                  </button>
                </span>
                <textarea className="admin-input min-h-24 resize-none" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} required />
                <small className="font-semibold text-admin-muted">Alamat mengikuti titik maps saat marker dipilih. Tetap bisa diedit manual jika hasil maps belum presisi.</small>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={closeForm} className="admin-btn-ghost" type="button">Batal</button>
              <button className="admin-btn-primary" type="submit" disabled={saving}>
                {saving ? <RefreshCw size={15} className="spin" /> : <CheckCircle2 size={15} />}
                Simpan Outlet
              </button>
            </div>
          </form>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[1.5rem] bg-admin-surface p-6 shadow-2xl">
            <h2 className="text-xl font-black text-admin-foreground">Reject Outlet</h2>
            <p className="mt-1 text-sm font-medium text-admin-muted">Tulis alasan agar data outlet bisa diperbaiki.</p>
            <textarea
              className="admin-input mt-4 min-h-28 resize-none"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Contoh: koordinat belum sesuai lokasi toko."
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setRejectTarget(null)} className="admin-btn-ghost" type="button">Batal</button>
              <button onClick={handleReject} className="admin-btn-primary" type="button" disabled={saving || rejectReason.trim().length < 3}>
                Reject Outlet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone = 'var(--admin-accent)' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-[1.25rem] border border-admin-border bg-admin-bg-card p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-admin-muted">{label}</p>
      <strong className="mt-2 block text-2xl font-black text-admin-foreground" style={{ color: tone }}>{value}</strong>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-admin-text">
      {label}
      {children}
    </label>
  );
}
