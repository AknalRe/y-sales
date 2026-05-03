import { useEffect, useState } from 'react';
import {
  Users, Plus, Search, Trash2, RefreshCw,
  KeyRound, AlertTriangle, CheckCircle2, UserX
} from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { getUsers, createUser, updateUser, deleteUser, resetPassword, getRoles, type TenantUser, type Role } from '@/lib/api/platform';

const statusIcon = {
  active: <CheckCircle2 size={13} color="var(--color-success)" />,
  inactive: <UserX size={13} color="var(--color-muted)" />,
  suspended: <AlertTriangle size={13} color="var(--color-danger)" />,
};

export function UsersPage() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<TenantUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', employeeCode: '',
    password: '', roleId: '',
  });

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone ?? '').includes(search)
  );

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [u, r] = await Promise.all([getUsers(accessToken), getRoles(accessToken)]);
      setUsers(u.users);
      setRoles(r.roles);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  async function handleCreate() {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    try {
      await createUser(accessToken, form);
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', employeeCode: '', password: '', roleId: '' });
      setSuccess('User berhasil dibuat.');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: TenantUser) {
    if (!accessToken || !confirm(`Hapus user ${user.name}?`)) return;
    try {
      await deleteUser(accessToken, user.id);
      setSuccess(`User ${user.name} berhasil dihapus.`);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleResetPassword() {
    if (!accessToken || !resetTarget) return;
    if (newPassword.length < 6) { setError('Password minimal 6 karakter.'); return; }
    setSaving(true);
    setError('');
    try {
      await resetPassword(accessToken, resetTarget.id, newPassword);
      setResetTarget(null);
      setNewPassword('');
      setSuccess('Password berhasil direset.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: TenantUser) {
    if (!accessToken) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateUser(accessToken, user.id, { status: newStatus });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="admin-page-wrapper">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-hero-title">
            <Users size={22} />
            Manajemen User
          </h1>
          <p className="admin-page-hero-subtitle">Kelola akun user dan akses tim Anda.</p>
        </div>
        <div className="admin-page-hero-actions">
          <button id="users-refresh-btn" onClick={load} className="admin-btn-ghost" type="button">
            <RefreshCw size={15} />
          </button>
          <button
            id="users-create-btn"
            onClick={() => setShowCreate(true)}
            className="admin-btn-primary"
            type="button"
          >
            <Plus size={15} />
            Tambah User
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertTriangle size={15} />{error}
          <button onClick={() => setError('')} className="admin-alert-close">×</button>
        </div>
      )}
      {success && (
        <div className="admin-alert admin-alert-success">
          <CheckCircle2 size={15} />{success}
          <button onClick={() => setSuccess('')} className="admin-alert-close">×</button>
        </div>
      )}

      <div className="admin-search-row">
        <div className="admin-search-box">
          <Search size={15} />
          <input
            id="users-search"
            type="text"
            placeholder="Cari nama, email, atau nomor HP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="admin-count-badge">{filtered.length} user</span>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading"><RefreshCw size={18} className="spin" /><span>Memuat...</span></div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kontak</th>
                <th>Role</th>
                <th>Status</th>
                <th>Login Terakhir</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="admin-user-name">{user.name}</div>
                        {user.employeeCode && (
                          <div className="admin-user-code">{user.employeeCode}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="admin-muted">
                    {user.email && <div>{user.email}</div>}
                    {user.phone && <div>{user.phone}</div>}
                  </td>
                  <td>
                    <span className="admin-role-badge">{user.roleName ?? user.roleCode}</span>
                  </td>
                  <td>
                    <button
                      id={`users-toggle-status-${user.id}`}
                      onClick={() => toggleStatus(user)}
                      className={`admin-status-pill admin-status-pill-${user.status}`}
                      type="button"
                    >
                      {statusIcon[user.status as keyof typeof statusIcon]}
                      {user.status}
                    </button>
                  </td>
                  <td className="admin-muted">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString('id-ID')
                      : 'Belum pernah'}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        id={`users-reset-pass-${user.id}`}
                        onClick={() => setResetTarget(user)}
                        className="admin-btn-icon-sm"
                        title="Reset Password"
                        type="button"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        id={`users-delete-${user.id}`}
                        onClick={() => handleDelete(user)}
                        className="admin-btn-icon-sm admin-btn-danger-sm"
                        title="Hapus User"
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-table-empty">Belum ada user.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="admin-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Tambah User Baru</h2>
              <button onClick={() => setShowCreate(false)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-grid">
                <div className="admin-field admin-field-full">
                  <label htmlFor="user-role">Role *</label>
                  <select
                    id="user-role"
                    value={form.roleId}
                    onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
                    className="admin-select"
                  >
                    <option value="">— Pilih Role —</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                    ))}
                  </select>
                </div>
                <div className="admin-field admin-field-full">
                  <label htmlFor="user-name">Nama Lengkap *</label>
                  <input
                    id="user-name"
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Budi Santoso"
                    className="admin-input"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="user-email">Email</label>
                  <input
                    id="user-email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="budi@company.com"
                    className="admin-input"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="user-phone">Nomor HP</label>
                  <input
                    id="user-phone"
                    type="text"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="08xxxxxxxxx"
                    className="admin-input"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="user-employee-code">Kode Karyawan</label>
                  <input
                    id="user-employee-code"
                    type="text"
                    value={form.employeeCode}
                    onChange={e => setForm(f => ({ ...f, employeeCode: e.target.value }))}
                    placeholder="EMP-001"
                    className="admin-input"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="user-password">Password *</label>
                  <input
                    id="user-password"
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Minimal 6 karakter"
                    className="admin-input"
                  />
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setShowCreate(false)} className="admin-btn-ghost" type="button">Batal</button>
              <button
                id="users-submit-create"
                onClick={handleCreate}
                className="admin-btn-primary"
                type="button"
                disabled={saving || !form.name || !form.password || !form.roleId}
              >
                {saving ? 'Menyimpan...' : 'Buat User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="admin-modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Reset Password</h2>
              <button onClick={() => setResetTarget(null)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <p className="admin-muted" style={{ marginBottom: '1rem' }}>
                Reset password untuk <strong>{resetTarget.name}</strong>.
              </p>
              <div className="admin-field">
                <label htmlFor="new-password">Password Baru *</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="admin-input"
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setResetTarget(null)} className="admin-btn-ghost" type="button">Batal</button>
              <button
                id="users-confirm-reset"
                onClick={handleResetPassword}
                className="admin-btn-primary"
                type="button"
                disabled={saving || newPassword.length < 6}
              >
                {saving ? 'Mereset...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
