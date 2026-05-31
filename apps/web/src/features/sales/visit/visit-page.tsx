import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, MapPin, Video, Store, XCircle, RefreshCw, RotateCcw, Send, WifiOff, PackageCheck, ShieldCheck, Smartphone } from 'lucide-react';
import { checkInVisit, checkOutVisit, type VisitPayload, type VisitCheckOutPayload } from '../../../lib/api/client';
import { getSalesConsignments, getTodayVisitPlan, submitSalesConsignmentAction, type Consignment, type TodayVisitSchedule } from '../../../lib/api/tenant';
import { captureFromVideo, startFrontCamera, stopCamera, type CapturedImage } from '../../../lib/camera/capture';
import { getCurrentLocation, type BrowserLocation } from '../../../lib/geo/location';
import { useAuth } from '../../auth/auth-provider';
import { enqueueVisit, getVisitQueueCount } from '../../../lib/offline/visit-queue';
import { syncVisitQueue } from '../../../lib/offline/sync-visits';
import { useScrollToTop } from '../../../hooks/use-scroll-to-top';

const activeVisitStorageKey = 'yuksales.sales.activeVisit';
const permissionStorageKey = 'yuksales.permission.visit';

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
  const [showPermissionPopup, setShowPermissionPopup] = useState(!localStorage.getItem(permissionStorageKey));

  const [schedules, setSchedules] = useState<TodayVisitSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [activeOutletName, setActiveOutletName] = useState('');
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [consignmentForm, setConsignmentForm] = useState({ consignmentId: '', productId: '', actionType: 'report_sold' as 'report_sold' | 'withdraw', quantity: '', amount: '', notes: '' });

  const [outcome, setOutcome] = useState<'closed_order' | 'no_order' | 'follow_up' | 'outlet_closed' | 'rejected' | 'invalid_location'>('closed_order');
  const [notes, setNotes] = useState('');

  useEffect(() => () => stopCamera(stream), [stream]);

  useEffect(() => {
    if (showPermissionPopup) return;
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
  }, [showPermissionPopup]);

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
      setSchedulesLoading(true);
      getTodayVisitPlan(accessToken)
        .then(res => setSchedules(res.schedules))
        .catch(e => console.error(e))
        .finally(() => setSchedulesLoading(false));
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && activeVisitId && selectedOutlet) {
      loadConsignments(selectedOutlet);
    } else {
      setConsignments([]);
    }
  }, [accessToken, activeVisitId, selectedOutlet]);

  const availableSchedules = schedules.filter((schedule) => ['assigned', 'approved'].includes(schedule.status));
  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId);

  function handleAllowPermissions() {
    localStorage.setItem(permissionStorageKey, '1');
    setShowPermissionPopup(false);
  }

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

  async function loadConsignments(outletId: string) {
    if (!accessToken) return;
    try {
      const result = await getSalesConsignments(accessToken, outletId);
      setConsignments(result.consignments ?? []);
    } catch {
      setConsignments([]);
    }
  }

  async function handleSubmitConsignmentAction() {
    if (!accessToken || !consignmentForm.consignmentId || !consignmentForm.productId || !consignmentForm.quantity) return;
    setLoading(true);
    setMessage('');
    try {
      await submitSalesConsignmentAction(accessToken, consignmentForm.consignmentId, {
        actionType: consignmentForm.actionType,
        productId: consignmentForm.productId,
        quantity: consignmentForm.quantity,
        amount: consignmentForm.amount || undefined,
        notes: consignmentForm.notes || undefined,
      });
      setMessage('Laporan konsinyasi terkirim dan menunggu approval admin.');
      setConsignmentForm({ consignmentId: '', productId: '', actionType: 'report_sold', quantity: '', amount: '', notes: '' });
      await loadConsignments(selectedOutlet);
    } catch (error: any) {
      setMessage(`Laporan konsinyasi gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
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
          <h1 className="sales-greeting-name" style={{ fontSize: '1.25rem' }}>
            {activeVisitId ? 'Check-Out Kunjungan' : 'Visit Check-In'}
          </h1>
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

      {/* ── CHECK-IN MODE ──────────────────────────────────────── */}
      {!activeVisitId && (
        <>
          {/* Step 1: Pilih Outlet */}
          <div className="sales-step-card">
            <h2>1. Pilih Outlet Tujuan</h2>
            {schedulesLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', padding: '1.5rem 0', color: '#94a3b8', fontSize: '.85rem' }}>
                <Loader2 size={18} className="animate-spin" /> Memuat jadwal...
              </div>
            ) : (
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
            )}
            {!availableSchedules.length && (
              <p className="mt-3 text-sales-muted" style={{ fontSize: '.8rem' }}>
                Belum ada jadwal outlet yang bisa dimulai hari ini. Hubungi admin untuk membuat atau mengaktifkan jadwal sales.
              </p>
            )}
          </div>

          {/* Step 2: Foto & Check-In */}
          <div className="sales-step-card">
            <h2>2. Verifikasi Wajah & GPS</h2>
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
              <button
                onClick={handleCaptureAndPreview}
                disabled={!stream}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sales-accent text-sales-surface border-none"
                style={{ padding: '.85rem', fontSize: '.95rem', fontWeight: 800, cursor: stream ? 'pointer' : 'not-allowed', opacity: stream ? 1 : 0.5, transition: 'all .2s' }}
              >
                <Camera size={20} /> Jepret & Check-In
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── CHECK-OUT MODE ─────────────────────────────────────── */}
      {activeVisitId && (
        <>
          {/* Step 1: Outlet Aktif */}
          <div className="sales-step-card">
            <h2>1. Outlet Dikunjungi</h2>
            <div className="flex items-center gap-3 rounded-2xl border border-sales-accent-bg bg-sales-bg p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sales-accent text-sales-surface">
                <Store size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-extrabold text-sales-text-heading truncate" style={{ fontSize: '.85rem' }}>
                  {activeOutletName || selectedSchedule?.outlet.name || 'Outlet Aktif'}
                </p>
                {selectedSchedule?.outlet.code && (
                  <p className="text-sales-muted truncate" style={{ fontSize: '.7rem' }}>{selectedSchedule.outlet.code}</p>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Hasil Kunjungan */}
          <div className="sales-step-card">
            <h2>2. Hasil Kunjungan</h2>
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

          {/* Konsinyasi (jika ada) */}
          {consignments.length > 0 && (
            <div className="sales-step-card">
              <h2><PackageCheck size={17} style={{ display: 'inline', marginRight: 6 }} /> Konsinyasi Outlet</h2>
              <div style={{ display: 'grid', gap: '.75rem' }}>
                {consignments.map((consignment) => (
                  <div key={consignment.id} style={{ border: '1px solid rgba(74, 41, 34, .12)', borderRadius: 14, padding: '.75rem', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', marginBottom: '.5rem' }}>
                      <strong style={{ fontSize: '.85rem' }}>Konsinyasi aktif</strong>
                      <span style={{ fontSize: '.72rem', color: '#B55925', fontWeight: 800 }}>Due {new Date(consignment.dueDate).toLocaleDateString('id-ID')}</span>
                    </div>
                    {(consignment.items ?? []).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setConsignmentForm((current) => ({ ...current, consignmentId: consignment.id, productId: item.productId }))}
                        style={{ width: '100%', border: consignmentForm.productId === item.productId ? '1px solid #B55925' : '1px solid #f1e5df', borderRadius: 12, padding: '.55rem', background: '#fffaf7', textAlign: 'left', marginTop: '.35rem' }}
                      >
                        <strong style={{ display: 'block', fontSize: '.8rem' }}>{item.productName}</strong>
                        <span style={{ fontSize: '.72rem', color: '#64748b' }}>Sisa {Number(item.remainingQuantity).toLocaleString('id-ID')} dari {Number(item.quantity).toLocaleString('id-ID')}</span>
                      </button>
                    ))}
                  </div>
                ))}
                <div style={{ display: 'grid', gap: '.55rem' }}>
                  <select className="sales-select" value={consignmentForm.actionType} onChange={(e) => setConsignmentForm((current) => ({ ...current, actionType: e.target.value as 'report_sold' | 'withdraw' }))}>
                    <option value="report_sold">Laporkan Terjual / Dibayar</option>
                    <option value="withdraw">Tarik Barang</option>
                  </select>
                  <input className="sales-input" type="number" min="0" placeholder="Qty" value={consignmentForm.quantity} onChange={(e) => setConsignmentForm((current) => ({ ...current, quantity: e.target.value }))} />
                  {consignmentForm.actionType === 'report_sold' && (
                    <input className="sales-input" type="number" min="0" placeholder="Nominal diterima (opsional)" value={consignmentForm.amount} onChange={(e) => setConsignmentForm((current) => ({ ...current, amount: e.target.value }))} />
                  )}
                  <textarea className="sales-input" rows={2} placeholder="Catatan / bukti singkat" value={consignmentForm.notes} onChange={(e) => setConsignmentForm((current) => ({ ...current, notes: e.target.value }))} />
                  <button className="sales-btn sales-btn-primary" type="button" disabled={loading || !consignmentForm.consignmentId || !consignmentForm.productId || !consignmentForm.quantity} onClick={handleSubmitConsignmentAction} style={{ justifyContent: 'center' }}>
                    {loading ? <Loader2 className="animate-spin" /> : <Send size={16} />} Kirim Approval Konsinyasi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Foto & Check-Out */}
          <div className="sales-step-card">
            <h2>3. Foto & Check-Out</h2>
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
              <button
                onClick={handleCaptureAndPreview}
                disabled={!stream}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sales-danger-light text-sales-surface border-none"
                style={{ padding: '.85rem', fontSize: '.95rem', fontWeight: 800, cursor: stream ? 'pointer' : 'not-allowed', opacity: stream ? 1 : 0.5, transition: 'all .2s' }}
              >
                <Camera size={20} /> Jepret & Check-Out
              </button>
            </div>
          </div>
        </>
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

            {/* Outlet Info Card */}
            {(selectedSchedule || activeOutletName) && (
              <div className="flex items-center gap-3 rounded-2xl border border-sales-accent-bg bg-sales-bg p-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sales-accent text-sales-surface">
                  <Store size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-extrabold text-sales-text-heading truncate" style={{ fontSize: '.85rem' }}>
                    {selectedSchedule?.outlet.name || activeOutletName}
                  </p>
                  {selectedSchedule?.outlet.code && (
                    <p className="text-sales-muted truncate" style={{ fontSize: '.7rem' }}>{selectedSchedule.outlet.code}</p>
                  )}
                </div>
              </div>
            )}

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

      {/* Permission Popup */}
      {showPermissionPopup && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm p-6" style={{ background: 'var(--sales-overlay-dark)' }}>
          <div className="w-full max-w-[340px] bg-sales-surface rounded-3xl p-6" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sales-accent-bg">
                <ShieldCheck size={32} className="text-sales-accent" />
              </div>
            </div>
            <h2 className="text-center text-sales-text-heading font-extrabold mb-2" style={{ fontSize: '1.1rem' }}>
              Izin Akses Diperlukan
            </h2>
            <p className="text-center text-sales-muted mb-5" style={{ fontSize: '.8rem', lineHeight: 1.6 }}>
              Untuk melakukan visit outlet, aplikasi memerlukan akses ke:
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
                  <p className="text-sales-muted" style={{ fontSize: '.7rem' }}>Validasi radius kunjungan outlet</p>
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
    </main>
  );
}
