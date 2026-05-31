import { useEffect, useState } from 'react';
import { UserCircle, LogOut, RefreshCw, Building2, Shield, Phone, Mail, IdCard, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../../lib/api/client';
import { useScrollToTop } from '../../../hooks/use-scroll-to-top';

function apiReq<T>(path: string, token: string): Promise<T> {
  return apiRequest<T>(path, { headers: { Authorization: `Bearer ${token}` } });
}

type AttendanceToday = {
  id: string;
  status: string;
  validationStatus: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
};

type AttendanceTodayResponse = {
  session: AttendanceToday | null;
  canCheckIn: boolean;
  checkInBlockedReason?: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  SALES_AGENT: 'Sales Agent',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Admin',
  OPERATIONAL_MANAGER: 'Operational Manager',
  OWNER: 'Owner',
  ADMINISTRATOR: 'Administrator',
};

const ROLE_COLOR: Record<string, string> = {
  SALES_AGENT: 'var(--sales-accent)',
  SUPERVISOR: 'var(--sales-brand-muted)',
  ADMIN: 'var(--sales-brand-primary)',
  OPERATIONAL_MANAGER: 'var(--sales-success)',
  OWNER: 'var(--sales-accent-dark)',
  ADMINISTRATOR: 'var(--sales-accent)',
};

export function SalesProfilePage() {
  useScrollToTop();
  const { user, signOut, accessToken } = useAuth();
  const navigate = useNavigate();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceToday | null>(null);
  const [canCheckInAttendance, setCanCheckInAttendance] = useState(true);
  const [attendanceBlockedReason, setAttendanceBlockedReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    apiReq<AttendanceTodayResponse>('/attendance/today', accessToken)
      .then(r => {
        setTodayAttendance(r.session);
        setCanCheckInAttendance(r.canCheckIn);
        setAttendanceBlockedReason(r.checkInBlockedReason ?? null);
        setError('');
      })
      .catch((e: any) => {
        setError(e.message ?? 'Gagal memuat data absensi');
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  const roleCode = user?.roleCode ?? '';
  const roleColor = ROLE_COLOR[roleCode] ?? 'var(--sales-muted)';

  return (
    <div className="sales-profile-page">
      {/* Header Hero */}
      <div className="sales-profile-hero">
        <div className="sales-profile-avatar">
          {user?.name?.charAt(0).toUpperCase() ?? 'U'}
        </div>
        <div className="sales-profile-info">
          <h1 className="sales-profile-name">{user?.name}</h1>
          <span className="sales-profile-role" style={{ background: `color-mix(in srgb, ${roleColor} 12%, transparent)`, color: roleColor, border: `1px solid color-mix(in srgb, ${roleColor} 25%, transparent)` }}>
            <Shield size={12} /> {ROLE_LABEL[roleCode] ?? roleCode}
          </span>
        </div>
        <div className={`sales-profile-online ${isOnline ? 'text-sales-emerald' : 'text-sales-danger-lighter'}`}>
          {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {error && <div className="dashboard-error"><AlertCircle size={15} /> {error}</div>}

      {/* Company Info */}
      {user?.company && (
        <div className="sales-profile-card">
          <div className="sales-profile-card-title">
            <Building2 size={16} /> Perusahaan
          </div>
          <div className="sales-profile-field">
            <span>Nama</span>
            <strong>{user.company.name}</strong>
          </div>
          <div className="sales-profile-field">
            <span>Kode</span>
            <strong>@{user.company.slug}</strong>
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="sales-profile-card">
        <div className="sales-profile-card-title">
          <UserCircle size={16} /> Informasi Akun
        </div>
        {user?.email && (
          <div className="sales-profile-field">
            <span><Mail size={13} /> Email</span>
            <strong>{user.email}</strong>
          </div>
        )}
        {user?.phone && (
          <div className="sales-profile-field">
            <span><Phone size={13} /> Telepon</span>
            <strong>{user.phone}</strong>
          </div>
        )}
        {user?.employeeCode && (
          <div className="sales-profile-field">
            <span><IdCard size={13} /> Kode Karyawan</span>
            <strong>{user.employeeCode}</strong>
          </div>
        )}
      </div>

      {/* Today Attendance */}
      <div className="sales-profile-card">
        <div className="sales-profile-card-title">
          <RefreshCw size={16} /> Absensi Hari Ini
        </div>
        {loading ? (
          <p className="text-sales-muted" style={{ fontSize: '.85rem' }}>Memuat...</p>
        ) : !todayAttendance ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p className="text-sales-muted" style={{ fontSize: '.85rem', margin: 0 }}>Belum absen hari ini.</p>
            <button onClick={() => navigate('/attendance')} className="sales-profile-btn-primary" style={{ marginTop: '.75rem' }}>
              Check-In Sekarang
            </button>
          </div>
        ) : (
          <div>
            <div className="sales-profile-field">
              <span>Status</span>
              <span className={`sales-attendance-status ${todayAttendance.status === 'open' ? 'bg-sales-emerald/15 text-sales-emerald' : 'bg-sales-info-light/12 text-sales-info-light'}`}>
                {todayAttendance.status === 'open' ? '✓ Sedang Check-In' : '✓ Sudah Check-Out'}
              </span>
            </div>
            {todayAttendance.checkInAt && (
              <div className="sales-profile-field">
                <span>Check-In</span>
                <strong>{new Date(todayAttendance.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</strong>
              </div>
            )}
            {todayAttendance.checkOutAt && (
              <div className="sales-profile-field">
                <span>Check-Out</span>
                <strong>{new Date(todayAttendance.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</strong>
              </div>
            )}
            {!canCheckInAttendance && todayAttendance.status !== 'open' && (
              <p className="text-sales-amber-deep" style={{ fontSize: '.8rem', marginTop: '.75rem' }}>
                {attendanceBlockedReason ?? 'Company hanya mengizinkan satu sesi absensi dalam sehari.'}
              </p>
            )}
            <div className="sales-profile-field">
              <span>Validasi</span>
              <span className={todayAttendance.validationStatus === 'validated' ? 'text-sales-emerald' : 'text-sales-amber'} style={{ fontSize: '.82rem' }}>
                {todayAttendance.validationStatus === 'validated' ? '✓ Tervalidasi' : '⏳ Menunggu'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out */}
      <button onClick={handleSignOut} className="sales-profile-signout">
        <LogOut size={18} /> Keluar dari Akun
      </button>

      <p className="text-sales-text-body" style={{ textAlign: 'center', fontSize: '.72rem', marginTop: '.75rem' }}>
        Yuksales v1.0 · {new Date().getFullYear()}
      </p>
    </div>
  );
}
