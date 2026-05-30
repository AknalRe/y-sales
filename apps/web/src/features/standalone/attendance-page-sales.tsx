import { Camera, Cloud, Loader2, MapPin, ShieldAlert, Video, WifiOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AttendanceState } from './attendance-page';

export function AttendancePageSales(props: AttendanceState) {
    const navigate = useNavigate();
    const { videoRef, stream, image, location, loading, syncing, message, queueCount, online,
        handleStartCamera, handleCapture, handleLocation, handleCheckIn, handleSyncQueue } = props;

    return (
        <div className="flex min-h-screen justify-center bg-gray-50 text-slate-900">
            <div className="mobile-shell relative flex flex-col overflow-hidden p-4 space-y-6">
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-100/70">
                    <ArrowLeft size={18} /> Kembali
                </button>
                <div className="rounded-3xl border border-[rgba(74,41,34,.14)] bg-white p-5 shadow-xl shadow-[rgba(64,35,30,.08)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#966556]">Attendance</p>
                            <h1 className="mt-1 text-2xl font-black">Absensi Wajah + GPS</h1>
                            <p className="mt-2 text-sm text-slate-600">
                                Foto wajah + lokasi GPS, validasi radius/geofence otomatis.
                            </p>
                        </div>
                        <div className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {online ? <Cloud size={14} /> : <WifiOff size={14} />}
                            {online ? 'Online' : 'Offline'} · Queue {queueCount}
                        </div>
                    </div>
                </div>

                <section className="rounded-2xl border border-[rgba(74,41,34,.14)] bg-white p-4 shadow-lg shadow-[rgba(64,35,30,.08)]">
                    <video ref={videoRef} className="aspect-video w-full rounded-xl bg-black object-cover" playsInline muted />
                    {image && <img src={image.dataUrl} alt="Captured face" className="mt-3 aspect-video w-full rounded-xl object-cover" />}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button onClick={handleStartCamera} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><Video size={16} /> Kamera</button>
                        <button onClick={handleCapture} disabled={!stream} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#B55925] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-[#cf6f2e] disabled:opacity-60"><Camera size={16} /> Foto</button>
                    </div>
                </section>

                <aside className="space-y-3">
                    <StatusCard icon={Camera} title="Foto Wajah" ok={!!image} text={image ? 'Foto wajah sudah diambil.' : 'Wajib ambil foto kamera depan.'} />
                    <StatusCard icon={MapPin} title="Lokasi GPS" ok={!!location} text={location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} ±${Math.round(location.accuracyM ?? 0)}m` : 'Ambil lokasi GPS akurat.'} />
                    <button onClick={handleLocation} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Ambil Lokasi</button>
                    <button onClick={handleCheckIn} disabled={!image || !location || loading} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#B55925] px-3 py-3 text-sm font-bold text-white transition hover:bg-[#cf6f2e] disabled:opacity-60">
                        {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                        Check-in Sekarang
                    </button>
                    <button onClick={handleSyncQueue} disabled={syncing || !online} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                        {syncing ? <Loader2 className="animate-spin" /> : <Cloud />}
                        Sync Queue Offline
                    </button>
                    {message && <p className="rounded-xl border border-[rgba(74,41,34,.14)] bg-white p-3 text-sm text-slate-700">{message}</p>}
                </aside>
            </div>
        </div>
    );
}

function StatusCard({ icon: Icon, title, text, ok }: { icon: typeof ShieldAlert; title: string; text: string; ok: boolean }) {
    return (
        <article className="rounded-xl border border-[rgba(74,41,34,.14)] bg-white p-4 shadow-lg shadow-[rgba(64,35,30,.08)]">
            <div className="flex items-center gap-2">
                <Icon size={16} className={ok ? 'text-emerald-600' : 'text-[#B55925]'} />
                <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
        </article>
    );
}