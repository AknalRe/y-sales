import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Clock,
  Cloud,
  CreditCard,
  Mail,
  Package,
  RefreshCw,
  Satellite,
  Server,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
  Warehouse,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { getMySubscription, type TenantSubscriptionInfo } from '@/lib/api/tenant';
import { apiRequest } from '@/lib/api/client';

type PlanDetails = {
  id: string;
  code: string;
  name: string;
  description?: string;
  level: number;
  priceMonthly: string;
  priceYearly: string;
  limits?: Record<string, number> | null;
  features?: string[] | null;
};

const PLAN_COLORS: Record<string, { tone: string; icon: LucideIcon }> = {
  starter: { tone: 'starter', icon: Shield },
  basic: { tone: 'basic', icon: Zap },
  pro: { tone: 'pro', icon: TrendingUp },
  enterprise: { tone: 'enterprise', icon: Server },
};

const STATUS_COLOR: Record<string, { tone: string; label: string }> = {
  trialing: { tone: 'info', label: 'Masa Trial' },
  active: { tone: 'success', label: 'Aktif' },
  past_due: { tone: 'warning', label: 'Jatuh Tempo' },
  suspended: { tone: 'danger', label: 'Suspended' },
  cancelled: { tone: 'muted', label: 'Dibatalkan' },
  expired: { tone: 'danger', label: 'Expired' },
};

const FEATURE_LABELS: Record<string, { icon: LucideIcon; label: string }> = {
  visits: { icon: Satellite, label: 'Visit Outlet (Geofence)' },
  attendance: { icon: Smartphone, label: 'Absensi Wajah' },
  face_recognition: { icon: Shield, label: 'Face Recognition AI' },
  reports: { icon: TrendingUp, label: 'Laporan & Ekspor' },
  offline_sync: { icon: RefreshCw, label: 'Offline Sync' },
  api_access: { icon: Server, label: 'API Access' },
  multi_warehouse: { icon: Warehouse, label: 'Multi Gudang' },
  consignment: { icon: Package, label: 'Konsinyasi' },
  receivables: { icon: CreditCard, label: 'Piutang Usaha' },
  gps_tracking: { icon: Satellite, label: 'GPS Tracking' },
  r2_storage: { icon: Cloud, label: 'Cloud Storage' },
};

const LIMIT_ICONS: Record<string, React.ReactNode> = {
  users: <Users size={14} />,
  outlets: <Boxes size={14} />,
  products: <Package size={14} />,
  storage_gb: <Shield size={14} />,
  api_calls_per_day: <Zap size={14} />,
};

