import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, MapPin, CheckCircle2, Clock, RefreshCw, AlertCircle, UserCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';

type VisitSession = {
  id: string;
  outletId: string;
  outletName?: string;
  outletAddress?: string;
  status: string;
  checkInAt?: string;
  checkOutAt?: string;
  outcome?: string | null;
};

type TodaySummary = {
  todaySalesAmount: string;
  todayOrders: number;
  todayVisits: number;
};

type AttendanceToday = {
  id: string;
  status: string;
  checkInAt?: string | null;
};

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

function apiGet<T>(path: string, token: string): Promise<T> {
  return fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message ?? 'Error') }));
}

function formatRp(v: string | number) {
  const n = Number(v || 0);
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

const OUTCOME_LABEL: Record<string, { text: string; color: string }> = {
  closed_order:     { text: 'Order Closed',   color: '#34d399' },
  no_order:         { text: 'Tidak Ada Order', color: '#94a3b8' },
  follow_up:        { text: 'Follow Up',       color: '#fbbf24' },
  outlet_closed:    { text: 'Outlet Tutup',    color: '#f87171' },
  rejected:         { text: 'Ditolak',         color: '#f87171' },
  invalid_location: { text: 'Lokasi Salah',    color: '#f87171' },
};

export function SalesHomePage() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<VisitSession[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceToday | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [visitRes, sumRes, attRes] = await Promise.allSettled([
        apiGet<{ sessions: VisitSession[] }>(`/visits/sessions?date=${today}`, accessToken),
        apiGet<{ summary: TodaySummary }>('/reports/summary', accessToken),
        apiGet<{ session: AttendanceToday | null }>('/attendance/today', accessToken),
      ]);

      if (visitRes.status === 'fulfilled') setVisits(visitRes.value.sessions ?? []);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.summary);
      if (attRes.status === 'fulfilled') setAttendance(attRes.value.session);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  const checkedIn = attendance?.status === 'checked_in';
  const todayVisitsDone = visits.filter(v => v.status === 'checked_out').length;
  const todayVisitsTotal = visits.length;

  return (
    <div className="sales-home">
      {/* Greeting */}
      <div className="sales-home-greeting">
        <div>
          <p className="sales-greeting-label">Selamat datang 👋</p>
          <h1 className="sales-greeting-name">{user?.name?.split(' ')[0] ?? 'Sales'}</h1>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={load} className="sales-icon-btn" type="button" disabled={loading}>
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : undefined }} />
          </button>
          <Link to="/sales/profile" className="sales-icon-btn">
            <UserCircle size={16} />
          </Link>
        </div>
      </div>

      {/* Attendance Status Banner */}
      <div className={`sales-attendance-banner ${checkedIn ? 'checked-in' : 'not-checked-in'}`}>
        {!loading ? (
          checkedIn ? (
            <>
              <CheckCircle2 size={18} />
              <div>
                <strong>Sudah Absen</strong>
                <span>
                  Check-in{attendance?.checkInAt
                    ? ` pukul ${new Date(attendance.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </span>
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={18} />
              <div>
                <strong>Belum Absen</strong>
                <span>Lakukan absensi dulu sebelum mulai kerja</span>
              </div>
              <button onClick={() => navigate('/attendance')} className="sales-banner-btn">Check-In</button>
            </>
          )
        ) : (
          <div style={{ color: 'inherit', fontSize: '.85rem', opacity: .6 }}>Memeriksa absensi...</div>
        )}
      </div>

      {/* Today KPI */}
      {summary && (
        <div className="sales-kpi-row">
          <div className="sales-kpi-card">
            <TrendingUp size={16} style={{ color: '#34d399' }} />
            <strong>{formatRp(summary.todaySalesAmount)}</strong>
            <span>Omset Hari Ini</span>
          </div>
          <div className="sales-kpi-card">
            <ShoppingCart size={16} style={{ color: '#60a5fa' }} />
            <strong>{summary.todayOrders}</strong>
            <span>Order</span>
          </div>
          <div className="sales-kpi-card">
            <MapPin size={16} style={{ color: '#a78bfa' }} />
            <strong>{todayVisitsDone}/{todayVisitsTotal}</strong>
            <span>Visit</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="sales-quick-actions">
        <Link to="/attendance" className="sales-action-card sales-action-primary">
          <div className="sales-action-icon">📷</div>
          <span>Absensi Wajah</span>
        </Link>
        <Link to="/sales/visit" className="sales-action-card">
          <div className="sales-action-icon">📍</div>
          <span>Check-In Visit</span>
        </Link>
        <Link to="/sales/transactions" className="sales-action-card">
          <div className="sales-action-icon">🛒</div>
          <span>Transaksi</span>
        </Link>
        <Link to="/sales/invoices" className="sales-action-card">
          <div className="sales-action-icon">🧾</div>
          <span>Foto Nota</span>
        </Link>
      </div>

      {/* Today's Visits */}
      <section className="sales-visits-section">
        <div className="sales-section-header">
          <h2>Kunjungan Hari Ini</h2>
          <Link to="/sales/visit" className="sales-section-link">Lihat Semua →</Link>
        </div>

        {loading ? (
          <div className="sales-visits-skeleton">
            {[1, 2, 3].map(i => (
              <div key={i} className="sales-visit-skeleton-item" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="sales-empty-state">
            <div className="sales-empty-icon">📍</div>
            <p>Belum ada kunjungan hari ini</p>
            <Link to="/sales/visit" className="sales-empty-btn">Mulai Kunjungan</Link>
          </div>
        ) : (
          <div className="sales-visits-list">
            {visits.map(v => {
              const isDone = v.status === 'checked_out';
              const outcomeInfo = v.outcome ? OUTCOME_LABEL[v.outcome] : null;
              return (
                <article key={v.id} className={`sales-visit-card ${isDone ? 'done' : 'active'}`}>
                  <div className={`sales-visit-status-dot ${isDone ? 'done' : 'active'}`} />
                  <div className="sales-visit-content">
                    <h3>{v.outletName ?? 'Outlet'}</h3>
                    <p>{v.outletAddress ?? '—'}</p>
                    {outcomeInfo && (
                      <span className="sales-visit-outcome" style={{ color: outcomeInfo.color }}>
                        {outcomeInfo.text}
                      </span>
                    )}
                  </div>
                  <div className="sales-visit-time">
                    <Clock size={11} />
                    {v.checkInAt
                      ? new Date(v.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
