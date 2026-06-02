import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  Cloud,
  Gauge,
  KeyRound,
  MapPin,
  Navigation,
  Radar,
  ReceiptText,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import {
  createCompanyIntegration,
  getCompanyIntegrations,
  getCompanyProfile,
  getGeneralSettings,
  updateCompanyIntegration,
  updateCompanyProfile,
  updateGeneralSettings,
  type CompanyIntegration,
  type CompanyProfile,
  type GeneralSettings,
} from '@/lib/api/tenant';
import { Spinner } from '@/components/ui';
import { OutletMapPicker } from '../outlets/outlet-map-picker';

type ToggleKey =
  | 'requireFaceForAttendance'
  | 'allowMultipleAttendanceSessionsPerDay'
  | 'requireAttendanceAtOffice'
  | 'requireFaceIdentityMatchForAttendance'
  | 'requireFaceForVisit'
  | 'enableLiveFaceDetectionInCamera'
  | 'requireTransactionProofPhoto'
  | 'requireFaceIdentityMatchForVisit'
  | 'requireLivenessForVisit'
  | 'rejectVisitOnFaceMismatch';

type MetricKey = 'defaultGeofenceRadiusM' | 'maxGpsAccuracyM' | 'faceMatchThreshold';
type SectionKey = 'company' | 'visit' | 'attendance' | 'transaction' | 'face' | 'storage';

type MetricItem = {
  key: MetricKey;
  title: string;
  description: string;
  suffix: string;
  min: number;
  max?: number;
  step?: number;
  icon: LucideIcon;
};

type ToggleItem = {
  key: ToggleKey;
  title: string;
  description: string;
  icon: LucideIcon;
};

type SettingsSection = {
  key: SectionKey;
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  metrics?: MetricItem[];
  toggles?: ToggleItem[];
};

type StorageForm = {
  id?: string;
  provider: 'cloudflare_r2' | 's3';
  name: string;
  status: 'active' | 'inactive';
  bucket: string;
  region: string;
  endpoint: string;
  publicBaseUrl: string;
  signedUrlExpiresSeconds: number;
  accessKeyId: string;
  secretAccessKey: string;
  description: string;
};

const defaultStorageForm: StorageForm = {
  provider: 'cloudflare_r2',
  name: 'Cloudflare R2 Storage',
  status: 'inactive',
  bucket: '',
  region: 'auto',
  endpoint: '',
  publicBaseUrl: '',
  signedUrlExpiresSeconds: 900,
  accessKeyId: '',
  secretAccessKey: '',
  description: '',
};

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' ? value : fallback;
}

function storageToForm(integration?: CompanyIntegration): StorageForm {
  if (!integration) return defaultStorageForm;
  const config = integration.config ?? {};
  return {
    id: integration.id,
    provider: integration.provider === 's3' ? 's3' : 'cloudflare_r2',
    name: integration.name,
    status: integration.status,
    bucket: readString(config.bucket),
    region: readString(config.region, 'auto'),
    endpoint: readString(config.endpoint),
    publicBaseUrl: readString(config.publicBaseUrl),
    signedUrlExpiresSeconds: readNumber(config.signedUrlExpiresSeconds, 900),
    accessKeyId: '',
    secretAccessKey: '',
    description: integration.description ?? '',
  };
}

