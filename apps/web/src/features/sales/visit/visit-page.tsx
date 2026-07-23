import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, Loader2, MapPin, Store, XCircle, RefreshCw, RotateCcw, Send, WifiOff, PackageCheck, ShieldCheck, Smartphone, Search, Plus, User, Phone, X } from 'lucide-react';
import { apiRequest, checkInVisit, checkOutVisit, getMobileRuntimeSettings, getActiveVisitSession, type VisitPayload, type VisitCheckOutPayload } from '../../../lib/api/client';
import { createOutlet, getSalesConsignments, getTodayVisitPlan, submitSalesConsignmentAction, getOutlets, type Consignment, type TodayVisitSchedule, type Outlet, type OutletPayload } from '../../../lib/api/tenant';
import { captureFromVideo, startFrontCamera, stopCamera, type CapturedImage } from '../../../lib/camera/capture';
import { getCurrentLocation, type BrowserLocation } from '../../../lib/geo/location';
import { useAuth } from '../../auth/auth-provider';
import { enqueueVisit, getVisitQueueCount } from '../../../lib/offline/visit-queue';
import { syncVisitQueue } from '../../../lib/offline/sync-visits';
import { useScrollToTop } from '../../../hooks/use-scroll-to-top';
import { SalesAlert, showSalesAlertToast } from '../ui/sales-alert';
import { LiveFaceOverlay } from '../ui/live-face-overlay';

const activeVisitStorageKey = 'yuksales.sales.activeVisit';
const permissionStorageKey = 'yuksales.permission.visit';

