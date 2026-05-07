import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, MapPin, Video, Store, XCircle } from 'lucide-react';
import { checkInVisit, checkOutVisit, type VisitPayload, type VisitCheckOutPayload } from '../../lib/api/client';
import { getOutlets } from '../../lib/api/tenant';
import { captureFromVideo, startFrontCamera, stopCamera, type CapturedImage } from '../../lib/camera/capture';
import { getCurrentLocation, type BrowserLocation } from '../../lib/geo/location';
import { useAuth } from '../auth/auth-provider';

export function VisitPage() {
  const { accessToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [location, setLocation] = useState<BrowserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Data
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);

  // Check-out fields
  const [outcome, setOutcome] = useState<'closed_order' | 'no_order' | 'follow_up' | 'outlet_closed' | 'rejected' | 'invalid_location'>('closed_order');
  const [notes, setNotes] = useState('');

  useEffect(() => () => stopCamera(stream), [stream]);

  useEffect(() => {
    if (accessToken) {
      getOutlets(accessToken).then(res => setOutlets(res.outlets)).catch(e => console.error(e));
    }
  }, [accessToken]);

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
      const result: any = await checkInVisit(accessToken, payload);
      setMessage(`Check-in berhasil!`);
      setActiveVisitId(result.session?.id || 'dummy-id'); // fallback if needed
      setImage(null); // Reset image for check-out
    } catch (error: any) {
      setMessage(`Check-in gagal: ${error.message}`);
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
      await checkOutVisit(accessToken, payload);
      setMessage(`Check-out berhasil!`);
      setActiveVisitId(null);
      setSelectedOutlet('');
      setImage(null);
      setNotes('');
    } catch (error: any) {
      setMessage(`Check-out gagal: ${error.message}`);
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
      </div>

      <div className="admin-card" style={{ marginTop: '1rem', padding: '1rem' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>{!activeVisitId ? '1. Pilih Outlet Tujuan' : 'Sesi Kunjungan Aktif'}</h2>
        {!activeVisitId ? (
          <select value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)} className="admin-select" style={{ width: '100%' }}>
            <option value="">-- Pilih Outlet --</option>
            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        ) : (
          <div className="sales-attendance-banner checked-in">
            <Store size={20} />
            <div>
              <strong>Sedang Visit</strong>
              <span>{outlets.find(o => o.id === selectedOutlet)?.name}</span>
            </div>
          </div>
        )}
      </div>

      <div className="admin-card" style={{ padding: '1rem' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>2. Verifikasi Wajah & GPS</h2>
        
        <div style={{ borderRadius: '1rem', overflow: 'hidden', background: '#000', marginBottom: '1rem', position: 'relative' }}>
          <video ref={videoRef} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} playsInline muted />
          {image && <img src={image.dataUrl} alt="Captured" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>

        <div style={{ display: 'grid', gap: '.5rem', gridTemplateColumns: '1fr 1fr' }}>
          <button onClick={handleStartCamera} className="admin-btn admin-btn-ghost" type="button" style={{ justifyContent: 'center' }}><Video size={16}/> Buka Kamera</button>
          <button onClick={handleCapture} className="admin-btn admin-btn-primary" type="button" style={{ justifyContent: 'center' }}><Camera size={16}/> Jepret Wajah</button>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button onClick={handleLocation} className="admin-btn admin-btn-ghost" type="button" style={{ width: '100%', justifyContent: 'center' }}>
            <MapPin size={16}/> Ambil Lokasi GPS
          </button>
          {location && <p style={{ fontSize: '.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '.5rem' }}>Akurasi: ±{Math.round(location.accuracyM ?? 0)}m</p>}
        </div>
      </div>

      {activeVisitId && (
        <div className="admin-card" style={{ padding: '1rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>3. Hasil Kunjungan (Check-Out)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <select value={outcome} onChange={e => setOutcome(e.target.value as any)} className="admin-select">
              <option value="closed_order">Closed Order (Berhasil Jual)</option>
              <option value="follow_up">Follow Up (Prospek Lanjutan)</option>
              <option value="no_order">No Order (Tidak Beli)</option>
              <option value="outlet_closed">Toko Tutup</option>
              <option value="rejected">Ditolak</option>
            </select>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan kunjungan (opsional)..." className="admin-input" rows={2} />
          </div>
        </div>
      )}

      {message && (
        <div className="admin-alert" style={{ background: 'rgba(52,211,153,.1)', color: '#34d399', border: '1px solid rgba(52,211,153,.2)' }}>
          {message}
        </div>
      )}

      {!activeVisitId ? (
        <button onClick={handleCheckIn} disabled={!image || !location || !selectedOutlet || loading} className="admin-btn admin-btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '1rem', justifyContent: 'center' }}>
          {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Check-In Visit
        </button>
      ) : (
        <button onClick={handleCheckOut} disabled={!image || !location || loading} className="admin-btn" style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '1rem', justifyContent: 'center', background: '#ef4444', color: '#fff' }}>
          {loading ? <Loader2 className="animate-spin" /> : <XCircle />} Check-Out & Selesai
        </button>
      )}

    </main>
  );
}
