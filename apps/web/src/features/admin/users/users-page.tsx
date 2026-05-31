import { useEffect, useState } from 'react';
import {
  Users, Plus, Search, Trash2, RefreshCw,
  KeyRound, AlertTriangle, CheckCircle2, UserX, Pencil, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getRoles,
  suggestEmployeeCode,
  type TenantUser,
  type Role,
} from '@/lib/api/platform';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui';

const statusIcon = {
  active: <CheckCircle2 size={13} className="text-admin-success" />,
  inactive: <UserX size={13} className="text-admin-muted" />,
  suspended: <AlertTriangle size={13} className="text-admin-danger" />,
};

export function UsersPage() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TenantUser | null>(null);
  const [resetTarget, setResetTarget] = useState<TenantUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [createPasswordVisible, setCreatePasswordVisible] = useState(false);
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', employeeCode: '',
    password: '', roleId: '',
  });
  const [editForm, setEditForm] = useState({
    name: '', email: '', phone: '', employeeCode: '',
    roleId: '', status: 'active' as TenantUser['status'],
  });

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone ?? '').includes(search)
  );

  async function handleGenerateEmployeeCode(mode: 'create' | 'edit') {
    if (!accessToken) return;
    const roleId = mode === 'create' ? form.roleId : editForm.roleId;
    const excludeUserId = mode === 'edit' ? editTarget?.id : undefined;
    if (!roleId) return;

    setGeneratingCode(true);
    setError('');
    try {
      const data = await suggestEmployeeCode(accessToken, roleId, excludeUserId);
      if (mode === 'create') {
        setForm((current) => ({ ...current, employeeCode: data.employeeCode }));
      } else {
        setEditForm((current) => ({ ...current, employeeCode: data.employeeCode }));
      }
    } catch (e: any) {
      setError(e.message ?? 'Gagal generate kode karyawan.');
    } finally {
      setGeneratingCode(false);
    }
  }

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
      await createUser(accessToken, {
        roleId: form.roleId,
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        employeeCode: form.employeeCode.trim() || undefined,
        password: form.password,
      });
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

  function openEdit(user: TenantUser) {
    setEditTarget(user);
    setEditForm({
      name: user.name,
      email: user.email ?? '',
      phone: user.phone ?? '',
      employeeCode: user.employeeCode ?? '',
      roleId: user.roleId ?? roles.find((role) => role.code === user.roleCode)?.id ?? '',
      status: user.status,
    });
  }

  async function handleUpdate() {
    if (!accessToken || !editTarget) return;
    setSaving(true);
    setError('');
    try {
      await updateUser(accessToken, editTarget.id, {
        roleId: editForm.roleId,
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        employeeCode: editForm.employeeCode.trim() || null,
        status: editForm.status,
      });
      setEditTarget(null);
      setSuccess(`User ${editForm.name} berhasil diperbarui.`);
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
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Users size={22} />
            Manajemen User
          </h1>
          <p className="admin-page-subtitle">Kelola akun user dan akses tim Anda.</p>
        </div>
        <div className="flex gap-2">
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
          <Table className="admin-table">
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Login Terakhir</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-admin-muted">
                    {user.email && <div>{user.email}</div>}
                    {user.phone && <div>{user.phone}</div>}
                  </TableCell>
                  <TableCell>
                    <span className="admin-role-badge">{user.roleName ?? user.roleCode}</span>
                  </TableCell>
                  <TableCell>
                    <button
                      id={`users-toggle-status-${user.id}`}
                      onClick={() => toggleStatus(user)}
                      className={`admin-status-pill admin-status-pill-${user.status}`}
                      type="button"
                    >
                      {statusIcon[user.status as keyof typeof statusIcon]}
                      {user.status}
                    </button>
                  </TableCell>
                  <TableCell className="text-admin-muted">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString('id-ID')
                      : 'Belum pernah'}
                  </TableCell>
                  <TableCell>
                    <div className="admin-row-actions">
                      <button
                        id={`users-edit-${user.id}`}
                        onClick={() => openEdit(user)}
                        className="admin-btn-icon-sm"
                        title="Edit User"
                        type="button"
                      >
                        <Pencil size={14} />
                      </button>
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
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <EmptyState colSpan={6} icon="👥" title="Belum ada user" description="Tambahkan user pertama Anda." />
              )}
            </TableBody>
          </Table>
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
                  <div className="admin-input-action">
                    <input
                      id="user-employee-code"
                      type="text"
                      value={form.employeeCode}
                      onChange={e => setForm(f => ({ ...f, employeeCode: e.target.value }))}
                      placeholder={form.roleId ? 'Klik generate kode' : 'Pilih role dulu'}
                      className="admin-input"
                    />
                    <button
                      type="button"
                      className="admin-btn-icon-sm"
                      title="Generate kode karyawan"
                      disabled={!form.roleId || generatingCode}
                      onClick={() => handleGenerateEmployeeCode('create')}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <small className="admin-field-hint">Format otomatis: KODE_COMPANY-urutan. Tetap bisa diisi manual.</small>
                </div>
                <div className="admin-field">
                  <label htmlFor="user-password">Password *</label>
                  <div className="admin-password-field">
                    <input
                      id="user-password"
                      type={createPasswordVisible ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Minimal 6 karakter"
                      className="admin-input"
                    />
                    <button
                      type="button"
                      className="admin-password-toggle"
                      onClick={() => setCreatePasswordVisible((current) => !current)}
                      title={createPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {createPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
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

      {/* Edit User Modal */}
      {editTarget && (
        <div className="admin-modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Edit User</h2>
                <p className="admin-modal-subtitle">{editTarget.name}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-grid">
                <div className="admin-field admin-field-full">
                  <label htmlFor="edit-user-role">Role *</label>
                  <select
                    id="edit-user-role"
                    value={editForm.roleId}
                    onChange={e => setEditForm(f => ({ ...f, roleId: e.target.value }))}
                    className="admin-select"
                  >
                    <option value="">— Pilih Role —</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                    ))}
                  </select>
                </div>
                <div className="admin-field admin-field-full">
                  <label htmlFor="edit-user-name">Nama Lengkap *</label>
                  <input
                    id="edit-user-name"
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="admin-input"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-user-email">Email</label>
                  <input
                    id="edit-user-email"
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="admin-input"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-user-phone">Nomor HP</label>
                  <input
                    id="edit-user-phone"
                    type="text"
                    value={editForm.phone}
                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                    className="admin-input"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-user-employee-code">Kode Karyawan</label>
                  <div className="admin-input-action">
                    <input
                      id="edit-user-employee-code"
                      type="text"
                      value={editForm.employeeCode}
                      onChange={e => setEditForm(f => ({ ...f, employeeCode: e.target.value }))}
                      placeholder={editForm.roleId ? 'Klik generate kode' : 'Pilih role dulu'}
                      className="admin-input"
                    />
                    <button
                      type="button"
                      className="admin-btn-icon-sm"
                      title="Generate kode karyawan"
                      disabled={!editForm.roleId || generatingCode}
                      onClick={() => handleGenerateEmployeeCode('edit')}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <small className="admin-field-hint">Klik generate bila ingin mengganti ke format KODE_COMPANY-urutan; input manual tetap diperbolehkan.</small>
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-user-status">Status</label>
                  <select
                    id="edit-user-status"
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value as TenantUser['status'] }))}
                    className="admin-select"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setEditTarget(null)} className="admin-btn-ghost" type="button">Batal</button>
              <button
                id="users-submit-edit"
                onClick={handleUpdate}
                className="admin-btn-primary"
                type="button"
                disabled={saving || !editForm.name || !editForm.roleId}
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
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
              <p className="text-admin-muted mb-4">
                Reset password untuk <strong>{resetTarget.name}</strong>.
              </p>
              <div className="admin-field">
                <label htmlFor="new-password">Password Baru *</label>
                <div className="admin-password-field">
                  <input
                    id="new-password"
                    type={resetPasswordVisible ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="admin-input"
                  />
                  <button
                    type="button"
                    className="admin-password-toggle"
                    onClick={() => setResetPasswordVisible((current) => !current)}
                    title={resetPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {resetPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
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
