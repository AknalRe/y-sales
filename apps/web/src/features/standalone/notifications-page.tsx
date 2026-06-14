import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  AlertCircle, 
  Inbox, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { 
  getNotifications, 
  markAllNotificationsAsRead, 
  markNotificationAsRead, 
  type NotificationItem 
} from '@/lib/api/client';

export function NotificationsPage() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const isSales = user?.roleCode === 'SALES' || window.location.pathname.startsWith('/sales');

  async function loadNotifications() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await getNotifications(accessToken, page, limit);
      setNotifications(res.data || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat notifikasi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [accessToken, page]);

  async function handleMarkAllAsRead() {
    if (!accessToken || loading) return;
    try {
      await markAllNotificationsAsRead(accessToken);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      // Dispatch event to update unread count globally in shells
      window.dispatchEvent(new CustomEvent('notifications:updated'));
    } catch (err: any) {
      setError(err?.message || 'Gagal menandai semua notifikasi dibaca.');
    }
  }

  async function handleMarkAsRead(id: string) {
    if (!accessToken) return;
    try {
      await markNotificationAsRead(accessToken, id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      // Dispatch event to update unread count globally in shells
      window.dispatchEvent(new CustomEvent('notifications:updated'));
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays === 1) return 'Kemarin';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function getNotificationIcon(type: string, isRead: boolean) {
    const iconClass = `p-2.5 rounded-2xl flex-shrink-0 transition-all ${
      isRead ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600 shadow-[0_4px_12px_rgba(99,102,241,0.12)]'
    }`;

    switch (type) {
      case 'sales_order_approved':
        return (
          <div className={`${iconClass} !bg-emerald-50 !text-emerald-600`}>
            <CheckCircle2 size={20} />
          </div>
        );
      case 'sales_order_rejected':
        return (
          <div className={`${iconClass} !bg-rose-50 !text-rose-600`}>
            <XCircle size={20} />
          </div>
        );
      case 'deposit_reconciled':
        return (
          <div className={`${iconClass} !bg-teal-50 !text-teal-600`}>
            <CreditCard size={20} />
          </div>
        );
      case 'deposit_rejected':
        return (
          <div className={`${iconClass} !bg-amber-50 !text-amber-600`}>
            <AlertCircle size={20} />
          </div>
        );
      case 'withdrawal_approved':
      case 'consignment_extend_approved':
      case 'consignment_withdraw_approved':
      case 'consignment_sold_approved':
      case 'consignment_payment_approved':
        return (
          <div className={`${iconClass} !bg-sky-50 !text-sky-600`}>
            <Check size={20} />
          </div>
        );
      case 'consignment_rejected':
        return (
          <div className={`${iconClass} !bg-orange-50 !text-orange-600`}>
            <XCircle size={20} />
          </div>
        );
      default:
        return (
          <div className={iconClass}>
            <Bell size={20} />
          </div>
        );
    }
  }

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className={`w-full ${isSales ? 'max-w-md mx-auto pb-8' : 'p-6 bg-slate-50 min-h-[calc(100vh-80px)]'}`}>
      
      {/* Header Halaman */}
      <div className={`flex items-center justify-between mb-6 ${isSales ? 'pt-2' : ''}`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(isSales ? '/sales' : '/admin')}
            className="p-2 hover:bg-slate-200/60 rounded-xl transition text-slate-600"
            title="Kembali"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Notifikasi</h1>
            <p className="text-xs text-slate-500">Pemberitahuan & update aktivitas Anda</p>
          </div>
        </div>

        {notifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-600 rounded-xl transition-all"
          >
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 mb-4 text-sm bg-rose-50 text-rose-600 rounded-2xl flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Konten Notifikasi */}
      {loading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 flex gap-4 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
          <div className="p-4 bg-slate-50 rounded-full text-slate-400 mb-4 animate-bounce">
            <Inbox size={42} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Inbox Bersih!</h3>
          <p className="text-xs text-slate-400 text-center mt-1">Anda tidak memiliki notifikasi saat ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (!item.isRead) handleMarkAsRead(item.id);
              }}
              className={`bg-white p-4 rounded-3xl border transition-all duration-200 flex gap-4 relative group cursor-pointer ${
                item.isRead 
                  ? 'border-slate-100 hover:border-slate-200/80 opacity-90' 
                  : 'border-indigo-100 bg-indigo-50/20 shadow-[0_4px_20px_rgba(99,102,241,0.04)] hover:bg-indigo-50/40 hover:border-indigo-200'
              }`}
            >
              {getNotificationIcon(item.type, item.isRead)}

              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm tracking-tight truncate ${item.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {formatTime(item.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">
                  {item.body}
                </p>
              </div>

              {!item.isRead && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping absolute" />
                  <span className="h-2 w-2 rounded-full bg-indigo-600" />
                </div>
              )}
            </div>
          ))}

          {/* Paginasi */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 px-1">
              <span className="text-xs text-slate-500">
                Halaman {page} dari {totalPages} ({total} notifikasi)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-white border border-slate-100 hover:bg-slate-50 disabled:opacity-40 rounded-xl transition text-slate-600"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 bg-white border border-slate-100 hover:bg-slate-50 disabled:opacity-40 rounded-xl transition text-slate-600"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
