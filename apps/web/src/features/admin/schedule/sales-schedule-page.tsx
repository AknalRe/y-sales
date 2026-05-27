import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, CheckCircle2, Clock, MapPin, RefreshCw, Search, Send, UserRound, XCircle } from 'lucide-react';
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

const scheduleStatusTone: Record<string, { bg: string; color: string; border: string }> = {
  draft: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  assigned: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  approved: { bg: '#ecfdf5', color: '#059669', border: '#bbf7d0' },
  in_progress: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  completed: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  missed: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  cancelled: { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
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
  const [outletSearch, setOutletSearch] = useState('');
  const [form, setForm] = useState({
    salesUserId: '',
    scheduledDate: todayStr(),
    plannedStartTime: '08:00',
    plannedEndTime: '17:00',
    targetClosingCount: 0,
    targetRevenueAmount: '0',
    targetDurationMinutes: '',
    priority: 3,
    notes: '',
  });
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const params = {
        date: selectedDate || undefined,
        salesUserId: selectedUserId || undefined,
      };
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

  useEffect(() => {
    load();
  }, [accessToken, selectedDate, selectedUserId]);

  const salesUsers = useMemo(() => {
    const filtered = users.filter((user) => user.status === 'active' && isSalesUser(user));
    return filtered.length ? filtered : users.filter((user) => user.status === 'active' && user.roleCode !== 'ADMINISTRATOR');
  }, [users]);

  const filteredOutlets = useMemo(() => {
    const q = outletSearch.trim().toLowerCase();
    if (!q) return outlets;
    return outlets.filter((outlet) => `${outlet.code} ${outlet.name} ${outlet.address}`.toLowerCase().includes(q));
  }, [outletSearch, outlets]);

  const selectedOutlets = useMemo(
    () => outlets.filter((outlet) => selectedOutletIds.includes(outlet.id)),
    [outlets, selectedOutletIds],
  );

  const groupedSchedules = useMemo(() => {
    const rows = new Map<string, VisitSchedule[]>();
    for (const schedule of schedules) {
      const key = `${schedule.salesUserId}:${schedule.scheduledDate}`;
      rows.set(key, [...(rows.get(key) ?? []), schedule]);
    }
    return Array.from(rows.values());
  }, [schedules]);

  function getUserName(id: string) {
    return users.find((user) => user.id === id)?.name ?? 'Sales tidak dikenal';
  }

  function getOutletName(id?: string | null) {
    if (!id) return 'Tanpa outlet';
    const outlet = outlets.find((item) => item.id === id);
    return outlet ? `${outlet.code} - ${outlet.name}` : `Outlet ${id.slice(0, 8)}`;
  }

  function toggleOutlet(id: string) {
    setSelectedOutletIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    setError('');
    setSuccess('');
    if (!form.salesUserId) {
      setError('Pilih sales terlebih dahulu.');
      return;
    }
    if (!selectedOutletIds.length) {
      setError('Pilih minimal satu outlet untuk jadwal sales.');
      return;
    }

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
      setSelectedOutletIds([]);
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
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      if (action === 'approve') {
        await approveVisitSchedule(accessToken, id);
        setSuccess('Jadwal berhasil disetujui.');
      } else {
        await cancelVisitSchedule(accessToken, id);
        setSuccess('Jadwal berhasil dibatalkan.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aksi jadwal gagal diproses');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <CalendarPlus size={24} style={{ color: '#b55925' }} />
            Jadwalkan Sales
          </h1>
          <p className="admin-page-subtitle">
            Susun rute outlet harian sales, tetapkan target, lalu pantau realisasi kunjungannya.
          </p>
        </div>
        <button onClick={load} className="admin-btn-ghost" type="button" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}
      {success && (
        <div className="admin-alert" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #bbf7d0' }}>
          <CheckCircle2 size={15} />
          {success}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleCreate} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-[#b55925]">
              <Send size={19} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Buat Jadwal</h2>
              <p className="text-sm font-medium text-slate-500">Satu outlet akan menjadi satu schedule.</p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Sales
              <select
                className="admin-select"
                value={form.salesUserId}
                onChange={(event) => setForm((current) => ({ ...current, salesUserId: event.target.value }))}
                required
              >
                <option value="">Pilih sales</option>
                {salesUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.name} ({user.roleName})</option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Tanggal
                <input
                  type="date"
                  className="admin-input"
                  value={form.scheduledDate}
                  onChange={(event) => setForm((current) => ({ ...current, scheduledDate: event.target.value }))}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Prioritas
                <select
                  className="admin-select"
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) }))}
                >
                  <option value={1}>1 - Sangat tinggi</option>
                  <option value={2}>2 - Tinggi</option>
                  <option value={3}>3 - Normal</option>
                  <option value={4}>4 - Rendah</option>
                  <option value={5}>5 - Fleksibel</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Mulai
                <input
                  type="time"
                  className="admin-input"
                  value={form.plannedStartTime}
                  onChange={(event) => setForm((current) => ({ ...current, plannedStartTime: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Selesai
                <input
                  type="time"
                  className="admin-input"
                  value={form.plannedEndTime}
                  onChange={(event) => setForm((current) => ({ ...current, plannedEndTime: event.target.value }))}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Target Closing
                <input
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.targetClosingCount}
                  onChange={(event) => setForm((current) => ({ ...current, targetClosingCount: Number(event.target.value) }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Target Omset
                <input
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.targetRevenueAmount}
                  onChange={(event) => setForm((current) => ({ ...current, targetRevenueAmount: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Durasi/Outlet
                <input
                  type="number"
                  min={1}
                  className="admin-input"
                  placeholder="menit"
                  value={form.targetDurationMinutes}
                  onChange={(event) => setForm((current) => ({ ...current, targetDurationMinutes: event.target.value }))}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Catatan
              <textarea
                className="admin-input min-h-20 resize-none"
                placeholder="Instruksi rute, fokus outlet, atau catatan penagihan."
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Pilih Outlet</h3>
                  <p className="text-xs font-semibold text-slate-500">{selectedOutlets.length} outlet dipilih</p>
                </div>
                <span className="rounded-xl bg-white px-3 py-1 text-xs font-black text-[#b55925] ring-1 ring-slate-200">
                  Target {selectedOutlets.length}
                </span>
              </div>

              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="admin-input w-full pl-9"
                  placeholder="Cari outlet..."
                  value={outletSearch}
                  onChange={(event) => setOutletSearch(event.target.value)}
                />
              </div>

              <div className="max-h-64 space-y-2 overflow-auto pr-1">
                {filteredOutlets.map((outlet) => {
                  const selected = selectedOutletIds.includes(outlet.id);
                  return (
                    <button
                      key={outlet.id}
                      type="button"
                      onClick={() => toggleOutlet(outlet.id)}
                      className="flex w-full items-start gap-3 rounded-2xl border bg-white p-3 text-left transition hover:border-orange-200"
                      style={{ borderColor: selected ? '#f2b38a' : '#e2e8f0' }}
                    >
                      <span className="mt-1 grid h-5 w-5 place-items-center rounded-md border" style={{ background: selected ? '#b55925' : '#fff', borderColor: selected ? '#b55925' : '#cbd5e1' }}>
                        {selected ? <CheckCircle2 size={13} color="#fff" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-slate-900">{outlet.code} - {outlet.name}</strong>
                        <span className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                          <MapPin size={12} />
                          <span className="truncate">{outlet.address}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
                {!filteredOutlets.length && (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm font-semibold text-slate-500">
                    Outlet aktif tidak ditemukan.
                  </p>
                )}
              </div>
            </div>

            <button className="brand-button flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-black text-white disabled:opacity-60" type="submit" disabled={saving}>
              {saving ? <RefreshCw size={16} className="spin" /> : <CalendarPlus size={16} />}
              Buat Jadwal Sales
            </button>
          </div>
        </form>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Daftar Jadwal</h2>
              <p className="text-sm font-medium text-slate-500">Filter berdasarkan tanggal dan sales.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input className="admin-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              <select className="admin-select" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                <option value="">Semua sales</option>
                {salesUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="admin-loading">
              <RefreshCw size={18} className="spin" />
              <span>Memuat jadwal...</span>
            </div>
          ) : groupedSchedules.length ? (
            <div className="space-y-3">
              {groupedSchedules.map((group) => {
                const first = group[0];
                return (
                  <article key={`${first.salesUserId}-${first.scheduledDate}-${first.id}`} className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-[#b55925]">
                          <UserRound size={18} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900">{getUserName(first.salesUserId)}</h3>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                            <span>{first.scheduledDate}</span>
                            <span>Target {group.length} outlet</span>
                            {first.plannedStartTime || first.plannedEndTime ? (
                              <span className="inline-flex items-center gap-1"><Clock size={12} /> {first.plannedStartTime ?? '--:--'} - {first.plannedEndTime ?? '--:--'}</span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Target Omset</p>
                        <strong className="text-sm font-black text-[#b55925]">{formatRp(first.targetRevenueAmount)}</strong>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {group.map((schedule) => {
                        const tone = scheduleStatusTone[schedule.status] ?? scheduleStatusTone.draft;
                        const canApprove = schedule.status === 'assigned';
                        const canCancel = ['assigned', 'approved'].includes(schedule.status);
                        return (
                          <div key={schedule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-900">{getOutletName(schedule.outletId)}</p>
                              <p className="text-xs font-semibold text-slate-500">Prioritas {schedule.priority} - Target closing {schedule.targetClosingCount}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-xl px-3 py-1 text-xs font-black" style={{ background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}>
                                {scheduleStatusLabel[schedule.status] ?? schedule.status}
                              </span>
                              {canApprove ? (
                                <button className="admin-btn-ghost" type="button" disabled={saving} onClick={() => runScheduleAction(schedule.id, 'approve')}>
                                  <CheckCircle2 size={14} />
                                  Approve
                                </button>
                              ) : null}
                              {canCancel ? (
                                <button className="admin-btn-ghost" type="button" disabled={saving} onClick={() => runScheduleAction(schedule.id, 'cancel')}>
                                  <XCircle size={14} />
                                  Cancel
                                </button>
                              ) : null}
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
            <div className="rounded-[1.5rem] border-2 border-dashed border-slate-200 py-16 text-center">
              <CalendarPlus size={42} className="mx-auto mb-3 text-slate-300" />
              <p className="text-base font-black text-slate-700">Belum ada jadwal sales</p>
              <p className="mt-1 text-sm font-medium text-slate-500">Buat jadwal agar sales punya list outlet kunjungan hari ini.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
