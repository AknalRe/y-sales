import { Loader2, MapPin, WifiOff, CheckCircle2, LogIn, LogOut, RotateCcw, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AttendanceState } from './attendance-page';
import { useAuth } from '../auth/auth-provider';
import { apiRequest } from '../../lib/api/client';

type TodaySession = {
  id: string;
  status: string;
  workDate: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
};

type AttendanceRecord = {
  id: string;
  workDate: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  salesName: string;
};

type TodayAttendanceResponse = {
  session: TodaySession | null;
  canCheckIn: boolean;
  allowMultipleAttendanceSessionsPerDay: boolean;
  checkInBlockedReason?: string | null;
};

export function AttendancePageSales(props: AttendanceState) {
  const { accessToken } = useAuth();
  const { videoRef, location, loading, message, online, preview, image, stream, reloadKey,
    handleCaptureAndPreview, handleRetake, handleConfirmSend, handleConfirmCheckOut } = props;

  const [todaySession, setTodaySession] = useState<TodaySession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [mode, setMode] = useState<'check-in' | 'check-out'>('check-in');
  const [loadingData, setLoadingData] = useState(true);
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [checkInBlockedReason, setCheckInBlockedReason] = useState<string | null>(null);
  const [allowMultipleSessions, setAllowMultipleSessions] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoadingData(true);
    try {
      const [todayRes, recordsRes] = await Promise.allSettled([
        apiRequest<TodayAttendanceResponse>('/attendance/today', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        apiRequest<{ attendance: AttendanceRecord[] }>('/attendance/history', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      if (todayRes.status === 'fulfilled') {
        const session = todayRes.value.session;
        setTodaySession(session);
        setCanCheckIn(todayRes.value.canCheckIn);
        setCheckInBlockedReason(todayRes.value.checkInBlockedReason ?? null);
        setAllowMultipleSessions(todayRes.value.allowMultipleAttendanceSessionsPerDay);
        if (session?.status === 'open') {
          setMode('check-out');
        } else if (!todayRes.value.canCheckIn) {
          setMode('check-in');
        } else {
          setMode('check-in');
        }
      }
      if (recordsRes.status === 'fulfilled') {
        setRecords(recordsRes.value.attendance ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoadingData(false); }
  }, [accessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData, reloadKey]);

  function formatTime(dateStr?: string | null) {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  async function handleSubmitAttendance() {
    if (mode === 'check-out') {
      if (!todaySession?.id || todaySession.status !== 'open') return;
      await handleConfirmCheckOut(todaySession.id);
      return;
    }

    if (!canCheckIn) return;
    await handleConfirmSend();
  }

  const canStartSelectedMode = mode === 'check-out'
    ? todaySession?.status === 'open'
    : canCheckIn;

  return (
    <div className="sales-home">
      {/* Header */}
      <div className="sales-home-greeting">
        <div>
          <p className="sales-greeting-label">Absensi Kehadiran</p>
          <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>
            {mode === 'check-in' ? 'Absen Masuk' : 'Absen Keluar'}
          </h1>
        </div>
        {!online && (
          <span style={{ fontSize: '.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
            <WifiOff size={14} /> Offline
          </span>
        )}
      </div>

      {/* Status Masuk / Keluar Toggle */}
      <div className="sales-step-card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
          <button
            onClick={() => setMode('check-in')}
            disabled={todaySession?.status === 'open' || !canCheckIn}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '.7rem', borderRadius: 12, fontSize: '.85rem', fontWeight: 800,
              border: 'none', cursor: (todaySession?.status === 'open' || !canCheckIn) ? 'not-allowed' : 'pointer',
              background: mode === 'check-in' ? '#B55925' : '#f1f5f9',
              color: mode === 'check-in' ? '#fff' : '#94a3b8',
              opacity: (todaySession?.status === 'open' || !canCheckIn) ? 0.5 : 1,
              transition: 'all .2s',
            }}
          >
            <LogIn size={16} /> Masuk
          </button>
          <button
            onClick={() => setMode('check-out')}
            disabled={!todaySession || todaySession.status !== 'open'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '.7rem', borderRadius: 12, fontSize: '.85rem', fontWeight: 800,
              border: 'none', cursor: (!todaySession || todaySession.status !== 'open') ? 'not-allowed' : 'pointer',
              background: mode === 'check-out' ? '#B55925' : '#f1f5f9',
              color: mode === 'check-out' ? '#fff' : '#94a3b8',
              opacity: (!todaySession || todaySession.status !== 'open') ? 0.5 : 1,
              transition: 'all .2s',
            }}
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>

        {/* Today status info */}
        {todaySession && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '.75rem', fontSize: '.8rem', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: todaySession.status === 'open' ? '#34d399' : '#94a3b8' }} />
              <span style={{ fontWeight: 700 }}>{todaySession.status === 'open' ? 'Sedang aktif' : 'Sesi hari ini selesai'}</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span>Masuk: <strong style={{ color: '#1e293b' }}>{formatTime(todaySession.checkInAt)}</strong></span>
              <span>Keluar: <strong style={{ color: '#1e293b' }}>{formatTime(todaySession.checkOutAt)}</strong></span>
            </div>
          </div>
        )}
        {!todaySession && !allowMultipleSessions && (
          <div style={{ marginTop: '.65rem', fontSize: '.75rem', color: '#64748b' }}>
            Company membatasi absensi menjadi satu sesi per hari.
          </div>
        )}
        {checkInBlockedReason && todaySession?.status !== 'open' && (
          <div style={{ marginTop: '.65rem', fontSize: '.75rem', color: '#b45309' }}>
            {checkInBlockedReason}
          </div>
        )}
      </div>

      {/* Live Camera */}
      <div style={{ position: 'relative', marginTop: '.5rem' }}>
        <video ref={videoRef} style={{ width: '100%', aspectRatio: '3/4', borderRadius: 16, background: '#000', objectFit: 'cover' }} playsInline muted />
        {location && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            borderRadius: 12, padding: '6px 12px', fontSize: '.75rem', color: '#fff',
          }}>
            <MapPin size={13} style={{ color: '#34d399', flexShrink: 0 }} />
            <span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
            <span style={{ marginLeft: 'auto', color: '#34d399' }}>±{Math.round(location.accuracyM ?? 0)}m</span>
          </div>
        )}
        {!location && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            borderRadius: 12, padding: '6px 12px', fontSize: '.75rem', color: '#fbbf24',
          }}>
            <MapPin size={13} />
            <span>Mengambil lokasi GPS...</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div style={{ marginTop: '.75rem' }}>
        <button
          onClick={handleCaptureAndPreview}
          disabled={!stream || !canStartSelectedMode}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '.85rem', borderRadius: 14, fontSize: '.95rem', fontWeight: 800,
            border: 'none', cursor: stream && canStartSelectedMode ? 'pointer' : 'not-allowed',
            background: '#B55925', color: '#fff',
            opacity: stream && canStartSelectedMode ? 1 : 0.5, transition: 'all .2s',
          }}
        >
          <CheckCircle2 size={20} />
          {mode === 'check-in' ? 'Absen Masuk' : 'Absen Keluar'}
        </button>

        {message && (
          <div style={{ marginTop: '.5rem', padding: '.7rem .85rem', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '.8rem', color: '#166534' }}>
            {message}
          </div>
        )}
      </div>

      {/* List Absensi */}
      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
          <h3 style={{ fontSize: '.9rem', fontWeight: 800, color: '#1e293b' }}>Riwayat Absensi</h3>
        </div>

        {loadingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 className="animate-spin" style={{ color: '#94a3b8' }} size={24} />
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '.85rem' }}>
            Belum ada riwayat absensi.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {records.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '.6rem .8rem', borderRadius: 12, background: '#fff',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: r.status === 'open' ? '#ecfdf5' : '#f8fafc',
                  color: r.status === 'open' ? '#059669' : '#94a3b8',
                }}>
                  {r.status === 'open' ? <LogIn size={16} /> : <CheckCircle2 size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{formatDate(r.workDate)}</p>
                  <p style={{ fontSize: '.7rem', color: '#94a3b8', margin: 0 }}>
                    {r.checkInAt ? formatTime(r.checkInAt) : '--:--'} → {r.checkOutAt ? formatTime(r.checkOutAt) : '--:--'}
                  </p>
                </div>
                <span style={{
                  padding: '3px 8px', borderRadius: 8, fontSize: '.65rem', fontWeight: 700,
                  background: r.status === 'open' ? '#ecfdf5' : r.status === 'flagged' ? '#fffbeb' : '#f1f5f9',
                  color: r.status === 'open' ? '#059669' : r.status === 'flagged' ? '#d97706' : '#94a3b8',
                }}>
                  {r.status === 'open' ? 'Aktif' : r.status === 'closed' ? 'Selesai' : r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal Popup */}
      {preview && image && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          padding: '1.5rem',
        }}>
          <div style={{
            width: '100%', maxWidth: 360, background: '#fff',
            borderRadius: 24, padding: '1.25rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }}>
            <p style={{ textAlign: 'center', fontSize: '.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '.75rem' }}>
              Preview {mode === 'check-in' ? 'Masuk' : 'Keluar'}
            </p>
            <img src={image.dataUrl} alt="Preview" style={{ width: '100%', aspectRatio: '3/4', borderRadius: 16, objectFit: 'cover' }} />
            {location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: '.6rem', fontSize: '.7rem', color: '#64748b' }}>
                <MapPin size={12} style={{ color: '#059669' }} />
                <span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · ±{Math.round(location.accuracyM ?? 0)}m</span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginTop: '.75rem' }}>
              <button
                onClick={handleRetake}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '.7rem', borderRadius: 14, fontSize: '.8rem', fontWeight: 700,
                  border: '1px solid #e2e8f0', background: '#fff', color: '#475569',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <RotateCcw size={15} /> Ulangi Foto
              </button>
              <button
                onClick={handleSubmitAttendance}
                disabled={loading || !location || !canStartSelectedMode}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '.7rem', borderRadius: 14, fontSize: '.8rem', fontWeight: 700,
                  border: 'none', background: '#B55925', color: '#fff',
                  cursor: (loading || !location || !canStartSelectedMode) ? 'not-allowed' : 'pointer',
                  opacity: (loading || !location || !canStartSelectedMode) ? 0.5 : 1,
                }}
              >
                {loading ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
                {loading ? 'Mengirim...' : 'Kirim Absensi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
