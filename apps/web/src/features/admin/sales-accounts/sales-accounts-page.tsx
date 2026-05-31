import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserX,
  Users,
  X,
} from 'lucide-react';

import { useAuth } from '../../auth/auth-provider';
import {
  createUser,
  deleteUser,
  getRoles,
  getUsers,
  resetPassword,
  suggestEmployeeCode,
  updateUser,
  type Role,
  type TenantUser,
} from '@/lib/api/platform';
import { EmptyState } from '@/components/ui';

type SalesAccount = TenantUser;

const statusIcon = {
  active: <CheckCircle2 size={13} className="text-admin-success" />,
  inactive: <UserX size={13} className="text-admin-muted" />,
  suspended: <AlertTriangle size={13} className="text-admin-danger" />,
};

function isSalesRole(code?: string, name?: string) {
  const roleCode = code?.toUpperCase() ?? '';
  const roleName = name?.toLowerCase() ?? '';
  return (
    roleCode.includes('SALES') ||
    roleCode.includes('AGENT') ||
    roleCode.includes('FIELD') ||
    roleName.includes('sales') ||
    roleName.includes('lapangan') ||
    roleName.includes('agent')
  );
}

export function SalesAccountsPage() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSales, setSelectedSales] = useState<SalesAccount | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<SalesAccount | null>(null);
  const [resetTarget, setResetTarget] = useState<SalesAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    employeeCode: '',
    password: '',
    roleId: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    employeeCode: '',
    roleId: '',
    status: 'active' as TenantUser['status'],
  });

  const salesRoles = useMemo(() => roles.filter((role) => isSalesRole(role.code, role.name)), [roles]);

  const salesAccounts = useMemo(() => {
    return users.filter((user) => isSalesRole(user.roleCode, user.roleName));
  }, [users]);

  const filtered = useMemo(() => {
    return salesAccounts.filter((sales) => {
      if (statusFilter && sales.status !== statusFilter) return false;
      if (!search) return true;

      const q = search.toLowerCase();
      return (
        sales.name.toLowerCase().includes(q) ||
        (sales.email ?? '').toLowerCase().includes(q) ||
        (sales.phone ?? '').includes(search) ||
        (sales.employeeCode ?? '').toLowerCase().includes(q)
      );
    });
  }, [salesAccounts, statusFilter, search]);

  const stats = useMemo(() => {
    const active = salesAccounts.filter((sales) => sales.status === 'active').length;
    const suspended = salesAccounts.filter((sales) => sales.status === 'suspended').length;
    const inactive = salesAccounts.filter((sales) => sales.status === 'inactive').length;
    return { active, inactive, suspended, total: salesAccounts.length };
  }, [salesAccounts]);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [userRes, roleRes] = await Promise.all([getUsers(accessToken), getRoles(accessToken)]);
      setUsers(userRes.users ?? []);
      setRoles(roleRes.roles ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data akun sales.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  function openCreate() {
    setForm({
      name: '',
      email: '',
      phone: '',
      employeeCode: '',
      password: '',
      roleId: salesRoles[0]?.id ?? '',
    });
    setShowCreate(true);
  }

  function openEdit(sales: SalesAccount) {
    setEditTarget(sales);
    setEditForm({
      name: sales.name,
      email: sales.email ?? '',
      phone: sales.phone ?? '',
      employeeCode: sales.employeeCode ?? '',
      roleId: sales.roleId ?? salesRoles.find((role) => role.code === sales.roleCode)?.id ?? '',
      status: sales.status,
    });
  }

  async function handleGenerateEmployeeCode(mode: 'create' | 'edit') {
    if (!accessToken) return;
    const roleId = mode === 'create' ? form.roleId : editForm.roleId;
    const excludeUserId = mode === 'edit' ? editTarget?.id : undefined;
    if (!roleId) return;

    setGeneratingCode(true);
    setError('');
    try {
      const data = await suggestEmployeeCode(accessToken, roleId, excludeUserId);
      if (mode === 'create') setForm((current) => ({ ...current, employeeCode: data.employeeCode }));
      else setEditForm((current) => ({ ...current, employeeCode: data.employeeCode }));
    } catch (e: any) {
      setError(e.message ?? 'Gagal generate kode karyawan.');
    } finally {
      setGeneratingCode(false);
    }
  }

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
      setSuccess('Akun sales berhasil dibuat.');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal membuat akun sales.');
    } finally {
      setSaving(false);
    }
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
      setSelectedSales(null);
      setSuccess(`Akun sales ${editForm.name} berhasil diperbarui.`);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal memperbarui akun sales.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(sales: SalesAccount) {
    if (!accessToken) return;
    const status = sales.status === 'active' ? 'inactive' : 'active';
    try {
      await updateUser(accessToken, sales.id, { status });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal mengubah status sales.');
    }
  }

  async function handleDelete(sales: SalesAccount) {
    if (!accessToken || !confirm(`Hapus/nonaktifkan akun sales "${sales.name}"?`)) return;
    try {
      await deleteUser(accessToken, sales.id);
      setSuccess(`Akun sales ${sales.name} berhasil dihapus.`);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Gagal menghapus akun sales.');
    }
  }

  async function handleResetPassword() {
    if (!accessToken || !resetTarget) return;
    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await resetPassword(accessToken, resetTarget.id, newPassword);
      setResetTarget(null);
      setNewPassword('');
      setSuccess(`Password ${resetTarget.name} berhasil direset.`);
    } catch (e: any) {
      setError(e.message ?? 'Gagal reset password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Users size={22} />
            Manajemen Akun Sales
          </h1>
          <p className="admin-page-subtitle">Kelola akun sales lapangan untuk absensi, visit outlet, transaksi, dan nota.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="admin-btn-ghost" disabled={loading} type="button" title="Refresh data">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
          <button onClick={openCreate} className="admin-btn-primary" type="button" disabled={!salesRoles.length}>
            <Plus size={15} />
            Tambah Sales
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

      {!salesRoles.length && !loading ? (
        <div className="admin-alert admin-alert-warning">
          <AlertTriangle size={15} />
          Belum ada role sales. Buat role dengan kode/nama mengandung SALES, AGENT, FIELD, atau lapangan terlebih dahulu.
        </div>
      ) : null}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <Users size={20} />
          </div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Total Sales</span>
            <strong className="text-2xl font-bold text-admin-foreground">{stats.total}</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Aktif</span>
            <strong className="text-2xl font-bold text-admin-foreground">{stats.active}</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <UserX size={20} />
          </div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Nonaktif</span>
            <strong className="text-2xl font-bold text-admin-foreground">{stats.inactive}</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Suspended</span>
            <strong className="text-2xl font-bold text-admin-foreground">{stats.suspended}</strong>
          </div>
        </div>
      </div>

      <div className="admin-filter-row admin-sales-filter-row">
        <div className="admin-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Cari nama, email, HP, kode karyawan..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <button className="admin-search-clear" type="button" onClick={() => setSearch('')} title="Bersihkan pencarian">
              <X size={14} />
            </button>
          ) : null}
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="admin-select">
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
          <option value="suspended">Suspended</option>
        </select>
        {/* <span className="admin-count-badge">{filtered.length} akun sales</span> */}
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading">
            <RefreshCw size={18} className="spin" />
            <span>Memuat data akun sales...</span>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sales</th>
                  <th>Kontak</th>
                  <th>Kode Karyawan</th>
                  <th>Status</th>
                  <th>Login Terakhir</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sales) => (
                  <tr key={sales.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar">{sales.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="admin-user-name">{sales.name}</div>
                          <span className="admin-role-badge">{sales.roleName ?? sales.roleCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-admin-muted">
                      {sales.email ? <div>{sales.email}</div> : null}
                      {sales.phone ? <div>{sales.phone}</div> : null}
                    </td>
                    <td>
                      <code className="admin-role-badge">{sales.employeeCode ?? '-'}</code>
                    </td>
                    <td>
                      <button
                        className={`admin-status-pill admin-status-pill-${sales.status}`}
                        onClick={() => toggleStatus(sales)}
                        type="button"
                      >
                        {statusIcon[sales.status]}
                        {sales.status}
                      </button>
                    </td>
                    <td className="text-admin-muted">
                      {sales.lastLoginAt
                        ? new Date(sales.lastLoginAt).toLocaleDateString('id-ID')
                        : 'Belum pernah'}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button onClick={() => setSelectedSales(sales)} className="admin-btn-icon-sm" title="Lihat Detail" type="button">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openEdit(sales)} className="admin-btn-icon-sm" title="Edit Sales" type="button">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setResetTarget(sales)} className="admin-btn-icon-sm" title="Reset Password" type="button">
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => handleDelete(sales)} className="admin-btn-icon-sm admin-btn-danger-sm" title="Hapus Sales" type="button">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <EmptyState colSpan={6} icon="👥" title="Tidak Ada Akun Sales" description="Belum ada akun sales yang terdaftar." />
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate ? (
        <div className="admin-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Tambah Sales</h2>
                <p className="admin-modal-subtitle">Akun sales otomatis masuk ke alur absensi, visit outlet, transaksi, dan nota.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-grid">
                <SalesRoleField value={form.roleId} roles={salesRoles} onChange={(roleId) => setForm((current) => ({ ...current, roleId }))} id="sales-role" />
                <TextField id="sales-name" label="Nama Sales *" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} className="admin-field-full" />
                <TextField id="sales-email" label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} type="email" />
                <TextField id="sales-phone" label="Nomor HP" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
                <EmployeeCodeField
                  id="sales-code"
                  value={form.employeeCode}
                  roleId={form.roleId}
                  placeholder={form.roleId ? 'Klik generate kode' : 'Pilih role dulu'}
                  disabled={generatingCode}
                  onChange={(value) => setForm((current) => ({ ...current, employeeCode: value }))}
                  onGenerate={() => handleGenerateEmployeeCode('create')}
                />
                <PasswordField id="sales-password" label="Password *" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setShowCreate(false)} className="admin-btn-ghost" type="button">Batal</button>
              <button onClick={handleCreate} className="admin-btn-primary" type="button" disabled={saving || !form.name || !form.password || !form.roleId}>
                {saving ? 'Menyimpan...' : 'Buat Sales'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="admin-modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Edit Sales</h2>
                <p className="admin-modal-subtitle">{editTarget.name}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-grid">
                <SalesRoleField value={editForm.roleId} roles={salesRoles} onChange={(roleId) => setEditForm((current) => ({ ...current, roleId }))} id="edit-sales-role" />
                <TextField id="edit-sales-name" label="Nama Sales *" value={editForm.name} onChange={(value) => setEditForm((current) => ({ ...current, name: value }))} className="admin-field-full" />
                <TextField id="edit-sales-email" label="Email" value={editForm.email} onChange={(value) => setEditForm((current) => ({ ...current, email: value }))} type="email" />
                <TextField id="edit-sales-phone" label="Nomor HP" value={editForm.phone} onChange={(value) => setEditForm((current) => ({ ...current, phone: value }))} />
                <EmployeeCodeField
                  id="edit-sales-code"
                  value={editForm.employeeCode}
                  roleId={editForm.roleId}
                  placeholder={editForm.roleId ? 'Klik generate kode' : 'Pilih role dulu'}
                  disabled={generatingCode}
                  onChange={(value) => setEditForm((current) => ({ ...current, employeeCode: value }))}
                  onGenerate={() => handleGenerateEmployeeCode('edit')}
                />
                <div className="admin-field">
                  <label htmlFor="edit-sales-status">Status</label>
                  <select
                    id="edit-sales-status"
                    value={editForm.status}
                    onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value as TenantUser['status'] }))}
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
              <button onClick={handleUpdate} className="admin-btn-primary" type="button" disabled={saving || !editForm.name || !editForm.roleId}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedSales ? (
        <div className="admin-modal-overlay" onClick={() => setSelectedSales(null)}>
          <div className="admin-modal admin-modal-sm" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Detail Akun Sales</h2>
              <button onClick={() => setSelectedSales(null)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <div className="flex items-center gap-4 mb-6 p-4 rounded-xl" style={{ background: 'var(--admin-bg)' }}>
                <div className="admin-user-avatar" style={{ width: 56, height: 56, fontSize: '1.5rem' }}>
                  {selectedSales.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-admin-foreground">{selectedSales.name}</div>
                  <div className="text-sm text-admin-muted">{selectedSales.roleName ?? selectedSales.roleCode}</div>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-admin-muted">
                    {selectedSales.email ? <span className="inline-flex items-center gap-1"><Mail size={12} />{selectedSales.email}</span> : null}
                    {selectedSales.phone ? <span className="inline-flex items-center gap-1"><Phone size={12} />{selectedSales.phone}</span> : null}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DetailBox label="Kode Karyawan" value={selectedSales.employeeCode ?? '-'} />
                <DetailBox label="Status" value={selectedSales.status} />
                <DetailBox label="Role" value={selectedSales.roleName ?? selectedSales.roleCode} />
                <DetailBox label="Login Terakhir" value={selectedSales.lastLoginAt ? new Date(selectedSales.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah'} />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => openEdit(selectedSales)} className="admin-btn-primary" type="button">
                <Pencil size={14} />
                Edit
              </button>
              <button onClick={() => setSelectedSales(null)} className="admin-btn-ghost" type="button">Tutup</button>
            </div>
          </div>
        </div>
      ) : null}

      {resetTarget ? (
        <div className="admin-modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="admin-modal admin-modal-sm" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Reset Password</h2>
              <button onClick={() => setResetTarget(null)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <p className="text-admin-muted mb-4">Reset password untuk <strong>{resetTarget.name}</strong>.</p>
              <PasswordField id="sales-reset-password" label="Password Baru *" value={newPassword} onChange={setNewPassword} />
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setResetTarget(null)} className="admin-btn-ghost" type="button">Batal</button>
              <button onClick={handleResetPassword} className="admin-btn-primary" type="button" disabled={saving || newPassword.length < 6}>
                {saving ? 'Mereset...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SalesRoleField(props: { id: string; value: string; roles: Role[]; onChange: (value: string) => void }) {
  return (
    <div className="admin-field admin-field-full">
      <label htmlFor={props.id}>Role Sales *</label>
      <select id={props.id} value={props.value} onChange={(event) => props.onChange(event.target.value)} className="admin-select">
        <option value="">— Pilih Role Sales —</option>
        {props.roles.map((role) => (
          <option key={role.id} value={role.id}>{role.name} ({role.code})</option>
        ))}
      </select>
    </div>
  );
}

function TextField(props: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; className?: string }) {
  return (
    <div className={`admin-field ${props.className ?? ''}`}>
      <label htmlFor={props.id}>{props.label}</label>
      <input
        id={props.id}
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="admin-input"
      />
    </div>
  );
}

function PasswordField(props: { id: string; label: string; value: string; onChange: (value: string) => void; className?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`admin-field ${props.className ?? ''}`}>
      <label htmlFor={props.id}>{props.label}</label>
      <div className="admin-password-field">
        <input
          id={props.id}
          type={visible ? 'text' : 'password'}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className="admin-input"
          placeholder="Minimal 6 karakter"
        />
        <button
          type="button"
          className="admin-password-toggle"
          onClick={() => setVisible((current) => !current)}
          title={visible ? 'Sembunyikan password' : 'Tampilkan password'}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function EmployeeCodeField(props: {
  id: string;
  value: string;
  roleId: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="admin-field">
      <label htmlFor={props.id}>Kode Karyawan</label>
      <div className="admin-input-action">
        <input
          id={props.id}
          type="text"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
          className="admin-input"
        />
        <button
          type="button"
          className="admin-btn-icon-sm"
          title="Generate kode karyawan"
          disabled={!props.roleId || props.disabled}
          onClick={props.onGenerate}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <small className="admin-field-hint">Format otomatis dari backend: KODE_COMPANY-urutan. Tetap bisa diisi manual.</small>
    </div>
  );
}

function DetailBox(props: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
      <div className="text-xs text-admin-muted font-semibold uppercase tracking-wider mb-1">{props.label}</div>
      <div className="font-bold text-admin-foreground">{props.value}</div>
    </div>
  );
}
