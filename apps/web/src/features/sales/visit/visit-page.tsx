import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, MapPin, Store, XCircle, RefreshCw, RotateCcw, Send, WifiOff } from 'lucide-react';
import { checkInVisit, checkOutVisit, type VisitPayload, type VisitCheckOutPayload } from '../../../lib/api/client';
import { getTodayVisitPlan, type TodayVisitSchedule } from '../../../lib/api/tenant';
import { captureFromVideo, startFrontCamera, stopCamera, type CapturedImage } from '../../../lib/camera/capture';
import { getCurrentLocation, type BrowserLocation } from '../../../lib/geo/location';
import { useAuth } from '../../auth/auth-provider';
import { enqueueVisit, getVisitQueueCount } from '../../../lib/offline/visit-queue';
import { syncVisitQueue } from '../../../lib/offline/sync-visits';
import { useScrollToTop } from '../../../hooks/use-scroll-to-top';

const activeVisitStorageKey = 'yuksales.sales.activeVisit';

export function VisitPage() {
  useScrollToTop();
  const { accessToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [location, setLocation] = useState<BrowserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [preview, setPreview] = useState(false);

  const [schedules, setSchedules] = useState<TodayVisitSchedule[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [activeOutletName, setActiveOutletName] = useState('');
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);

  const [outcome, setOutcome] = useState<'closed_order' | 'no_order' | 'follow_up' | 'outlet_closed' | 'rejected' | 'invalid_location'>('closed_order');
  const [notes, setNotes] = useState('');

  useEffect(() => () => stopCamera(stream), [stream]);

  useEffect(() => {
    const init = async () => {
      try {
        if (videoRef.current) {
          const nextStream = await startFrontCamera(videoRef.current);
          setStream(nextStream);
        }
      } catch { /* camera permission denied */ }
      try {
        const current = await getCurrentLocation();
        setLocation(current);
      } catch { /* geolocation denied */ }
    };
    init();
  }, []);

  useEffect(() => {
    refreshQueueCount();
    const handleOnline = async () => {
      setOnline(true);
      await handleSyncQueue();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(activeVisitStorageKey);
    if (!raw) return;
    try {
      const activeVisit = JSON.parse(raw) as { id: string; outletId: string; scheduleId?: string; outletName?: string };
      setActiveVisitId(activeVisit.id);
      setSelectedOutlet(activeVisit.outletId);
      setSelectedScheduleId(activeVisit.scheduleId ?? '');
      setActiveOutletName(activeVisit.outletName ?? '');
    } catch {
      localStorage.removeItem(activeVisitStorageKey);
    }
  }, []);

  useEffect(() => {
    if (accessToken) {
      getTodayVisitPlan(accessToken).then(res => setSchedules(res.schedules)).catch(e => console.error(e));
    }
  }, [accessToken]);

  const availableSchedules = schedules.filter((schedule) => ['assigned', 'approved'].includes(schedule.status));
  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId);

  async function refreshQueueCount() {
    const count = await getVisitQueueCount();
    setQueueCount(count);
  }

  async function handleSyncQueue() {
    setSyncing(true);
    try {
      const result = await syncVisitQueue();
      await refreshQueueCount();
      if (result.synced || result.failed) {
        setMessage(`Sync visit selesai. Berhasil: ${result.synced}, gagal: ${result.failed}`);
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleCaptureAndPreview() {
    if (!videoRef.current) return;
    const captured = await captureFromVideo(videoRef.current);
    setImage(captured);
    setPreview(true);
  }

  function handleRetake() {
    setPreview(false);
    setImage(null);
  }

  async function handleCheckIn() {
    if (!accessToken || !image || !location || !selectedOutlet) return;
    setLoading(true);
    setMessage('');

    const payload: VisitPayload = {
      clientRequestId: crypto.randomUUID(),
      outletId: selectedOutlet,
      scheduleId: selectedScheduleId || undefined,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyM: location.accuracyM,
      faceCapture: {
        dataUrl: image.dataUrl,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        faceDetected: image.faceDetected,
        faceConfidence: image.faceConfidence,
        capturedAt: image.capturedAt,
      },
    };

    try {
      if (!navigator.onLine) throw new Error('offline');
      const result = await checkInVisit(accessToken, payload);
      setMessage(`Check-in berhasil!`);
      setActiveVisitId(result.visit.id);
      setActiveOutletName(selectedSchedule?.outlet.name ?? '');
      localStorage.setItem(activeVisitStorageKey, JSON.stringify({
        id: result.visit.id,
        outletId: result.visit.outletId,
        scheduleId: selectedScheduleId,
        outletName: selectedSchedule?.outlet.name,
      }));
      setPreview(false);
      setImage(null);
    } catch (error: any) {
      if (!navigator.onLine || error.message === 'offline') {
        await enqueueVisit({ type: 'check-in', accessToken, payload });
        await refreshQueueCount();
        setMessage('Check-in disimpan offline dan akan tersinkron saat online.');
        setPreview(false);
        setImage(null);
      } else {
        setMessage(`Check-in gagal: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!accessToken || !image || !location || !activeVisitId) return;
    setLoading(true);
    setMessage('');

    const payload: VisitCheckOutPayload = {
      visitSessionId: activeVisitId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyM: location.accuracyM,
      outcome,
      closingNotes: notes,
      faceCapture: {
        dataUrl: image.dataUrl,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        faceDetected: image.faceDetected,
        faceConfidence: image.faceConfidence,
        capturedAt: image.capturedAt,
      },
    };

    try {
      if (!navigator.onLine) throw new Error('offline');
      await checkOutVisit(accessToken, payload);
      setMessage(`Check-out berhasil!`);
      setActiveVisitId(null);
      localStorage.removeItem(activeVisitStorageKey);
      setSelectedOutlet('');
      setSelectedScheduleId('');
      setActiveOutletName('');
      setImage(null);
      setNotes('');
      setPreview(false);
    } catch (error: any) {
      if (!navigator.onLine || error.message === 'offline') {
        await enqueueVisit({ type: 'check-out', accessToken, payload });
        await refreshQueueCount();
        setActiveVisitId(null);
        localStorage.removeItem(activeVisitStorageKey);
        setSelectedOutlet('');
        setSelectedScheduleId('');
        setActiveOutletName('');
        setImage(null);
        setNotes('');
        setPreview(false);
        setMessage('Check-out disimpan offline dan akan tersinkron saat online.');
      } else {
        setMessage(`Check-out gagal: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  const canCheckIn = !!image && !!location && !!selectedOutlet;
  const canCheckOut = !!image && !!location && !!activeVisitId;

  return (
    <main className="sales-home" style={{ paddingBottom: '6rem' }}>
      <div className="sales-home-greeting">
        <div>
          <p className="sales-greeting-label">Eksekusi Kunjungan</p>
          <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>Visit Check-In</h1>
        </div>
        {!online && <span className="flex items-center gap-1 text-sales-red" style={{ fontSize: '.75rem' }}><WifiOff size={14} /> Offline</span>}
      </div>

      {queueCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-sales-accent-bg bg-sales-bg px-3 py-2 mb-2">
          <span className="text-sales-accent" style={{ fontSize: '.8rem' }}>{queueCount} visit menunggu sync</span>
          <button onClick={handleSyncQueue} disabled={syncing || !navigator.onLine} className="flex items-center gap-1 text-sales-accent" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync
          </button>
        </div>
      )}

      <div className="sales-step-card">
        <h2>{!activeVisitId ? '1. Pilih Outlet Tujuan' : 'Sesi Kunjungan Aktif'}</h2>
        {!activeVisitId ? (
          <select
            value={selectedScheduleId}
            onChange={e => {
              const schedule = schedules.find((item) => item.id === e.target.value);
              setSelectedScheduleId(e.target.value);
              setSelectedOutlet(schedule?.outletId ?? '');
            }}
            className="sales-select"
            style={{ width: '100%' }}
          >
            <option value="">-- Pilih Outlet dari Jadwal Hari Ini --</option>
            {availableSchedules.map(schedule => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.outlet.code} - {schedule.outlet.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="sales-attendance-banner checked-in">
            <Store size={20} />
            <div>
              <strong>Sedang Visit</strong>
              <span>{activeOutletName || selectedSchedule?.outlet.name || selectedOutlet}</span>
            </div>
          </div>
        )}
        {!activeVisitId && !availableSchedules.length && (
          <p className="mt-3 text-sales-muted" style={{ fontSize: '.8rem' }}>
            Belum ada jadwal outlet yang bisa dimulai hari ini. Hubungi admin untuk membuat atau mengaktifkan jadwal sales.
          </p>
        )}
      </div>

      <div className="sales-step-card">
        <h2>{!activeVisitId ? '2. Verifikasi Wajah & GPS' : 'Verifikasi Wajah & GPS'}</h2>

        <div className="relative">
          <video ref={videoRef} className="w-full rounded-2xl bg-black object-cover" style={{ aspectRatio: '3/4' }} playsInline muted />
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

        <div className="mt-3">
          {!activeVisitId ? (
            <button
              onClick={handleCaptureAndPreview}
              disabled={!stream}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sales-accent text-sales-surface border-none"
              style={{ padding: '.85rem', fontSize: '.95rem', fontWeight: 800, cursor: stream ? 'pointer' : 'not-allowed', opacity: stream ? 1 : 0.5, transition: 'all .2s' }}
            >
              <Camera size={20} /> Jepret & Check-In
            </button>
          ) : (
            <button
              onClick={handleCaptureAndPreview}
              disabled={!stream}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sales-danger-light text-sales-surface border-none"
              style={{ padding: '.85rem', fontSize: '.95rem', fontWeight: 800, cursor: stream ? 'pointer' : 'not-allowed', opacity: stream ? 1 : 0.5, transition: 'all .2s' }}
            >
              <Camera size={20} /> Jepret & Check-Out
            </button>
          )}
        </div>
      </div>

      {activeVisitId && (
        <div className="sales-step-card">
          <h2>3. Hasil Kunjungan (Check-Out)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <select value={outcome} onChange={e => setOutcome(e.target.value as any)} className="sales-select">
              <option value="closed_order">Closed Order (Berhasil Jual)</option>
              <option value="follow_up">Follow Up (Prospek Lanjutan)</option>
              <option value="no_order">No Order (Tidak Beli)</option>
              <option value="outlet_closed">Toko Tutup</option>
              <option value="rejected">Ditolak</option>
            </select>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan kunjungan (opsional)..." className="sales-input" rows={2} />
          </div>
        </div>
      )}

      {message && (
        <div className="sales-message">
          {message}
        </div>
      )}

      {/* Preview Modal */}
      {preview && image && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm p-6" style={{ background: 'var(--sales-overlay-dark)' }}>
          <div className="w-full max-w-[360px] bg-sales-surface rounded-3xl p-5" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <p className="text-center text-sales-text-heading font-extrabold mb-3" style={{ fontSize: '.9rem' }}>
              Preview {activeVisitId ? 'Check-Out' : 'Check-In'}
            </p>
            <img src={image.dataUrl} alt="Preview" className="w-full rounded-2xl object-cover" style={{ aspectRatio: '3/4' }} />
            {location && (
              <div className="flex items-center gap-1.5 mt-2 text-sales-muted" style={{ fontSize: '.7rem' }}>
                <MapPin size={12} className="text-sales-emerald-dark" />
                <span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · ±{Math.round(location.accuracyM ?? 0)}m</span>
              </div>
            )}
            {selectedSchedule && (
              <div className="flex items-center gap-1.5 mt-1 text-sales-muted" style={{ fontSize: '.7rem' }}>
                <Store size={12} className="text-sales-accent" />
                <span>{selectedSchedule.outlet.name}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={handleRetake}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-sales-surface text-sales-text-label"
                style={{ padding: '.7rem', fontSize: '.8rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                <RotateCcw size={15} /> Ulangi
              </button>
              <button
                onClick={activeVisitId ? handleCheckOut : handleCheckIn}
                disabled={loading || (!activeVisitId ? !canCheckIn : !canCheckOut)}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-sales-accent text-sales-surface border-none"
                style={{ padding: '.7rem', fontSize: '.8rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
              >
                {loading ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
                {loading ? 'Mengirim...' : activeVisitId ? 'Check-Out' : 'Check-In Visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
