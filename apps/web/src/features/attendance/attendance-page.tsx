import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Cloud, Loader2, MapPin, ShieldAlert, Video, WifiOff } from 'lucide-react';
import { checkInAttendance, type AttendancePayload } from '../../lib/api/client';
import { captureFromVideo, startFrontCamera, stopCamera, type CapturedImage } from '../../lib/camera/capture';
import { getCurrentLocation, type BrowserLocation } from '../../lib/geo/location';
import { enqueueAttendance, getAttendanceQueue } from '../../lib/offline/attendance-queue';
import { syncAttendanceQueue } from '../../lib/offline/sync-attendance';
import { useAuth } from '../auth/auth-provider';

export function AttendancePage() {
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

  async function refreshQueueCount() {
    const queue = await getAttendanceQueue();
    setQueueCount(queue.length);
  }

  async function handleSyncQueue() {
    setSyncing(true);
    try {
      const result = await syncAttendanceQueue();
      await refreshQueueCount();
      if (result.synced || result.failed) {
        setMessage(`Sync selesai. Berhasil: ${result.synced}, gagal: ${result.failed}`);
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
    if (!accessToken || !image || !location) return;
    setLoading(true);
    setMessage('');

    const payload: AttendancePayload = {
      clientRequestId: crypto.randomUUID(),
      capturedAt: image.capturedAt,
      location,
      faceCapture: {
        dataUrl: image.dataUrl,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        faceDetected: image.faceDetected,
        faceConfidence: image.faceConfidence,
      },
    };

    try {
      if (!navigator.onLine) throw new Error('offline');
      const result = await checkInAttendance(accessToken, payload);
      setMessage(`Absensi terkirim. Status: ${JSON.stringify(result.geofence)}`);
    } catch (error) {
      await enqueueAttendance({ type: 'check-in', accessToken, payload });
      await refreshQueueCount();
      setMessage(error instanceof Error && error.message !== 'offline'
        ? `Absensi disimpan offline karena gagal terkirim: ${error.message}`
        : 'Absensi disimpan offline dan akan tersinkron saat online.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-8 text-slate-100">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-teal-200">Attendance</p>
              <h1 className="mt-2 text-4xl font-black">Absensi Wajah + GPS</h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Gunakan kamera depan untuk foto wajah, ambil lokasi GPS akurat, lalu sistem akan memvalidasi radius/geofence.
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${online ? 'bg-teal-400/15 text-teal-100' : 'bg-amber-400/15 text-amber-100'}`}>
              {online ? <Cloud size={18} /> : <WifiOff size={18} />}
              {online ? 'Online' : 'Offline'} · Queue {queueCount}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <video ref={videoRef} className="aspect-video w-full rounded-3xl bg-black object-cover" playsInline muted />
            {image && <img src={image.dataUrl} alt="Captured face" className="mt-4 aspect-video w-full rounded-3xl object-cover" />}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={handleStartCamera} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 font-bold transition hover:bg-white/15"><Video size={18} /> Buka Kamera</button>
              <button onClick={handleCapture} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-teal-300"><Camera size={18} /> Ambil Foto</button>
            </div>
          </section>

          <aside className="space-y-4">
            <StatusCard icon={Camera} title="Foto Wajah" ok={!!image} text={image ? 'Foto wajah sudah diambil. Face detection MVP aktif.' : 'Wajib ambil foto kamera depan.'} />
            <StatusCard icon={MapPin} title="Lokasi GPS" ok={!!location} text={location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} ±${Math.round(location.accuracyM ?? 0)}m` : 'Ambil lokasi GPS akurat.'} />
            <button onClick={handleLocation} className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold transition hover:bg-white/15">Ambil Lokasi</button>
            <button onClick={handleCheckIn} disabled={!image || !location || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60">
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Check-in Sekarang
            </button>
            <button onClick={handleSyncQueue} disabled={syncing || !online} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold transition hover:bg-white/15 disabled:opacity-60">
              {syncing ? <Loader2 className="animate-spin" /> : <Cloud />}
              Sync Queue Offline
            </button>
            {message && <p className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-200">{message}</p>}
          </aside>
        </div>
      </section>
    </main>
  );
}

function StatusCard({ icon: Icon, title, text, ok }: { icon: typeof ShieldAlert; title: string; text: string; ok: boolean }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <Icon className={ok ? 'text-teal-300' : 'text-amber-300'} />
      <h2 className="mt-3 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </article>
  );
}



