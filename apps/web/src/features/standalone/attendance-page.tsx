import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';
import { checkInAttendance, checkOutAttendance, type AttendancePayload } from '../../lib/api/client';
import { captureFromVideo, startFrontCamera, stopCamera, type CapturedImage } from '../../lib/camera/capture';
import { getCurrentLocation, type BrowserLocation } from '../../lib/geo/location';
import { enqueueAttendance, getAttendanceQueue } from '../../lib/offline/attendance-queue';
import { syncAttendanceQueue } from '../../lib/offline/sync-attendance';
import { useAuth } from '../auth/auth-provider';
import { AttendancePageAdmin } from './attendance-page-admin';
import { AttendancePageSales } from './attendance-page-sales';

export type AttendanceMode = 'admin' | 'sales';

export interface AttendanceState {
  videoRef: RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  image: CapturedImage | null;
  location: BrowserLocation | null;
  loading: boolean;
  syncing: boolean;
  message: string;
  queueCount: number;
  online: boolean;
  preview: boolean;
  reloadKey: number;
  handleStartCamera: () => Promise<void>;
  handleCapture: () => Promise<void>;
  handleLocation: () => Promise<void>;
  handleCheckIn: () => Promise<void>;
  handleCheckOut: (attendanceSessionId: string) => Promise<void>;
  handleSyncQueue: () => Promise<void>;
  handleCaptureAndPreview: () => Promise<void>;
  handleRetake: () => void;
  handleConfirmSend: () => Promise<void>;
  handleConfirmCheckOut: (attendanceSessionId: string) => Promise<void>;
}

export function AttendancePage({ mode = 'admin' }: { mode?: AttendanceMode }) {
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
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => () => stopCamera(stream), [stream]);

  // Auto-start camera and location for sales mode
  useEffect(() => {
    if (mode === 'sales') {
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
    }
  }, [mode]);

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

  const handleConfirmSend = useCallback(async () => {
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
      setPreview(false);
      setReloadKey(k => k + 1);
    } catch (error) {
      await enqueueAttendance({ type: 'check-in', accessToken, payload });
      await refreshQueueCount();
      setMessage(error instanceof Error && error.message !== 'offline'
        ? `Absensi disimpan offline karena gagal terkirim: ${error.message}`
        : 'Absensi disimpan offline dan akan tersinkron saat online.');
      setPreview(false);
      setReloadKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  }, [accessToken, image, location]);

  const handleConfirmCheckOut = useCallback(async (attendanceSessionId: string) => {
    if (!accessToken || !image || !location) return;
    setLoading(true);
    setMessage('');

    const payload: AttendancePayload & { attendanceSessionId: string } = {
      attendanceSessionId,
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
      await checkOutAttendance(accessToken, payload);
      setMessage('Absensi keluar terkirim.');
      setPreview(false);
      setReloadKey(k => k + 1);
    } catch (error) {
      await enqueueAttendance({ type: 'check-out', accessToken, payload });
      await refreshQueueCount();
      setMessage(error instanceof Error && error.message !== 'offline'
        ? `Absensi keluar disimpan offline karena gagal terkirim: ${error.message}`
        : 'Absensi keluar disimpan offline dan akan tersinkron saat online.');
      setPreview(false);
      setReloadKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  }, [accessToken, image, location]);

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

  async function handleCheckOut(attendanceSessionId: string) {
    await handleConfirmCheckOut(attendanceSessionId);
  }

  const state: AttendanceState = {
    videoRef, stream, image, location, loading, syncing, message, queueCount, online, preview, reloadKey,
    handleStartCamera, handleCapture, handleLocation, handleCheckIn, handleCheckOut, handleSyncQueue,
    handleCaptureAndPreview, handleRetake, handleConfirmSend, handleConfirmCheckOut,
  };

  if (mode === 'sales') {
    return <AttendancePageSales {...state} />;
  }

  return <AttendancePageAdmin {...state} />;
}
