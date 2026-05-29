import React, { useEffect, useState } from 'react';
import { CreditCard, RefreshCw, AlertCircle, CheckCircle2, Shield, Zap, Users, Package, Boxes, Clock, Mail } from 'lucide-react';
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

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  starter: { bg: 'rgba(100,116,139,.12)', text: '#94a3b8', border: 'rgba(100,116,139,.25)', icon: '🌱' },
  basic: { bg: 'rgba(59,130,246,.12)', text: '#60a5fa', border: 'rgba(59,130,246,.25)', icon: '⚡' },
  pro: { bg: 'rgba(139,92,246,.15)', text: '#a78bfa', border: 'rgba(139,92,246,.3)', icon: '🚀' },
  enterprise: { bg: 'rgba(250,204,21,.12)', text: '#fde047', border: 'rgba(250,204,21,.25)', icon: '👑' },
};

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  trialing: { bg: 'rgba(96,165,250,.15)', text: '#60a5fa', label: 'Masa Trial' },
  active: { bg: 'rgba(52,211,153,.15)', text: '#34d399', label: 'Aktif' },
  past_due: { bg: 'rgba(249,115,22,.15)', text: '#fb923c', label: 'Jatuh Tempo' },
  suspended: { bg: 'rgba(239,68,68,.12)', text: '#f87171', label: 'Suspended' },
  cancelled: { bg: 'rgba(107,114,128,.12)', text: '#6b7280', label: 'Dibatalkan' },
  expired: { bg: 'rgba(239,68,68,.12)', text: '#f87171', label: 'Expired' },
};