const sections: SettingsSection[] = [
  {
    key: 'company',
    title: 'Data Perusahaan',
    eyebrow: 'Profil bisnis',
    description: 'Nama, alamat, koordinat kantor, dan zona waktu utama company.',
    icon: Store,
  },
  {
    key: 'visit',
    title: 'Visit, Absensi & Radius',
    eyebrow: 'Kunjungan sales',
    description: 'Mengatur validasi lokasi untuk visit outlet dan fallback radius absensi berbasis kantor/outlet.',
    icon: Navigation,
    metrics: [
      {
        key: 'defaultGeofenceRadiusM',
        title: 'Radius outlet default',
        description: 'Dipakai ketika outlet belum punya radius khusus.',
        suffix: 'meter',
        min: 1,
        icon: MapPin,
      },
      {
        key: 'maxGpsAccuracyM',
        title: 'Maksimum akurasi GPS',
        description: 'GPS di atas nilai ini masuk manual review.',
        suffix: 'meter',
        min: 1,
        icon: Gauge,
      },
    ],
    toggles: [
      {
        key: 'requireFaceForVisit',
        title: 'Foto wajah saat visit',
        description: 'Sales wajib mengambil foto wajah saat check-in dan check-out outlet.',
        icon: UserCheck,
      },
    ],
  },
  {
    key: 'attendance',
    title: 'Aturan Absensi Sales',
    eyebrow: 'Kehadiran harian',
    description: 'Membatasi sesi absensi harian, bukti wajah, dan apakah absensi harus dilakukan di titik kantor.',
    icon: Clock3,
    toggles: [
      {
        key: 'allowMultipleAttendanceSessionsPerDay',
        title: 'Absensi lebih dari sekali sehari',
        description: 'Sales boleh memulai sesi absensi baru setelah sesi sebelumnya check-out.',
        icon: CheckCircle2,
      },
      {
        key: 'requireAttendanceAtOffice',
        title: 'Absensi wajib di kantor',
        description: 'Check-in absensi kerja harus berada dalam radius titik kantor perusahaan yang diatur di Data Perusahaan.',
        icon: MapPin,
      },
      {
        key: 'requireFaceForAttendance',
        title: 'Foto wajah absensi',
        description: 'Absensi tetap wajib membawa bukti wajah.',
        icon: UserCheck,
      },
      {
        key: 'requireFaceIdentityMatchForAttendance',
        title: 'Cocokkan identitas absensi',
        description: 'Absensi memanggil face provider untuk memastikan wajah cocok dengan template user.',
        icon: ShieldCheck,
      },
    ],
  },
  {
    key: 'transaction',
    title: 'Transaksi Outlet',
    eyebrow: 'Order dan nota',
    description: 'Mengatur bukti transaksi sales sebelum transaksi masuk proses approval.',
    icon: ReceiptText,
    toggles: [
      {
        key: 'requireTransactionProofPhoto',
        title: 'Bukti foto transaksi wajib',
        description: 'Admin hanya bisa approve transaksi setelah nota atau foto bukti diunggah.',
        icon: Camera,
      },
    ],
  },
  {
    key: 'face',
    title: 'Face Verification',
    eyebrow: 'Identitas sales',
    description: 'Mengatur pencocokan wajah, liveness, dan aksi otomatis ketika wajah tidak cocok.',
    icon: ShieldCheck,
    metrics: [
      {
        key: 'faceMatchThreshold',
        title: 'Threshold face match',
        description: 'Nilai 0 sampai 1 untuk provider face verification.',
        suffix: 'score',
        min: 0,
        max: 1,
        step: 0.01,
        icon: ShieldCheck,
      },
    ],
    toggles: [
      {
        key: 'enableLiveFaceDetectionInCamera',
        title: 'Live detector di kamera sales',
        description: 'Menampilkan kotak wajah secara langsung di preview kamera mobile sebelum foto dikirim.',
        icon: Camera,
      },
      {
        key: 'requireFaceIdentityMatchForVisit',
        title: 'Cocokkan identitas wajah',
        description: 'Aktifkan setelah template wajah dan provider verifikasi siap digunakan.',
        icon: ShieldCheck,
      },
      {
        key: 'requireLivenessForVisit',
        title: 'Liveness detection',
        description: 'Provider face verification harus mengembalikan status liveness yang valid.',
        icon: CheckCircle2,
      },
      {
        key: 'rejectVisitOnFaceMismatch',
        title: 'Tolak jika wajah tidak cocok',
        description: 'Visit langsung ditolak ketika hasil verifikasi menyatakan tidak cocok.',
        icon: Radar,
      },
    ],
  },
  {
    key: 'storage',
    title: 'Cloud Storage',
    eyebrow: 'File dan foto',
    description: 'Konfigurasi object storage untuk foto nota, bukti visit, produk, dan dokumen.',
    icon: Cloud,
  },
];

