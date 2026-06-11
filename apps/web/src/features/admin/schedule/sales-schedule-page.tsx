import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { AlertTriangle, CalendarPlus, CheckCircle2, Clock, Download, MapPin, RefreshCw, Search, Send, UserRound, X, XCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';
import {
  approveVisitSchedule,
  cancelVisitSchedule,
  createVisitSchedules,
  getOutlets,
  getTenantUsers,
  getVisitSchedules,
  type Outlet,
  type TenantUser,
  type VisitSchedule,
} from '@/lib/api/tenant';

const scheduleStatusLabel: Record<string, string> = {
  draft: 'Draft',
  assigned: 'Ditugaskan',
  approved: 'Disetujui',
  in_progress: 'Berjalan',
  completed: 'Selesai',
  missed: 'Terlewat',
  cancelled: 'Dibatalkan',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatRp(value: string | number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function isSalesUser(user: TenantUser) {
  const code = user.roleCode.toLowerCase();
  return code.includes('sales') || code.includes('agent') || code === 'field_sales';
}

type ScheduleForm = {
  salesUserId: string;
  scheduledDate: string;
  plannedStartTime: string;
  plannedEndTime: string;
  targetClosingCount: number;
  targetRevenueAmount: string;
  targetDurationMinutes: string;
  priority: number;
  notes: string;
};

const emptyForm: ScheduleForm = {
  salesUserId: '',
  scheduledDate: todayStr(),
  plannedStartTime: '08:00',
  plannedEndTime: '17:00',
  targetClosingCount: 0,
  targetRevenueAmount: '0',
  targetDurationMinutes: '',
  priority: 3,
  notes: '',
};

export function SalesSchedulePage() {
  const { accessToken } = useAuth();
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);
  const [outletSearch, setOutletSearch] = useState('');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const params = { date: selectedDate || undefined, salesUserId: selectedUserId || undefined };
      const [scheduleRes, userRes, outletRes] = await Promise.all([
        getVisitSchedules(accessToken, params),
        getTenantUsers(accessToken),
        getOutlets(accessToken, { status: 'active' }),
      ]);
      setSchedules(scheduleRes.schedules ?? []);
      setUsers(userRes.users ?? []);
      setOutlets(outletRes.outlets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat jadwal sales');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken, selectedDate, selectedUserId]);

  const salesUsers = useMemo(() => {
    const filtered = users.filter((u) => u.status === 'active' && isSalesUser(u));
    return filtered.length ? filtered : users.filter((u) => u.status === 'active' && u.roleCode !== 'ADMINISTRATOR');
  }, [users]);

  const filteredOutlets = useMemo(() => {
    const q = outletSearch.trim().toLowerCase();
    if (!q) return outlets;
    return outlets.filter((o) => `${o.code} ${o.name} ${o.address}`.toLowerCase().includes(q));
  }, [outletSearch, outlets]);

  const selectedOutlets = useMemo(() => outlets.filter((o) => selectedOutletIds.includes(o.id)), [outlets, selectedOutletIds]);

  const filteredSchedules = useMemo(() => {
    const q = scheduleSearch.trim().toLowerCase();
    return schedules.filter((schedule) => {
      if (selectedStatus && schedule.status !== selectedStatus) return false;
      if (!q) return true;
      const salesName = getUserName(schedule.salesUserId);
      const outletName = getOutletName(schedule.outletId);
      return `${salesName} ${outletName} ${schedule.scheduledDate} ${schedule.notes ?? ''} ${schedule.status}`.toLowerCase().includes(q);
    });
  }, [schedules, selectedStatus, scheduleSearch, users, outlets]);

  const groupedSchedules = useMemo(() => {
    const rows = new Map<string, VisitSchedule[]>();
    for (const s of filteredSchedules) {
      const key = `${s.salesUserId}:${s.scheduledDate}`;
      rows.set(key, [...(rows.get(key) ?? []), s]);
    }
    return Array.from(rows.values());
  }, [filteredSchedules]);

  const scheduleStats = useMemo(() => ({
    total: filteredSchedules.length,
    assigned: filteredSchedules.filter((s) => s.status === 'assigned').length,
    approved: filteredSchedules.filter((s) => s.status === 'approved').length,
    completed: filteredSchedules.filter((s) => s.status === 'completed').length,
  }), [filteredSchedules]);

  function getUserName(id: string) { return users.find((u) => u.id === id)?.name ?? 'Sales tidak dikenal'; }
  function getOutletName(id?: string | null) {
    if (!id) return 'Tanpa outlet';
    const o = outlets.find((item) => item.id === id);
    return o ? `${o.code} - ${o.name}` : `Outlet ${id.slice(0, 8)}`;
  }
  function toggleOutlet(id: string) {
    setSelectedOutletIds((c) => c.includes(id) ? c.filter((i) => i !== id) : [...c, id]);
  }

  function getCreateBlocker() {
    if (!form.salesUserId) return 'Pilih sales terlebih dahulu.';
    if (!form.scheduledDate) return 'Pilih tanggal jadwal terlebih dahulu.';
    if (!selectedOutletIds.length) return 'Pilih minimal satu outlet.';
    return '';
  }

  function openModal() {
    setForm({ ...emptyForm, scheduledDate: selectedDate || todayStr() });
    setSelectedOutletIds([]);
    setOutletSearch('');
    setError('');
    setShowModal(true);
  }

  async function handleCreate(event?: React.FormEvent) {
    event?.preventDefault();
    if (!accessToken) return;
    setError('');
    const blocker = getCreateBlocker();
    if (blocker) { setError(blocker); return; }
    setSaving(true);
    try {
      const result = await createVisitSchedules(accessToken, {
        salesUserId: form.salesUserId,
        outletIds: selectedOutletIds,
        scheduledDate: form.scheduledDate,
        plannedStartTime: form.plannedStartTime || undefined,
        plannedEndTime: form.plannedEndTime || undefined,
        targetOutletCount: selectedOutletIds.length,
        targetDurationMinutes: form.targetDurationMinutes ? Number(form.targetDurationMinutes) : undefined,
        targetClosingCount: Number(form.targetClosingCount || 0),
        targetRevenueAmount: String(form.targetRevenueAmount || '0'),
        priority: Number(form.priority),
        notes: form.notes || undefined,
      });
      setSuccess(`${result.schedules.length} jadwal outlet berhasil dibuat.`);
      setShowModal(false);
      setSelectedDate(form.scheduledDate);
      setSelectedUserId(form.salesUserId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat jadwal sales');
    } finally {
      setSaving(false);
    }
  }

  async function runScheduleAction(id: string, action: 'approve' | 'cancel') {
    if (!accessToken) return;
    setError(''); setSuccess(''); setSaving(true);
    try {
      if (action === 'approve') { await approveVisitSchedule(accessToken, id); setSuccess('Jadwal berhasil disetujui.'); }
      else { await cancelVisitSchedule(accessToken, id); setSuccess('Jadwal berhasil dibatalkan.'); }
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Aksi jadwal gagal'); }
    finally { setSaving(false); }
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case 'assigned': return { background: 'var(--admin-accent-shadow)', color: 'var(--admin-accent)' };
      case 'approved': case 'completed': return { background: 'var(--admin-success-soft)', color: 'var(--admin-success)' };
      case 'in_progress': return { background: 'var(--admin-accent-shadow)', color: 'var(--admin-accent-light)' };
      case 'missed': return { background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' };
      case 'cancelled': return { background: 'var(--admin-bg)', color: 'var(--admin-muted-dim)' };
      default: return { background: 'var(--admin-bg)', color: 'var(--admin-muted)' };
    }
  }

  function exportExcel() {
    const rows = filteredSchedules.map((schedule) => ({
      Tanggal: schedule.scheduledDate,
      Sales: getUserName(schedule.salesUserId),
      Outlet: getOutletName(schedule.outletId),
      Status: scheduleStatusLabel[schedule.status] ?? schedule.status,
      Prioritas: schedule.priority,
      'Jam Mulai': schedule.plannedStartTime ?? '-',
      'Jam Selesai': schedule.plannedEndTime ?? '-',
      'Target Closing': schedule.targetClosingCount,
      'Target Omset': Number(schedule.targetRevenueAmount || 0),
      Catatan: schedule.notes ?? '',
    }));
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Tanggal: 'Tidak ada data' }]);
    sheet['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 34 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(workbook, sheet, 'Jadwal Sales');
    XLSX.writeFile(workbook, `jadwal-sales-${selectedDate || 'semua'}.xlsx`, { compression: true });
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><CalendarPlus size={24} style={{ color: 'var(--admin-accent)' }} /> Jadwalkan Sales</h1>
          <p className="admin-page-subtitle">Susun rute outlet harian sales, tetapkan target, lalu pantau realisasi kunjungannya.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="admin-btn-ghost" type="button" disabled={!filteredSchedules.length}>
            <Download size={16} /> Excel
          </button>
          <button onClick={load} className="admin-btn-ghost" type="button" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button onClick={openModal} className="admin-btn-primary" type="button">
            <CalendarPlus size={16} /> Buat Jadwal
          </button>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error"><AlertTriangle size={15} />{error}<button onClick={() => setError('')} className="admin-alert-close">×</button></div>}
      {success && <div className="admin-alert admin-alert-success"><CheckCircle2 size={15} />{success}<button onClick={() => setSuccess('')} className="admin-alert-close">×</button></div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        <ScheduleStat label="Total Jadwal" value={scheduleStats.total} />
        <ScheduleStat label="Ditugaskan" value={scheduleStats.assigned} tone="warning" />
        <ScheduleStat label="Disetujui" value={scheduleStats.approved} tone="success" />
        <ScheduleStat label="Selesai" value={scheduleStats.completed} tone="success" />
      </section>

      {/* ─── Filters ────────────────────────────── */}
      <section className="mb-4 rounded-[1.5rem] border border-admin-border bg-admin-bg-card p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[160px_220px_190px_minmax(260px,1fr)_auto]">
          <input className="admin-input w-full" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <select className="admin-select w-full" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
            <option value="">Semua sales</option>
            {salesUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="admin-select w-full" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="">Semua status</option>
            {Object.entries(scheduleStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <div className="relative min-w-0">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-admin-muted" />
            <input
              className="admin-input admin-input-with-icon w-full"
              placeholder="Cari sales, outlet, tanggal, status, atau catatan..."
              value={scheduleSearch}
              onChange={(e) => setScheduleSearch(e.target.value)}
            />
            {scheduleSearch && (
              <button
                className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-admin-muted hover:bg-admin-bg"
                type="button"
                onClick={() => setScheduleSearch('')}
                aria-label="Bersihkan pencarian jadwal"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            className="admin-btn-ghost justify-center"
            type="button"
            onClick={() => { setSelectedDate(todayStr()); setSelectedUserId(''); setSelectedStatus(''); setScheduleSearch(''); }}
          >
            Reset
          </button>
        </div>
      </section>

      {/* ─── Schedule List ──────────────────────── */}
      {loading ? (
        <div className="admin-card grid place-items-center text-center text-admin-muted" style={{ padding: '3rem', minHeight: 126 }}>
          <div className="grid justify-items-center gap-3">
            <RefreshCw size={20} className="spin" />
            <span className="text-sm font-semibold">Memuat jadwal...</span>
          </div>
        </div>
      ) : groupedSchedules.length ? (
        <div className="grid gap-3">
          {groupedSchedules.map((group) => {
            const first = group[0];
            return (
              <article key={`${first.salesUserId}-${first.scheduledDate}-${first.id}`} className="admin-card" style={{ padding: '1rem', borderRadius: '1.25rem' }}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: 'var(--admin-accent-shadow)', color: 'var(--admin-accent)' }}>
                      <UserRound size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-admin-foreground">{getUserName(first.salesUserId)}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-admin-muted">
                        <span>{first.scheduledDate}</span>
                        <span>Target {group.length} outlet</span>
                        {first.plannedStartTime || first.plannedEndTime ? (
                          <span className="inline-flex items-center gap-1"><Clock size={12} /> {first.plannedStartTime ?? '--:--'} - {first.plannedEndTime ?? '--:--'}</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase tracking-wide text-admin-muted">Target Omset</p>
                    <strong className="text-sm font-black text-admin-accent">{formatRp(first.targetRevenueAmount)}</strong>
                  </div>
                </div>

                <div className="grid gap-2">
                  {group.map((s) => {
                    const statusStyle = getStatusStyle(s.status);
                    const canApprove = s.status === 'assigned';
                    const canCancel = ['assigned', 'approved'].includes(s.status);
                    return (
                      <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-2.5" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border-subtle)' }}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-admin-foreground">{getOutletName(s.outletId)}</p>
                          <p className="text-xs font-semibold text-admin-muted">Prioritas {s.priority} · Target closing {s.targetClosingCount}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-xl px-3 py-1 text-xs font-black" style={statusStyle}>{scheduleStatusLabel[s.status] ?? s.status}</span>
                          {canApprove && <button className="admin-btn-ghost" type="button" disabled={saving} onClick={() => runScheduleAction(s.id, 'approve')}><CheckCircle2 size={14} /> Approve</button>}
                          {canCancel && <button className="admin-btn-ghost" type="button" disabled={saving} onClick={() => runScheduleAction(s.id, 'cancel')}><XCircle size={14} /> Cancel</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-card text-center" style={{ padding: '3rem', border: '2px dashed var(--admin-border)' }}>
          <CalendarPlus size={42} className="mx-auto mb-3 text-admin-subtle" />
          <p className="text-base font-black text-admin-foreground">Belum ada jadwal sales</p>
          <p className="mt-1 text-sm font-medium text-admin-muted">Klik "Buat Jadwal" untuk membuat jadwal baru.</p>
        </div>
      )}

      {/* ─── Create Modal ───────────────────────── */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => { if (!saving) setShowModal(false); }}>
          <div className="admin-modal" style={{ maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Buat Jadwal Sales</h2>
                <p className="admin-modal-subtitle">Satu outlet akan menjadi satu schedule.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="admin-modal-close" type="button" disabled={saving}>×</button>
            </div>

            <form id="sales-schedule-create-form" onSubmit={handleCreate} className="admin-modal-body">
              {error && <div className="admin-alert admin-alert-error mb-3"><AlertTriangle size={15} />{error}</div>}

              <div className="admin-field">
                <label>Sales *</label>
                <select className="admin-input" value={form.salesUserId} onChange={(e) => setForm((c) => ({ ...c, salesUserId: e.target.value }))} required>
                  <option value="">Pilih sales</option>
                  {salesUsers.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.roleName})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="admin-field">
                  <label>Tanggal *</label>
                  <input type="date" className="admin-input" value={form.scheduledDate} onChange={(e) => setForm((c) => ({ ...c, scheduledDate: e.target.value }))} required />
                </div>
                <div className="admin-field">
                  <label>Prioritas</label>
                  <select className="admin-input" value={form.priority} onChange={(e) => setForm((c) => ({ ...c, priority: Number(e.target.value) }))}>
                    <option value={1}>1 - Sangat tinggi</option>
                    <option value={2}>2 - Tinggi</option>
                    <option value={3}>3 - Normal</option>
                    <option value={4}>4 - Rendah</option>
                    <option value={5}>5 - Fleksibel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="admin-field">
                  <label>Mulai</label>
                  <input type="time" className="admin-input" value={form.plannedStartTime} onChange={(e) => setForm((c) => ({ ...c, plannedStartTime: e.target.value }))} />
                </div>
                <div className="admin-field">
                  <label>Selesai</label>
                  <input type="time" className="admin-input" value={form.plannedEndTime} onChange={(e) => setForm((c) => ({ ...c, plannedEndTime: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="admin-field">
                  <label>Target Closing</label>
                  <input type="number" min={0} className="admin-input" value={form.targetClosingCount} onChange={(e) => setForm((c) => ({ ...c, targetClosingCount: Number(e.target.value) }))} />
                </div>
                <div className="admin-field">
                  <label>Target Omset</label>
                  <input type="number" min={0} className="admin-input" value={form.targetRevenueAmount} onChange={(e) => setForm((c) => ({ ...c, targetRevenueAmount: e.target.value }))} />
                </div>
                <div className="admin-field">
                  <label>Durasi/Outlet</label>
                  <input type="number" min={1} className="admin-input" placeholder="menit" value={form.targetDurationMinutes} onChange={(e) => setForm((c) => ({ ...c, targetDurationMinutes: e.target.value }))} />
                </div>
              </div>

              <div className="admin-field">
                <label>Catatan</label>
                <textarea className="admin-input" rows={2} placeholder="Instruksi rute, fokus outlet, atau catatan penagihan." value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
              </div>

              {/* Outlet Picker */}
              <div className="admin-field">
                <label>Pilih Outlet * <span className="text-admin-muted font-normal">({selectedOutlets.length} dipilih)</span></label>
                <div className="admin-search-box !p-2 !rounded-xl !gap-2 mb-2">
                  <Search size={14} />
                  <input className="!text-sm" placeholder="Cari outlet..." value={outletSearch} onChange={(e) => setOutletSearch(e.target.value)} />
                  {outletSearch && <button className="admin-search-clear !h-6 !w-6" type="button" onClick={() => setOutletSearch('')}><X size={12} /></button>}
                </div>
                <div className="max-h-48 space-y-1.5 overflow-auto pr-1">
                  {filteredOutlets.map((o) => {
                    const selected = selectedOutletIds.includes(o.id);
                    return (
                      <button key={o.id} type="button" onClick={() => toggleOutlet(o.id)}
                        className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition"
                        style={{ background: selected ? 'var(--admin-accent-shadow)' : 'var(--admin-surface)', border: `1px solid ${selected ? 'var(--admin-accent)' : 'var(--admin-border)'}` }}>
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md" style={{ background: selected ? 'var(--admin-accent)' : 'transparent', border: `1px solid ${selected ? 'var(--admin-accent)' : 'var(--admin-border-strong)'}` }}>
                          {selected ? <CheckCircle2 size={13} color="white" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm text-admin-foreground">{o.code} - {o.name}</strong>
                          <span className="flex items-center gap-1 text-xs text-admin-muted"><MapPin size={11} /><span className="truncate">{o.address}</span></span>
                        </span>
                      </button>
                    );
                  })}
                  {!filteredOutlets.length && <p className="rounded-xl p-3 text-center text-sm text-admin-muted" style={{ border: '1px dashed var(--admin-border)' }}>Outlet tidak ditemukan.</p>}
                </div>
                <p className="mt-2 text-xs font-semibold text-admin-muted">
                  Tombol simpan akan membuat satu jadwal untuk setiap outlet yang dipilih.
                </p>
              </div>
            </form>

            <div className="admin-modal-footer">
              <button onClick={() => setShowModal(false)} className="admin-btn-ghost" type="button" disabled={saving}>Batal</button>
              <button
                className="admin-btn-primary"
                type="submit"
                form="sales-schedule-create-form"
                disabled={saving}
                title={getCreateBlocker() || 'Simpan jadwal sales'}
              >
                {saving ? <RefreshCw size={15} className="spin" /> : <Send size={15} />} Buat {selectedOutletIds.length} Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleStat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'success' | 'warning' }) {
  const color = tone === 'success'
    ? 'var(--admin-success)'
    : tone === 'warning'
      ? 'var(--admin-warning)'
      : 'var(--admin-accent)';
  return (
    <div className="rounded-[1.2rem] border border-admin-border bg-admin-bg-card p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-admin-muted">{label}</p>
      <strong className="mt-1 block text-2xl font-black" style={{ color }}>{value}</strong>
    </div>
  );
}
