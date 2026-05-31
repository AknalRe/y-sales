import { useEffect, useState } from 'react';
import { Camera, CheckCircle2, MapPin, Radar, Save, ShieldCheck, SlidersHorizontal, UserCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { getGeneralSettings, updateGeneralSettings, type GeneralSettings } from '@/lib/api/tenant';
import { Spinner } from '@/components/ui';

type ToggleKey =
  | 'requireFaceForAttendance'
  | 'allowMultipleAttendanceSessionsPerDay'
  | 'requireFaceForVisit'
  | 'requireTransactionProofPhoto'
  | 'requireFaceIdentityMatchForVisit'
  | 'requireLivenessForVisit'
  | 'rejectVisitOnFaceMismatch';

const toggles: Array<{ key: ToggleKey; title: string; description: string; icon: typeof Camera }> = [
  { key: 'allowMultipleAttendanceSessionsPerDay', title: 'Absensi lebih dari sekali sehari', description: 'Sales boleh memulai sesi absensi baru setelah sesi sebelumnya check-out.', icon: CheckCircle2 },
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
    <main className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <SlidersHorizontal size={24} />
            Pengaturan Operasional
          </h1>
          <p className="admin-page-subtitle">Atur validasi visit, radius outlet, GPS, bukti transaksi, dan face verification untuk company ini.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="admin-btn-primary" type="button">
          {saving ? <Spinner size={16} /> : <Save size={16} />} Simpan
        </button>
      </div>

      {message && (
        <div className="admin-alert admin-alert-success">
          <CheckCircle2 size={15} /> {message}
        </div>
      )}
      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

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
