import { useEffect, useMemo, useState } from 'react';
import { Camera, RefreshCw, MapPin, ShieldCheck, AlertTriangle, Search, X } from 'lucide-react';

import { getAttendanceReview, type AttendanceReviewItem } from '../../../lib/api/client';
import { useAuth } from '../../auth/auth-provider';

export function AttendanceReviewPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<AttendanceReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !`${row.salesName} ${row.salesEmail ?? ''} ${row.workDate}`.toLowerCase().includes(q)) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      return true;
    });
  }, [rows, search, statusFilter]);

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

      <section className="mt-5 rounded-[1.5rem] border border-admin-border bg-admin-bg-card p-5 shadow-sm">
        <div className="admin-filter-row">
          <div className="admin-search-box">
            <Search size={15} />
            <input
              placeholder="Cari nama sales, email, atau tanggal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button className="admin-search-clear" type="button" onClick={() => setSearch('')} title="Bersihkan pencarian">
                <X size={14} />
              </button>
            ) : null}
          </div>
          <select className="admin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Semua status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="flagged">Flagged</option>
          </select>
          <span className="admin-count-badge">{filteredRows.length} absensi</span>
        </div>

        {loading && !rows.length ? (
          <div className="admin-loading">
            <RefreshCw size={18} className="spin" />
            <span>Memuat data absensi...</span>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRows.map((row) => (
              <article key={row.id} className="grid gap-6 rounded-[2rem] border border-admin-border-subtle bg-admin-bg-card p-6 shadow-sm hover:shadow-md transition-shadow md:grid-cols-[180px_1fr]">
                <div className="aspect-square overflow-hidden rounded-[1.5rem] bg-admin-bg border border-admin-border-subtle shadow-inner">
                  {row.faceImageUrl ? (
                    <img src={row.faceImageUrl} alt={row.salesName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-admin-border">
                      <Camera size={40} />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black text-admin-foreground tracking-tight">{row.salesName}</h2>
                      <p className="text-admin-muted font-semibold text-sm">
                        {row.salesEmail ?? 'Tanpa email'} · <span className="text-admin-subtle">{row.workDate}</span>
                      </p>
                    </div>
                    <span className="rounded-xl bg-admin-accent-shadow px-3 py-1 text-xs font-black text-admin-accent border border-admin-border uppercase tracking-wider">
                      {row.validationStatus}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Metric icon={ShieldCheck} label="Status Absensi" value={row.status} />
                    <Metric icon={Camera} label="Deteksi Wajah" value={row.faceDetected ? `Terdeteksi (${Math.round(Number(row.faceConfidence ?? 0) * 100)}%)` : 'Tidak Terdeteksi'} />
                    <Metric icon={MapPin} label="Akurasi GPS" value={`${row.checkInAccuracyM ?? '-'}m · ${row.checkInDistanceM ?? '-'}m`} />
                  </div>

                  <div className="flex items-center gap-6 text-xs text-admin-muted font-bold pt-3 border-t border-admin-border-subtle">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-admin-success"></span>
                      <span>Check-in: <strong className="text-admin-foreground">{row.checkInAt ?? '-'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-admin-border"></span>
                      <span>Check-out: <strong className="text-admin-foreground">{row.checkOutAt ?? '-'}</strong></span>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {!filteredRows.length && (
              <div className="text-center py-24 bg-admin-bg-card rounded-[2.5rem] border-2 border-dashed border-admin-border-subtle text-admin-subtle">
                <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold text-lg">Belum ada data absensi</p>
                <p className="text-sm">Semua data absensi untuk hari ini sudah direview atau belum ada masuk.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-admin-bg/50 border border-admin-border-subtle p-4 transition-colors hover:bg-admin-bg-card hover:border-admin-border">
      <div className="flex items-center gap-2 mb-2 text-admin-accent">
        <Icon size={14} strokeWidth={3} />
        <span className="text-[10px] uppercase font-black tracking-widest text-admin-subtle">{label}</span>
      </div>
      <p className="font-bold text-admin-foreground leading-tight">{value}</p>
    </div>
  );
}