import { Camera, Cloud, Loader2, MapPin, ShieldAlert, Video, WifiOff, CheckCircle2 } from 'lucide-react';
import type { AttendanceState } from './attendance-page';

export function AttendancePageAdmin(props: AttendanceState) {
    const { videoRef, stream, image, location, loading, syncing, message, queueCount, online,
        handleStartCamera, handleCapture, handleLocation, handleCheckIn, handleSyncQueue } = props;

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-slate-900">
            <section className="mx-auto w-full max-w-5xl space-y-6">
                <div className="rounded-3xl border border-[rgba(74,41,34,.14)] bg-white p-6 shadow-xl shadow-[rgba(64,35,30,.08)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.35em] text-[#966556]">Attendance</p>
                            <h1 className="mt-2 text-4xl font-black">Absensi Wajah + GPS</h1>
                            <p className="mt-3 max-w-2xl text-slate-600">
                                Gunakan kamera depan untuk foto wajah, ambil lokasi GPS akurat, lalu sistem akan memvalidasi radius/geofence.
                            </p>
                        </div>
                        <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {online ? <Cloud size={18} /> : <WifiOff size={18} />}
                            {online ? 'Online' : 'Offline'} · Queue {queueCount}
                        </div>
                    </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
                    <section className="rounded-[2rem] border border-[rgba(74,41,34,.14)] bg-white p-5 shadow-xl shadow-[rgba(64,35,30,.08)]">
                        <video ref={videoRef} className="aspect-video w-full rounded-3xl bg-black object-cover" playsInline muted />
                        {image && <img src={image.dataUrl} alt="Captured face" className="mt-4 aspect-video w-full rounded-3xl object-cover" />}
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <button onClick={handleStartCamera} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50"><Video size={18} /> Buka Kamera</button>
                            <button onClick={handleCapture} disabled={!stream} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B55925] px-4 py-3 font-bold text-white transition hover:bg-[#cf6f2e] disabled:opacity-60"><Camera size={18} /> Ambil Foto</button>
                        </div>
                    </section>

                    <aside className="space-y-4">
                        <StatusCard icon={Camera} title="Foto Wajah" ok={!!image} text={image ? 'Foto wajah sudah diambil. Face detection MVP aktif.' : 'Wajib ambil foto kamera depan.'} />
                        <StatusCard icon={MapPin} title="Lokasi GPS" ok={!!location} text={location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} ±${Math.round(location.accuracyM ?? 0)}m` : 'Ambil lokasi GPS akurat.'} />
                        <button onClick={handleLocation} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50">Ambil Lokasi</button>
                        <button onClick={handleCheckIn} disabled={!image || !location || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B55925] px-4 py-3 font-bold text-white transition hover:bg-[#cf6f2e] disabled:opacity-60">
                            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                            Check-in Sekarang
                        </button>
                        <button onClick={handleSyncQueue} disabled={syncing || !online} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                            {syncing ? <Loader2 className="animate-spin" /> : <Cloud />}
                            Sync Queue Offline
                        </button>
                        {message && <p className="rounded-2xl border border-[rgba(74,41,34,.14)] bg-white p-4 text-sm text-slate-700">{message}</p>}
                    </aside>
                </div>
            </section>
        </main>
    );
}

function StatusCard({ icon: Icon, title, text, ok }: { icon: typeof ShieldAlert; title: string; text: string; ok: boolean }) {
    return (
        <article className="rounded-3xl border border-[rgba(74,41,34,.14)] bg-white p-5 shadow-xl shadow-[rgba(64,35,30,.08)]">
            <Icon className={ok ? 'text-emerald-600' : 'text-[#B55925]'} />
            <h2 className="mt-3 text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
        </article>
    );
}