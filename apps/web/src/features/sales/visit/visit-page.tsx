import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, MapPin, Video, Store, XCircle, RefreshCw, WifiOff } from 'lucide-react';
import { checkInVisit, checkOutVisit, type VisitPayload, type VisitCheckOutPayload } from '../../../lib/api/client';
import { getTodayVisitPlan, type TodayVisitSchedule } from '../../../lib/api/tenant';
import { captureFromVideo, startFrontCamera, stopCamera, type CapturedImage } from '../../../lib/camera/capture';
import { getCurrentLocation, type BrowserLocation } from '../../../lib/geo/location';
import { useAuth } from '../../auth/auth-provider';
import { enqueueVisit, getVisitQueueCount } from '../../../lib/offline/visit-queue';
import { syncVisitQueue } from '../../../lib/offline/sync-visits';

const activeVisitStorageKey = 'yuksales.sales.activeVisit';

export function VisitPage() {
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

  // Data
  const [schedules, setSchedules] = useState<TodayVisitSchedule[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [activeOutletName, setActiveOutletName] = useState('');
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);

  // Check-out fields
  const [outcome, setOutcome] = useState<'closed_order' | 'no_order' | 'follow_up' | 'outlet_closed' | 'rejected' | 'invalid_location'>('closed_order');
  const [notes, setNotes] = useState('');

  useEffect(() => () => stopCamera(stream), [stream]);

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

  async function handleStartCamera() {
    if (!videoRef.current) return;
    const nextStream = await startFrontCamera(videoRef.current);
    setStream(nextStream);
  }

  async function handleCapture() {
    if (!videoRef.current) return;
    const captured = await captureFromVideo(videoRef.current);
    setImage(captured);
  }

  async function handleLocation() {
    const current = await getCurrentLocation();
    setLocation(current);
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
      setImage(null); // Reset image for check-out
    } catch (error: any) {
      if (!navigator.onLine || error.message === 'offline') {
        await enqueueVisit({ type: 'check-in', accessToken, payload });
        await refreshQueueCount();
        setMessage('Check-in disimpan offline dan akan tersinkron saat online.');
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
        setMessage('Check-out disimpan offline dan akan tersinkron saat online.');
      } else {
        setMessage(`Check-out gagal: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="sales-home" style={{ paddingBottom: '6rem' }}>
      <div className="sales-home-greeting">
        <div>
          <p className="sales-greeting-label">Eksekusi Kunjungan</p>
          <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>Visit Check-In</h1>
        </div>
        {!online && <span style={{ fontSize: '.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}><WifiOff size={14} /> Offline</span>}
      </div>

      {queueCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '.5rem .75rem', marginBottom: '.5rem' }}>
          <span style={{ fontSize: '.8rem', color: '#B55925' }}>{queueCount} visit menunggu sync</span>
          <button onClick={handleSyncQueue} disabled={syncing || !navigator.onLine} style={{ background: 'none', border: 'none', color: '#B55925', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '.8rem', fontWeight: 600 }}>
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
          <p style={{ marginTop: '.75rem', fontSize: '.8rem', color: '#94a3b8' }}>
            Belum ada jadwal outlet yang bisa dimulai hari ini. Hubungi admin untuk membuat atau mengaktifkan jadwal sales.
          </p>
        )}
      </div>

      <div className="sales-step-card">
        <h2>2. Verifikasi Wajah & GPS</h2>

        <div className="sales-camera-frame">
          <video ref={videoRef} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} playsInline muted />
          {image && <img src={image.dataUrl} alt="Captured" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>

        <div style={{ display: 'grid', gap: '.5rem', gridTemplateColumns: '1fr 1fr' }}>
          <button onClick={handleStartCamera} className="sales-btn sales-btn-ghost" type="button" style={{ justifyContent: 'center' }}><Video size={16} /> Buka Kamera</button>
          <button onClick={handleCapture} disabled={!stream} className="sales-btn sales-btn-primary" type="button" style={{ justifyContent: 'center' }}><Camera size={16} /> Jepret Wajah</button>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button onClick={handleLocation} className="sales-btn sales-btn-ghost" type="button" style={{ width: '100%', justifyContent: 'center' }}>
            <MapPin size={16} /> Ambil Lokasi GPS
          </button>
          {location && <p style={{ fontSize: '.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '.5rem' }}>Akurasi: ±{Math.round(location.accuracyM ?? 0)}m</p>}
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

      {!activeVisitId ? (
        <button onClick={handleCheckIn} disabled={!image || !location || !selectedOutlet || loading} className="sales-btn sales-btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '1rem', justifyContent: 'center' }}>
          {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Check-In Visit
        </button>
      ) : (
        <button onClick={handleCheckOut} disabled={!image || !location || loading} className="sales-danger-btn">
          {loading ? <Loader2 className="animate-spin" /> : <XCircle />} Check-Out & Selesai
        </button>
      )}

    </main>
  );
}
