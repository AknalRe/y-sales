import { Loader2, MapPin, WifiOff, CheckCircle2, LogIn, LogOut, RotateCcw, Send, ShieldCheck, Camera, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AttendanceState } from './attendance-page';
import { useAuth } from '../auth/auth-provider';
import { apiRequest } from '../../lib/api/client';
import { useScrollToTop } from '../../hooks/use-scroll-to-top';
import { SalesAlert, showSalesAlertToast } from '../sales/ui/sales-alert';
import { LiveFaceOverlay } from '../sales/ui/live-face-overlay';

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
  useScrollToTop();
  const { accessToken } = useAuth();
  const { videoRef, location, loading, message, online, preview, image, stream, reloadKey,
    showPermissionPopup, handleAllowPermissions,
    handleCaptureAndPreview, handleRetake, handleConfirmSend, handleConfirmCheckOut, clearMessage } = props;

  const [todaySession, setTodaySession] = useState<TodaySession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [mode, setMode] = useState<'check-in' | 'check-out'>('check-in');
  const [loadingData, setLoadingData] = useState(true);
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [checkInBlockedReason, setCheckInBlockedReason] = useState<string | null>(null);
  const [allowMultipleSessions, setAllowMultipleSessions] = useState(false);
  const [loadError, setLoadError] = useState('');

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
    } catch { setLoadError('Gagal memuat data absensi.'); }
    finally { setLoadingData(false); }
  }, [accessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData, reloadKey]);

  useEffect(() => {
    showSalesAlertToast(message);
  }, [message]);

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
          <span className="flex items-center gap-1 text-sales-red" style={{ fontSize: '.75rem' }}>
            <WifiOff size={14} /> Offline
          </span>
        )}
      </div>

      {/* Status Masuk / Keluar Toggle */}
      <div className="sales-step-card">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('check-in')}
            disabled={todaySession?.status === 'open' || !canCheckIn}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-extrabold border-none transition-all ${mode === 'check-in' ? 'bg-sales-accent text-sales-surface' : 'bg-sales-surface-muted text-sales-muted'}`}
            style={{ cursor: (todaySession?.status === 'open' || !canCheckIn) ? 'not-allowed' : 'pointer', opacity: (todaySession?.status === 'open' || !canCheckIn) ? 0.5 : 1 }}
          >
            <LogIn size={16} /> Masuk
          </button>
          <button
            onClick={() => setMode('check-out')}
            disabled={!todaySession || todaySession.status !== 'open'}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-extrabold border-none transition-all ${mode === 'check-out' ? 'bg-sales-accent text-sales-surface' : 'bg-sales-surface-muted text-sales-muted'}`}
            style={{ cursor: (!todaySession || todaySession.status !== 'open') ? 'not-allowed' : 'pointer', opacity: (!todaySession || todaySession.status !== 'open') ? 0.5 : 1 }}
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>

        {/* Today status info */}
        {todaySession && (
          <div className="flex items-center justify-between mt-3 text-sales-muted" style={{ fontSize: '.8rem' }}>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${todaySession.status === 'open' ? 'bg-sales-emerald' : 'bg-sales-muted'}`} />
              <span className="font-bold">{todaySession.status === 'open' ? 'Sedang aktif' : 'Sesi hari ini selesai'}</span>
            </div>
            <div className="flex gap-4">
              <span>Masuk: <strong className="text-sales-text-heading">{formatTime(todaySession.checkInAt)}</strong></span>
              <span>Keluar: <strong className="text-sales-text-heading">{formatTime(todaySession.checkOutAt)}</strong></span>
            </div>
          </div>
        )}
        {!todaySession && !allowMultipleSessions && (
          <div className="mt-2 text-sales-muted" style={{ fontSize: '.75rem' }}>
            Company membatasi absensi menjadi satu sesi per hari.
          </div>
        )}
        {checkInBlockedReason && todaySession?.status !== 'open' && (
          <div className="mt-2 text-sales-amber-deep" style={{ fontSize: '.75rem' }}>
            {checkInBlockedReason}
          </div>
        )}
      </div>

      {/* Live Camera */}
      <div className="relative mt-2">
        <video ref={videoRef} className="w-full rounded-2xl bg-black object-cover" style={{ aspectRatio: '3/4' }} playsInline muted />
        <LiveFaceOverlay videoRef={videoRef} stream={stream} />
        {location && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-xl px-3 py-1.5 text-white backdrop-blur-md" style={{ background: 'var(--sales-overlay-dark)', fontSize: '.75rem' }}>
            <MapPin size={13} className="shrink-0 text-sales-emerald" />
            <span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
            <span className="ml-auto text-sales-emerald">±{Math.round(location.accuracyM ?? 0)}m</span>
          </div>
        )}
        {!location && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-xl px-3 py-1.5 text-sales-amber backdrop-blur-md" style={{ background: 'var(--sales-overlay-dark)', fontSize: '.75rem' }}>
            <MapPin size={13} />
            <span>Mengambil lokasi GPS...</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-3">
        <button
          onClick={handleCaptureAndPreview}
          disabled={!stream || !canStartSelectedMode}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sales-accent text-sales-surface border-none"
          style={{ padding: '.85rem', fontSize: '.95rem', fontWeight: 800, cursor: stream && canStartSelectedMode ? 'pointer' : 'not-allowed', opacity: stream && canStartSelectedMode ? 1 : 0.5, transition: 'all .2s' }}
        >
          <CheckCircle2 size={20} />
          {mode === 'check-in' ? 'Absen Masuk' : 'Absen Keluar'}
        </button>

        <SalesAlert message={message} onClose={clearMessage} className="mt-2" />
      </div>

      {/* List Absensi */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sales-text-heading" style={{ fontSize: '.9rem', fontWeight: 800 }}>Riwayat Absensi</h3>
        </div>

        {loadError && (
          <div className="text-center py-4 text-sales-red" style={{ fontSize: '.8rem' }}>{loadError}</div>
        )}

        {loadingData ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-sales-muted" size={24} />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-sales-muted" style={{ fontSize: '.85rem' }}>
            {loadError || 'Belum ada riwayat absensi.'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {records.map(r => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-sales-surface px-3 py-2.5">
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${r.status === 'open' ? 'bg-sales-emerald-bg text-sales-emerald-dark' : 'bg-sales-surface-muted text-sales-muted'}`}>
                  {r.status === 'open' ? <LogIn size={16} /> : <CheckCircle2 size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sales-text-heading font-bold m-0" style={{ fontSize: '.8rem' }}>{formatDate(r.workDate)}</p>
                  <p className="text-sales-muted m-0" style={{ fontSize: '.7rem' }}>
                    {r.checkInAt ? formatTime(r.checkInAt) : '--:--'} → {r.checkOutAt ? formatTime(r.checkOutAt) : '--:--'}
                  </p>
                </div>
                <span
                  className={`rounded-lg px-2 py-0.5 text-xs font-bold ${r.status === 'open' ? 'bg-sales-emerald-bg text-sales-emerald-dark' : r.status === 'flagged' ? 'bg-sales-amber-bg text-sales-amber-dark' : 'bg-sales-surface-muted text-sales-muted'}`}
                >
                  {r.status === 'open' ? 'Aktif' : r.status === 'closed' ? 'Selesai' : r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal Popup */}
      {preview && image && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm p-6" style={{ background: 'var(--sales-overlay-dark)' }}>
          <div className="w-full max-w-[360px] bg-sales-surface rounded-3xl p-5" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <p className="text-center text-sales-text-heading font-extrabold mb-3" style={{ fontSize: '.9rem' }}>
              Preview {mode === 'check-in' ? 'Masuk' : 'Keluar'}
            </p>
            <img src={image.dataUrl} alt="Preview" className="w-full rounded-2xl object-cover" style={{ aspectRatio: '3/4' }} />
            {location && (
              <div className="flex items-center gap-1.5 mt-2 text-sales-muted" style={{ fontSize: '.7rem' }}>
                <MapPin size={12} className="text-sales-emerald-dark" />
                <span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · ±{Math.round(location.accuracyM ?? 0)}m</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={handleRetake}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-sales-surface text-sales-text-label"
                style={{ padding: '.7rem', fontSize: '.8rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                <RotateCcw size={15} /> Ulangi Foto
              </button>
              <button
                onClick={handleSubmitAttendance}
                disabled={loading || !location || !canStartSelectedMode}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-sales-accent text-sales-surface border-none"
                style={{ padding: '.7rem', fontSize: '.8rem', fontWeight: 700, cursor: (loading || !location || !canStartSelectedMode) ? 'not-allowed' : 'pointer', opacity: (loading || !location || !canStartSelectedMode) ? 0.5 : 1 }}
              >
                {loading ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
                {loading ? 'Mengirim...' : 'Kirim Absensi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Popup */}
      {showPermissionPopup && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm p-6" style={{ background: 'var(--sales-overlay-dark)' }}>
          <div className="w-full max-w-[340px] bg-sales-surface rounded-3xl p-6" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--sales-accent-bg)' }}>
                <ShieldCheck size={32} className="text-sales-accent" />
              </div>
            </div>
            <h2 className="text-center text-sales-text-heading font-extrabold mb-2" style={{ fontSize: '1.1rem' }}>
              Izin Akses Diperlukan
            </h2>
            <p className="text-center text-sales-muted mb-5" style={{ fontSize: '.8rem', lineHeight: 1.6 }}>
              Untuk melakukan absensi, aplikasi memerlukan akses ke:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1.25rem' }}>
              <div className="flex items-center gap-3 rounded-xl bg-sales-bg p-3">
                <Camera size={20} className="text-sales-accent shrink-0" />
                <div>
                  <strong className="text-sales-text-heading" style={{ fontSize: '.8rem' }}>Kamera</strong>
                  <p className="text-sales-muted" style={{ fontSize: '.7rem' }}>Foto wajah saat check-in dan check-out</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-sales-bg p-3">
                <MapPin size={20} className="text-sales-emerald shrink-0" />
                <div>
                  <strong className="text-sales-text-heading" style={{ fontSize: '.8rem' }}>Lokasi GPS</strong>
                  <p className="text-sales-muted" style={{ fontSize: '.7rem' }}>Validasi lokasi kehadiran</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleAllowPermissions}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sales-accent text-sales-surface border-none"
              style={{ padding: '.85rem', fontSize: '.95rem', fontWeight: 800, cursor: 'pointer' }}
            >
              <Smartphone size={18} /> Izinkan & Lanjutkan
            </button>
            <p className="text-center text-sales-muted mt-3" style={{ fontSize: '.65rem' }}>
              Browser akan meminta konfirmasi izin secara terpisah.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