export function OperationalSettingsPage() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [storageForm, setStorageForm] = useState<StorageForm>(defaultStorageForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<SectionKey>('company');

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    Promise.all([
      getGeneralSettings(accessToken),
      getCompanyProfile(accessToken),
      getCompanyIntegrations(accessToken, 'storage'),
    ])
      .then(([settingsData, companyData, storageData]) => {
        setSettings(settingsData.settings);
        setCompany(companyData.company);
        setStorageForm(storageToForm(storageData.integrations[0]));
      })
      .catch((e: any) => setError(e.message ?? 'Gagal memuat pengaturan.'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  function patch<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) {
    setSettings((current) => current ? { ...current, [key]: value } : current);
  }

  function patchFaceIntegration<K extends keyof GeneralSettings['faceIntegration']>(key: K, value: GeneralSettings['faceIntegration'][K]) {
    setSettings((current) => current ? {
      ...current,
      faceIntegration: {
        ...current.faceIntegration,
        [key]: value,
      },
    } : current);
  }

  function patchCompany<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    setCompany((current) => current ? { ...current, [key]: value } : current);
  }

  function patchStorage<K extends keyof StorageForm>(key: K, value: StorageForm[K]) {
    setStorageForm((current) => ({ ...current, [key]: value }));
  }

  const activeSettingsSection = useMemo(
    () => sections.find((section) => section.key === activeSection) ?? sections[0],
    [activeSection],
  );

  async function handleSave() {
    if (!accessToken || !settings) return;
    setSaving(true);
    setMessage('');
    setError('');
    const shouldPersistStorage = Boolean(
      storageForm.id ||
      storageForm.status === 'active' ||
      storageForm.bucket ||
      storageForm.endpoint ||
      storageForm.publicBaseUrl ||
      storageForm.accessKeyId ||
      storageForm.secretAccessKey,
    );
    try {
      const [settingsResult, companyResult, storageResult] = await Promise.all([
        updateGeneralSettings(accessToken, settings),
        company ? updateCompanyProfile(accessToken, {
          name: company.name,
          code: company.code || null,
          legalName: company.legalName || null,
          email: company.email || null,
          phone: company.phone || null,
          address: company.address || null,
          city: company.city || null,
          province: company.province || null,
          postalCode: company.postalCode || null,
          country: company.country || null,
          latitude: company.latitude ? Number(company.latitude) : undefined,
          longitude: company.longitude ? Number(company.longitude) : undefined,
          logoUrl: company.logoUrl || null,
          coverPhotoUrl: company.coverPhotoUrl || null,
          taxNumber: company.taxNumber || null,
          websiteUrl: company.websiteUrl || null,
          timezone: company.timezone,
        }) : Promise.resolve(null),
        shouldPersistStorage && storageForm.id
          ? updateCompanyIntegration(accessToken, storageForm.id, {
            provider: storageForm.provider,
            name: storageForm.name,
            status: storageForm.status,
            config: {
              bucket: storageForm.bucket,
              region: storageForm.region,
              endpoint: storageForm.endpoint,
              publicBaseUrl: storageForm.publicBaseUrl,
              signedUrlExpiresSeconds: storageForm.signedUrlExpiresSeconds,
            },
            ...(storageForm.accessKeyId || storageForm.secretAccessKey ? {
              secretConfig: {
                ...(storageForm.accessKeyId ? { accessKeyId: storageForm.accessKeyId } : {}),
                ...(storageForm.secretAccessKey ? { secretAccessKey: storageForm.secretAccessKey } : {}),
              },
            } : {}),
            description: storageForm.description,
          })
          : shouldPersistStorage ? createCompanyIntegration(accessToken, {
            type: 'storage',
            provider: storageForm.provider,
            name: storageForm.name,
            status: storageForm.status,
            config: {
              bucket: storageForm.bucket,
              region: storageForm.region,
              endpoint: storageForm.endpoint,
              publicBaseUrl: storageForm.publicBaseUrl,
              signedUrlExpiresSeconds: storageForm.signedUrlExpiresSeconds,
            },
            secretConfig: {
              accessKeyId: storageForm.accessKeyId,
              secretAccessKey: storageForm.secretAccessKey,
            },
            description: storageForm.description,
          }) : Promise.resolve(null),
      ]);
      setSettings(settingsResult.settings);
      if (companyResult) setCompany(companyResult.company);
      if (storageResult) setStorageForm(storageToForm(storageResult.integration));
      setMessage('Pengaturan company, operasional, dan integrasi tersimpan.');
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

  const ActiveSectionIcon = activeSettingsSection.icon;

  return (
    <main className="admin-page">
      <div className="settings-sticky-header">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">
              <SlidersHorizontal size={24} />
              Pengaturan Operasional
            </h1>
            <p className="admin-page-subtitle">Pusat aturan company untuk absensi, visit outlet, transaksi, dan face verification sales.</p>
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

        <section className="settings-summary-grid">
          <div className="settings-summary-card accent">
            <span><MapPin size={17} /> Radius Default</span>
            <strong>{settings.defaultGeofenceRadiusM} m</strong>
            <small>Fallback radius outlet</small>
          </div>
          <div className="settings-summary-card">
            <span><Gauge size={17} /> Akurasi GPS</span>
            <strong>{settings.maxGpsAccuracyM} m</strong>
            <small>Batas manual review</small>
          </div>
          <div className="settings-summary-card">
            <span><ShieldCheck size={17} /> Face Match</span>
            <strong>{settings.faceMatchThreshold}</strong>
            <small>Threshold provider</small>
          </div>
          <div className="settings-summary-card">
            <span><Radar size={17} /> Face Provider</span>
            <strong>{settings.faceIntegration.enabled ? 'Aktif' : 'Nonaktif'}</strong>
            <small>{settings.faceIntegration.provider}</small>
          </div>
        </section>
      </div>

      <section className="settings-layout">
        <aside className="settings-side-nav" aria-label="Kategori pengaturan operasional">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = section.key === activeSection;
            return (
              <button
                key={section.key}
                type="button"
                className={`settings-side-button ${active ? 'active' : ''}`}
                onClick={() => setActiveSection(section.key)}
              >
                <span className="settings-side-icon"><Icon size={18} /></span>
                <span>
                  <strong>{section.title}</strong>
                  <small>{section.eyebrow}</small>
                </span>
              </button>
            );
          })}
        </aside>

        <div className="settings-section-panel">
          <div className="settings-section-header">
            <span className="settings-section-icon">
              <ActiveSectionIcon size={22} />
            </span>
            <div>
              <small>{activeSettingsSection.eyebrow}</small>
              <h2>{activeSettingsSection.title}</h2>
              <p>{activeSettingsSection.description}</p>
            </div>
          </div>

          {activeSection === 'company' && company ? (
            <div className="settings-form-grid">
              <label className="settings-field wide">
                <span>Nama company</span>
                <input value={company.name} onChange={(e) => patchCompany('name', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Kode perusahaan</span>
                <input
                  value={company.code ?? ''}
                  onChange={(e) => patchCompany('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  placeholder="YKS"
                  maxLength={32}
                />
                <small>Kode ini digunakan sebagai awalan kode karyawan. Contoh: YKS-001.</small>
              </label>
              <label className="settings-field">
                <span>Nama legal</span>
                <input value={company.legalName ?? ''} onChange={(e) => patchCompany('legalName', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Email</span>
                <input type="email" value={company.email ?? ''} onChange={(e) => patchCompany('email', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Telepon</span>
                <input value={company.phone ?? ''} onChange={(e) => patchCompany('phone', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>NPWP / Tax number</span>
                <input value={company.taxNumber ?? ''} onChange={(e) => patchCompany('taxNumber', e.target.value)} />
              </label>
              <label className="settings-field wide">
                <span>Alamat kantor</span>
                <textarea rows={3} value={company.address ?? ''} onChange={(e) => patchCompany('address', e.target.value)} />
                <small>Alamat dan titik koordinat ini menjadi referensi profil company dan konteks absensi kantor.</small>
              </label>
              <label className="settings-field">
                <span>Kota</span>
                <input value={company.city ?? ''} onChange={(e) => patchCompany('city', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Provinsi</span>
                <input value={company.province ?? ''} onChange={(e) => patchCompany('province', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Kode pos</span>
                <input value={company.postalCode ?? ''} onChange={(e) => patchCompany('postalCode', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Negara</span>
                <input value={company.country ?? ''} onChange={(e) => patchCompany('country', e.target.value)} />
              </label>
              <div className="settings-map-field">
                <OutletMapPicker
                  latitude={Number.isFinite(Number(company.latitude)) ? Number(company.latitude) : null}
                  longitude={Number.isFinite(Number(company.longitude)) ? Number(company.longitude) : null}
                  title="Pilih Titik Kantor"
                  description="Klik peta atau geser marker untuk mengisi koordinat kantor company."
                  onChange={(position) => setCompany((current) => current ? {
                    ...current,
                    latitude: String(position.latitude),
                    longitude: String(position.longitude),
                  } : current)}
                />
              </div>
              <label className="settings-field">
                <span>Latitude kantor</span>
                <input type="number" step="0.0000001" value={company.latitude ?? ''} onChange={(e) => patchCompany('latitude', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Longitude kantor</span>
                <input type="number" step="0.0000001" value={company.longitude ?? ''} onChange={(e) => patchCompany('longitude', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Timezone</span>
                <input value={company.timezone} onChange={(e) => patchCompany('timezone', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Website</span>
                <input value={company.websiteUrl ?? ''} onChange={(e) => patchCompany('websiteUrl', e.target.value)} />
              </label>
            </div>
          ) : null}

          {activeSettingsSection.metrics?.length ? (
            <div className="settings-control-grid">
              {activeSettingsSection.metrics.map((item) => {
                const Icon = item.icon;
                return (
                  <label key={item.key} className="settings-number-card">
                    <span><Icon size={18} /> {item.title}</span>
                    <div className="settings-number-input">
                      <input
                        type="number"
                        min={item.min}
                        max={item.max}
                        step={item.step}
                        value={settings[item.key]}
                        onChange={(e) => patch(item.key, Number(e.target.value))}
                      />
                      <small>{item.suffix}</small>
                    </div>
                    <em>{item.description}</em>
                  </label>
                );
              })}
            </div>
          ) : null}

          {activeSection === 'face' ? (
            <div className="settings-form-grid compact">
              <label className="settings-check-row wide">
                <span className="settings-toggle-icon"><KeyRound size={19} /></span>
                <span>
                  <strong>Aktifkan provider face recognition</strong>
                  <small>Jika nonaktif, sistem memakai mode mock dan verifikasi wajah tidak memanggil layanan eksternal.</small>
                </span>
                <input
                  type="checkbox"
                  checked={settings.faceIntegration.enabled}
                  onChange={(e) => patchFaceIntegration('enabled', e.target.checked)}
                />
              </label>
              <label className="settings-field">
                <span>Provider</span>
                <select
                  value={settings.faceIntegration.provider}
                  onChange={(e) => patchFaceIntegration('provider', e.target.value as GeneralSettings['faceIntegration']['provider'])}
                >
                  <option value="mock">Mock / internal test</option>
                  <option value="internal_python">Internal Python service</option>
                  <option value="custom_http">Custom HTTP</option>
                  <option value="aws_rekognition">AWS Rekognition</option>
                  <option value="azure_face">Azure Face</option>
                  <option value="google_vertex">Google Vertex</option>
                </select>
              </label>
              <label className="settings-field">
                <span>Mode</span>
                <select
                  value={settings.faceIntegration.mode}
                  onChange={(e) => patchFaceIntegration('mode', e.target.value as GeneralSettings['faceIntegration']['mode'])}
                >
                  <option value="verify">Verify</option>
                  <option value="detect_and_verify">Detect and verify</option>
                </select>
              </label>
              <label className="settings-field wide">
                <span>Base URL</span>
                <input value={settings.faceIntegration.baseUrl} onChange={(e) => patchFaceIntegration('baseUrl', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>API key</span>
                <input type="password" value={settings.faceIntegration.apiKey} onChange={(e) => patchFaceIntegration('apiKey', e.target.value)} />
                <small>Nilai yang tampil masked akan dipertahankan oleh backend jika tidak diganti.</small>
              </label>
              <label className="settings-field">
                <span>Timeout</span>
                <input type="number" min={1000} max={60000} value={settings.faceIntegration.timeoutMs} onChange={(e) => patchFaceIntegration('timeoutMs', Number(e.target.value))} />
              </label>
              <label className="settings-field">
                <span>Project ID</span>
                <input value={settings.faceIntegration.projectId} onChange={(e) => patchFaceIntegration('projectId', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Region</span>
                <input value={settings.faceIntegration.region} onChange={(e) => patchFaceIntegration('region', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Model</span>
                <input value={settings.faceIntegration.model} onChange={(e) => patchFaceIntegration('model', e.target.value)} />
              </label>
            </div>
          ) : null}

          {activeSection === 'storage' ? (
            <div className="settings-form-grid">
              <label className="settings-check-row wide">
                <span className="settings-toggle-icon"><Cloud size={19} /></span>
                <span>
                  <strong>Aktifkan cloud storage company</strong>
                  <small>Jika nonaktif, upload memakai fallback storage dari konfigurasi environment server.</small>
                </span>
                <input
                  type="checkbox"
                  checked={storageForm.status === 'active'}
                  onChange={(e) => patchStorage('status', e.target.checked ? 'active' : 'inactive')}
                />
              </label>
              <label className="settings-field">
                <span>Provider</span>
                <select value={storageForm.provider} onChange={(e) => patchStorage('provider', e.target.value as StorageForm['provider'])}>
                  <option value="cloudflare_r2">Cloudflare R2</option>
                  <option value="s3">S3 compatible</option>
                </select>
              </label>
              <label className="settings-field">
                <span>Nama integrasi</span>
                <input value={storageForm.name} onChange={(e) => patchStorage('name', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Bucket</span>
                <input value={storageForm.bucket} onChange={(e) => patchStorage('bucket', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Region</span>
                <input value={storageForm.region} onChange={(e) => patchStorage('region', e.target.value)} />
              </label>
              <label className="settings-field wide">
                <span>Endpoint</span>
                <input value={storageForm.endpoint} onChange={(e) => patchStorage('endpoint', e.target.value)} placeholder="https://<account-id>.r2.cloudflarestorage.com" />
              </label>
              <label className="settings-field wide">
                <span>Public base URL</span>
                <input value={storageForm.publicBaseUrl} onChange={(e) => patchStorage('publicBaseUrl', e.target.value)} />
              </label>
              <label className="settings-field">
                <span>Access key ID</span>
                <input value={storageForm.accessKeyId} onChange={(e) => patchStorage('accessKeyId', e.target.value)} placeholder={storageForm.id ? 'Biarkan kosong jika tidak diganti' : ''} />
              </label>
              <label className="settings-field">
                <span>Secret access key</span>
                <input type="password" value={storageForm.secretAccessKey} onChange={(e) => patchStorage('secretAccessKey', e.target.value)} placeholder={storageForm.id ? 'Biarkan kosong jika tidak diganti' : ''} />
              </label>
              <label className="settings-field">
                <span>Signed URL expired</span>
                <input type="number" min={60} value={storageForm.signedUrlExpiresSeconds} onChange={(e) => patchStorage('signedUrlExpiresSeconds', Number(e.target.value))} />
              </label>
              <label className="settings-field wide">
                <span>Catatan</span>
                <textarea rows={3} value={storageForm.description} onChange={(e) => patchStorage('description', e.target.value)} />
              </label>
            </div>
          ) : null}

          {activeSettingsSection.toggles?.length ? (
            <div className="settings-toggle-grid">
              {activeSettingsSection.toggles.map((item) => {
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
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
