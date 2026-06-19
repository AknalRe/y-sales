import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  CreditCard,
  Inbox,
  Loader2,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from '@/lib/api/client';

type NotificationsPopupProps = {
  open: boolean;
  onClose: () => void;
  accessToken?: string | null;
  onUnreadCountChange?: (count: number) => void;
  variant?: 'admin' | 'sales';
};

function formatNotificationTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return 'Kemarin';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getNotificationIcon(type: string, isRead: boolean) {
  const baseClass = `grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition ${
    isRead ? 'bg-slate-100 text-slate-400' : 'bg-orange-50 text-orange-600'
  }`;

  switch (type) {
    case 'sales_order_approved':
      return <span className={`${baseClass} !bg-emerald-50 !text-emerald-600`}><CheckCircle2 size={18} /></span>;
    case 'sales_order_rejected':
      return <span className={`${baseClass} !bg-rose-50 !text-rose-600`}><XCircle size={18} /></span>;
    case 'deposit_reconciled':
      return <span className={`${baseClass} !bg-teal-50 !text-teal-600`}><CreditCard size={18} /></span>;
    case 'deposit_rejected':
      return <span className={`${baseClass} !bg-amber-50 !text-amber-600`}><AlertCircle size={18} /></span>;
    case 'withdrawal_approved':
    case 'consignment_extend_approved':
    case 'consignment_withdraw_approved':
    case 'consignment_sold_approved':
    case 'consignment_payment_approved':
      return <span className={`${baseClass} !bg-sky-50 !text-sky-600`}><Check size={18} /></span>;
    case 'consignment_rejected':
      return <span className={`${baseClass} !bg-orange-50 !text-orange-600`}><XCircle size={18} /></span>;
    default:
      return <span className={baseClass}><Bell size={18} /></span>;
  }
}

export function NotificationsPopup({
  open,
  onClose,
  accessToken,
  onUnreadCountChange,
  variant = 'admin',
}: NotificationsPopupProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');
  const limit = variant === 'sales' ? 12 : 15;

  const unreadCount = useMemo(() => notifications.filter(item => !item.isRead).length, [notifications]);

  async function loadNotifications() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await getNotifications(accessToken, 1, limit);
      const list = res.data ?? [];
      setNotifications(list);
      onUnreadCountChange?.(list.filter(item => !item.isRead).length);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat notifikasi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, accessToken]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  async function handleMarkAllAsRead() {
    if (!accessToken || markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setError('');
    try {
      await markAllNotificationsAsRead(accessToken);
      setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
      onUnreadCountChange?.(0);
      window.dispatchEvent(new CustomEvent('notifications:updated'));
    } catch (err: any) {
      setError(err?.message || 'Gagal menandai semua notifikasi dibaca.');
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleMarkAsRead(item: NotificationItem) {
    if (!accessToken || item.isRead) return;
    setNotifications(prev => prev.map(row => row.id === item.id ? { ...row, isRead: true } : row));
    onUnreadCountChange?.(Math.max(0, unreadCount - 1));
    try {
      await markNotificationAsRead(accessToken, item.id);
      window.dispatchEvent(new CustomEvent('notifications:updated'));
    } catch (err: any) {
      setNotifications(prev => prev.map(row => row.id === item.id ? { ...row, isRead: false } : row));
      setError(err?.message || 'Gagal menandai notifikasi dibaca.');
    }
  }

  if (!open) return null;

  const panelClass = variant === 'sales'
    ? 'fixed left-3 right-3 top-4 z-[120] mx-auto max-w-[25rem]'
    : 'fixed right-4 top-20 z-[120] w-[min(26rem,calc(100vw-2rem))]';

  return (
    <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true" aria-label="Daftar notifikasi">
      <button
        aria-label="Tutup notifikasi"
        className="absolute inset-0 h-full w-full cursor-default bg-slate-950/20 backdrop-blur-[2px]"
        type="button"
        onClick={onClose}
      />

      <section className={`${panelClass} overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]`}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                <Bell size={17} />
              </span>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-slate-950">Notifikasi</h2>
                <p className="text-xs font-medium text-slate-500">{unreadCount} belum dibaca</p>
              </div>
            </div>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            type="button"
            onClick={onClose}
            title="Tutup"
          >
            <X size={17} />
          </button>
        </header>

        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={loadNotifications}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white shadow-[0_10px_22px_rgba(234,88,12,0.22)] transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Tandai dibaca
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="max-h-[min(31rem,calc(100vh-12rem))] overflow-y-auto p-3">
          {loading && notifications.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map(item => (
                <div key={item} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="grid place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400">
                <Inbox size={24} />
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">Belum ada notifikasi</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">Update aktivitas akan muncul di sini.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(item => (
                <button
                  key={item.id}
                  className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${
                    item.isRead
                      ? 'border-slate-100 bg-white hover:bg-slate-50'
                      : 'border-orange-200 bg-orange-50/55 shadow-[0_10px_28px_rgba(234,88,12,0.08)] hover:bg-orange-50'
                  }`}
                  type="button"
                  onClick={() => handleMarkAsRead(item)}
                >
                  {getNotificationIcon(item.type, item.isRead)}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={`line-clamp-1 text-sm ${item.isRead ? 'font-bold text-slate-700' : 'font-extrabold text-slate-950'}`}>
                        {item.title}
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-slate-400">
                        {formatNotificationTime(item.createdAt)}
                      </span>
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">
                      {item.body || 'Tidak ada detail tambahan.'}
                    </span>
                  </span>
                  {!item.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