export function VisitPage() {
  useScrollToTop();
  const navigate = useNavigate();
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

  const [showLookup, setShowLookup] = useState(false);
  const [lookupOutlets, setLookupOutlets] = useState<Outlet[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [lookupTypeFilter, setLookupTypeFilter] = useState<'all' | 'store' | 'agent' | 'user'>('all');
  const [lookupSortBy, setLookupSortBy] = useState<'name' | 'phone' | 'ownerName'>('name');

  const [showCreateOutletModal, setShowCreateOutletModal] = useState(false);
  const [newOutletName, setNewOutletName] = useState('');
  const [newOutletType, setNewOutletType] = useState<'store' | 'agent' | 'user'>('store');
  const [newOutletOwner, setNewOutletOwner] = useState('');
  const [newOutletPhone, setNewOutletPhone] = useState('');
  const [newOutletAddress, setNewOutletAddress] = useState('');
  const [createOutletSubmitting, setCreateOutletSubmitting] = useState(false);

  useEffect(() => {
    if (showLookup && accessToken) {
      setLookupLoading(true);
      getOutlets(accessToken, { status: 'active' })
        .then((res: any) => setLookupOutlets(res.outlets ?? []))
        .catch(() => setMessage('Gagal memuat list outlet untuk pencarian.'))
        .finally(() => setLookupLoading(false));
    }
  }, [showLookup, accessToken]);

  useEffect(() => {
    if (showLookup || showCreateOutletModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showLookup, showCreateOutletModal]);

  const sortedLookupOutlets = useMemo(() => {
    const filtered = lookupOutlets.filter(o => {
      const matchesSearch = !lookupSearch || 
        o.name.toLowerCase().includes(lookupSearch.toLowerCase()) ||
        o.code.toLowerCase().includes(lookupSearch.toLowerCase()) ||
        (o.phone && o.phone.toLowerCase().includes(lookupSearch.toLowerCase())) ||
        (o.ownerName && o.ownerName.toLowerCase().includes(lookupSearch.toLowerCase()));

      const matchesType = lookupTypeFilter === 'all' || o.customerType === lookupTypeFilter;
      
      return matchesSearch && matchesType;
    });

    return [...filtered].sort((a, b) => {
      if (lookupSortBy === 'phone') {
        return (a.phone || '').localeCompare(b.phone || '');
      } else if (lookupSortBy === 'ownerName') {
        return (a.ownerName || '').localeCompare(b.ownerName || '');
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }, [lookupOutlets, lookupSearch, lookupTypeFilter, lookupSortBy]);

  async function handleCreateOutletSubmit() {
    if (!accessToken || !newOutletName.trim() || !newOutletAddress.trim()) return;
    setCreateOutletSubmitting(true);
    try {
      const code = `OTK-${Date.now().toString().slice(-6)}`;
      const lat = location?.latitude ?? -6.200000;
      const lng = location?.longitude ?? 106.816666;
      const payload: OutletPayload = {
        code,
        name: newOutletName.trim(),
        customerType: newOutletType,
        ownerName: newOutletOwner.trim() || undefined,
        phone: newOutletPhone.trim() || undefined,
        address: newOutletAddress.trim(),
        latitude: lat,
        longitude: lng,
        status: 'active',
      };
      const res = await createOutlet(accessToken, payload);
      if (res.outlet) {
        setLookupOutlets(prev => [res.outlet, ...prev]);
        setSelectedOutlet(res.outlet.id);
        setSelectedScheduleId('');
        setShowCreateOutletModal(false);
        setShowLookup(false);
        setNewOutletName('');
        setNewOutletOwner('');
        setNewOutletPhone('');
        setNewOutletAddress('');
        showSalesAlertToast('Outlet baru berhasil dibuat dan dipilih!');
      }
    } catch (e: any) {
      setMessage(e.message || 'Gagal membuat outlet baru.');
    } finally {
      setCreateOutletSubmitting(false);
    }
  }

  const [consignmentForm, setConsignmentForm] = useState({ consignmentId: '', productId: '', actionType: 'report_sold' as 'report_sold' | 'withdraw', quantity: '', amount: '', notes: '' });

  const [outcome, setOutcome] = useState<'closed_order' | 'no_order' | 'follow_up' | 'outlet_closed' | 'rejected' | 'invalid_location'>('closed_order');
  const [notes, setNotes] = useState('');
  const [attendanceOpen, setAttendanceOpen] = useState<boolean | null>(null);
  const [liveFaceDetectionEnabled, setLiveFaceDetectionEnabled] = useState(true);

  useEffect(() => () => stopCamera(stream), [stream]);

  useEffect(() => {
    if (showPermissionPopup) return;
    const timer = setTimeout(async () => {
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
    }, 100);
    return () => clearTimeout(timer);
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
    let cancelled = false;

    async function restoreActiveVisit() {
      const raw = localStorage.getItem(activeVisitStorageKey);
      if (raw) {
        try {
          const stored = JSON.parse(raw) as { id: string; outletId: string; scheduleId?: string; outletName?: string };
          if (!cancelled) {
            setActiveVisitId(stored.id);
            setSelectedOutlet(stored.outletId);
            setSelectedScheduleId(stored.scheduleId ?? '');
            setActiveOutletName(stored.outletName ?? '');
          }
        } catch {
          localStorage.removeItem(activeVisitStorageKey);
        }
        return;
      }

      // localStorage kosong — tanya server apakah ada visit aktif hari ini
      if (!accessToken) return;
      try {
        const res = await getActiveVisitSession(accessToken);
        if (cancelled) return;
        if (res.activeVisit) {
          const av = res.activeVisit;
          const visitData = { id: av.id, outletId: av.outletId, scheduleId: av.scheduleId ?? undefined, outletName: av.outletName ?? undefined };
          localStorage.setItem(activeVisitStorageKey, JSON.stringify(visitData));
          setActiveVisitId(av.id);
          setSelectedOutlet(av.outletId);
          setSelectedScheduleId(av.scheduleId ?? '');
          setActiveOutletName(av.outletName ?? '');
        }
      } catch { /* gagal fetch — biarkan form check-in tampil */ }
    }

    restoreActiveVisit();
    return () => { cancelled = true; };
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      setSchedulesLoading(true);
      getTodayVisitPlan(accessToken)
        .then(res => setSchedules(res.schedules))
        .catch(e => setMessage(e.message || 'Gagal memuat jadwal.'))
        .finally(() => setSchedulesLoading(false));
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    apiRequest<{ session: { status: string } | null }>('/attendance/today', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => setAttendanceOpen(res.session?.status === 'open'))
      .catch(() => setAttendanceOpen(false));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    getMobileRuntimeSettings(accessToken)
      .then((res) => setLiveFaceDetectionEnabled(res.settings.enableLiveFaceDetectionInCamera))
      .catch(() => setLiveFaceDetectionEnabled(true));
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && activeVisitId && selectedOutlet) {
      loadConsignments(selectedOutlet);
    } else {
      setConsignments([]);
    }
  }, [accessToken, activeVisitId, selectedOutlet]);

  useEffect(() => {
    showSalesAlertToast(message);
  }, [message]);

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

    let freshLocation: BrowserLocation;
    try {
      freshLocation = await getCurrentLocation({ fresh: true });
      setLocation(freshLocation);
    } catch (error: any) {
      setMessage(`Check-in gagal mengambil GPS terbaru: ${error.message ?? 'Lokasi tidak tersedia.'}`);
      setLoading(false);
      return;
    }

    const payload: VisitPayload = {
      clientRequestId: crypto.randomUUID(),
      outletId: selectedOutlet,
      scheduleId: selectedScheduleId || undefined,
      latitude: freshLocation.latitude,
      longitude: freshLocation.longitude,
      accuracyM: freshLocation.accuracyM,
      locationTimestamp: freshLocation.timestamp,
      speedMps: freshLocation.speedMps,
      heading: freshLocation.heading,
      altitude: freshLocation.altitude,
      altitudeAccuracyM: freshLocation.altitudeAccuracyM,
      isMockedLocation: freshLocation.isMocked,
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
      const outletName = selectedSchedule?.outlet.name || lookupOutlets.find(o => o.id === selectedOutlet)?.name || 'Outlet';
      setActiveOutletName(outletName);
      localStorage.setItem(activeVisitStorageKey, JSON.stringify({
        id: result.visit.id,
        outletId: result.visit.outletId,
        scheduleId: selectedScheduleId || undefined,
        outletName: outletName,
      }));
      setPreview(false);
      setImage(null);
    } catch (error: any) {
      if (!navigator.onLine || error.message === 'offline') {
        await enqueueVisit({ type: 'check-in', accessToken, payload });
        await refreshQueueCount();
        // Simpan state lokal agar halaman lain (Transaksi) tahu ada kunjungan aktif
        const outletName = selectedSchedule?.outlet.name || lookupOutlets.find(o => o.id === selectedOutlet)?.name || 'Outlet';
        const tempVisitData = { id: `offline-${payload.clientRequestId}`, outletId: payload.outletId, scheduleId: selectedScheduleId || undefined, outletName };
        localStorage.setItem(activeVisitStorageKey, JSON.stringify(tempVisitData));
        setActiveVisitId(tempVisitData.id);
        setActiveOutletName(outletName);
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

    let freshLocation: BrowserLocation;
    try {
      freshLocation = await getCurrentLocation({ fresh: true });
      setLocation(freshLocation);
    } catch (error: any) {
      setMessage(`Check-out gagal mengambil GPS terbaru: ${error.message ?? 'Lokasi tidak tersedia.'}`);
      setLoading(false);
      return;
    }

    const payload: VisitCheckOutPayload = {
      visitSessionId: activeVisitId,
      latitude: freshLocation.latitude,
      longitude: freshLocation.longitude,
      accuracyM: freshLocation.accuracyM,
      locationTimestamp: freshLocation.timestamp,
      speedMps: freshLocation.speedMps,
      heading: freshLocation.heading,
      altitude: freshLocation.altitude,
      altitudeAccuracyM: freshLocation.altitudeAccuracyM,
      isMockedLocation: freshLocation.isMocked,
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
      {!activeVisitId && attendanceOpen === false && (
        <div className="sales-step-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sales-amber-bg text-sales-amber-deep">
              <XCircle size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <strong className="text-sales-text-heading" style={{ fontSize: '.85rem' }}>Belum Absensi</strong>
              <p className="text-sales-muted" style={{ fontSize: '.75rem', marginTop: 2 }}>
                Absensi kehadiran diperlukan sebelum bisa visit outlet.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/sales/attendance')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sales-accent text-sales-surface border-none"
            style={{ marginTop: '.75rem', padding: '.7rem', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Buka Halaman Absensi
          </button>
        </div>
      )}

      {!activeVisitId && (attendanceOpen === true || attendanceOpen === null) && (
        <>
          {/* Step 1: Pilih Outlet */}
          <div className="sales-step-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
              <h2 style={{ margin: 0 }}>1. Pilih Outlet Tujuan</h2>
              <button
                type="button"
                onClick={() => setShowLookup(true)}
                className="sales-btn-secondary"
                style={{ fontSize: '.75rem', padding: '.35rem .75rem', display: 'flex', alignItems: 'center', gap: '.25rem', height: 'auto', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--sales-accent)', border: 'none', borderRadius: '.5rem', cursor: 'pointer' }}
              >
                <Search size={12} /> Cari Outlet
              </button>
            </div>
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
            {selectedOutlet && !selectedScheduleId && (
              <div style={{ marginTop: '.75rem', padding: '.75rem', borderRadius: '.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '.75rem', color: '#94a3b8', fontWeight: 600 }}>Outlet Ad-Hoc Terpilih:</p>
                <strong style={{ fontSize: '.85rem', color: 'var(--sales-foreground)' }}>
                  {lookupOutlets.find(o => o.id === selectedOutlet)?.name || 'Outlet Lain'}
                </strong>
                <button
                  type="button"
                  onClick={() => { setSelectedOutlet(''); setSelectedScheduleId(''); }}
                  style={{ marginLeft: '.5rem', background: 'none', border: 'none', color: '#ef4444', fontSize: '.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Batal
                </button>
              </div>
            )}
            {!availableSchedules.length && !selectedOutlet && (
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
              {liveFaceDetectionEnabled && <LiveFaceOverlay videoRef={videoRef} stream={stream} />}
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
                <option value="closed_order">Order Berhasil</option>
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
                      <span style={{ fontSize: '.72rem', color: '#B55925', fontWeight: 800 }}>Jatuh tempo {new Date(consignment.dueDate).toLocaleDateString('id-ID')}</span>
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
              {liveFaceDetectionEnabled && <LiveFaceOverlay videoRef={videoRef} stream={stream} />}
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

      <SalesAlert message={message} onClose={() => setMessage('')} />

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

      {/* Lookup Outlet Modal */}
      {showLookup && (
        <div className="fixed inset-x-0 top-0 bottom-16 z-[45] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'var(--sales-overlay-dark)' }} onClick={() => setShowLookup(false)}>
          <div 
            className="w-full max-w-[480px] bg-sales-surface rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden shadow-2xl" 
            style={{ boxShadow: '0 -10px 25px rgba(0,0,0,0.15), 0 20px 25px rgba(0,0,0,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--sales-border)' }}>
              <div>
                <strong style={{ fontSize: '1.05rem', color: 'var(--sales-text-heading)', fontWeight: 800 }}>Lookup Outlet</strong>
                <p style={{ margin: 0, fontSize: '.7rem', color: '#94a3b8' }}>Cari Toko, Agent, atau User</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateOutletModal(true)}
                  className="flex items-center gap-1 text-xs font-extrabold text-sales-surface bg-sales-accent px-3 py-1.5 rounded-xl border-none cursor-pointer shadow-sm"
                >
                  <Plus size={14} /> Tambah Outlet
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowLookup(false)} 
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.25rem', fontWeight: 600, cursor: 'pointer', padding: '.25rem' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Filters & Search */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--sales-border)', background: 'var(--sales-bg)' }}>
              {/* Search */}
              <div className="sales-search-box" style={{ display: 'flex', alignItems: 'center', background: 'var(--sales-surface)', borderRadius: '1rem', border: '1px solid var(--sales-border)', padding: '.35rem .75rem', marginBottom: '.75rem' }}>
                <Search size={14} style={{ color: '#94a3b8', marginRight: '.5rem' }} />
                <input 
                  type="text" 
                  placeholder="Cari nama, kode, owner, HP..." 
                  value={lookupSearch} 
                  onChange={e => setLookupSearch(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '.8rem', width: '100%', background: 'transparent', color: 'var(--sales-foreground)' }} 
                />
              </div>

              {/* Grid of filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                <div>
                  <label style={{ fontSize: '.65rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '.25rem' }}>Tipe Outlet</label>
                  <select 
                    value={lookupTypeFilter} 
                    onChange={e => setLookupTypeFilter(e.target.value as any)}
                    className="sales-select"
                    style={{ padding: '.4rem', fontSize: '.75rem', borderRadius: '.75rem', width: '100%', height: 'auto', border: '1px solid var(--sales-border)' }}
                  >
                    <option value="all">Semua Tipe</option>
                    <option value="store">Toko</option>
                    <option value="agent">Agent</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '.65rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '.25rem' }}>Urutkan</label>
                  <select 
                    value={lookupSortBy} 
                    onChange={e => setLookupSortBy(e.target.value as any)}
                    className="sales-select"
                    style={{ padding: '.4rem', fontSize: '.75rem', borderRadius: '.75rem', width: '100%', height: 'auto', border: '1px solid var(--sales-border)' }}
                  >
                    <option value="name">Nama Outlet</option>
                    <option value="phone">No. Handphone</option>
                    <option value="ownerName">Nama Owner</option>
                  </select>
                </div>
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y', padding: '.65rem 1.25rem 1.5rem' }}>
              {lookupLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 0', gap: '.5rem', color: '#94a3b8' }}>
                  <Loader2 size={24} className="animate-spin text-sales-accent" />
                  <span style={{ fontSize: '.8rem', fontWeight: 600 }}>Memuat list outlet...</span>
                </div>
              ) : sortedLookupOutlets.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {sortedLookupOutlets.map((outlet: Outlet) => {
                    const isSelected = selectedOutlet === outlet.id;
                    const typeLabel = outlet.customerType === 'agent' ? 'Agent' : outlet.customerType === 'user' ? 'User' : 'Toko';
                    const typeBg = outlet.customerType === 'agent' ? 'rgba(99, 102, 241, 0.12)' : outlet.customerType === 'user' ? 'rgba(236, 72, 153, 0.12)' : 'rgba(16, 185, 129, 0.12)';
                    const typeColor = outlet.customerType === 'agent' ? 'var(--sales-accent)' : outlet.customerType === 'user' ? '#ec4899' : '#10b981';

                    return (
                      <div 
                        key={outlet.id}
                        onClick={() => {
                          setSelectedOutlet(outlet.id);
                          setSelectedScheduleId('');
                          setShowLookup(false);
                        }}
                        style={{ 
                          padding: '.8rem .85rem', 
                          borderRadius: '1.15rem', 
                          border: isSelected ? '1.5px solid var(--sales-accent)' : '1px solid var(--sales-border)', 
                          background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'var(--sales-surface)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '.75rem',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        {/* Avatar Icon */}
                        <div style={{ 
                          width: 44, 
                          height: 44, 
                          borderRadius: '1rem', 
                          background: typeBg, 
                          color: typeColor, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0 
                        }}>
                          <Store size={22} />
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '.15rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
                            <span style={{ fontSize: '.68rem', fontWeight: 800, color: 'var(--sales-accent)', background: 'rgba(99, 102, 241, 0.1)', padding: '.12rem .4rem', borderRadius: '.4rem', letterSpacing: '.03em', textTransform: 'uppercase' }}>
                              {outlet.code}
                            </span>
                            <span style={{ fontSize: '.65rem', fontWeight: 800, color: typeColor, background: typeBg, padding: '.12rem .45rem', borderRadius: '.4rem' }}>
                              {typeLabel}
                            </span>
                          </div>

                          <strong style={{ fontSize: '.9rem', color: 'var(--sales-text-heading)', fontWeight: 800, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {outlet.name}
                          </strong>

                          <p style={{ margin: 0, fontSize: '.72rem', color: '#64748b', lineHeight: 1.2 }}>
                            Owner: <strong style={{ color: 'var(--sales-foreground)' }}>{outlet.ownerName || '—'}</strong> | HP: <strong style={{ color: 'var(--sales-foreground)' }}>{outlet.phone || '—'}</strong>
                          </p>

                          <p style={{ margin: 0, fontSize: '.68rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                            {outlet.address}
                          </p>
                        </div>

                        {isSelected && (
                          <div style={{ color: 'var(--sales-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CheckCircle2 size={22} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--sales-bg)', display: 'grid', placeItems: 'center', marginBottom: '.75rem' }}>
                    <Store size={28} style={{ opacity: 0.5 }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '.9rem', fontWeight: 800, color: 'var(--sales-text-heading)' }}>Outlet tidak ditemukan</p>
                  <p style={{ margin: '4px 0 1.25rem', fontSize: '.75rem', color: '#94a3b8' }}>Belum ada toko yang cocok dengan pencarian Anda.</p>
                  <button
                    type="button"
                    onClick={() => setShowCreateOutletModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-sales-surface bg-sales-accent px-4 py-2.5 rounded-xl border-none cursor-pointer shadow-sm hover:opacity-90 transition-all"
                  >
                    <Plus size={16} /> Buat Outlet Baru
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Outlet Form Modal */}
      {showCreateOutletModal && (
        <div 
          className="fixed inset-x-0 top-0 bottom-16 z-[50] flex items-center justify-center p-4" 
          style={{ background: 'var(--sales-overlay-dark)' }}
          onClick={() => setShowCreateOutletModal(false)}
        >
          <div 
            className="w-full max-w-md bg-sales-surface rounded-3xl p-5 flex flex-col max-h-[85vh] overflow-y-auto shadow-2xl border border-sales-accent-bg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-sales-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sales-accent-bg text-sales-accent">
                  <Plus size={18} />
                </div>
                <strong className="text-sales-text-heading text-base font-extrabold">Tambah Outlet Baru</strong>
              </div>
              <button onClick={() => setShowCreateOutletModal(false)} className="text-sales-muted bg-transparent border-none p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="block text-xs font-bold text-sales-muted mb-1">Nama Outlet / Toko *</label>
                <div className="flex items-center gap-2 rounded-xl border border-sales-border-brand bg-sales-surface-input px-3 py-2.5">
                  <Store size={18} className="text-sales-brand-muted shrink-0" />
                  <input
                    type="text"
                    placeholder="Masukkan nama outlet..."
                    value={newOutletName}
                    onChange={(e) => setNewOutletName(e.target.value)}
                    className="bg-transparent border-none text-sales-foreground outline-none w-full text-sm font-semibold"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sales-muted mb-1">Tipe Customer</label>
                <select
                  value={newOutletType}
                  onChange={(e) => setNewOutletType(e.target.value as any)}
                  className="w-full rounded-xl border border-sales-border-brand bg-sales-surface-input px-3 py-2.5 text-sm font-semibold text-sales-foreground outline-none"
                >
                  <option value="store">Toko Retail</option>
                  <option value="agent">Agent / Agen</option>
                  <option value="user">User / Pengguna</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-sales-muted mb-1">Nama Owner / Pemilik (Opsional)</label>
                <div className="flex items-center gap-2 rounded-xl border border-sales-border-brand bg-sales-surface-input px-3 py-2.5">
                  <User size={18} className="text-sales-brand-muted shrink-0" />
                  <input
                    type="text"
                    placeholder="Nama pemilik toko..."
                    value={newOutletOwner}
                    onChange={(e) => setNewOutletOwner(e.target.value)}
                    className="bg-transparent border-none text-sales-foreground outline-none w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sales-muted mb-1">Nomor Telepon / WhatsApp (Opsional)</label>
                <div className="flex items-center gap-2 rounded-xl border border-sales-border-brand bg-sales-surface-input px-3 py-2.5">
                  <Phone size={18} className="text-sales-brand-muted shrink-0" />
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={newOutletPhone}
                    onChange={(e) => setNewOutletPhone(e.target.value)}
                    className="bg-transparent border-none text-sales-foreground outline-none w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sales-muted mb-1">Alamat Lengkap *</label>
                <textarea
                  rows={3}
                  placeholder="Masukkan alamat lengkap toko..."
                  value={newOutletAddress}
                  onChange={(e) => setNewOutletAddress(e.target.value)}
                  className="w-full rounded-xl border border-sales-border-brand bg-sales-surface-input px-3 py-2 text-sm text-sales-foreground outline-none resize-none font-medium"
                />
              </div>

              <div className="rounded-xl bg-sales-accent-bg/40 p-2.5 text-xs text-sales-muted flex items-center gap-2">
                <MapPin size={16} className="text-sales-accent shrink-0" />
                <span>Lokasi GPS saat ini akan otomatis didaftarkan sebagai koordinat lokasi toko.</span>
              </div>

              <button
                disabled={!newOutletName.trim() || !newOutletAddress.trim() || createOutletSubmitting}
                onClick={handleCreateOutletSubmit}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sales-accent text-sales-surface py-3 font-bold text-sm border-none cursor-pointer disabled:opacity-50 mt-2"
              >
                {createOutletSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Simpan & Pilih Outlet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
