import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Navigation, Store, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { getTodayVisitPlan, type TodayVisitSchedule } from '../../../lib/api/tenant';
import { useScrollToTop } from '../../../hooks/use-scroll-to-top';

const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  draft: { text: 'Draft', color: 'var(--sales-muted)', bg: 'var(--sales-bg)' },
  assigned: { text: 'Ditugaskan', color: 'var(--sales-info-light)', bg: 'var(--sales-info-bg, #eef2ff)' },
  approved: { text: 'Disetujui', color: 'var(--sales-emerald)', bg: 'var(--sales-success-bg)' },
  in_progress: { text: 'Sedang Dikunjungi', color: 'var(--sales-amber)', bg: 'var(--sales-warning-bg)' },
  completed: { text: 'Selesai', color: 'var(--sales-success)', bg: 'var(--sales-success-bg)' },
  missed: { text: 'Terlewat', color: 'var(--sales-danger-lighter)', bg: 'var(--sales-danger-bg, #fef2f2)' },
  cancelled: { text: 'Dibatalkan', color: 'var(--sales-muted)', bg: 'var(--sales-bg)' },
};

function openGoogleMaps(lat: string | number, lng: string | number, outletName?: string) {
  const destination = outletName
    ? encodeURIComponent(outletName)
    : `${lat},${lng}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=&origin=&travelmode=driving&dir_action=navigate`;
  window.open(url, '_blank');
}

function formatTime(time?: string | null) {
  if (!time) return null;
  try {
    const [h, m] = time.split(':');
    return `${h}:${m}`;
  } catch {
    return time;
  }
}

export function SalesSchedulesPage() {
  useScrollToTop();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<TodayVisitSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    getTodayVisitPlan(accessToken)
      .then(res => setSchedules(res.schedules))
      .catch(e => setError(e.message || 'Gagal memuat jadwal kunjungan.'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="sales-home" style={{ paddingBottom: '6rem' }}>
      <div className="sales-home-greeting">
        <div>
          <p className="sales-greeting-label">Jadwal Kunjungan</p>
          <h1 className="sales-greeting-name" style={{ fontSize: '1.2rem' }}>
            <CalendarDays size={18} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            {today}
          </h1>
        </div>
      </div>

      {error && <div className="sales-alert sales-alert-error">{error}</div>}

      {loading ? (
        <div className="sales-visits-skeleton">
          {[1, 2, 3].map(i => (
            <div key={i} className="sales-visit-skeleton-item" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="sales-empty-state">
          <div className="sales-empty-icon"><CalendarDays size={34} /></div>
          <p>Belum ada jadwal kunjungan hari ini</p>
          <button
            onClick={() => navigate('/sales')}
            className="sales-empty-btn"
          >
            Kembali ke Beranda
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {schedules.map((schedule, index) => {
            const statusInfo = STATUS_LABEL[schedule.status] ?? STATUS_LABEL.draft;
            const isDone = schedule.status === 'completed';
            const isCancelled = schedule.status === 'cancelled' || schedule.status === 'missed';
            const canNavigate = schedule.outlet.latitude && schedule.outlet.longitude;

            return (
              <div
                key={schedule.id}
                className="sales-step-card"
                style={{
                  opacity: isCancelled ? 0.6 : 1,
                  borderLeft: `4px solid ${statusInfo.color}`,
                }}
              >
                {/* Header: Number + Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: isDone ? 'var(--sales-success-bg)' : 'var(--sales-accent-bg)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '.75rem',
                      fontWeight: 800,
                      color: isDone ? 'var(--sales-success)' : 'var(--sales-accent)',
                    }}>
                      {isDone ? <CheckCircle2 size={15} /> : index + 1}
                    </div>
                    <span style={{ fontSize: '.72rem', fontWeight: 700, color: statusInfo.color }}>
                      {statusInfo.text}
                    </span>
                  </div>
                  {schedule.plannedStartTime && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', color: 'var(--sales-muted)', fontSize: '.72rem' }}>
                      <Clock size={12} />
                      {formatTime(schedule.plannedStartTime)}
                      {schedule.plannedEndTime && ` - ${formatTime(schedule.plannedEndTime)}`}
                    </div>
                  )}
                </div>

                {/* Outlet Info */}
                <div className="flex items-center gap-3" style={{ marginBottom: '.75rem' }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{
                    background: isDone ? 'var(--sales-success-bg)' : 'var(--sales-accent)',
                    color: isDone ? 'var(--sales-success)' : 'var(--sales-surface)',
                  }}>
                    <Store size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-extrabold text-sales-text-heading truncate" style={{ fontSize: '.9rem' }}>
                      {schedule.outlet.name}
                    </p>
                    {schedule.outlet.code && (
                      <p className="text-sales-muted" style={{ fontSize: '.72rem' }}>{schedule.outlet.code}</p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '.5rem',
                  padding: '.6rem .75rem',
                  background: 'var(--sales-bg)',
                  borderRadius: 12,
                  marginBottom: '.75rem',
                }}>
                  <MapPin size={14} className="shrink-0 text-sales-muted" style={{ marginTop: 2 }} />
                  <span style={{ fontSize: '.78rem', color: 'var(--sales-muted)', lineHeight: 1.5 }}>
                    {schedule.outlet.address}
                  </span>
                </div>

                {/* Coordinates */}
                {canNavigate && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '.4rem',
                    padding: '.4rem .6rem',
                    background: 'var(--sales-bg)',
                    borderRadius: 8,
                    marginBottom: '.75rem',
                    fontSize: '.68rem',
                    color: 'var(--sales-muted)',
                    fontFamily: 'monospace',
                  }}>
                    <MapPin size={11} />
                    {Number(schedule.outlet.latitude).toFixed(6)}, {Number(schedule.outlet.longitude).toFixed(6)}
                    {schedule.outlet.geofenceRadiusM && (
                      <span style={{ marginLeft: 'auto', fontFamily: 'inherit', fontWeight: 600 }}>
                        ±{schedule.outlet.geofenceRadiusM}m
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  {canNavigate && (
                    <button
                      onClick={() => openGoogleMaps(schedule.outlet.latitude, schedule.outlet.longitude, schedule.outlet.name)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border-none"
                      style={{
                        flex: 1,
                        padding: '.7rem',
                        fontSize: '.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: 'var(--sales-accent)',
                        color: 'var(--sales-surface)',
                        transition: 'all .18s',
                      }}
                    >
                      <Navigation size={16} /> Buka Maps
                    </button>
                  )}
                  {!isDone && !isCancelled && (
                    <button
                      onClick={() => navigate('/sales/visit')}
                      className="flex items-center justify-center gap-1.5 rounded-xl border-none"
                      style={{
                        flex: 1,
                        padding: '.7rem',
                        fontSize: '.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: 'var(--sales-bg)',
                        color: 'var(--sales-accent)',
                        border: '1px solid var(--sales-accent-bg)',
                        transition: 'all .18s',
                      }}
                    >
                      <MapPin size={16} /> Check-In
                    </button>
                  )}
                </div>

                {/* Notes */}
                {schedule.notes && (
                  <p style={{ marginTop: '.6rem', fontSize: '.72rem', color: 'var(--sales-muted)', fontStyle: 'italic' }}>
                    Catatan: {schedule.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
