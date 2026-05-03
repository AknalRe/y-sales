import { useEffect, useState } from 'react';
import { Edit2, Layers3, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import {
  platformCreateFeature,
  platformDeleteFeature,
  platformGetFeatures,
  platformUpdateFeature,
  type SubscriptionFeature,
} from '@/lib/api/platform';

type FeatureForm = {
  key: string;
  label: string;
  description: string;
  category: string;
  status: string;
};

const defaultForm: FeatureForm = {
  key: '',
  label: '',
  description: '',
  category: 'Custom',
  status: 'active',
};

export function PlatformFeaturesPage() {
  const { accessToken } = useAuth();
  const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | { feature: SubscriptionFeature } | null>(null);
  const [form, setForm] = useState<FeatureForm>(defaultForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await platformGetFeatures(accessToken);
      setFeatures(data.features);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  function openCreate() {
    setForm(defaultForm);
    setError('');
    setModal('create');
  }

  function openEdit(feature: SubscriptionFeature) {
    setForm({
      key: feature.key,
      label: feature.label,
      description: feature.description ?? '',
      category: feature.category,
      status: feature.status,
    });
    setError('');
    setModal({ feature });
  }

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, description: form.description || undefined };
      if (modal === 'create') await platformCreateFeature(accessToken, payload);
      else if (modal && typeof modal === 'object') await platformUpdateFeature(accessToken, modal.feature.id, payload);
      setModal(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan feature.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(feature: SubscriptionFeature) {
    if (!accessToken) return;
    if (!confirm(`Nonaktifkan fitur "${feature.label}"?`)) return;
    await platformDeleteFeature(accessToken, feature.id);
    await load();
  }

  const grouped = features.reduce<Record<string, SubscriptionFeature[]>>((acc, feature) => {
    acc[feature.category] = [...(acc[feature.category] ?? []), feature];
    return acc;
  }, {});

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1 className="platform-page-title"><Layers3 size={24} /> Feature Catalog</h1>
          <p className="platform-page-subtitle">CRUD fitur subscription yang bisa dipilih saat membuat atau mengubah plan.</p>
        </div>
        <button id="platform-create-feature-btn" onClick={openCreate} className="platform-btn platform-btn-primary" type="button">
          <Plus size={16} /> Tambah Feature
        </button>
      </div>

      {loading ? <div className="platform-loading">Memuat fitur...</div> : (
        <div className="platform-feature-catalog">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category} className="platform-card">
              <div className="platform-card-header">
                <h2>{category}</h2>
                <span className="platform-count-badge">{items.length} fitur</span>
              </div>
              <div className="platform-feature-list">
                {items.map(feature => (
                  <article key={feature.id} className={`platform-feature-row platform-feature-${feature.status}`}>
                    <div>
                      <strong>{feature.label}</strong>
                      <code>{feature.key}</code>
                      <p>{feature.description || 'Tanpa deskripsi.'}</p>
                    </div>
                    <div className="platform-row-actions">
                      <span className={`platform-status-dot platform-status-${feature.status}`}>{feature.status}</span>
                      <button id={`platform-edit-feature-${feature.id}`} onClick={() => openEdit(feature)} className="platform-btn-sm platform-btn-ghost" type="button">
                        <Edit2 size={13} /> Edit
                      </button>
                      <button id={`platform-delete-feature-${feature.id}`} onClick={() => handleDelete(feature)} className="platform-btn-sm platform-btn-danger" type="button">
                        <Trash2 size={13} /> Nonaktifkan
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {modal && (
        <div className="platform-modal-overlay" onClick={() => setModal(null)}>
          <div className="platform-modal" onClick={e => e.stopPropagation()}>
            <div className="platform-modal-header">
              <h2>{modal === 'create' ? 'Tambah Feature' : `Edit Feature: ${modal.feature.label}`}</h2>
              <button onClick={() => setModal(null)} className="platform-modal-close" type="button">×</button>
            </div>
            <div className="platform-modal-body">
              {error && <div className="platform-alert platform-alert-error">{error}</div>}
              <div className="platform-form-grid">
                <div className="platform-field">
                  <label>Key *</label>
                  <input id="feature-key" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} className="platform-input" placeholder="contoh: advanced_inventory" />
                </div>
                <div className="platform-field">
                  <label>Label *</label>
                  <input id="feature-label" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="platform-input" placeholder="Advanced Inventory" />
                </div>
                <div className="platform-field">
                  <label>Kategori</label>
                  <input id="feature-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="platform-input" />
                </div>
                <div className="platform-field">
                  <label>Status</label>
                  <select id="feature-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="platform-select">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
                <div className="platform-field platform-field-full">
                  <label>Deskripsi</label>
                  <textarea id="feature-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="platform-input" rows={3} />
                </div>
              </div>
            </div>
            <div className="platform-modal-footer">
              <button onClick={() => setModal(null)} className="platform-btn platform-btn-ghost" type="button">Batal</button>
              <button id="platform-save-feature" onClick={handleSave} disabled={saving || !form.key || !form.label} className="platform-btn platform-btn-primary" type="button">
                {saving ? 'Menyimpan...' : 'Simpan Feature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
