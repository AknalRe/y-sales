import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Banknote, FileText, Plus, ReceiptText } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import {
  platformCreateInvoice,
  platformGetCompanies,
  platformGetInvoices,
  platformGetPlans,
  platformRecordInvoicePayment,
  type Company,
  type PlatformInvoice,
  type SubscriptionPlan,
} from '@/lib/api/platform';

type InvoiceForm = {
  companyId: string;
  subscriptionId: string;
  planCode: string;
  billingReason: string;
  billingCycle: string;
  cycleQty: string;
  periodStart: string;
  periodEnd: string;
  dueAt: string;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  notes: string;
};

type PaymentForm = {
  amount: string;
  method: string;
  provider: string;
  paidAt: string;
  paymentRef: string;
  notes: string;
};

const defaultInvoiceForm: InvoiceForm = {
  companyId: '', subscriptionId: '', planCode: '', billingReason: 'renewal', billingCycle: 'monthly', cycleQty: '1',
  periodStart: new Date().toISOString().slice(0, 10), periodEnd: '', dueAt: new Date().toISOString().slice(0, 10), subtotalAmount: '', discountAmount: '0', taxAmount: '0', notes: '',
};

const defaultPaymentForm: PaymentForm = {
  amount: '', method: 'bank_transfer', provider: 'manual', paidAt: new Date().toISOString().slice(0, 10), paymentRef: '', notes: '',
};

const formatMoney = (value: string | number) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const toIso = (value: string) => value ? new Date(value).toISOString() : undefined;

const reasonLabel: Record<string, string> = {
  renewal: 'Renewal',
  new_subscription: 'New Subscription',
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  manual_adjustment: 'Manual Adjustment',
};


