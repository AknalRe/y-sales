import { useEffect, useState } from 'react';
import {
  Users, Plus, Search, Trash2, RefreshCw,
  KeyRound, AlertTriangle, CheckCircle2, UserX, Pencil, Eye, EyeOff, Camera
} from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  enrollFaceTemplate,
  getFaceTemplates,
  resetPassword,
  getRoles,
  suggestEmployeeCode,
  type TenantUser,
  type Role,
  type FaceTemplate,
} from '@/lib/api/platform';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui';
import { FaceCaptureField } from '../shared/face-capture-field';

const statusIcon = {
  active: <CheckCircle2 size={13} className="text-admin-success" />,
  inactive: <UserX size={13} className="text-admin-muted" />,
  suspended: <AlertTriangle size={13} className="text-admin-danger" />,
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Gagal membaca file foto wajah.'));
    reader.readAsDataURL(file);
  });
}

function UserAvatar(props: { name: string; imageUrl?: string | null }) {
  if (props.imageUrl) {
    return (
      <img
        className="admin-user-avatar admin-user-avatar-img"
        src={props.imageUrl}
        alt={`Foto wajah ${props.name}`}
      />
    );
  }
  return <div className="admin-user-avatar">{props.name.charAt(0).toUpperCase()}</div>;
}

async function dataUrlToFile(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], `face-template-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
}

export function UsersPage() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TenantUser | null>(null);
  const [resetTarget, setResetTarget] = useState<TenantUser | null>(null);
  const [faceTarget, setFaceTarget] = useState<TenantUser | null>(null);
  const [faceTemplates, setFaceTemplates] = useState<FaceTemplate[]>([]);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState('');
  const [faceSaving, setFaceSaving] = useState(false);
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

  const activeFaceTemplateByUser = new Map(faceTemplates.filter((template) => template.status === 'active').map((template) => [template.userId, template]));

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
      const [u, r, f] = await Promise.allSettled([getUsers(accessToken), getRoles(accessToken), getFaceTemplates(accessToken)]);
      if (u.status === 'fulfilled') setUsers(u.value.users);
      if (r.status === 'fulfilled') setRoles(r.value.roles);
      if (f.status === 'fulfilled') setFaceTemplates(f.value.templates ?? []);
      const failed = [u, r].find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
      if (failed) throw failed.reason;
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

  function openFaceEnrollment(user: TenantUser) {
    setFaceTarget(user);
    setFaceFile(null);
    setFacePreview('');
  }

  async function handleFaceFileChange(file?: File | null) {
    if (!file) {
      setFaceFile(null);
      setFacePreview('');
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Foto wajah harus berupa JPEG, PNG, atau WEBP.');
      return;
    }
    if (file.size > 4_000_000) {
      setError('Ukuran foto wajah maksimal 4MB.');
      return;
    }
    setFaceFile(file);
    setFacePreview(await fileToDataUrl(file));
  }

  async function handleEnrollFace() {
    if (!accessToken || !faceTarget || !facePreview) return;
    setFaceSaving(true);
    setError('');
    try {
      const uploadFile = faceFile ?? await dataUrlToFile(facePreview);
      await enrollFaceTemplate(accessToken, {
        userId: faceTarget.id,
        dataUrl: facePreview,
        mimeType: uploadFile.type as 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/webp',
        sizeBytes: uploadFile.size,
      });
      setSuccess(`Data wajah ${faceTarget.name} berhasil disimpan.`);
      setFaceTarget(null);
      setFaceFile(null);
      setFacePreview('');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan template wajah.');
    } finally {
      setFaceSaving(false);
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
                      <UserAvatar name={user.name} imageUrl={activeFaceTemplateByUser.get(user.id)?.fileUrl} />
                      <div>
                        <div className="admin-user-name">{user.name}</div>
                        {user.employeeCode && (
                          <div className="admin-user-code">{user.employeeCode}</div>
                        )}
                        <span className={`admin-role-badge ${activeFaceTemplateByUser.has(user.id) ? 'text-admin-success' : 'text-admin-muted'}`}>
                          <Camera size={11} />
                          {activeFaceTemplateByUser.has(user.id) ? 'Wajah aktif' : 'Belum wajah'}
                        </span>
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
                        id={`users-face-${user.id}`}
                        onClick={() => openFaceEnrollment(user)}
                        className="admin-btn-icon-sm"
                        title="Data Wajah"
                        type="button"
                      >
                        <Camera size={14} />
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

      {faceTarget && (
        <div className="admin-modal-overlay" onClick={() => setFaceTarget(null)}>
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Data Wajah User</h2>
                <p className="admin-modal-subtitle">{faceTarget.name}</p>
              </div>
              <button onClick={() => setFaceTarget(null)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-alert admin-alert-info" style={{ marginBottom: '1rem' }}>
                <Camera size={15} />
                Foto ini menjadi template wajah aktif user. Template lama akan otomatis dinonaktifkan.
              </div>
              <FaceCaptureField
                id="user-face-file"
                preview={facePreview}
                targetName={faceTarget.name}
                onCapture={handleFaceFileChange}
              />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="admin-detail-box">
                  <span>Status Template</span>
                  <strong>{activeFaceTemplateByUser.has(faceTarget.id) ? 'Sudah aktif' : 'Belum ada'}</strong>
                </div>
                <div className="admin-detail-box">
                  <span>File Baru</span>
                  <strong>{faceFile ? `${Math.round(faceFile.size / 1024)} KB` : '-'}</strong>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setFaceTarget(null)} className="admin-btn-ghost" type="button">Batal</button>
              <button onClick={handleEnrollFace} className="admin-btn-primary" type="button" disabled={faceSaving || !facePreview}>
                {faceSaving ? 'Menyimpan...' : 'Simpan Wajah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
