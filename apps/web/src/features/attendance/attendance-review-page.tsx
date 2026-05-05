import { useEffect, useState } from 'react';
import { Camera, Loader2, MapPin, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';

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
    <main className="min-h-screen px-5 py-8 text-slate-900">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between items-start rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-teal-600">Supervisor Review</p>
            <h1 className="mt-2 text-4xl font-black text-slate-900">Review Absensi Sales</h1>
            <p className="mt-3 text-slate-500">Validasi foto wajah, status geofence, akurasi GPS, dan jam check-in/check-out.</p>
          </div>
          <button onClick={load} className="admin-btn-ghost" type="button"><RefreshCw size={15} /></button>
        </div>

        {loading && <div className="flex items-center gap-3 rounded-3xl bg-slate-100 p-5 text-slate-600"><RefreshCw className="animate-spin" /> Memuat data...</div>}
        {error && <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-600">{error}</div>}

        <div className="grid gap-4">
          {rows.map((row) => (
            <article key={row.id} className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40 md:grid-cols-[160px_1fr]">
              <div className="aspect-square overflow-hidden rounded-3xl bg-slate-100 border border-slate-200">
                {row.faceImageUrl ? <img src={row.faceImageUrl} alt={row.salesName} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-300"><Camera size={32} /></div>}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{row.salesName}</h2>
                    <p className="text-slate-500 font-medium">{row.salesEmail ?? 'Tanpa email'} · {row.workDate}</p>
                  </div>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal-600 border border-teal-100">{row.validationStatus}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric icon={ShieldCheck} label="Status" value={row.status} />
                  <Metric icon={Camera} label="Face" value={row.faceDetected ? `Detected ${row.faceConfidence ?? ''}` : 'Not detected'} />
                  <Metric icon={MapPin} label="GPS" value={`${row.checkInAccuracyM ?? '-'}m · ${row.checkInDistanceM ?? '-'}m`} />
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 font-semibold pt-2 border-top border-slate-50">
                   <span>Check-in: <strong className="text-slate-900">{row.checkInAt ?? '-'}</strong></span>
                   <span>Check-out: <strong className="text-slate-900">{row.checkOutAt ?? '-'}</strong></span>
                </div>
              </div>
            </article>
          ))}
          {!loading && !rows.length && (
             <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 font-bold">
               Belum ada data absensi untuk direview.
             </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
      <div className="flex items-center gap-2 mb-2 text-teal-600">
        <Icon size={16} />
        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{label}</span>
      </div>
      <p className="font-black text-slate-900">{value}</p>
    </div>
  );
}





