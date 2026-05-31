import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, ReceiptText, ShoppingCart, MapPin, CheckCircle2, Clock, RefreshCw, AlertCircle, UserCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { apiRequest } from '../../../lib/api/client';
import { useScrollToTop } from '../../../hooks/use-scroll-to-top';

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
  checkOutAt?: string | null;
};

type AttendanceTodayResponse = {
  session: AttendanceToday | null;
  canCheckIn: boolean;
  checkInBlockedReason?: string | null;
};

function formatRp(v: string | number) {
  const n = Number(v || 0);
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

const OUTCOME_LABEL: Record<string, { text: string; color: string }> = {
  closed_order: { text: 'Order Closed', color: 'var(--sales-emerald)' },
  no_order: { text: 'Tidak Ada Order', color: 'var(--sales-muted)' },
  follow_up: { text: 'Follow Up', color: 'var(--sales-amber)' },
  outlet_closed: { text: 'Outlet Tutup', color: 'var(--sales-danger-lighter)' },
  rejected: { text: 'Ditolak', color: 'var(--sales-danger-lighter)' },
  invalid_location: { text: 'Lokasi Salah', color: 'var(--sales-danger-lighter)' },
};

export function SalesHomePage() {
  useScrollToTop();
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<VisitSession[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceToday | null>(null);
  const [canCheckInAttendance, setCanCheckInAttendance] = useState(true);
  const [attendanceBlockedReason, setAttendanceBlockedReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [visitRes, sumRes, attRes] = await Promise.allSettled([
        apiRequest<{ sessions: VisitSession[] }>(`/visits/sessions?date=${today}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        apiRequest<{ summary: TodaySummary }>('/reports/summary', { headers: { Authorization: `Bearer ${accessToken}` } }),
        apiRequest<AttendanceTodayResponse>('/attendance/today', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);

      if (visitRes.status === 'fulfilled') setVisits(visitRes.value.sessions ?? []);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.summary);
      if (attRes.status === 'fulfilled') {
        setAttendance(attRes.value.session);
        setCanCheckInAttendance(attRes.value.canCheckIn);
        setAttendanceBlockedReason(attRes.value.checkInBlockedReason ?? null);
      }
      const firstError = [visitRes, sumRes, attRes].find(r => r.status === 'rejected');
      if (firstError) setError((firstError as PromiseRejectedResult).reason?.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  const checkedIn = attendance?.status === 'open';
  const todayVisitsDone = visits.filter(v => v.status === 'completed').length;
  const todayVisitsTotal = visits.length;

  return (
    <div className="sales-home">
      {/* Greeting */}
      <div className="sales-home-greeting">
        <div>
          <p className="sales-greeting-label">Selamat datang</p>
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

      {error && <div className="sales-alert sales-alert-error">{error}</div>}

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
          ) : attendance && !canCheckInAttendance ? (
            <>
              <CheckCircle2 size={18} />
              <div>
                <strong>Absensi Hari Ini Selesai</strong>
                <span>{attendanceBlockedReason ?? 'Hanya mengizinkan satu sesi absensi dalam sehari.'}</span>
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={18} />
              <div>
                <strong>Belum Absen</strong>
                <span>Lakukan absensi dulu sebelum mulai kerja</span>
              </div>
              <button onClick={() => navigate('/sales/attendance')} className="sales-banner-btn">Check-In</button>
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
            <TrendingUp size={16} className="text-sales-emerald" />
            <strong>{formatRp(summary.todaySalesAmount)}</strong>
            <span>Omset Hari Ini</span>
          </div>
          <div className="sales-kpi-card">
            <ShoppingCart size={16} className="text-sales-info-light" />
            <strong>{summary.todayOrders}</strong>
            <span>Order</span>
          </div>
          <div className="sales-kpi-card">
            <MapPin size={16} className="text-sales-violet" />
            <strong>{todayVisitsDone}/{todayVisitsTotal}</strong>
            <span>Visit</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="sales-quick-actions">
        <Link to="/sales/attendance" className="sales-action-card sales-action-primary">
          <div className="sales-action-icon"><Camera size={22} /></div>
          <span>Absensi Wajah</span>
        </Link>
        <Link to="/sales/visit" className="sales-action-card">
          <div className="sales-action-icon"><MapPin size={22} /></div>
          <span>Check-In Visit</span>
        </Link>
        <Link to="/sales/transactions" className="sales-action-card">
          <div className="sales-action-icon"><ShoppingCart size={22} /></div>
          <span>Transaksi</span>
        </Link>
        <Link to="/sales/invoices" className="sales-action-card">
          <div className="sales-action-icon"><ReceiptText size={22} /></div>
          <span>Riwayat Nota</span>
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
            <div className="sales-empty-icon"><MapPin size={34} /></div>
            <p>Belum ada kunjungan hari ini</p>
            <Link to="/sales/visit" className="sales-empty-btn">Mulai Kunjungan</Link>
          </div>
        ) : (
          <div className="sales-visits-list">
            {visits.map(v => {
              const isDone = v.status === 'completed';
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