export function PlatformBillingPage() {
  const { accessToken } = useAuth();
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState<PlatformInvoice | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>(defaultInvoiceForm);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(defaultPaymentForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [invoiceData, companyData, planData] = await Promise.all([
        platformGetInvoices(accessToken, status || undefined),
        platformGetCompanies(accessToken),
        platformGetPlans(accessToken),
      ]);
      setInvoices(invoiceData.invoices);
      setCompanies(companyData.companies);
      setPlans(planData.plans);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken, status]);

  const summary = useMemo(() => {
    const paid = invoices.filter(invoice => invoice.status === 'paid');
    const open = invoices.filter(invoice => ['issued', 'draft', 'overdue'].includes(invoice.status));
    return {
      total: invoices.length,
      paid: paid.length,
      open: open.length,
      collected: paid.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0),
    };
  }, [invoices]);

  function getPlanPrice(planCode: string, cycle: string, qty: string) {
    const plan = plans.find(item => item.code === planCode);
    if (!plan) return '';
    const m = Number(plan.priceMonthly ?? 0);
    const y = Number(plan.priceYearly ?? m * 12);
    let price = 0;
    
    if (cycle === 'weekly') price = m / 4;
    else if (cycle === 'monthly') price = m;
    else if (cycle === 'quarterly') price = m * 3;
    else if (cycle === 'semi_annually') price = m * 6;
    else if (cycle === 'yearly') price = y;
    else if (cycle === 'biennially') price = y * 2;
    else if (cycle === 'lifetime') price = y; // fallback for lifetime
    
    return String(price * (Number(qty) || 1));
  }

  function calculatePeriodEnd(start: string, cycle: string, qty: string) {
    if (!start || cycle === 'lifetime') return '';
    const date = new Date(start);
    const q = Number(qty) || 1;
    
    if (cycle === 'weekly') date.setDate(date.getDate() + (7 * q));
    else if (cycle === 'monthly') date.setMonth(date.getMonth() + (1 * q));
    else if (cycle === 'quarterly') date.setMonth(date.getMonth() + (3 * q));
    else if (cycle === 'semi_annually') date.setMonth(date.getMonth() + (6 * q));
    else if (cycle === 'yearly') date.setFullYear(date.getFullYear() + (1 * q));
    else if (cycle === 'biennially') date.setFullYear(date.getFullYear() + (2 * q));
    
    // Usually period ends a day before the next cycle starts
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  function handleFormChange(updates: Partial<InvoiceForm>) {
    setInvoiceForm(prev => {
      const next = { ...prev, ...updates };
      // Auto-calculate subtotal if plan, cycle, or qty changed
      if (updates.planCode !== undefined || updates.billingCycle !== undefined || updates.cycleQty !== undefined) {
        next.subtotalAmount = getPlanPrice(next.planCode, next.billingCycle, next.cycleQty) || next.subtotalAmount;
      }
      // Auto-calculate periodEnd if start, cycle, or qty changed
      if (updates.periodStart !== undefined || updates.billingCycle !== undefined || updates.cycleQty !== undefined) {
        next.periodEnd = calculatePeriodEnd(next.periodStart, next.billingCycle, next.cycleQty);
      }
      return next;
    });
  }

  function openInvoiceModal(company?: Company) {
    const sub = company?.subscriptionSummary;
    const cycle = sub?.billingCycle ?? 'monthly';
    // For renewal, pre-fill with current plan price. Plan field is hidden.
    const currentPlanCode = sub?.planCode ?? '';
    setError('');
    setInvoiceForm({
      ...defaultInvoiceForm,
      companyId: company?.id ?? '',
      subscriptionId: sub?.id ?? '',
      planCode: currentPlanCode,
      billingReason: 'renewal',
      billingCycle: cycle,
      cycleQty: '1',
      periodStart: defaultInvoiceForm.periodStart,
      periodEnd: calculatePeriodEnd(defaultInvoiceForm.periodStart, cycle, '1'),
      subtotalAmount: getPlanPrice(currentPlanCode, cycle, '1'),
    });
    setInvoiceModal(true);
  }

  async function saveInvoice() {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    try {
      await platformCreateInvoice(accessToken, {
        companyId: invoiceForm.companyId,
        subscriptionId: invoiceForm.subscriptionId || undefined,
        billingReason: invoiceForm.billingReason,
        // normalize to valid enum values for db
        billingCycle: ['weekly', 'monthly', 'quarterly', 'semi_annually'].includes(invoiceForm.billingCycle) 
          ? 'monthly' 
          : invoiceForm.billingCycle === 'lifetime' 
          ? 'lifetime' 
          : 'yearly',
        // Only send planCode for non-renewal reasons
        planCode: invoiceForm.billingReason !== 'renewal' ? (invoiceForm.planCode || undefined) : undefined,
        periodStart: toIso(invoiceForm.periodStart),
        periodEnd: toIso(invoiceForm.periodEnd),
        dueAt: toIso(invoiceForm.dueAt),
        subtotalAmount: Number(invoiceForm.subtotalAmount || 0),
        discountAmount: Number(invoiceForm.discountAmount || 0),
        taxAmount: Number(invoiceForm.taxAmount || 0),
        notes: invoiceForm.notes || undefined,
      });
      setInvoiceModal(false);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal membuat invoice.');
    } finally {
      setSaving(false);
    }
  }

  function openPayment(invoice: PlatformInvoice) {
    setError('');
    setPaymentForm({ ...defaultPaymentForm, amount: String(Number(invoice.totalAmount || 0)) });
    setPaymentModal(invoice);
  }

  async function savePayment() {
    if (!accessToken || !paymentModal) return;
    setSaving(true);
    setError('');
    try {
      await platformRecordInvoicePayment(accessToken, paymentModal.id, {
        amount: Number(paymentForm.amount || 0),
        method: paymentForm.method,
        provider: paymentForm.provider,
        paidAt: toIso(paymentForm.paidAt),
        paymentRef: paymentForm.paymentRef || undefined,
        notes: paymentForm.notes || undefined,
      });
      setPaymentModal(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal mencatat payment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1 className="platform-page-title"><ReceiptText size={24} /> Billing & Invoices</h1>
          <p className="platform-page-subtitle">Source-of-truth invoice, payment, dan renewal subscription tenant.</p>
        </div>
        <button id="platform-create-invoice-btn" onClick={() => openInvoiceModal()} className="platform-btn platform-btn-primary" type="button">
          <Plus size={16} /> Buat Invoice
        </button>
      </div>

      <div className="platform-stats-grid">
        <div className="platform-stat-card"><div className="platform-stat-icon"><FileText size={20} /></div><div className="platform-stat-info"><span>Total Invoice</span><strong>{summary.total}</strong></div></div>
        <div className="platform-stat-card"><div className="platform-stat-icon"><Banknote size={20} /></div><div className="platform-stat-info"><span>Collected</span><strong>{formatMoney(summary.collected)}</strong></div></div>
        <div className="platform-stat-card"><div className="platform-stat-icon"><ReceiptText size={20} /></div><div className="platform-stat-info"><span>Paid</span><strong>{summary.paid}</strong></div></div>
        <div className="platform-stat-card"><div className="platform-stat-icon"><FileText size={20} /></div><div className="platform-stat-info"><span>Open</span><strong>{summary.open}</strong></div></div>
      </div>

      <div className="platform-card">
        <div className="platform-card-header">
          <h2>Invoice Tracking</h2>
          <select id="billing-status-filter" value={status} onChange={e => setStatus(e.target.value)} className="platform-select platform-filter-select">
            <option value="">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="void">Void</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {loading ? <div className="platform-loading">Memuat invoice...</div> : (
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead><tr><th>Invoice</th><th>Company</th><th>Plan</th><th>Reason</th><th>Amount</th><th>Due</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.invoiceNumber}</strong>
                      <small style={{ display: 'block', color: 'var(--platform-subtle)', marginTop: '2px' }}>
                        {invoice.billingCycle}
                      </small>
                    </td>
                    <td>
                      <span>{invoice.companyName ?? '-'}</span>
                      {(() => {
                        const co = companies.find(c => c.id === invoice.companyId);
                        const sub = co?.subscriptionSummary;
                        return sub ? (
                          <small style={{ display: 'block', color: 'var(--platform-subtle)', marginTop: '2px' }}>
                            {sub.planName} · <span className={`platform-status-dot platform-status-${sub.status}`} style={{ fontSize: '0.7rem', padding: '0 .35rem' }}>{sub.status}</span>
                          </small>
                        ) : null;
                      })()}
                    </td>
                    <td>
                      {invoice.planName ? (
                        <div>
                          <strong style={{ color: '#fff' }}>{invoice.planName}</strong>
                          <small style={{ display: 'block', color: '#93c5fd', marginTop: '2px' }}>{invoice.planCode}</small>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--platform-subtle)' }}>—</span>
                      )}
                    </td>
                    <td><span className="platform-billing-reason-badge platform-billing-reason-{invoice.billingReason}">{reasonLabel[invoice.billingReason] ?? invoice.billingReason}</span></td>
                    <td>{formatMoney(invoice.totalAmount)}</td>
                    <td>{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString('id-ID') : '-'}</td>
                    <td><span className={`platform-status-dot platform-status-${invoice.status}`}>{invoice.status}</span></td>
                    <td>
                      <div className="platform-row-actions">
                        <Link to={`/platform/billing/invoices/${invoice.id}`} className="platform-btn-sm" type="button">Cetak</Link>
                        <button onClick={() => openPayment(invoice)} className="platform-btn-sm platform-btn-primary" type="button" disabled={invoice.status === 'paid'}>Catat Bayar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!invoices.length && <tr><td colSpan={8} className="platform-empty">Belum ada invoice.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {invoiceModal && (
        <div className="platform-modal-overlay" onClick={() => setInvoiceModal(false)}>
          <div className="platform-modal" onClick={e => e.stopPropagation()}>
            <div className="platform-modal-header">
              <div>
                <h2>Buat Invoice</h2>
                <small style={{ color: 'var(--platform-subtle)' }}>
                  {invoiceForm.billingReason === 'renewal' ? '↻ Renewal — melanjutkan plan yang sudah ada' : '✦ Ganti / Aktivasi Plan Baru'}
                </small>
              </div>
              <button onClick={() => setInvoiceModal(false)} className="platform-modal-close" type="button">×</button>
            </div>
            <div className="platform-modal-body">
              {error && <div className="platform-alert platform-alert-error">{error}</div>}
              <div className="platform-form-grid">

                {/* Step 1: Company */}
                <div className="platform-field platform-field-full">
                  <label>Company</label>
                  <select value={invoiceForm.companyId} onChange={e => {
                    const selected = companies.find(c => c.id === e.target.value);
                    const sub = selected?.subscriptionSummary;
                    const planCode = sub?.planCode ?? '';
                    const cycle = sub?.billingCycle ?? 'monthly';
                    handleFormChange({
                      companyId: e.target.value,
                      subscriptionId: sub?.id ?? '',
                      planCode,
                      billingCycle: cycle,
                    });
                  }} className="platform-select">
                    <option value="">Pilih company</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} · {c.subscriptionSummary?.planName ?? 'No plan'}</option>
                    ))}
                  </select>
                </div>

                {/* Current Subscription Info — shown when company is selected */}
                {invoiceForm.companyId && (() => {
                  const sub = companies.find(c => c.id === invoiceForm.companyId)?.subscriptionSummary;
                  if (!sub) return (
                    <div className="platform-field platform-field-full">
                      <div className="invoice-sub-info-card invoice-sub-info-none">
                        <span>⚠ Company ini belum memiliki subscription aktif</span>
                      </div>
                    </div>
                  );
                  return (
                    <div className="platform-field platform-field-full">
                      <label>Subscription Saat Ini</label>
                      <div className="invoice-sub-info-card">
                        <div className="invoice-sub-info-row">
                          <div>
                            <strong>{sub.planName}</strong>
                            <small>{sub.planCode}</small>
                          </div>
                          <span className={`platform-status-dot platform-status-${sub.status}`}>{sub.status}</span>
                        </div>
                        <div className="invoice-sub-info-meta">
                          <div>
                            <span>Cycle</span>
                            <strong>{sub.billingCycle}</strong>
                          </div>
                          <div>
                            <span>Berlaku s/d</span>
                            <strong>{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</strong>
                          </div>
                          <div>
                            <span>Harga / bln</span>
                            <strong>{sub.priceMonthly ? `Rp ${Number(sub.priceMonthly).toLocaleString('id-ID')}` : '—'}</strong>
                          </div>
                          <div>
                            <span>Harga / thn</span>
                            <strong>{sub.priceYearly ? `Rp ${Number(sub.priceYearly).toLocaleString('id-ID')}` : '—'}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Step 2: Billing Reason */}
                <div className="platform-field">
                  <label>Alasan Billing</label>
                  <select
                    value={invoiceForm.billingReason}
                    onChange={e => {
                      const reason = e.target.value;
                      // If switching to renewal, restore company's current plan
                      const sub = companies.find(c => c.id === invoiceForm.companyId)?.subscriptionSummary;
                      const renewalPlanCode = sub?.planCode ?? '';
                      const cycle = sub?.billingCycle ?? invoiceForm.billingCycle;
                      if (reason === 'renewal') {
                        handleFormChange({ billingReason: reason, planCode: renewalPlanCode, billingCycle: cycle });
                      } else {
                        handleFormChange({ billingReason: reason });
                      }
                    }}
                    className="platform-select"
                  >
                    <option value="renewal">Renewal — perpanjang plan yang sama</option>
                    <option value="new_subscription">New Subscription — aktivasi plan baru</option>
                    <option value="upgrade">Upgrade — naik ke plan lebih tinggi</option>
                    <option value="downgrade">Downgrade — turun ke plan lebih rendah</option>
                    <option value="manual_adjustment">Manual Adjustment — penyesuaian manual</option>
                  </select>
                </div>

                {/* Step 3: Plan — only for non-renewal */}
                {invoiceForm.billingReason !== 'renewal' ? (
                  <div className="platform-field">
                    <label>
                      {invoiceForm.billingReason === 'upgrade' ? '↑ Plan Tujuan (Upgrade)'
                        : invoiceForm.billingReason === 'downgrade' ? '↓ Plan Tujuan (Downgrade)'
                        : invoiceForm.billingReason === 'new_subscription' ? 'Plan yang Diaktifkan'
                        : 'Plan'}
                    </label>
                    <select
                      value={invoiceForm.planCode}
                      onChange={e => handleFormChange({ planCode: e.target.value })}
                      className="platform-select"
                    >
                      <option value="">Pilih plan</option>
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.code}>
                          Level {plan.level} · {plan.name} · {Number(plan.priceMonthly) === 0 ? 'Gratis' : formatMoney(plan.priceMonthly) + '/bln'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="platform-field">
                    <label>Plan (Renewal)</label>
                    <div className="platform-input" style={{ background: 'rgba(255,255,255,.03)', color: '#94a3b8', cursor: 'not-allowed' }}>
                      {companies.find(c => c.id === invoiceForm.companyId)?.subscriptionSummary?.planName ?? invoiceForm.planCode ?? '-'}
                    </div>
                    <small style={{ color: 'var(--platform-subtle)' }}>Plan tidak berubah saat renewal</small>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', gridColumn: '1 / -1' }}>
                  {/* Billing Cycle */}
                  <div className="platform-field">
                    <label>Billing Cycle</label>
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      <input 
                        type="number" 
                        min="1" 
                        value={invoiceForm.cycleQty} 
                        onChange={e => handleFormChange({ cycleQty: e.target.value })} 
                        className="platform-input" 
                        style={{ width: '80px' }} 
                        placeholder="Qty" 
                      />
                      <select value={invoiceForm.billingCycle} onChange={e => handleFormChange({ billingCycle: e.target.value })} className="platform-select" style={{ flex: 1 }}>
                        <option value="weekly">Mingguan (Weekly)</option>
                        <option value="monthly">Bulanan (Monthly)</option>
                        <option value="quarterly">3 Bulan (Quarterly)</option>
                        <option value="semi_annually">6 Bulan (Semi-Annually)</option>
                        <option value="yearly">1 Tahun (Yearly)</option>
                        <option value="biennially">2 Tahun (Biennially)</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                    </div>
                  </div>
                  {/* Period */}
                  <div className="platform-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                    <div><label>Period Start</label><input type="date" value={invoiceForm.periodStart} onChange={e => handleFormChange({ periodStart: e.target.value })} className="platform-input" style={{ width: '100%' }} /></div>
                    <div><label>Period End</label><input type="date" value={invoiceForm.periodEnd} onChange={e => handleFormChange({ periodEnd: e.target.value })} className="platform-input" style={{ width: '100%' }} /></div>
                  </div>
                </div>

                <div className="platform-field platform-field-full" style={{ maxWidth: '50%' }}><label>Due Date</label><input type="date" value={invoiceForm.dueAt} onChange={e => handleFormChange({ dueAt: e.target.value })} className="platform-input" /></div>

                {/* Pricing */}
                <div className="platform-field"><label>Subtotal</label><input type="number" value={invoiceForm.subtotalAmount} onChange={e => handleFormChange({ subtotalAmount: e.target.value })} className="platform-input" /></div>
                <div className="platform-field"><label>Diskon</label><input type="number" value={invoiceForm.discountAmount} onChange={e => handleFormChange({ discountAmount: e.target.value })} className="platform-input" /></div>
                <div className="platform-field"><label>Pajak</label><input type="number" value={invoiceForm.taxAmount} onChange={e => handleFormChange({ taxAmount: e.target.value })} className="platform-input" /></div>
                <div className="platform-field platform-field-full"><label>Notes</label><textarea value={invoiceForm.notes} onChange={e => handleFormChange({ notes: e.target.value })} className="platform-input" rows={2} /></div>
              </div>
            </div>
            <div className="platform-modal-footer">
              <button onClick={() => setInvoiceModal(false)} className="platform-btn platform-btn-ghost" type="button">Batal</button>
              <button
                onClick={saveInvoice}
                disabled={saving || !invoiceForm.companyId || !invoiceForm.subtotalAmount || (invoiceForm.billingReason !== 'renewal' && !invoiceForm.planCode)}
                className="platform-btn platform-btn-primary"
                type="button"
              >
                {saving ? 'Menyimpan...' : 'Simpan Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModal && (
        <div className="platform-modal-overlay" onClick={() => setPaymentModal(null)}>
          <div className="platform-modal" onClick={e => e.stopPropagation()}>
            <div className="platform-modal-header"><h2>Catat Pembayaran {paymentModal.invoiceNumber}</h2><button onClick={() => setPaymentModal(null)} className="platform-modal-close" type="button">×</button></div>
            <div className="platform-modal-body">
              {error && <div className="platform-alert platform-alert-error">{error}</div>}
              <div className="platform-form-grid">
                <div className="platform-field"><label>Amount</label><input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} className="platform-input" /></div>
                <div className="platform-field"><label>Tanggal Bayar</label><input type="date" value={paymentForm.paidAt} onChange={e => setPaymentForm(f => ({ ...f, paidAt: e.target.value }))} className="platform-input" /></div>
                <div className="platform-field"><label>Method</label><input value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))} className="platform-input" /></div>
                <div className="platform-field"><label>Payment Ref</label><input value={paymentForm.paymentRef} onChange={e => setPaymentForm(f => ({ ...f, paymentRef: e.target.value }))} className="platform-input" /></div>
                <div className="platform-field platform-field-full"><label>Notes</label><textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} className="platform-input" rows={3} /></div>
              </div>
            </div>
            <div className="platform-modal-footer"><button onClick={() => setPaymentModal(null)} className="platform-btn platform-btn-ghost" type="button">Batal</button><button onClick={savePayment} disabled={saving || !paymentForm.amount} className="platform-btn platform-btn-primary" type="button">{saving ? 'Menyimpan...' : 'Catat Pembayaran'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