const FEATURE_LABELS: Record<string, { icon: string; label: string }> = {
  visits: { icon: '📍', label: 'Visit Outlet (Geofence)' },
  attendance: { icon: '🤳', label: 'Absensi Wajah' },
  face_recognition: { icon: '👁️', label: 'Face Recognition AI' },
  reports: { icon: '📊', label: 'Laporan & Ekspor' },
  offline_sync: { icon: '🔄', label: 'Offline Sync' },
  api_access: { icon: '🔌', label: 'API Access' },
  multi_warehouse: { icon: '🏭', label: 'Multi Gudang' },
  consignment: { icon: '📦', label: 'Konsinyasi' },
  receivables: { icon: '💳', label: 'Piutang Usaha' },
  gps_tracking: { icon: '🛰️', label: 'GPS Tracking' },
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

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><CreditCard size={22} /> Subscription Saya</h1>
          <p className="admin-page-subtitle">Informasi plan aktif, batas penggunaan, dan fitur yang tersedia untuk perusahaan Anda.</p>
        </div>
        <button onClick={load} className="admin-btn-ghost" type="button"><RefreshCw size={15} /></button>

      </div>

      {error && <div className="admin-alert admin-alert-error"><AlertCircle size={15} /> {error}</div>}

      {loading ? (
        <div className="admin-loading">Memuat info subscription...</div>
      ) : !sub ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CreditCard size={40} style={{ color: 'var(--admin-text)', margin: '0 auto .75rem' }} />
          <h2 style={{ color: 'var(--admin-muted)', marginBottom: '.5rem' }}>Tidak ada subscription aktif</h2>
          <p style={{ color: 'var(--admin-muted-dim)', fontSize: '.875rem' }}>Hubungi admin platform untuk mengaktifkan subscription Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4 items-start">
          {/* Main Info */}
          <div className="flex flex-col gap-4">
            {/* Plan Header */}
            <div className="admin-card" style={{ borderColor: planStyle.border, background: planStyle.bg, padding: '1.5rem' }}>
              <div className="flex items-center gap-4 flex-wrap">
                <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{planStyle.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1">
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: planStyle.text, textTransform: 'uppercase', letterSpacing: '-.02em' }}>
                      Plan {plan?.name ?? sub.planCode}
                    </h2>
                    <span className="admin-badge" style={{ background: statusInfo.bg, color: statusInfo.text, border: `1px solid ${statusInfo.text}40` }}>
                      {statusInfo.label}
                    </span>
                  </div>
                  {plan?.description && (
                    <p className="m-0 text-sm text-[var(--admin-muted)]">{plan.description}</p>
                  )}
                </div>
                {plan && (
                  <div className="text-right">
                    <div className="text-[0.72rem] uppercase tracking-[0.06em] text-[var(--admin-muted)]">Harga Bulanan</div>
                    <div style={{ color: planStyle.text }} className="text-[1.35rem] font-extrabold">{formatRp(plan.priceMonthly)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Limits */}
            {limits && Object.keys(limits).length > 0 && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2>Batas Penggunaan</h2>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
                  {Object.entries(limits).map(([key, val]) => (
                    <div key={key} className="bg-[var(--admin-surface-hover)] border border-[var(--admin-border)] rounded-[14px] p-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-[var(--admin-muted)] text-[0.73rem] uppercase tracking-[0.07em] mb-1.5">
                        {LIMIT_ICONS[key] ?? <Shield size={14} />}
                        {LIMIT_LABELS[key] ?? key}
                      </div>
                      <div className="text-[1.5rem] font-extrabold text-[var(--admin-foreground)]">
                        {val === -1 ? '∞' : val.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            {features && features.length > 0 && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2>Fitur Tersedia</h2>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
                  {features.map(f => {
                    const info = FEATURE_LABELS[f];
                    return (
                      <div key={f} className="flex items-center gap-2.5 py-2.5 px-3.5 bg-[var(--admin-success-soft)] border border-[var(--admin-success-soft)] rounded-xl">
                        <CheckCircle2 size={16} className="text-[var(--admin-success)] shrink-0" />
                        <span className="text-sm text-[var(--admin-text)]">
                          {info ? `${info.icon} ${info.label}` : f}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="flex flex-col gap-3">
            {/* Period Info */}
            <div className="admin-card">
              <div className="admin-card-header mb-3 pb-2.5">
                <h2>Info Periode</h2>
                <Clock size={15} className="text-[var(--admin-muted)]" />
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'Billing Cycle', value: sub.billingCycle === 'monthly' ? 'Bulanan' : sub.billingCycle === 'yearly' ? 'Tahunan' : 'Seumur Hidup' },
                  { label: 'Mulai Periode', value: formatDate(sub.currentPeriodStart) },
                  { label: 'Akhir Periode', value: formatDate(sub.currentPeriodEnd) },
                  { label: 'Trial Hingga', value: formatDate(sub.trialEndsAt) },
                  { label: 'Dibayar Pada', value: formatDate(sub.paidAt) },
                  { label: 'Nominal Bayar', value: sub.amountPaid ? formatRp(sub.amountPaid) : '—' },
                ].filter(r => r.value !== '—').map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center text-[0.82rem]">
                    <span className="text-[var(--admin-muted)]">{label}</span>
                    <span className="text-[var(--admin-text)] font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Days Remaining */}
            {daysLeft !== null && (
              <div
                className="admin-card text-center p-5"
                style={{
                  background: daysLeft <= 7 ? 'var(--admin-danger-soft)' : 'var(--admin-success-soft)',
                  borderColor: daysLeft <= 7 ? 'var(--admin-danger-soft)' : 'var(--admin-success-soft)',
                }}
              >
                <div style={{ color: daysLeft <= 7 ? 'var(--admin-danger-light)' : 'var(--admin-success)' }} className="text-[2.5rem] font-black leading-none">
                  {daysLeft}
                </div>
                <div className="text-[var(--admin-muted)] text-[0.78rem] mt-1">hari tersisa</div>
                {daysLeft <= 7 && daysLeft > 0 && (
                  <div className="mt-3 text-[var(--admin-danger-light)] text-[0.78rem] bg-[var(--admin-danger-soft)] rounded-lg p-2">
                    <AlertCircle size={14} className="inline mr-1 align-[-2px]" />
                    Subscription Anda segera habis. Hubungi admin untuk perpanjangan.
                  </div>
                )}
                {daysLeft <= 0 && (
                  <div className="mt-3 text-[var(--admin-danger-light)] text-[0.78rem] bg-[var(--admin-danger-soft)] rounded-lg p-2">
                    <AlertCircle size={14} className="inline mr-1 align-[-2px]" />
                    Subscription telah berakhir. Akses akan dibatasi.
                  </div>
                )}
              </div>
            )}

            {/* Contact */}
            <div className="admin-card p-4 px-4.5">
              <p className="mb-2.5 text-[var(--admin-muted)] text-[0.82rem]">Ingin upgrade atau ada pertanyaan?</p>
              <a href="mailto:support@mahasura.id" className="flex items-center gap-1.5 bg-[var(--brand-cream)] border border-[var(--brand-border)] text-[var(--brand-accent)] rounded-[10px] py-2.5 px-4 text-[0.82rem] font-bold no-underline justify-center">
                <Mail size={15} /> Hubungi Tim Kami
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
