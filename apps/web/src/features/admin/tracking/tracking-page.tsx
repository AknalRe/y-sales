import { useEffect, useMemo, useState } from 'react';
import { Map, RefreshCw, User, MapPin, CheckCircle2, AlertCircle, Timer, Navigation, Calendar } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { getVisitSchedules, getVisitSessions, getTenantUsers, type VisitSchedule, type VisitSession, type TenantUser } from '@/lib/api/tenant';
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const scheduleStatusColor: Record<string, string> = {
  assigned: 'var(--admin-accent)',
  approved: 'var(--admin-success)',
  in_progress: 'var(--admin-danger-light)',
  completed: 'var(--admin-success)',
  missed: 'var(--admin-danger)',
  cancelled: 'var(--admin-muted)',
  draft: 'var(--admin-subtle)',
};

const visitStatusColor: Record<string, string> = {
  open: 'var(--admin-danger-light)',
  completed: 'var(--admin-success)',
  invalid_location: 'var(--admin-danger)',
  synced: 'var(--admin-accent)',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function TrackingPage() {
  const { accessToken } = useAuth();
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [sessions, setSessions] = useState<VisitSession[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'schedules' | 'sessions'>('sessions');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = {
        date: selectedDate || undefined,
        salesUserId: selectedUserId || undefined,
      };
      const [schRes, sesRes, userRes] = await Promise.all([
        getVisitSchedules(accessToken, params),
        getVisitSessions(accessToken, params),
        getTenantUsers(accessToken),
      ]);
      setSchedules(schRes.schedules ?? []);
      setSessions(sesRes.sessions ?? []);
      setUsers(userRes.users ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken, selectedDate, selectedUserId]);

  const stats = useMemo(() => ({
    total: sessions.length,
    completed: sessions.filter(s => s.status === 'completed').length,
    open: sessions.filter(s => s.status === 'open').length,
    invalid: sessions.filter(s => s.status === 'invalid_location').length,
  }), [sessions]);

  function getUserName(id: string) {
    return users.find(u => u.id === id)?.name ?? 'User—' + id.slice(0, 4);
  }

  function formatTime(ts?: string | null) {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Navigation size={24} style={{ color: 'var(--admin-accent)' }} />
            Tracking Lapangan
          </h1>
          <p className="admin-page-subtitle">
            Monitor pergerakan sales dan aktivitas kunjungan outlet hari ini.</p>
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

      {/* Stats Cards */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: 'var(--admin-accent-shadow)', color: 'var(--admin-accent)' }}><MapPin size={20} /></div>
          <div>
            <span className="text-admin-subtle text-xs font-semibold uppercase tracking-wide">Total Visit</span>
            <strong className="text-xl text-admin-foreground">{stats.total}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: 'var(--admin-success-soft)', color: 'var(--admin-success)' }}><CheckCircle2 size={20} /></div>
          <div>
            <span className="text-admin-subtle text-xs font-semibold uppercase tracking-wide">Selesai</span>
            <strong className="text-xl text-admin-foreground">{stats.completed}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: 'var(--admin-accent-shadow)', color: 'var(--admin-accent-light)' }}><Timer size={20} /></div>
          <div>
            <span className="text-admin-subtle text-xs font-semibold uppercase tracking-wide">Aktif</span>
            <strong className="text-xl text-admin-foreground">{stats.open}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: 'var(--admin-danger-soft)', color: 'var(--admin-danger)' }}><AlertCircle size={20} /></div>
          <div>
            <span className="text-admin-subtle text-xs font-semibold uppercase tracking-wide">Invalid</span>
            <strong className="text-xl text-admin-foreground">{stats.invalid}</strong>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-admin-surface border border-admin-border rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="admin-filter-group" style={{ background: 'var(--admin-bg)', padding: '.25rem .75rem', borderRadius: 12 }}>
            <Calendar size={16} className="text-admin-muted" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="admin-input" style={{ border: 'none', background: 'transparent' }} />
          </div>
          <div className="admin-filter-group" style={{ background: 'var(--admin-bg)', padding: '.25rem .75rem', borderRadius: 12 }}>
            <User size={16} className="text-admin-muted" />
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="admin-select" style={{ border: 'none', background: 'transparent' }}>
              <option value="">Semua Sales</option>
              {users.filter(u => u.roleCode !== 'ADMINISTRATOR').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="admin-tab-group" style={{ background: 'var(--admin-border-subtle)', padding: '.3rem', borderRadius: 14 }}>
          <button onClick={() => setTab('sessions')} className={`admin-tab ${tab === 'sessions' ? 'active' : ''}`} style={{ borderRadius: 11, fontSize: '.85rem' }}>Kunjungan (Visit)</button>
          <button onClick={() => setTab('schedules')} className={`admin-tab ${tab === 'schedules' ? 'active' : ''}`} style={{ borderRadius: 11, fontSize: '.85rem' }}>Jadwal Sales</button>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw size={32} className="spin mx-auto mb-4 opacity-20" />
              <p className="text-admin-muted font-semibold">Menyelaraskan data lapangan...</p>
            </div>
          ) : tab === 'sessions' ? (
            <table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Informasi Sales</TableHead>
                  <TableHead>Lokasi (Check-In)</TableHead>
                  <TableHead>Check-In</TableHead>
                  <TableHead>Check-Out</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-admin-accent border border-admin-border-subtle" style={{ background: 'var(--admin-bg)' }}>
                          {getUserName(s.salesUserId).charAt(0)}
                        </div>
                        <strong className="text-admin-foreground text-[.9rem]">{getUserName(s.salesUserId)}</strong>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-admin-muted">
                        <MapPin size={12} className="text-admin-subtle" />
                        {s.checkInLatitude && s.checkInLongitude
                          ? <a href={`https://www.google.com/maps?q=${s.checkInLatitude},${s.checkInLongitude}`} target="_blank" rel="noreferrer" className="text-blue-500 no-underline font-bold">
                            Lihat di Peta
                          </a>
                          : 'Tidak ada koordinat'}
                      </div>
                    </TableCell>
                    <TableCell><div className="font-semibold text-admin-text">{formatTime(s.checkInAt)}</div></TableCell>
                    <TableCell><div className="font-semibold text-admin-text">{formatTime(s.checkOutAt)}</div></TableCell>
                    <TableCell>
                      <div className="text-[.8rem] text-admin-muted capitalize">
                        {s.outcome ? s.outcome.replace(/_/g, ' ') : '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="admin-badge font-extrabold px-2 py-1 rounded-full" style={{
                        color: visitStatusColor[s.status],
                        background: `color-mix(in srgb, ${visitStatusColor[s.status]} 15%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${visitStatusColor[s.status]} 30%, transparent)`,
                      }}>
                        {s.status.toUpperCase()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {!sessions.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center">
                      <div className="opacity-10 mb-4"><Map size={48} className="mx-auto" /></div>
                      <p className="text-admin-muted font-semibold">Belum ada aktivitas kunjungan.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </table>
          ) : (
            <table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Sales</TableHead>
                  <TableHead>Tanggal Tugas</TableHead>
                  <TableHead>Target Outlet</TableHead>
                  <TableHead>Target Closing</TableHead>
                  <TableHead>Target Revenue</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-admin-accent border border-admin-border-subtle" style={{ background: 'var(--admin-bg)' }}>
                          {getUserName(s.salesUserId).charAt(0)}
                        </div>
                        <strong className="text-admin-foreground text-[.9rem]">{getUserName(s.salesUserId)}</strong>
                      </div>
                    </TableCell>
                    <TableCell><div className="font-semibold text-admin-text">{s.scheduledDate}</div></TableCell>
                    <TableCell><div className="font-bold text-admin-foreground">{s.targetOutletCount}</div></TableCell>
                    <TableCell><div className="font-bold text-admin-success">{s.targetClosingCount}</div></TableCell>
                    <TableCell><div className="font-extrabold text-admin-accent">Rp {Number(s.targetRevenueAmount).toLocaleString('id-ID')}</div></TableCell>
                    <TableCell>
                      <span className="admin-badge font-extrabold px-2 py-1 rounded-full" style={{
                        color: scheduleStatusColor[s.status],
                        background: `color-mix(in srgb, ${scheduleStatusColor[s.status]} 15%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${scheduleStatusColor[s.status]} 30%, transparent)`,
                      }}>
                        {s.status.toUpperCase()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {!schedules.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center">
                      <div className="opacity-10 mb-4"><Calendar size={48} className="mx-auto" /></div>
                      <p className="text-admin-muted font-semibold">Belum ada jadwal tugas yang dibuat.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
