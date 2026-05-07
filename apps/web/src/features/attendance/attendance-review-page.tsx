import { useEffect, useState } from 'react';
import { Camera, RefreshCw, MapPin, ShieldCheck, AlertTriangle } from 'lucide-react';

import { getAttendanceReview, type AttendanceReviewItem } from '../../lib/api/client';
import { useAuth } from '../auth/auth-provider';

export function AttendanceReviewPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<AttendanceReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const result = await getAttendanceReview(accessToken);
      setRows(result.attendance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat review absensi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [accessToken]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <ShieldCheck size={24} />
            Review Absensi Sales
          </h1>
          <p className="admin-page-subtitle">Validasi foto wajah, status geofence, dan jam check-in/out tim Anda.</p>
        </div>
        <button onClick={load} className="admin-btn-ghost" type="button">
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {loading && !rows.length ? (
        <div className="admin-loading">
          <RefreshCw size={18} className="spin" />
          <span>Memuat data absensi...</span>
        </div>
      ) : (
        <div className="grid gap-4 mt-6">
          {rows.map((row) => (
            <article key={row.id} className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow md:grid-cols-[180px_1fr]">
              <div className="aspect-square overflow-hidden rounded-[1.5rem] bg-slate-100 border border-slate-100 shadow-inner">
                {row.faceImageUrl ? (
                  <img src={row.faceImageUrl} alt={row.salesName} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-slate-300">
                    <Camera size={40} />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{row.salesName}</h2>
                    <p className="text-slate-500 font-semibold text-sm">
                      {row.salesEmail ?? 'Tanpa email'} · <span className="text-slate-400">{row.workDate}</span>
                    </p>
                  </div>
                  <span className="rounded-xl bg-orange-50 px-3 py-1 text-xs font-black text-orange-600 border border-orange-100 uppercase tracking-wider">
                    {row.validationStatus}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric icon={ShieldCheck} label="Status Absensi" value={row.status} />
                  <Metric icon={Camera} label="Deteksi Wajah" value={row.faceDetected ? `Terdeteksi (${Math.round(Number(row.faceConfidence ?? 0) * 100)}%)` : 'Tidak Terdeteksi'} />
                  <Metric icon={MapPin} label="Akurasi GPS" value={`${row.checkInAccuracyM ?? '-'}m · ${row.checkInDistanceM ?? '-'}m`} />
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-500 font-bold pt-3 border-t border-slate-100">
                   <div className="flex items-center gap-2">
                     <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                     <span>Check-in: <strong className="text-slate-900">{row.checkInAt ?? '-'}</strong></span>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                     <span>Check-out: <strong className="text-slate-900">{row.checkOutAt ?? '-'}</strong></span>
                   </div>
                </div>
              </div>
            </article>
          ))}

          {!rows.length && (
             <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400">
               <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
               <p className="font-bold text-lg">Belum ada data absensi</p>
               <p className="text-sm">Semua data absensi untuk hari ini sudah direview atau belum ada masuk.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50/50 border border-slate-100 p-4 transition-colors hover:bg-white hover:border-orange-100">
      <div className="flex items-center gap-2 mb-2 text-orange-600">
        <Icon size={14} strokeWidth={3} />
        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{label}</span>
      </div>
      <p className="font-bold text-slate-900 leading-tight">{value}</p>
    </div>
  );
}
