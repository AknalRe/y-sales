import { useEffect, useMemo, useState } from 'react';
import { Map, RefreshCw, User, MapPin, Clock, CheckCircle2, AlertCircle, Timer } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { getVisitSchedules, getVisitSessions, getTenantUsers, type VisitSchedule, type VisitSession, type TenantUser } from '@/lib/api/tenant';

const scheduleStatusColor: Record<string, string> = {
  assigned: '#60a5fa',
  approved: '#34d399',
  in_progress: '#fbbf24',
  completed: '#a3e635',
  missed: '#f87171',
  cancelled: '#6b7280',
  draft: '#94a3b8',
};

const visitStatusColor: Record<string, string> = {
  open: '#fbbf24',
  completed: '#34d399',
  invalid_location: '#f87171',
  synced: '#60a5fa',
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
    return users.find(u => u.id === id)?.name ?? id.slice(0, 8);
  }

  function formatTime(ts?: string | null) {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><Map size={22} /> Tracking Penjualan</h1>
          <p className="admin-page-subtitle">Monitor kunjungan outlet, lokasi sales, dan aktivitas lapangan secara real-time.</p>
        </div>
        <button onClick={load} className="admin-btn-ghost" type="button"><RefreshCw size={15} /></button>

      </div>

      {/* Stats */}
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#60a5fa' }}><MapPin size={18} /></div>
          <div><span>Total Visit</span><strong>{stats.total}</strong></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#34d399' }}><CheckCircle2 size={18} /></div>
          <div><span>Selesai</span><strong>{stats.completed}</strong></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#fbbf24' }}><Timer size={18} /></div>
          <div><span>Berjalan</span><strong>{stats.open}</strong></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#f87171' }}><AlertCircle size={18} /></div>
          <div><span>Invalid Lokasi</span><strong>{stats.invalid}</strong></div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filter-row">
        <div className="admin-filter-group">
          <Clock size={15} />
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="admin-input" />
        </div>
        <div className="admin-filter-group">
          <User size={15} />
          <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="admin-select">
            <option value="">Semua Sales</option>
            {users.filter(u => u.roleCode !== 'ADMINISTRATOR').map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="admin-tab-group">
          <button onClick={() => setTab('sessions')} className={`admin-tab ${tab === 'sessions' ? 'active' : ''}`}>Visit Sessions</button>
          <button onClick={() => setTab('schedules')} className={`admin-tab ${tab === 'schedules' ? 'active' : ''}`}>Jadwal</button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">Memuat data tracking...</div>
        ) : tab === 'sessions' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sales</th>
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
                      <strong>{getUserName(s.salesUserId)}</strong>
                      <small style={{ display: 'block', color: 'var(--admin-subtle)', marginTop: 2 }}>
                        {s.checkInLatitude && s.checkInLongitude
                          ? `${Number(s.checkInLatitude).toFixed(4)}, ${Number(s.checkInLongitude).toFixed(4)}`
                          : 'Koordinat tidak ada'}
                      </small>
                    </td>
                    <td>{formatTime(s.checkInAt)}</td>
                    <td>{formatTime(s.checkOutAt)}</td>
                    <td>{s.outcome ? s.outcome.replace(/_/g, ' ') : '—'}</td>
                    <td>
                      <span className="admin-badge" style={{ background: `${visitStatusColor[s.status]}20`, color: visitStatusColor[s.status], border: `1px solid ${visitStatusColor[s.status]}40` }}>
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {!sessions.length && <tr><td colSpan={5} className="admin-empty">Tidak ada visit pada tanggal ini.</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sales</th>
                  <th>Tanggal</th>
                  <th>Target Outlet</th>
                  <th>Target Closing</th>
                  <th>Target Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => (
                  <tr key={s.id}>
                    <td><strong>{getUserName(s.salesUserId)}</strong></td>
                    <td>{s.scheduledDate}</td>
                    <td>{s.targetOutletCount}</td>
                    <td>{s.targetClosingCount}</td>
                    <td>Rp {Number(s.targetRevenueAmount).toLocaleString('id-ID')}</td>
                    <td>
                      <span className="admin-badge" style={{ background: `${scheduleStatusColor[s.status]}20`, color: scheduleStatusColor[s.status], border: `1px solid ${scheduleStatusColor[s.status]}40` }}>
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {!schedules.length && <tr><td colSpan={6} className="admin-empty">Tidak ada jadwal pada tanggal ini.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
