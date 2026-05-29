import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Edit3, MapPin, Plus, RefreshCw, Search, Store, Trash2, XCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';
import {
  approveOutlet,
  createOutlet,
  deleteOutlet,
  getOutlets,
  rejectOutlet,
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

export function OutletsPage() {
  const { accessToken } = useAuth();
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
    load();
  }, [accessToken, statusFilter]);

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
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    const payload = toPayload(form);
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
            <Store size={24} style={{ color: '#b55925' }} />
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

      <section className="mt-5 rounded-[1.5rem] border border-admin-border bg-admin-surface p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
            <input
              className="admin-input w-full pl-9"
              placeholder="Cari kode, nama, alamat, atau HP..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') load();
              }}
            />
          </div>
          <select className="admin-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Semua status</option>
            <option value="pending_verification">Menunggu Verifikasi</option>
            <option value="active">Aktif</option>
            <option value="draft">Draft</option>
            <option value="rejected">Ditolak</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-loading">
            <RefreshCw size={18} className="spin" />
            <span>Memuat outlet...</span>
          </div>
        ) : outlets.length ? (
          <div className="grid gap-3">
            {outlets.map((outlet) => {
              const tone = statusTone[outlet.status];
              return (
                <article key={outlet.id} className="rounded-2xl border border-admin-border p-4 transition hover:border-admin-accent hover:shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-xl bg-admin-accent-shadow px-2.5 py-1 text-xs font-black text-admin-accent">{outlet.code}</span>
                        <span className="rounded-xl px-2.5 py-1 text-xs font-black" style={{ background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}>
                          {tone.label}
                        </span>
                        <span className="rounded-xl bg-admin-bg px-2.5 py-1 text-xs font-black text-admin-muted">
                          {outlet.customerType === 'agent' ? 'Agent' : 'Toko'}
                        </span>
                      </div>
                      <h2 className="truncate text-lg font-black text-admin-foreground">{outlet.name}</h2>
                      <p className="mt-1 text-sm font-semibold text-admin-muted">{outlet.ownerName || 'Tanpa PIC'} {outlet.phone ? `- ${outlet.phone}` : ''}</p>
                      <p className="mt-2 flex items-start gap-2 text-sm font-medium text-admin-muted">
                        <MapPin size={15} className="mt-0.5 shrink-0 text-admin-muted" />
                        <span>{outlet.address}</span>
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-admin-muted">
                        <span className="rounded-xl bg-admin-bg px-3 py-1">Lat {outlet.latitude}</span>
                        <span className="rounded-xl bg-admin-bg px-3 py-1">Lng {outlet.longitude}</span>
                        <span className="rounded-xl bg-admin-bg px-3 py-1">Radius {outlet.geofenceRadiusM ?? 'default'}m</span>
                        <a
                          href={`https://www.google.com/maps?q=${outlet.latitude},${outlet.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-admin-accent-shadow px-3 py-1 text-admin-accent"
                        >
                          Buka Maps
                        </a>
                      </div>
                      {outlet.rejectionReason ? (
                        <p className="mt-3 rounded-xl bg-admin-danger-soft px-3 py-2 text-xs font-bold text-admin-danger">Alasan reject: {outlet.rejectionReason}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button className="admin-btn-ghost" type="button" onClick={() => openEdit(outlet)}>
                        <Edit3 size={14} />
                        Edit
                      </button>
                      {outlet.status !== 'active' ? (
                        <button className="admin-btn-ghost" type="button" disabled={saving} onClick={() => handleVerify(outlet)}>
                          <CheckCircle2 size={14} />
                          Aktifkan
                        </button>
                      ) : null}
                      {outlet.status !== 'rejected' && outlet.status !== 'inactive' ? (
                        <button className="admin-btn-ghost" type="button" disabled={saving} onClick={() => { setRejectTarget(outlet); setRejectReason(''); }}>
                          <XCircle size={14} />
                          Reject
                        </button>
                      ) : null}
                      {outlet.status !== 'inactive' ? (
                        <button className="admin-btn-ghost" type="button" disabled={saving} onClick={() => handleDeactivate(outlet)}>
                          <Trash2 size={14} />
                          Nonaktif
                        </button>
                      ) : null}
                    </div>
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
              <Field label="Status">
                <select className="admin-select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as OutletForm['status'] }))}>
                  <option value="pending_verification">Menunggu Verifikasi</option>
                  <option value="active">Aktif</option>
                  <option value="draft">Draft</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </Field>
              <Field label="Nama PIC / Owner">
                <input className="admin-input" value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
              </Field>
              <Field label="No. HP">
                <input className="admin-input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </Field>
              <div className="sm:col-span-2">
                <OutletMapPicker
                  latitude={Number.isFinite(Number(form.latitude)) ? Number(form.latitude) : null}
                  longitude={Number.isFinite(Number(form.longitude)) ? Number(form.longitude) : null}
                  onChange={(position) => setForm((current) => ({
                    ...current,
                    latitude: String(position.latitude),
                    longitude: String(position.longitude),
                  }))}
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
                Alamat
                <textarea className="admin-input min-h-24 resize-none" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} required />
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

function StatCard({ label, value, tone = '#b55925' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-[1.25rem] border border-admin-border bg-admin-surface p-4 shadow-sm">
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
