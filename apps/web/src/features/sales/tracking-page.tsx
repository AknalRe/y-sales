import { useEffect, useMemo, useState } from 'react';
import { Map, RefreshCw, User, MapPin, Clock, CheckCircle2, AlertCircle, Timer, Navigation, Calendar } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { getVisitSchedules, getVisitSessions, getTenantUsers, type VisitSchedule, type VisitSession, type TenantUser } from '@/lib/api/tenant';

const scheduleStatusColor: Record<string, string> = {
  assigned: '#3b82f6',
  approved: '#10b981',
  in_progress: '#f59e0b',
  completed: '#059669',
  missed: '#ef4444',
  cancelled: '#64748b',
  draft: '#94a3b8',
};

const visitStatusColor: Record<string, string> = {
  open: '#f59e0b',
  completed: '#10b981',
  invalid_location: '#ef4444',
  synced: '#3b82f6',
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
            <Navigation size={24} style={{ color: '#b55925' }} />
            Tracking Lapangan
          </h1>
          <p className="admin-page-subtitle">Monitor pergerakan sales dan aktivitas kunjungan outlet hari ini.</p>
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
      <div className="admin-stats-row" style={{ gap: '1rem', marginBottom: '2rem' }}>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><MapPin size={20} /></div>
          <div>
            <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Total Visit</span>
            <strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{stats.total}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><CheckCircle2 size={20} /></div>
          <div>
            <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Selesai</span>
            <strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{stats.completed}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}><Timer size={20} /></div>
          <div>
            <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Aktif</span>
            <strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{stats.open}</strong>
          </div>
        </div>
        <div className="admin-stat-card" style={{ flex: 1, minWidth: 200, padding: '1.25rem' }}>
          <div className="admin-stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><AlertCircle size={20} /></div>
          <div>
            <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Invalid</span>
            <strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{stats.invalid}</strong>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="admin-filter-row" style={{ background: '#fff', padding: '1rem', borderRadius: 20, marginBottom: '1.5rem', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="admin-filter-group" style={{ background: '#f8fafc', padding: '.25rem .75rem', borderRadius: 12 }}>
            <Calendar size={16} style={{ color: '#64748b' }} />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="admin-input" style={{ border: 'none', background: 'transparent' }} />
          </div>
          <div className="admin-filter-group" style={{ background: '#f8fafc', padding: '.25rem .75rem', borderRadius: 12 }}>
            <User size={16} style={{ color: '#64748b' }} />
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="admin-select" style={{ border: 'none', background: 'transparent' }}>
              <option value="">Semua Sales</option>
              {users.filter(u => u.roleCode !== 'ADMINISTRATOR').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="admin-tab-group" style={{ background: '#f1f5f9', padding: '.3rem', borderRadius: 14 }}>
          <button onClick={() => setTab('sessions')} className={`admin-tab ${tab === 'sessions' ? 'active' : ''}`} style={{ borderRadius: 11, fontSize: '.85rem' }}>Kunjungan (Visit)</button>
          <button onClick={() => setTab('schedules')} className={`admin-tab ${tab === 'schedules' ? 'active' : ''}`} style={{ borderRadius: 11, fontSize: '.85rem' }}>Jadwal Sales</button>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p style={{ color: '#64748b', fontWeight: 600 }}>Menyelaraskan data lapangan...</p>
          </div>
        ) : tab === 'sessions' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Informasi Sales</th>
                  <th>Lokasi (Check-In)</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Outcome</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div style={{ width: 36, height: 36, background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#b55925', border: '1px solid #f1f5f9' }}>
                          {getUserName(s.salesUserId).charAt(0)}
                        </div>
                        <strong style={{ color: '#0f172a', fontSize: '.9rem' }}>{getUserName(s.salesUserId)}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                        <MapPin size={12} style={{ color: '#94a3b8' }} />
                        {s.checkInLatitude && s.checkInLongitude
                          ? <a href={`https://www.google.com/maps?q=${s.checkInLatitude},${s.checkInLongitude}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 700 }}>
                              Lihat di Peta
                            </a>
                          : 'Tidak ada koordinat'}
                      </div>
                    </td>
                    <td><div style={{ fontWeight: 600, color: '#334155' }}>{formatTime(s.checkInAt)}</div></td>
                    <td><div style={{ fontWeight: 600, color: '#334155' }}>{formatTime(s.checkOutAt)}</div></td>
                    <td>
                      <div style={{ fontSize: '.8rem', color: '#64748b', textTransform: 'capitalize' }}>
                        {s.outcome ? s.outcome.replace(/_/g, ' ') : '—'}
                      </div>
                    </td>
                    <td>
                      <span className="admin-badge" style={{ background: `${visitStatusColor[s.status]}15`, color: visitStatusColor[s.status], border: `1px solid ${visitStatusColor[s.status]}30`, fontWeight: 800, padding: '.3rem .6rem' }}>
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {!sessions.length && (
                  <tr>
                    <td colSpan={6} style={{ padding: '4rem', textAlign: 'center' }}>
                      <div style={{ opacity: 0.1, marginBottom: '1rem' }}><Map size={48} style={{ margin: '0 auto' }} /></div>
                      <p style={{ color: '#64748b', fontWeight: 600 }}>Belum ada aktivitas kunjungan.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama Sales</th>
                  <th>Tanggal Tugas</th>
                  <th>Target Outlet</th>
                  <th>Target Closing</th>
                  <th>Target Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div style={{ width: 36, height: 36, background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#b55925', border: '1px solid #f1f5f9' }}>
                          {getUserName(s.salesUserId).charAt(0)}
                        </div>
                        <strong style={{ color: '#0f172a', fontSize: '.9rem' }}>{getUserName(s.salesUserId)}</strong>
                      </div>
                    </td>
                    <td><div style={{ fontWeight: 600, color: '#334155' }}>{s.scheduledDate}</div></td>
                    <td><div style={{ fontWeight: 700, color: '#0f172a' }}>{s.targetOutletCount}</div></td>
                    <td><div style={{ fontWeight: 700, color: '#10b981' }}>{s.targetClosingCount}</div></td>
                    <td><div style={{ fontWeight: 800, color: '#b55925' }}>Rp {Number(s.targetRevenueAmount).toLocaleString('id-ID')}</div></td>
                    <td>
                      <span className="admin-badge" style={{ background: `${scheduleStatusColor[s.status]}15`, color: scheduleStatusColor[s.status], border: `1px solid ${scheduleStatusColor[s.status]}30`, fontWeight: 800, padding: '.3rem .6rem' }}>
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {!schedules.length && (
                  <tr>
                    <td colSpan={6} style={{ padding: '4rem', textAlign: 'center' }}>
                      <div style={{ opacity: 0.1, marginBottom: '1rem' }}><Calendar size={48} style={{ margin: '0 auto' }} /></div>
                      <p style={{ color: '#64748b', fontWeight: 600 }}>Belum ada jadwal tugas yang dibuat.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
