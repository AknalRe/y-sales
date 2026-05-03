import { useEffect, useState } from 'react';
import { CreditCard, Plus, Edit2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { platformGetPlans, platformCreatePlan, platformUpdatePlan, platformGetFeatures, type SubscriptionFeature, type SubscriptionPlan } from '@/lib/api/platform';
import { DEFAULT_PLAN_LIMITS, PLAN_LIMITS, type PlanLimitKey } from '@/lib/subscription-catalog';

type PlanForm = {
  code: string; name: string; description: string;
  level: number; priceMonthly: number; priceYearly: number; isPublic: boolean; status: string;
  features: string[];
  limits: Record<PlanLimitKey, number>;
};

const defaultForm: PlanForm = {
  code: '', name: '', description: '', level: 1, priceMonthly: 0, priceYearly: 0, isPublic: true, status: 'active',
  features: ['attendance', 'visits'],
  limits: DEFAULT_PLAN_LIMITS,
};

export function PlatformPlansPage() {
  const { accessToken } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | { plan: SubscriptionPlan } | null>(null);
  const [form, setForm] = useState<PlanForm>(defaultForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [plansData, featuresData] = await Promise.all([
        platformGetPlans(accessToken),
        platformGetFeatures(accessToken),
      ]);
      setPlans(plansData.plans);
      setFeatures(featuresData.features.filter(feature => feature.status === 'active'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  function openCreate() {
    setForm(defaultForm);
    setModal('create');
  }

  function openEdit(plan: SubscriptionPlan) {
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      level: plan.level ?? 1,
      priceMonthly: Number(plan.priceMonthly),
      priceYearly: Number(plan.priceYearly),
      isPublic: plan.isPublic,
      status: plan.status,
      features: plan.features ?? [],
      limits: { ...DEFAULT_PLAN_LIMITS, ...((plan.limits ?? {}) as Partial<Record<PlanLimitKey, number>>) },
    });
    setModal({ plan });
  }

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        priceMonthly: String(form.priceMonthly),
        priceYearly: String(form.priceYearly),
        features: form.features,
        limits: form.limits,
      };
      if (modal === 'create') {
        await platformCreatePlan(accessToken, payload);
      } else if (modal && typeof modal === 'object') {
        await platformUpdatePlan(accessToken, modal.plan.id, payload);
      }
      setModal(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleFeature(feature: string) {
    setForm(current => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter(item => item !== feature)
        : [...current.features, feature],
    }));
  }

  function updateLimit(limit: PlanLimitKey, value: number) {
    setForm(current => ({
      ...current,
      limits: { ...current.limits, [limit]: Math.max(0, value) },
    }));
  }

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1 className="platform-page-title">
            <CreditCard size={24} />
            Subscription Plans
          </h1>
          <p className="platform-page-subtitle">Kelola paket langganan yang tersedia untuk tenant.</p>
        </div>
        <button
          id="platform-create-plan-btn"
          onClick={openCreate}
          className="platform-btn platform-btn-primary"
          type="button"
        >
          <Plus size={16} />
          Tambah Plan
        </button>
      </div>

      {error && (
        <div className="platform-alert platform-alert-error">
          <AlertTriangle size={16} />{error}
        </div>
      )}

      <div className="platform-plans-grid">
        {loading ? (
          <p className="platform-muted">Memuat plans...</p>
        ) : (
          plans.map(plan => (
            <div key={plan.id} className={`platform-plan-card ${plan.status !== 'active' ? 'platform-plan-inactive' : ''}`}>
              <div className="platform-plan-card-header">
                <div>
                  <h3 className="platform-plan-card-name">{plan.name}</h3>
                  <div className="platform-plan-meta-row">
                    <code className="platform-plan-card-code">{plan.code}</code>
                    <span className="platform-level-badge">Level {plan.level ?? 1}</span>
                  </div>
                </div>
                <button
                  id={`platform-edit-plan-${plan.id}`}
                  onClick={() => openEdit(plan)}
                  className="platform-btn-icon"
                  type="button"
                >
                  <Edit2 size={15} />
                </button>
              </div>
              <p className="platform-plan-card-desc">{plan.description ?? 'Tanpa deskripsi.'}</p>
              <div className="platform-plan-pricing">
                <div>
                  <span className="platform-plan-price-label">Bulanan</span>
                  <span className="platform-plan-price-value">
                    {Number(plan.priceMonthly) === 0
                      ? 'Gratis'
                      : `Rp ${Number(plan.priceMonthly).toLocaleString('id-ID')}`}
                  </span>
                </div>
                <div>
                  <span className="platform-plan-price-label">Tahunan</span>
                  <span className="platform-plan-price-value">
                    {Number(plan.priceYearly) === 0
                      ? 'Gratis'
                      : `Rp ${Number(plan.priceYearly).toLocaleString('id-ID')}`}
                  </span>
                </div>
              </div>
              {plan.features && plan.features.length > 0 && (
                <div className="platform-plan-features">
                  {(plan.features as string[]).map((f: string) => (
                    <span key={f} className="platform-feature-tag">{f}</span>
                  ))}
                </div>
              )}
              <div className="platform-plan-card-footer">
                <span className={`platform-badge ${plan.isPublic ? 'platform-badge-success' : 'platform-badge-muted'}`}>
                  {plan.isPublic ? 'Public' : 'Hidden'}
                </span>
                <span className={`platform-badge ${plan.status === 'active' ? 'platform-badge-success' : 'platform-badge-muted'}`}>
                  {plan.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Plan Modal */}
      {modal !== null && (
        <div className="platform-modal-overlay" onClick={() => setModal(null)}>
          <div className="platform-modal" onClick={e => e.stopPropagation()}>
            <div className="platform-modal-header">
              <h2>{modal === 'create' ? 'Buat Plan Baru' : `Edit Plan: ${(modal as any).plan.name}`}</h2>
              <button onClick={() => setModal(null)} className="platform-modal-close" type="button">×</button>
            </div>
            <div className="platform-modal-body">
              <div className="platform-form-grid">
                <div className="platform-field">
                  <label htmlFor="plan-code">Kode Plan *</label>
                  <input
                    id="plan-code"
                    type="text"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                    disabled={modal !== 'create'}
                    className="platform-input"
                    placeholder="pro"
                  />
                </div>
                <div className="platform-field">
                  <label htmlFor="plan-name">Nama Plan *</label>
                  <input
                    id="plan-name"
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="platform-input"
                    placeholder="Pro"
                  />
                </div>
                <div className="platform-field platform-field-full">
                  <label htmlFor="plan-desc">Deskripsi</label>
                  <textarea
                    id="plan-desc"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="platform-input"
                  />
                </div>
                <div className="platform-field">
                  <label htmlFor="plan-level">Level Subscription *</label>
                  <input
                    id="plan-level"
                    type="number"
                    value={form.level}
                    onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))}
                    className="platform-input"
                    min={1}
                    max={99}
                  />
                </div>
                <div className="platform-field">
                  <label htmlFor="plan-price-monthly">Harga Bulanan (Rp)</label>
                  <input
                    id="plan-price-monthly"
                    type="number"
                    value={form.priceMonthly}
                    onChange={e => setForm(f => ({ ...f, priceMonthly: Number(e.target.value) }))}
                    className="platform-input"
                    min={0}
                  />
                </div>
                <div className="platform-field">
                  <label htmlFor="plan-price-yearly">Harga Tahunan (Rp)</label>
                  <input
                    id="plan-price-yearly"
                    type="number"
                    value={form.priceYearly}
                    onChange={e => setForm(f => ({ ...f, priceYearly: Number(e.target.value) }))}
                    className="platform-input"
                    min={0}
                  />
                </div>
                <div className="platform-field">
                  <label htmlFor="plan-status">Status</label>
                  <select
                    id="plan-status"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="platform-select"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="platform-field">
                  <label>Visibilitas</label>
                  <label className="platform-toggle">
                    <input
                      id="plan-public"
                      type="checkbox"
                      checked={form.isPublic}
                      onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))}
                    />
                    <span>Tampilkan ke publik</span>
                  </label>
                </div>
                <div className="platform-field platform-field-full">
                  <label>Fitur Plan</label>
                  <div className="platform-feature-grid">
                    {features.map(feature => {
                      const checked = form.features.includes(feature.key);
                      return (
                        <button
                          key={feature.key}
                          type="button"
                          className={`platform-feature-option ${checked ? 'platform-feature-option-active' : ''}`}
                          onClick={() => toggleFeature(feature.key)}
                        >
                          <span className="platform-feature-option-title">{feature.label}</span>
                          <span className="platform-feature-option-desc">{feature.description}</span>
                          <span className="platform-feature-option-category">{feature.category}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="platform-field platform-field-full">
                  <label>Limit / Kuota Plan</label>
                  <div className="platform-limit-grid">
                    {PLAN_LIMITS.map(limit => (
                      <label key={limit.key} className="platform-limit-item" htmlFor={`plan-limit-${limit.key}`}>
                        <span>
                          <strong>{limit.label}</strong>
                          <small>{limit.description}</small>
                        </span>
                        <div className="platform-limit-input-wrap">
                          <input
                            id={`plan-limit-${limit.key}`}
                            type="number"
                            min={0}
                            value={form.limits[limit.key] ?? 0}
                            onChange={e => updateLimit(limit.key, Number(e.target.value))}
                            className="platform-input"
                          />
                          <em>{limit.unit}</em>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="platform-modal-footer">
              <button onClick={() => setModal(null)} className="platform-btn platform-btn-ghost" type="button">
                Batal
              </button>
              <button
                id="platform-save-plan-btn"
                onClick={handleSave}
                className="platform-btn platform-btn-primary"
                type="button"
                disabled={saving || !form.code || !form.name || form.level < 1}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
