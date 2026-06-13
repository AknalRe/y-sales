import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Map,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Timer,
  User,
  X,
} from 'lucide-react';

import { useAuth } from '../../auth/auth-provider';
import {
  getTenantUsers,
  getVisitSchedules,
  getVisitSessions,
  type TenantUser,
  type VisitSchedule,
  type VisitSession,
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

const visitStatusLabel: Record<string, string> = {
  open: 'Sedang Visit',
  completed: 'Selesai',
  invalid_location: 'Lokasi Invalid',
  synced: 'Tersinkron',
};

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

function formatTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return '-';
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

function formatRp(value: string | number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function mapsUrl(latitude?: string | null, longitude?: string | null) {
  if (!latitude || !longitude) return '';
  return `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function statusTone(status: string) {
  if (['completed', 'approved', 'valid', 'synced'].includes(status)) return 'success';
  if (['open', 'in_progress', 'assigned'].includes(status)) return 'warning';
  if (['invalid_location', 'missed', 'cancelled', 'face_not_detected'].includes(status)) return 'danger';
  return 'info';
}

export function TrackingPage() {
  const { accessToken } = useAuth();
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [sessions, setSessions] = useState<VisitSession[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'sessions' | 'schedules'>('sessions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const params = { date: selectedDate || undefined, salesUserId: selectedUserId || undefined };
      const [scheduleRes, sessionRes, userRes] = await Promise.all([
        getVisitSchedules(accessToken, params),
        getVisitSessions(accessToken, params),
        getTenantUsers(accessToken),
      ]);
      setSchedules(scheduleRes.schedules ?? []);
      setSessions(sessionRes.sessions ?? []);
      setUsers(userRes.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat tracking kunjungan');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [accessToken, selectedDate, selectedUserId]);

  function getUserName(id: string) {
    return users.find((user) => user.id === id)?.name ?? 'Sales tidak dikenal';
  }

  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((session) => {
      if (selectedStatus && session.status !== selectedStatus) return false;
      if (!q) return true;
      return `${session.salesName ?? getUserName(session.salesUserId)} ${session.outletCode ?? ''} ${session.outletName ?? ''} ${session.outletAddress ?? ''} ${session.outcome ?? ''} ${session.status}`.toLowerCase().includes(q);
    });
  }, [sessions, selectedStatus, query, users]);

  const filteredSchedules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schedules.filter((schedule) => {
      if (selectedStatus && schedule.status !== selectedStatus) return false;
      if (!q) return true;
      return `${schedule.salesName ?? getUserName(schedule.salesUserId)} ${schedule.outletCode ?? ''} ${schedule.outletName ?? ''} ${schedule.outletAddress ?? ''} ${schedule.notes ?? ''} ${schedule.status}`.toLowerCase().includes(q);
    });
  }, [schedules, selectedStatus, query, users]);

  const stats = useMemo(() => ({
    total: filteredSessions.length,
    completed: filteredSessions.filter((session) => session.status === 'completed').length,
    open: filteredSessions.filter((session) => session.status === 'open').length,
    invalid: filteredSessions.filter((session) => session.status === 'invalid_location').length,
  }), [filteredSessions]);

  const activeRows = tab === 'sessions' ? filteredSessions.length : filteredSchedules.length;

  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    const visitRows = filteredSessions.map((session) => ({
      Sales: session.salesName ?? getUserName(session.salesUserId),
      Outlet: `${session.outletCode ?? ''} ${session.outletName ?? ''}`.trim(),
      Alamat: session.outletAddress ?? '',
      Status: visitStatusLabel[session.status] ?? session.status,
      Outcome: session.outcome ?? '-',
      'Check-in': session.checkInAt ? new Date(session.checkInAt).toLocaleString('id-ID') : '-',
      'Check-out': session.checkOutAt ? new Date(session.checkOutAt).toLocaleString('id-ID') : '-',
      Durasi: formatDuration(session.durationSeconds),
      'Jarak Check-in': session.checkInDistanceM ?? '-',
      'Akurasi Check-in': session.checkInAccuracyM ?? '-',
      Maps: mapsUrl(session.checkInLatitude, session.checkInLongitude),
    }));
    const scheduleRows = filteredSchedules.map((schedule) => ({
      Tanggal: schedule.scheduledDate,
      Sales: schedule.salesName ?? getUserName(schedule.salesUserId),
      Outlet: `${schedule.outletCode ?? ''} ${schedule.outletName ?? ''}`.trim(),
      Alamat: schedule.outletAddress ?? '',
      Status: scheduleStatusLabel[schedule.status] ?? schedule.status,
      Prioritas: schedule.priority,
      'Jam Mulai': schedule.plannedStartTime ?? '-',
      'Jam Selesai': schedule.plannedEndTime ?? '-',
      'Target Closing': schedule.targetClosingCount,
      'Target Omset': Number(schedule.targetRevenueAmount || 0),
      Catatan: schedule.notes ?? '',
    }));
    const visitSheet = XLSX.utils.json_to_sheet(visitRows.length ? visitRows : [{ Sales: 'Tidak ada data' }]);
    const scheduleSheet = XLSX.utils.json_to_sheet(scheduleRows.length ? scheduleRows : [{ Tanggal: 'Tidak ada data' }]);
    visitSheet['!cols'] = [{ wch: 28 }, { wch: 34 }, { wch: 42 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 45 }];
    scheduleSheet['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 34 }, { wch: 42 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(workbook, visitSheet, 'Visit');
    XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'Jadwal');
    XLSX.writeFile(workbook, `tracking-kunjungan-${selectedDate || 'semua'}.xlsx`, { compression: true });
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Navigation size={24} style={{ color: 'var(--admin-accent)' }} />
            Tracking Kunjungan
          </h1>
          <p className="admin-page-subtitle">Monitor pergerakan sales, status visit outlet, dan realisasi jadwal harian.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="admin-btn-ghost" type="button" disabled={!activeRows}>
            <Download size={16} /> Excel
          </button>
          <button onClick={load} className="admin-btn-ghost" type="button" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error"><AlertCircle size={15} /> {error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TrackingStat label="Total Visit" value={stats.total} icon={MapPin} />
        <TrackingStat label="Selesai" value={stats.completed} icon={CheckCircle2} tone="success" />
        <TrackingStat label="Aktif" value={stats.open} icon={Timer} tone="warning" />
        <TrackingStat label="Invalid" value={stats.invalid} icon={AlertCircle} tone="danger" />
      </section>

      <section className="mt-5 rounded-[1.5rem] border border-admin-border bg-admin-bg-card p-4 shadow-[0_1px_1px_0_rgba(0,_0,_0,_0.025)]">
        <div className="grid gap-3 items-center xl:grid-cols-[160px_220px_190px_minmax(260px,1fr)_auto]">
          <input className="admin-input w-full h-[42px]" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          <select className="admin-select w-full h-[42px]" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
            <option value="">Semua sales</option>
            {users.filter((user) => user.roleCode !== 'ADMINISTRATOR').map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          <select className="admin-select w-full h-[42px]" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
            <option value="">Semua status</option>
            {Object.entries(tab === 'sessions' ? visitStatusLabel : scheduleStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="admin-search-box !mb-0 h-[42px] !py-0 px-3">
            <Search size={18} />
            <input
              className="h-full"
              placeholder="Cari sales, outlet, alamat, outcome, atau status..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button className="admin-search-clear" type="button" onClick={() => setQuery('')} aria-label="Bersihkan pencarian">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="admin-tab-group justify-self-end h-[42px] min-w-[160px]">
            <button onClick={() => { setTab('sessions'); setSelectedStatus(''); }} className={`admin-tab flex-1 font-bold ${tab === 'sessions' ? 'active' : ''}`} type="button">Visit</button>
            <button onClick={() => { setTab('schedules'); setSelectedStatus(''); }} className={`admin-tab flex-1 font-bold ${tab === 'schedules' ? 'active' : ''}`} type="button">Jadwal</button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="admin-loading mt-5">
          <RefreshCw size={18} className="spin" />
          <span>Menyelaraskan data lapangan...</span>
        </div>
      ) : (
        <section className="mt-5 grid gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-admin-muted">{activeRows} data ditampilkan</p>
          </div>

          {tab === 'sessions' ? filteredSessions.map((session) => (
            <VisitSessionCard key={session.id} session={session} salesName={session.salesName ?? getUserName(session.salesUserId)} />
          )) : filteredSchedules.map((schedule) => (
            <VisitScheduleCard key={schedule.id} schedule={schedule} salesName={schedule.salesName ?? getUserName(schedule.salesUserId)} />
          ))}

          {!activeRows && (
            <div className="rounded-[2rem] border-2 border-dashed border-admin-border py-20 text-center text-admin-muted">
              <Map size={46} className="mx-auto mb-4 opacity-30" />
              <p className="text-base font-black text-admin-foreground">Tidak ada data tracking</p>
              <p className="text-sm">Ubah filter atau tunggu sales melakukan kunjungan.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function TrackingStat({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: any; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const color = tone === 'success' ? 'var(--admin-success)' : tone === 'warning' ? 'var(--admin-warning)' : tone === 'danger' ? 'var(--admin-danger)' : 'var(--admin-accent)';
  return (
    <div className="rounded-[1.2rem] border border-admin-border bg-admin-bg-card p-4 shadow-[0_1px_1px_0_rgba(0,_0,_0,_0.025)]">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={18} style={{ color }} />
        <span className="text-xs font-black uppercase tracking-wide text-admin-muted">{label}</span>
      </div>
      <strong className="text-2xl font-black" style={{ color }}>{value}</strong>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone = statusTone(status);
  const cls = tone === 'success'
    ? 'bg-admin-success-soft text-admin-success'
    : tone === 'danger'
      ? 'bg-admin-danger-soft text-admin-danger'
      : tone === 'warning'
        ? 'bg-admin-warning-soft text-admin-warning'
        : 'bg-admin-accent-shadow text-admin-accent';
  return <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${cls}`}>{label}</span>;
}

function VisitSessionCard({ session, salesName }: { session: VisitSession; salesName: string }) {
  const checkInMaps = mapsUrl(session.checkInLatitude, session.checkInLongitude);
  return (
    <article className="grid gap-3 rounded-2xl border border-admin-border bg-admin-bg-card p-3 shadow-sm lg:grid-cols-[minmax(230px,1fr)_minmax(260px,1.3fr)_minmax(320px,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={session.status} label={visitStatusLabel[session.status] ?? session.status} />
          {session.validationStatus && <StatusBadge status={session.validationStatus} label={session.validationStatus.replace(/_/g, ' ')} />}
        </div>
        <h2 className="mt-1 truncate text-sm font-black text-admin-foreground">{salesName}</h2>
        <p className="truncate text-xs font-semibold text-admin-muted">{session.outletCode ? `${session.outletCode} - ` : ''}{session.outletName ?? 'Outlet tidak dikenal'}</p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-black text-admin-foreground">{session.outletAddress ?? '-'}</p>
        <p className="text-xs font-semibold text-admin-muted">Jarak {session.checkInDistanceM ?? '-'}m · Akurasi {session.checkInAccuracyM ?? '-'}m</p>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-3">
        <MiniMetric icon={Clock} label="Check-in" value={formatTime(session.checkInAt)} />
        <MiniMetric icon={Clock} label="Check-out" value={formatTime(session.checkOutAt)} />
        <MiniMetric icon={Timer} label="Durasi" value={formatDuration(session.durationSeconds)} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {checkInMaps ? (
          <a className="admin-btn-ghost px-3 py-2 text-xs" href={checkInMaps} target="_blank" rel="noreferrer">
            <MapPin size={14} /> Maps
          </a>
        ) : (
          <button className="admin-btn-ghost px-3 py-2 text-xs" type="button" disabled><MapPin size={14} /> Maps</button>
        )}
      </div>
    </article>
  );
}

function VisitScheduleCard({ schedule, salesName }: { schedule: VisitSchedule; salesName: string }) {
  return (
    <article className="grid gap-3 rounded-2xl border border-admin-border bg-admin-bg-card p-3 shadow-sm lg:grid-cols-[minmax(230px,1fr)_minmax(280px,1.4fr)_minmax(240px,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <StatusBadge status={schedule.status} label={scheduleStatusLabel[schedule.status] ?? schedule.status} />
        <h2 className="mt-1 truncate text-sm font-black text-admin-foreground">{salesName}</h2>
        <p className="truncate text-xs font-semibold text-admin-muted">{schedule.scheduledDate} · Prioritas {schedule.priority}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-admin-foreground">{schedule.outletCode ? `${schedule.outletCode} - ` : ''}{schedule.outletName ?? 'Tanpa outlet'}</p>
        <p className="truncate text-xs font-semibold text-admin-muted">{schedule.outletAddress ?? schedule.notes ?? '-'}</p>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-3">
        <MiniMetric icon={Calendar} label="Jam" value={`${schedule.plannedStartTime ?? '--:--'}-${schedule.plannedEndTime ?? '--:--'}`} />
        <MiniMetric icon={MapPin} label="Outlet" value={String(schedule.targetOutletCount)} />
        <MiniMetric icon={CheckCircle2} label="Target" value={`${schedule.targetClosingCount} · ${formatRp(schedule.targetRevenueAmount)}`} />
      </div>
      <div className="justify-self-end text-xs font-bold text-admin-muted">
        Dibuat {formatTime(schedule.createdAt)}
      </div>
    </article>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-admin-border-subtle bg-admin-bg/45 px-2.5 py-2">
      <Icon size={13} className="shrink-0 text-admin-accent" strokeWidth={3} />
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-admin-subtle">{label}</p>
        <p className="truncate text-xs font-black text-admin-foreground">{value}</p>
      </div>
    </div>
  );
}
