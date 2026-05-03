import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Layers3,
  Plus,
  ReceiptText,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { platformGetCompanies, platformGetPlans, type Company, type SubscriptionPlan } from '@/lib/api/platform';

const formatRupiah = (value: number) => `Rp ${Math.round(value).toLocaleString('id-ID')}`;

export function PlatformDashboardPage() {
  const { accessToken, user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      platformGetCompanies(accessToken),
      platformGetPlans(accessToken),
    ]).then(([companyData, planData]) => {
      setCompanies(companyData.companies);
      setPlans(planData.plans);
    }).finally(() => setLoading(false));
  }, [accessToken]);

  const metrics = useMemo(() => {
    const activeCount = companies.filter(company => company.status === 'active').length;
    const trialCount = companies.filter(company => company.status === 'trialing').length;
    const suspendedCount = companies.filter(company => company.status === 'suspended').length;
    const recurringSubscriptions = companies
      .map(company => company.subscriptionSummary)
      .filter(Boolean)
      .filter(subscription => ['active', 'trialing', 'past_due'].includes(subscription!.status));
    const estimatedMrr = recurringSubscriptions.reduce((sum, subscription) => {
      if (!subscription) return sum;
      if (subscription.billingCycle === 'monthly') return sum + Number(subscription.priceMonthly ?? 0);
      if (subscription.billingCycle === 'yearly') return sum + Number(subscription.priceYearly ?? 0) / 12;
      return sum;
    }, 0);
    const paidSubscriptions = companies
      .map(company => ({ company, subscription: company.subscriptionSummary }))
      .filter(item => item.subscription?.amountPaid);
    const totalRecordedRevenue = paidSubscriptions.reduce((sum, item) => sum + Number(item.subscription?.amountPaid ?? 0), 0);

    return {
      activeCount,
      trialCount,
      suspendedCount,
      estimatedMrr,
      estimatedArr: estimatedMrr * 12,
      totalRecordedRevenue,
      recentPayments: paidSubscriptions
        .sort((a, b) => new Date(b.subscription?.paidAt ?? 0).getTime() - new Date(a.subscription?.paidAt ?? 0).getTime())
        .slice(0, 4),
    };
  }, [companies]);

  const recentCompanies = companies.slice(0, 5);
  const planPreview = [...plans].sort((a, b) => (a.level ?? 1) - (b.level ?? 1)).slice(0, 4);

  const kpis = [
    { label: 'Companies Aktif', value: metrics.activeCount, icon: CheckCircle2, tone: 'green', hint: 'Tenant operasional' },
    { label: 'Masa Trial', value: metrics.trialCount, icon: Clock, tone: 'amber', hint: 'Perlu follow-up' },
    { label: 'Disuspend', value: metrics.suspendedCount, icon: AlertTriangle, tone: 'red', hint: 'Butuh review' },
    { label: 'Total Plans', value: plans.length, icon: CreditCard, tone: 'violet', hint: 'Level subscription' },
  ];

  return (
    <div className="platform-page platform-dashboard-polished">
      <section className="platform-dashboard-hero">
        <div className="platform-hero-glow" />
        <div className="platform-hero-content">
          <span className="platform-eyebrow"><Sparkles size={15} /> Platform Command Center</span>
          <h1>Platform Overview</h1>
          <p>
            Selamat datang, <strong>{user?.name ?? 'Super Admin'}</strong>. Pantau tenant, revenue,
            subscription, dan aktivitas billing SaaS dari satu dashboard.
          </p>
          <div className="platform-hero-actions">
            <Link to="/platform/billing" className="platform-btn platform-btn-primary">
              <ReceiptText size={16} /> Kelola Billing
            </Link>
            <Link to="/platform/companies" className="platform-btn platform-btn-ghost">
              <Building2 size={16} /> Kelola Companies
            </Link>
          </div>
        </div>
        <div className="platform-hero-panel">
          <span>MRR Estimate</span>
          <strong>{loading ? '—' : formatRupiah(metrics.estimatedMrr)}</strong>
          <small>ARR {loading ? '—' : formatRupiah(metrics.estimatedArr)}</small>
          <div className="platform-hero-meter"><span style={{ width: `${Math.min(100, Math.max(8, companies.length * 12))}%` }} /></div>
        </div>
      </section>

      <section className="platform-kpi-grid">
        {kpis.map(item => {
          const Icon = item.icon;
          return (
            <article key={item.label} className={`platform-kpi-card platform-kpi-${item.tone}`}>
              <div className="platform-kpi-icon"><Icon size={21} /></div>
              <div>
                <span>{item.label}</span>
                <strong>{loading ? '—' : item.value}</strong>
                <small>{item.hint}</small>
              </div>
            </article>
          );
        })}
      </section>

      <section className="platform-dashboard-grid-main">
        <article className="platform-card platform-revenue-card platform-dashboard-revenue">
          <div className="platform-card-header">
            <div>
              <h2>Revenue Intelligence</h2>
              <p className="platform-muted">Ringkasan revenue dari subscription snapshot. Histori resmi dikelola di Billing.</p>
            </div>
            <Link to="/platform/billing" className="platform-link-sm">Buka Billing <ArrowUpRight size={14} /></Link>
          </div>
          <div className="platform-revenue-grid">
            <div>
              <span className="platform-revenue-label">Monthly Recurring Revenue</span>
              <strong className="platform-revenue-value">{loading ? '—' : formatRupiah(metrics.estimatedMrr)}</strong>
              <p className="platform-muted">Dihitung dari tenant active/trialing/past_due.</p>
            </div>
            <div>
              <span className="platform-revenue-label">Annual Run Rate</span>
              <strong className="platform-revenue-value">{loading ? '—' : formatRupiah(metrics.estimatedArr)}</strong>
              <p className="platform-muted">Proyeksi tahunan dari MRR saat ini.</p>
            </div>
            <div>
              <span className="platform-revenue-label">Recorded Payment</span>
              <strong className="platform-revenue-value">{loading ? '—' : formatRupiah(metrics.totalRecordedRevenue)}</strong>
              <p className="platform-muted">Snapshot pembayaran/manual override terakhir.</p>
            </div>
          </div>
          <div className="platform-payment-list platform-payment-list-compact">
            {metrics.recentPayments.length === 0 ? (
              <p className="platform-muted">Belum ada pembayaran tercatat.</p>
            ) : metrics.recentPayments.map(item => (
              <div key={item.company.id} className="platform-payment-row">
                <div>
                  <strong>{item.company.name}</strong>
                  <span>{item.subscription?.planName} · {item.subscription?.invoiceRef ?? 'Tanpa invoice'}</span>
                </div>
                <strong>{formatRupiah(Number(item.subscription?.amountPaid ?? 0))}</strong>
              </div>
            ))}
          </div>
        </article>

        <aside className="platform-quick-actions-card">
          <div className="platform-card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="platform-quick-actions">
            <Link to="/platform/companies" className="platform-quick-action"><Plus size={17} /><span>Tambah Company</span><ChevronRight size={15} /></Link>
            <Link to="/platform/plans" className="platform-quick-action"><CreditCard size={17} /><span>Kelola Plans</span><ChevronRight size={15} /></Link>
            <Link to="/platform/features" className="platform-quick-action"><Layers3 size={17} /><span>Feature Catalog</span><ChevronRight size={15} /></Link>
            <Link to="/platform/billing" className="platform-quick-action"><Banknote size={17} /><span>Invoice & Payment</span><ChevronRight size={15} /></Link>
          </div>
        </aside>
      </section>

      <section className="platform-two-col platform-dashboard-lists">
        <div className="platform-card">
          <div className="platform-card-header">
            <h2>Companies Terbaru</h2>
            <Link to="/platform/companies" className="platform-link-sm">Lihat semua <ArrowUpRight size={14} /></Link>
          </div>
          <div className="platform-card-body">
            {loading ? <p className="platform-muted">Memuat...</p> : (
              <ul className="platform-company-list">
                {recentCompanies.map(company => (
                  <li key={company.id}>
                    <div className="platform-company-row">
                      <div className="platform-company-avatar-sm">{company.name.charAt(0)}</div>
                      <div className="platform-company-row-info">
                        <span className="platform-company-row-name">{company.name}</span>
                        <small>{company.subscriptionSummary?.planName ?? 'Belum ada plan'} · {company.city ?? 'No city'}</small>
                      </div>
                      <span className={`platform-status-dot platform-status-${company.status}`}>{company.status}</span>
                    </div>
                  </li>
                ))}
                {recentCompanies.length === 0 && <li className="platform-empty-list">Belum ada company.</li>}
              </ul>
            )}
          </div>
        </div>

        <div className="platform-card">
          <div className="platform-card-header">
            <h2>Subscription Plans</h2>
            <Link to="/platform/plans" className="platform-link-sm">Kelola <ArrowUpRight size={14} /></Link>
          </div>
          <div className="platform-card-body">
            {loading ? <p className="platform-muted">Memuat...</p> : (
              <ul className="platform-plan-list">
                {planPreview.map(plan => (
                  <li key={plan.id} className="platform-plan-row">
                    <div className="platform-plan-icon"><Building2 size={16} /></div>
                    <div className="platform-plan-info">
                      <span className="platform-plan-name">Level {plan.level ?? 1} · {plan.name}</span>
                      <span className="platform-plan-price">
                        {Number(plan.priceMonthly) === 0 ? 'Gratis' : `${formatRupiah(Number(plan.priceMonthly))}/bln`}
                      </span>
                    </div>
                    <span className={`platform-status-dot platform-status-${plan.status}`}>{plan.status}</span>
                  </li>
                ))}
                {planPreview.length === 0 && <li className="platform-empty-list">Belum ada plan.</li>}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
