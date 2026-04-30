import { useEffect, useState } from 'react';
import { Camera, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { getAttendanceReview, type AttendanceReviewItem } from '../../lib/api/client';
import { useAuth } from '../auth/auth-provider';

export function AttendanceReviewPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<AttendanceReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!accessToken) return;
      try {
        const result = await getAttendanceReview(accessToken);
        setRows(result.attendance);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat review absensi');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [accessToken]);

  return (
    <main className="min-h-screen px-5 py-8 text-slate-100">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-teal-200">Supervisor Review</p>
          <h1 className="mt-2 text-4xl font-black">Review Absensi Sales</h1>
          <p className="mt-3 text-slate-300">Validasi foto wajah, status geofence, akurasi GPS, dan jam check-in/check-out.</p>
        </div>

        {loading && <div className="flex items-center gap-3 rounded-3xl bg-white/10 p-5"><Loader2 className="animate-spin" /> Memuat data...</div>}
        {error && <div className="rounded-3xl border border-red-300/30 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <div className="grid gap-4">
          {rows.map((row) => (
            <article key={row.id} className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 backdrop-blur-xl md:grid-cols-[160px_1fr]">
              <div className="aspect-square overflow-hidden rounded-3xl bg-black/40">
                {row.faceImageUrl ? <img src={row.faceImageUrl} alt={row.salesName} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-500"><Camera /></div>}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">{row.salesName}</h2>
                    <p className="text-slate-400">{row.salesEmail ?? 'Tanpa email'} · {row.workDate}</p>
                  </div>
                  <span className="rounded-full bg-teal-400/15 px-3 py-1 text-sm font-bold text-teal-100">{row.validationStatus}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric icon={ShieldCheck} label="Status" value={row.status} />
                  <Metric icon={Camera} label="Face" value={row.faceDetected ? `Detected ${row.faceConfidence ?? ''}` : 'Not detected'} />
                  <Metric icon={MapPin} label="GPS" value={`${row.checkInAccuracyM ?? '-'}m · ${row.checkInDistanceM ?? '-'}m`} />
                </div>
                <p className="text-sm text-slate-400">Check-in: {row.checkInAt ?? '-'} · Check-out: {row.checkOutAt ?? '-'}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Camera; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <Icon className="mb-2 text-teal-300" size={18} />
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-100">{value}</p>
    </div>
  );
}



