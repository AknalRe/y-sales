import { useEffect, useState } from 'react';
import { UserCircle, LogOut, RefreshCw, Building2, Shield, Phone, Mail, IdCard, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { useNavigate } from 'react-router-dom';

function apiReq<T>(path: string, token: string): Promise<T> {
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  return fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message ?? 'Error') }));
}

type AttendanceToday = {
  id: string;
  status: string;
  validationStatus: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
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
  SALES_AGENT: '#60a5fa',
  SUPERVISOR: '#fbbf24',
  ADMIN: '#a78bfa',
  OPERATIONAL_MANAGER: '#34d399',
  OWNER: '#f97316',
  ADMINISTRATOR: '#f87171',
};

export function SalesProfilePage() {
  const { user, signOut, accessToken } = useAuth();
  const navigate = useNavigate();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceToday | null>(null);
  const [loading, setLoading] = useState(true);
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
    apiReq<{ session: AttendanceToday | null }>('/attendance/today', accessToken)
      .then(r => setTodayAttendance(r.session))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  const roleCode = user?.roleCode ?? '';
  const roleColor = ROLE_COLOR[roleCode] ?? '#94a3b8';

  return (
    <div className="sales-profile-page">
      {/* Header Hero */}
      <div className="sales-profile-hero">
        <div className="sales-profile-avatar">
          {user?.name?.charAt(0).toUpperCase() ?? 'U'}
        </div>
        <div className="sales-profile-info">
          <h1 className="sales-profile-name">{user?.name}</h1>
          <span className="sales-profile-role" style={{ background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}>
            <Shield size={12} /> {ROLE_LABEL[roleCode] ?? roleCode}
          </span>
        </div>
        <div className="sales-profile-online" style={{ color: isOnline ? '#34d399' : '#f87171' }}>
          {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

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
          <p style={{ color: '#64748b', fontSize: '.85rem' }}>Memuat...</p>
        ) : !todayAttendance ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ color: '#64748b', fontSize: '.85rem', margin: 0 }}>Belum absen hari ini.</p>
            <button onClick={() => navigate('/attendance')} className="sales-profile-btn-primary" style={{ marginTop: '.75rem' }}>
              Check-In Sekarang
            </button>
          </div>
        ) : (
          <div>
            <div className="sales-profile-field">
              <span>Status</span>
              <span className="sales-attendance-status" style={{
                background: todayAttendance.status === 'checked_in' ? 'rgba(52,211,153,.15)' : 'rgba(99,163,237,.12)',
                color: todayAttendance.status === 'checked_in' ? '#34d399' : '#60a5fa',
              }}>
                {todayAttendance.status === 'checked_in' ? '✓ Sedang Check-In' : '✓ Sudah Check-Out'}
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
            <div className="sales-profile-field">
              <span>Validasi</span>
              <span style={{ fontSize: '.82rem', color: todayAttendance.validationStatus === 'validated' ? '#34d399' : '#fbbf24' }}>
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

      <p style={{ textAlign: 'center', color: '#334155', fontSize: '.72rem', marginTop: '.75rem' }}>
        YukSales v1.0 · {new Date().getFullYear()}
      </p>
    </div>
  );
}
