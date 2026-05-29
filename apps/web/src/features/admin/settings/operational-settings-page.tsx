import { useEffect, useState } from 'react';
import { Camera, CheckCircle2, MapPin, Radar, Save, ShieldCheck, SlidersHorizontal, UserCheck } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { getGeneralSettings, updateGeneralSettings, type GeneralSettings } from '@/lib/api/tenant';
import { Spinner } from '@/components/ui';

type ToggleKey =
  | 'requireFaceForAttendance'
  | 'requireFaceForVisit'
  | 'requireTransactionProofPhoto'
  | 'requireFaceIdentityMatchForVisit'
  | 'requireLivenessForVisit'
  | 'rejectVisitOnFaceMismatch';

const toggles: Array<{ key: ToggleKey; title: string; description: string; icon: typeof Camera }> = [
  { key: 'requireTransactionProofPhoto', title: 'Bukti foto transaksi wajib', description: 'Admin hanya bisa approve transaksi setelah nota/foto bukti diunggah.', icon: Camera },
  { key: 'requireFaceForVisit', title: 'Foto wajah saat visit', description: 'Sales wajib mengambil foto wajah saat check-in dan check-out outlet.', icon: UserCheck },
  { key: 'requireFaceIdentityMatchForVisit', title: 'Cocokkan identitas wajah', description: 'Aktifkan setelah template wajah dan provider verifikasi siap digunakan.', icon: ShieldCheck },
  { key: 'rejectVisitOnFaceMismatch', title: 'Tolak jika wajah tidak cocok', description: 'Visit langsung ditolak ketika hasil verifikasi menyatakan tidak cocok.', icon: Radar },
  { key: 'requireLivenessForVisit', title: 'Liveness detection', description: 'Provider face verification harus mengembalikan status liveness yang valid.', icon: CheckCircle2 },
  { key: 'requireFaceForAttendance', title: 'Foto wajah absensi', description: 'Absensi tetap wajib membawa bukti wajah sales.', icon: UserCheck },
];

export function OperationalSettingsPage() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    getGeneralSettings(accessToken)
      .then((data) => setSettings(data.settings))
      .catch((e: any) => setError(e.message ?? 'Gagal memuat pengaturan.'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  function patch<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) {
    setSettings((current) => current ? { ...current, [key]: value } : current);
  }

  async function handleSave() {
    if (!accessToken || !settings) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await updateGeneralSettings(accessToken, settings);
      setSettings(result.settings);
      setMessage('Pengaturan operasional tersimpan.');
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="admin-loading"><Spinner /> Memuat pengaturan...</div>;
  }

  if (!settings) {
    return <div className="admin-card">Pengaturan tidak tersedia.</div>;
  }

  return (
    <main className="settings-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[22px] p-5" style={{ background: 'linear-gradient(135deg, #40231E, #4A2922)', color: '#ffffff', boxShadow: '0 18px 40px rgba(64, 35, 30, .18)' }}>
        <div>
          <p className="inline-flex items-center gap-1.5 m-0 text-[0.78rem] font-extrabold uppercase tracking-[0.08em]" style={{ color: '#d8b6aa' }}>
            <SlidersHorizontal size={15} /> Operational Rules
          </p>
          <h1 className="my-1 text-[1.55rem] leading-[1.15]">Pengaturan Operasional</h1>
          <p className="m-0 max-w-[720px]" style={{ color: '#ead7d0' }}>Atur validasi visit, radius outlet, GPS, bukti transaksi, dan face verification untuk company ini.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-[#B55925] hover:bg-[#c4632e] text-white border-none rounded-xl px-4 py-2.5 font-semibold cursor-pointer text-sm w-full sm:w-auto shrink-0 inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors" type="button">
          {saving ? <Spinner size={16} /> : <Save size={16} />} Simpan
        </button>
      </div>

      {message && <div className="platform-alert platform-alert-success">{message}</div>}
      {error && <div className="platform-alert platform-alert-error">{error}</div>}

      <section className="settings-metrics">
        <label className="settings-number-card">
          <span><MapPin size={18} /> Radius outlet default</span>
          <input
            type="number"
            min={1}
            value={settings.defaultGeofenceRadiusM}
            onChange={(e) => patch('defaultGeofenceRadiusM', Number(e.target.value))}
          />
          <small>Meter, digunakan bila outlet tidak punya radius khusus.</small>
        </label>
        <label className="settings-number-card">
          <span><Radar size={18} /> Maksimum akurasi GPS</span>
          <input
            type="number"
            min={1}
            value={settings.maxGpsAccuracyM}
            onChange={(e) => patch('maxGpsAccuracyM', Number(e.target.value))}
          />
          <small>GPS di atas nilai ini akan masuk manual review.</small>
        </label>
        <label className="settings-number-card">
          <span><ShieldCheck size={18} /> Threshold face match</span>
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={settings.faceMatchThreshold}
            onChange={(e) => patch('faceMatchThreshold', Number(e.target.value))}
          />
          <small>Nilai 0 sampai 1 untuk provider face verification.</small>
        </label>
      </section>

      <section className="settings-toggle-grid">
        {toggles.map((item) => {
          const Icon = item.icon;
          const active = Boolean(settings[item.key]);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => patch(item.key, !active)}
              className={`settings-toggle-card ${active ? 'active' : ''}`}
            >
              <span className="settings-toggle-icon"><Icon size={19} /></span>
              <span className="settings-toggle-copy">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <span className="settings-switch" aria-hidden="true"><span /></span>
            </button>
          );
        })}
      </section>
    </main>
  );
}
