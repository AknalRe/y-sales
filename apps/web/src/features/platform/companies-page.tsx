import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, Search, CheckCircle2, AlertTriangle,
  XCircle, Clock, RefreshCw, ChevronRight, Edit2
} from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import {
  platformGetCompanies, platformCreateCompany, platformSuspendCompany,
  platformActivateCompany, platformGetPlans, platformUpdateCompany, platformUpdateSubscription,
  type Company, type SubscriptionPlan
} from '@/lib/api/platform';
import { setPlatformCompanyView } from '@/lib/api/client';

const statusConfig = {
  active: { label: 'Aktif', icon: CheckCircle2, color: 'var(--color-success)' },
  trialing: { label: 'Trial', icon: Clock, color: 'var(--color-warning)' },
  suspended: { label: 'Suspend', icon: AlertTriangle, color: 'var(--color-danger)' },
  cancelled: { label: 'Dibatalkan', icon: XCircle, color: 'var(--color-muted)' },
} as const;

export function PlatformCompaniesPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [suspendDialog, setSuspendDialog] = useState<{ company: Company; reason: string } | null>(null);
  const [editDialog, setEditDialog] = useState<{ company: Company } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', slug: '', email: '', phone: '',
    city: '', planCode: 'starter', trialDays: 14,
  });

  const [editForm, setEditForm] = useState({
    name: '', email: '', phone: '', city: '',
    planCode: 'starter', billingCycle: 'monthly', status: 'active',
    trialEndsAt: '', currentPeriodStart: '', currentPeriodEnd: '', autoCalculatePeriodEnd: true,
    invoiceRef: '', amountPaid: '', paidAt: '',
  });

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase()) ||
    c.subscriptionSummary?.planName.toLowerCase().includes(search.toLowerCase())
  );

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [companiesData, plansData] = await Promise.all([
        platformGetCompanies(accessToken),
        platformGetPlans(accessToken),
      ]);
      setCompanies(companiesData.companies);
      setPlans(plansData.plans);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  async function handleCreate() {
    if (!accessToken) return;
    setError('');
    try {
      await platformCreateCompany(accessToken, {
        ...form,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        trialDays: Number(form.trialDays),
      });
      setShowCreate(false);
      setForm({ name: '', slug: '', email: '', phone: '', city: '', planCode: 'starter', trialDays: 14 });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleSuspend() {
    if (!accessToken || !suspendDialog) return;
    try {
      await platformSuspendCompany(accessToken, suspendDialog.company.id, suspendDialog.reason);
      setSuspendDialog(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleActivate(company: Company) {
    if (!accessToken) return;
    try {
      await platformActivateCompany(accessToken, company.id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function toDateInput(value?: string | null) {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
  }

  function openEdit(company: Company) {
    const subscription = company.subscriptionSummary;
    setEditForm({
      name: company.name,
      email: company.email ?? '',
      phone: company.phone ?? '',
      city: company.city ?? '',
      planCode: subscription?.planCode ?? plans[0]?.code ?? 'starter',
      billingCycle: subscription?.billingCycle ?? 'monthly',
      status: subscription?.status ?? 'active',
      trialEndsAt: toDateInput(subscription?.trialEndsAt),
      currentPeriodStart: toDateInput(subscription?.currentPeriodStart),
      currentPeriodEnd: toDateInput(subscription?.currentPeriodEnd),
      autoCalculatePeriodEnd: false,
      invoiceRef: subscription?.invoiceRef ?? '',
      amountPaid: subscription?.amountPaid ? String(Number(subscription.amountPaid)) : '',
      paidAt: toDateInput(subscription?.paidAt),
    });
    setEditDialog({ company });
  }

  async function handleSaveEdit() {
    if (!accessToken || !editDialog) return;
    setSavingEdit(true);
    setError('');
    try {
      await platformUpdateCompany(accessToken, editDialog.company.id, {
        name: editForm.name,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        city: editForm.city || undefined,
      });
      await platformUpdateSubscription(accessToken, editDialog.company.id, {
        planCode: editForm.planCode,
        billingCycle: editForm.billingCycle,
        status: editForm.status,
        trialEndsAt: editForm.trialEndsAt ? new Date(editForm.trialEndsAt).toISOString() : null,
        currentPeriodStart: editForm.currentPeriodStart ? new Date(editForm.currentPeriodStart).toISOString() : null,
        currentPeriodEnd: editForm.autoCalculatePeriodEnd
          ? undefined
          : (editForm.currentPeriodEnd ? new Date(editForm.currentPeriodEnd).toISOString() : null),
        autoCalculatePeriodEnd: editForm.autoCalculatePeriodEnd,
        invoiceRef: editForm.invoiceRef || undefined,
        amountPaid: editForm.amountPaid ? Number(editForm.amountPaid) : undefined,
        paidAt: editForm.paidAt ? new Date(editForm.paidAt).toISOString() : undefined,
      });
      setEditDialog(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingEdit(false);
    }
  }

  function formatSubscriptionEnd(company: Company) {
    const subscription = company.subscriptionSummary;
    if (!subscription) return 'Belum ada subscription';
    const endDate = subscription.currentPeriodEnd ?? subscription.trialEndsAt;
    if (!endDate) return subscription.billingCycle === 'lifetime' ? 'Lifetime' : 'Belum diset';
    return new Date(endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1 className="platform-page-title">
            <Building2 size={24} />
            Companies
          </h1>
          <p className="platform-page-subtitle">Kelola semua tenant yang terdaftar di platform YukSales.</p>
        </div>
        <div className="platform-page-actions">
          <button id="platform-refresh-btn" onClick={load} className="platform-btn platform-btn-ghost" type="button">
            <RefreshCw size={15} />
          </button>
          <button
            id="platform-create-company-btn"
            onClick={() => setShowCreate(true)}
            className="platform-btn platform-btn-primary"
            type="button"
          >
            <Plus size={16} />
            Tambah Company
          </button>
        </div>
      </div>

      {error && (
        <div className="platform-alert platform-alert-error">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div className="platform-search-bar">
        <Search size={16} />
        <input
          id="platform-company-search"
          type="text"
          placeholder="Cari nama atau slug company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="platform-search-input"
        />
      </div>

      <div className="platform-table-card">
        {loading ? (
          <div className="platform-loading">
            <RefreshCw size={20} className="spin" />
            <span>Memuat data...</span>
          </div>
        ) : (
          <table className="platform-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Status</th>
                <th>Subscription</th>
                <th>Berakhir</th>
                <th>Kota</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(company => {
                const status = statusConfig[company.status] ?? statusConfig.active;
                const StatusIcon = status.icon;
                return (
                  <tr key={company.id}>
                    <td>
                      <div className="platform-company-cell">
                        <div className="platform-company-avatar">
                          {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="platform-company-name">{company.name}</div>
                          <div className="platform-company-slug">@{company.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="platform-status-badge" style={{ color: status.color }}>
                        <StatusIcon size={13} />
                        {status.label}
                      </span>
                    </td>
                    <td>
                      {company.subscriptionSummary ? (
                        <div className="platform-subscription-cell">
                          <span className="platform-subscription-plan">
                            {company.subscriptionSummary.planName}
                          </span>
                          <span className="platform-subscription-meta">
                            Level {company.subscriptionSummary.planLevel ?? '—'} · {company.subscriptionSummary.billingCycle} · {company.subscriptionSummary.status}
                          </span>
                        </div>
                      ) : (
                        <span className="platform-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className="platform-subscription-end">
                        {formatSubscriptionEnd(company)}
                      </span>
                    </td>
                    <td className="platform-muted">{company.city ?? '—'}</td>
                    <td className="platform-muted">
                      {new Date(company.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td>
                      <div className="platform-row-actions">
                        <button
                          id={`platform-edit-company-${company.id}`}
                          onClick={() => openEdit(company)}
                          className="platform-btn-sm platform-btn-ghost"
                          type="button"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        {company.status === 'active' || company.status === 'trialing' ? (
                          <button
                            id={`platform-suspend-${company.id}`}
                            onClick={() => setSuspendDialog({ company, reason: '' })}
                            className="platform-btn-sm platform-btn-danger"
                            type="button"
                          >
                            Suspend
                          </button>
                        ) : company.status === 'suspended' ? (
                          <button
                            id={`platform-activate-${company.id}`}
                            onClick={() => handleActivate(company)}
                            className="platform-btn-sm platform-btn-success"
                            type="button"
                          >
                            Aktifkan
                          </button>
                        ) : null}
                        <button
                          id={`platform-open-company-${company.id}`}
                          onClick={() => {
                            setPlatformCompanyView({ id: company.id, name: company.name, slug: company.slug });
                            navigate('/admin');
                          }}
                          className="platform-btn-sm platform-btn-ghost"
                          type="button"
                          title="Buka dashboard sisi company"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="platform-empty">Tidak ada company ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Company Modal */}
      {showCreate && (
        <div className="platform-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="platform-modal" onClick={e => e.stopPropagation()}>
            <div className="platform-modal-header">
              <h2>Tambah Company Baru</h2>
              <button onClick={() => setShowCreate(false)} className="platform-modal-close" type="button">×</button>
            </div>
            <div className="platform-modal-body">
              <div className="platform-form-grid">
                <div className="platform-field">
                  <label htmlFor="create-name">Nama Company *</label>
                  <input
                    id="create-name"
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({
                      ...f,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                    }))}
                    placeholder="PT Maju Bersama"
                    className="platform-input"
                  />
                </div>
                <div className="platform-field">
                  <label htmlFor="create-slug">Slug *</label>
                  <input
                    id="create-slug"
                    type="text"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    placeholder="maju-bersama"
                    className="platform-input"
                  />
                </div>
                <div className="platform-field">
                  <label htmlFor="create-email">Email</label>
                  <input
                    id="create-email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="admin@company.com"
                    className="platform-input"
                  />
                </div>
                <div className="platform-field">
                  <label htmlFor="create-phone">Telepon</label>
                  <input
                    id="create-phone"
                    type="text"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="08xxxxxxxxx"
                    className="platform-input"
                  />
                </div>
                <div className="platform-field">
                  <label htmlFor="create-plan">Plan Awal</label>
                  <select
                    id="create-plan"
                    value={form.planCode}
                    onChange={e => setForm(f => ({ ...f, planCode: e.target.value }))}
                    className="platform-select"
                  >
                    {plans.length > 0 ? (
                      plans.map(plan => (
                        <option key={plan.id} value={plan.code}>
                          Level {plan.level ?? 1} · {plan.name} {Number(plan.priceMonthly) === 0 ? '(Gratis)' : ''}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="starter">Level 1 · Starter (Gratis)</option>
                        <option value="pro">Level 2 · Pro</option>
                        <option value="enterprise">Level 3 · Enterprise</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="platform-field">
                  <label htmlFor="create-trial">Trial (hari)</label>
                  <input
                    id="create-trial"
                    type="number"
                    value={form.trialDays}
                    onChange={e => setForm(f => ({ ...f, trialDays: Number(e.target.value) }))}
                    min={0}
                    max={90}
                    className="platform-input"
                  />
                </div>
              </div>
            </div>
            <div className="platform-modal-footer">
              <button onClick={() => setShowCreate(false)} className="platform-btn platform-btn-ghost" type="button">
                Batal
              </button>
              <button
                id="platform-submit-company"
                onClick={handleCreate}
                className="platform-btn platform-btn-primary"
                type="button"
                disabled={!form.name}
              >
                Buat Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {editDialog && (
        <div className="platform-modal-overlay" onClick={() => setEditDialog(null)}>
          <div className="platform-modal" onClick={e => e.stopPropagation()}>
            <div className="platform-modal-header">
              <h2>Edit Company: {editDialog.company.name}</h2>
              <button onClick={() => setEditDialog(null)} className="platform-modal-close" type="button">×</button>
            </div>
            <div className="platform-modal-body">
              <div className="platform-form-grid">
                <div className="platform-field">
                  <label htmlFor="edit-name">Nama Company *</label>
                  <input id="edit-name" type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="platform-input" />
                </div>
                <div className="platform-field">
                  <label htmlFor="edit-email">Email</label>
                  <input id="edit-email" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="platform-input" />
                </div>
                <div className="platform-field">
                  <label htmlFor="edit-phone">Telepon</label>
                  <input id="edit-phone" type="text" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="platform-input" />
                </div>
                <div className="platform-field">
                  <label htmlFor="edit-city">Kota</label>
                  <input id="edit-city" type="text" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} className="platform-input" />
                </div>
                <div className="platform-field platform-field-full">
                  <label htmlFor="edit-plan">Plan Berlangganan</label>
                  <select id="edit-plan" value={editForm.planCode} onChange={e => setEditForm(f => ({ ...f, planCode: e.target.value }))} className="platform-select">
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.code}>
                        Level {plan.level ?? 1} · {plan.name} · Rp {Number(plan.priceMonthly).toLocaleString('id-ID')}/bln
                      </option>
                    ))}
                  </select>
                </div>
                <div className="platform-field">
                  <label htmlFor="edit-billing-cycle">Billing Cycle</label>
                  <select id="edit-billing-cycle" value={editForm.billingCycle} onChange={e => setEditForm(f => ({ ...f, billingCycle: e.target.value }))} className="platform-select">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                <div className="platform-field">
                  <label htmlFor="edit-subscription-status">Status Subscription</label>
                  <select id="edit-subscription-status" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="platform-select">
                    <option value="trialing">Trialing</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div className="platform-field">
                  <label htmlFor="edit-trial-ends">Trial Berakhir</label>
                  <input id="edit-trial-ends" type="date" value={editForm.trialEndsAt} onChange={e => setEditForm(f => ({ ...f, trialEndsAt: e.target.value }))} className="platform-input" />
                </div>
                <div className="platform-field">
                  <label htmlFor="edit-period-start">Masa Aktif Mulai</label>
                  <input id="edit-period-start" type="date" value={editForm.currentPeriodStart} onChange={e => setEditForm(f => ({ ...f, currentPeriodStart: e.target.value }))} className="platform-input" />
                </div>
                <div className="platform-field">
                  <label htmlFor="edit-period-end">Masa Aktif Berakhir</label>
                  <input id="edit-period-end" type="date" value={editForm.currentPeriodEnd} onChange={e => setEditForm(f => ({ ...f, currentPeriodEnd: e.target.value, autoCalculatePeriodEnd: false }))} className="platform-input" disabled={editForm.autoCalculatePeriodEnd} />
                </div>
                <div className="platform-field">
                  <label>Hitung Otomatis</label>
                  <label className="platform-toggle">
                    <input id="edit-auto-period" type="checkbox" checked={editForm.autoCalculatePeriodEnd} onChange={e => setEditForm(f => ({ ...f, autoCalculatePeriodEnd: e.target.checked }))} />
                    <span>Berakhir otomatis dari billing cycle</span>
                  </label>
                </div>
                <div className="platform-field">
                  <label>Manual Payment Override</label>
                  <input id="edit-amount-paid" type="number" min={0} value={editForm.amountPaid} onChange={e => setEditForm(f => ({ ...f, amountPaid: e.target.value }))} placeholder="Contoh: 250000" className="platform-input" />
                </div>
                <div className="platform-field">
                  <label>Tanggal Bayar</label>
                  <input id="edit-paid-at" type="date" value={editForm.paidAt} onChange={e => setEditForm(f => ({ ...f, paidAt: e.target.value }))} className="platform-input" />
                </div>
                <div className="platform-field platform-field-full">
                  <label>No. Invoice / Referensi</label>
                  <input id="edit-invoice-ref" type="text" value={editForm.invoiceRef} onChange={e => setEditForm(f => ({ ...f, invoiceRef: e.target.value }))} placeholder="INV-2026-0001" className="platform-input" />
                </div>
              </div>
            </div>
            <div className="platform-modal-footer">
              <button onClick={() => setEditDialog(null)} className="platform-btn platform-btn-ghost" type="button">Batal</button>
              <button id="platform-save-company-edit" onClick={handleSaveEdit} className="platform-btn platform-btn-primary" type="button" disabled={savingEdit || !editForm.name || !editForm.planCode}>
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Dialog */}
      {suspendDialog && (
        <div className="platform-modal-overlay" onClick={() => setSuspendDialog(null)}>
          <div className="platform-modal platform-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="platform-modal-header">
              <h2>Suspend Company</h2>
              <button onClick={() => setSuspendDialog(null)} className="platform-modal-close" type="button">×</button>
            </div>
            <div className="platform-modal-body">
              <p className="platform-muted" style={{ marginBottom: '1rem' }}>
                Suspend <strong>{suspendDialog.company.name}</strong>? Semua user tenant tidak dapat mengakses sistem.
              </p>
              <div className="platform-field">
                <label htmlFor="suspend-reason">Alasan Suspend *</label>
                <textarea
                  id="suspend-reason"
                  value={suspendDialog.reason}
                  onChange={e => setSuspendDialog(d => d ? { ...d, reason: e.target.value } : null)}
                  placeholder="Contoh: Tagihan belum dibayar selama 30 hari."
                  rows={3}
                  className="platform-input"
                />
              </div>
            </div>
            <div className="platform-modal-footer">
              <button onClick={() => setSuspendDialog(null)} className="platform-btn platform-btn-ghost" type="button">
                Batal
              </button>
              <button
                id="platform-confirm-suspend"
                onClick={handleSuspend}
                className="platform-btn platform-btn-danger"
                type="button"
                disabled={suspendDialog.reason.length < 5}
              >
                Konfirmasi Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