const LIMIT_LABELS: Record<string, string> = {
  users: 'Max Users',
  outlets: 'Max Outlets',
  products: 'Max Produk',
  storage_gb: 'Storage (GB)',
  api_calls_per_day: 'API Calls/Hari',
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatRp(v: string | number) {
  return `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
}

function daysRemaining(end?: string | null): number | null {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function apiReq<T>(path: string, token: string): Promise<T> {
  return apiRequest<T>(path, { headers: { Authorization: `Bearer ${token}` } });
}

export function SubscriptionPage() {
  const { accessToken } = useAuth();
  const [sub, setSub] = useState<TenantSubscriptionInfo | null>(null);
  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const subRes = await getMySubscription(accessToken);
      setSub(subRes.subscription);

      // If subscription has planCode, try fetch plan details from catalog
      if (subRes.subscription?.planCode) {
        try {
          const catRes = await apiReq<{ plans: PlanDetails[] }>('/platform/plans', accessToken);
          const found = catRes.plans?.find(p => p.code === subRes.subscription!.planCode);
          if (found) setPlan(found);
        } catch {
          // plan catalog might not be accessible for tenant — that's okay
        }
      }
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data subscription.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  const planStyle = PLAN_COLORS[sub?.planCode ?? ''] ?? PLAN_COLORS.starter;
  const statusInfo = STATUS_COLOR[sub?.status ?? ''] ?? STATUS_COLOR.active;
  const daysLeft = daysRemaining(sub?.currentPeriodEnd ?? sub?.trialEndsAt);
  const limits = (sub?.limitsSnapshot ?? plan?.limits) as Record<string, number> | null;
  const features = (sub?.featuresSnapshot ?? plan?.features) as string[] | null;
  const PlanIcon = planStyle.icon;
  const usageCards = useMemo(() => limits ? Object.entries(limits) : [], [limits]);
  const periodRows = [
    { label: 'Billing Cycle', value: sub?.billingCycle === 'monthly' ? 'Bulanan' : sub?.billingCycle === 'yearly' ? 'Tahunan' : 'Seumur Hidup' },
    { label: 'Mulai Periode', value: formatDate(sub?.currentPeriodStart) },
    { label: 'Akhir Periode', value: formatDate(sub?.currentPeriodEnd) },
    { label: 'Trial Hingga', value: formatDate(sub?.trialEndsAt) },
    { label: 'Dibayar Pada', value: formatDate(sub?.paidAt) },
    { label: 'Nominal Bayar', value: sub?.amountPaid ? formatRp(sub.amountPaid) : '—' },
  ].filter((row) => row.value !== '—');

  return (
    <div className="admin-page admin-subscription-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><CreditCard size={22} /> Subscription Saya</h1>
          <p className="admin-page-subtitle">Informasi plan aktif, batas penggunaan, dan fitur yang tersedia untuk perusahaan Anda.</p>
        </div>
        <button onClick={load} className="admin-btn-ghost" type="button" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <div className="admin-alert admin-alert-error"><AlertCircle size={15} /> {error}</div>}

      {loading ? (
        <div className="admin-loading"><RefreshCw size={18} className="spin" /> Memuat info subscription...</div>
      ) : !sub ? (
        <div className="subscription-empty">
          <span><CreditCard size={34} /></span>
          <h2>Tidak ada subscription aktif</h2>
          <p>Hubungi admin platform untuk mengaktifkan subscription perusahaan Anda.</p>
        </div>
      ) : (
        <div className="subscription-layout">
          <div className="subscription-main">
            <section className={`subscription-hero ${planStyle.tone}`}>
              <div className="subscription-plan-icon"><PlanIcon size={26} /></div>
              <div className="subscription-hero-copy">
                <span className="admin-kicker">Plan Aktif</span>
                <div className="subscription-title-row">
                  <h2>{plan?.name ?? sub.planCode}</h2>
                  <span className={`subscription-status ${statusInfo.tone}`}>{statusInfo.label}</span>
                </div>
                <p>{plan?.description ?? 'Paket berlangganan aktif untuk operasional perusahaan saat ini.'}</p>
              </div>
              {plan ? (
                <div className="subscription-price">
                  <small>Harga bulanan</small>
                  <strong>{formatRp(plan.priceMonthly)}</strong>
                  <span>Tahunan {formatRp(plan.priceYearly)}</span>
                </div>
              ) : null}
            </section>

            {/* {usageCards.length > 0 ? (
              <section className="subscription-panel">
                <div className="subscription-panel-header">
                  <div>
                    <span className="admin-kicker">Limit Company</span>
                    <h2>Batas Penggunaan</h2>
                  </div>
                  <Shield size={18} />
                </div>
                <div className="subscription-limit-grid">
                  {usageCards.map(([key, val]) => (
                    <div key={key} className="subscription-limit-card">
                      <span>
                        {LIMIT_ICONS[key] ?? <Shield size={14} />}
                        {LIMIT_LABELS[key] ?? key}
                      </span>
                      <strong>{val === -1 ? '∞' : val.toLocaleString('id-ID')}</strong>
                    </div>
                  ))}
                </div>
              </section>
            ) : null} */}

            {features && features.length > 0 ? (
              <section className="subscription-panel">
                <div className="subscription-panel-header">
                  <div>
                    <span className="admin-kicker">Fitur Aktif</span>
                    <h2>Fitur Tersedia</h2>
                  </div>
                  <CheckCircle2 size={18} />
                </div>
                <div className="subscription-feature-grid">
                  {features.map((feature) => {
                    const info = FEATURE_LABELS[feature];
                    const Icon = info?.icon ?? CheckCircle2;
                    return (
                      <div key={feature} className="subscription-feature-card">
                        <span><Icon size={16} /></span>
                        <strong>{info?.label ?? feature}</strong>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="subscription-side">
            <section className="subscription-panel compact">
              <div className="subscription-panel-header">
                <div>
                  <span className="admin-kicker">Periode</span>
                  <h2>Info Billing</h2>
                </div>
                <Clock size={18} />
              </div>
              <div className="subscription-meta-list">
                {periodRows.map(({ label, value }) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </section>

            {daysLeft !== null ? (
              <section className={`subscription-days ${daysLeft <= 7 ? 'urgent' : 'safe'}`}>
                <strong>{daysLeft}</strong>
                <span>hari tersisa</span>
                {daysLeft <= 7 && daysLeft > 0 ? <p>Subscription segera habis. Hubungi admin untuk perpanjangan.</p> : null}
                {daysLeft <= 0 ? <p>Subscription telah berakhir. Akses akan dibatasi.</p> : null}
              </section>
            ) : null}

            <section className="subscription-contact">
              <p>Ingin upgrade atau ada pertanyaan?</p>
              <a href="mailto:support@yuksales.id">
                <Mail size={15} /> Hubungi Tim Kami
              </a>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
