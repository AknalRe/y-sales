import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePhoneInput } from '@/hooks/use-phone-input';
import {
  Users, Plus, Search, Trash2, RefreshCw,
  KeyRound, AlertTriangle, CheckCircle2, UserX, Pencil, Eye, EyeOff, Camera,
  X
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
import { showAppToast } from '@/components/ui/app-toast';
import { FaceCaptureField } from '../shared/face-capture-field';

import {
  AdminDialog,
  AdminDialogPortal,
  AdminDialogBackdrop,
  AdminDialogContent,
  AdminDialogHeader,
  AdminDialogTitle,
  AdminDialogSubtitle,
  AdminDialogClose,
  AdminDialogBody,
  AdminDialogFooter,
} from '@/components/ui-composed/cva/dialog-admin';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectPositioner,
  SelectPopup,
  SelectList,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectScrollUpArrow,
  SelectScrollDownArrow,
  SelectChevronUpDownIcon,
  SelectCheckIcon,
} from '@/components/ui-composed/module/select-field';

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [createPasswordVisible, setCreatePasswordVisible] = useState(false);
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);

  const phoneInput = usePhoneInput();

  const createUserSchema = z.object({
    name: z.string().min(1, 'Nama lengkap wajib diisi.'),
    email: z.string().min(1, 'Email wajib diisi.').refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Format email tidak valid.',
    }),
    phone: z.string().optional().refine((val) => !val || /^[0-9+\-\s()]+$/.test(val), {
      message: 'Nomor HP hanya boleh angka.',
    }),
    employeeCode: z.string().optional(),
    password: z.string().min(1, 'Password wajib diisi.').min(6, 'Password minimal 6 karakter.'),
    roleId: z.string().min(1, 'Role wajib dipilih.'),
  });

  type CreateUserForm = z.infer<typeof createUserSchema>;

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: createErrors },
    reset: resetCreateForm,
    setValue: setCreateValue,
    watch: watchCreate,
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      employeeCode: '',
      password: '',
      roleId: '',
    },
  });

  const updateUserSchema = z.object({
    name: z.string().min(1, 'Nama lengkap wajib diisi.'),
    email: z.string().min(1, 'Email wajib diisi.').refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Format email tidak valid.',
    }),
    phone: z.string().optional().refine((val) => !val || /^[0-9+\-\s()]+$/.test(val), {
      message: 'Nomor HP hanya boleh angka.',
    }),
    employeeCode: z.string().optional(),
    roleId: z.string().min(1, 'Role wajib dipilih.'),
    status: z.enum(['active', 'inactive', 'suspended']),
  });

  type UpdateUserForm = z.infer<typeof updateUserSchema>;

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors },
    reset: resetEditForm,
    setValue: setEditValue,
    watch: watchEdit,
  } = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      employeeCode: '',
      roleId: '',
      status: 'active',
    },
  });

  const resetPasswordSchema = z.object({
    password: z.string().min(6, 'Password minimal 6 karakter.'),
  });

  type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetPasswordErrors },
    reset: resetPasswordForm,
    watch: watchResetPassword,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: {
      password: '',
    },
  });

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone ?? '').includes(search)
  );

  const activeFaceTemplateByUser = new Map(faceTemplates.filter((template) => template.status === 'active').map((template) => [template.userId, template]));

  async function handleGenerateEmployeeCode(mode: 'create' | 'edit') {
    if (!accessToken) return;
    const roleId = mode === 'create' ? watchCreate('roleId') : watchEdit('roleId');
    const excludeUserId = mode === 'edit' ? editTarget?.id : undefined;
    if (!roleId) return;

    setGeneratingCode(true);
    setError('');
    try {
      const data = await suggestEmployeeCode(accessToken, roleId, excludeUserId);
      if (mode === 'create') {
        setCreateValue('employeeCode', data.employeeCode);
      } else {
        setEditValue('employeeCode', data.employeeCode);
      }
    } catch (e: any) {
      const message = e.message ?? 'Gagal generate kode karyawan.';
      setError(message);
      showAppToast({ title: 'Gagal Generate Kode Karyawan', message, tone: 'error', duration: 5000 });
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

  async function handleCreate(data: CreateUserForm) {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    try {
      await createUser(accessToken, {
        roleId: data.roleId,
        name: data.name.trim(),
        email: data.email.trim() || undefined,
        phone: data.phone.trim() || undefined,
        employeeCode: data.employeeCode.trim() || undefined,
        password: data.password,
      });
      setShowCreate(false);
      resetCreateForm();
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
    resetEditForm({
      name: user.name,
      email: user.email ?? '',
      phone: user.phone ?? '',
      employeeCode: user.employeeCode ?? '',
      roleId: user.roleId ?? roles.find((role) => role.code === user.roleCode)?.id ?? '',
      status: user.status,
    });
  }

  async function handleUpdate(data: UpdateUserForm) {
    if (!accessToken || !editTarget) return;
    setSaving(true);
    setError('');
    try {
      await updateUser(accessToken, editTarget.id, {
        roleId: data.roleId,
        name: data.name.trim(),
        email: data.email.trim() || null,
        phone: data.phone.trim() || null,
        employeeCode: data.employeeCode.trim() || null,
        status: data.status,
      });
      setEditTarget(null);
      setSuccess(`User ${data.name} berhasil diperbarui.`);
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

  async function handleResetPassword(data: ResetPasswordForm) {
    if (!accessToken || !resetTarget) return;
    setSaving(true);
    setError('');
    try {
      await resetPassword(accessToken, resetTarget.id, data.password);
      setResetTarget(null);
      resetPasswordForm();
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

      <div className="grid gap-3 items-center sm:grid-cols-[minmax(260px,1fr)_auto] mb-5">
        <div className="admin-search-box !mb-0 h-[42px] !py-0 px-3">
          <Search size={18} />
          <input
            id="users-search"
            className="h-full"
            type="text"
            placeholder="Cari nama, email, atau nomor HP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search ? (
            <button className="admin-search-clear" type="button" onClick={() => setSearch('')} title="Bersihkan pencarian">
              <X size={14} />
            </button>
          ) : null}
        </div>
        <span className="admin-count-badge">
          {filtered.length} user
        </span>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading"><RefreshCw size={18} className="animate-spin" /><span>Memuat...</span></div>
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
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {user.employeeCode && (
                            <code className="admin-role-badge">{user.employeeCode}</code>
                          )}
                          <span className={`admin-role-badge inline-flex items-center gap-1.5 whitespace-nowrap ${activeFaceTemplateByUser.has(user.id) ? 'text-admin-success' : 'text-admin-muted'}`}>
                            <Camera size={11} />
                            {activeFaceTemplateByUser.has(user.id) ? 'Wajah aktif' : 'Belum wajah'}
                          </span>
                        </div>
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
                        onClick={() => { resetPasswordForm(); setResetTarget(user); }}
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
                <EmptyState colSpan={6} icon={<Users size={40} className="mx-auto text-admin-muted" />} title="Belum ada user" description="Tambahkan user pertama Anda." />
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create User Modal */}
      <AdminDialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetCreateForm(); } else { resetCreateForm(); } }} disablePointerDismissal={saving}>
        <AdminDialogPortal>
          <AdminDialogBackdrop />
          <AdminDialogContent className="admin-page">
            <AdminDialogHeader>
              <AdminDialogTitle>Tambah User Baru</AdminDialogTitle>
              <AdminDialogClose aria-label="Tutup"><X size={18} /></AdminDialogClose>
            </AdminDialogHeader>
            <AdminDialogBody>
              <div className="admin-form-grid">
                <div className="admin-field admin-field-full">
                  <label htmlFor="user-role">Role <span className="text-admin-danger">*</span></label>
                  <Select
                    items={[
                      { value: '', label: '— Pilih Role —' },
                      ...roles.map(r => ({ value: r.id, label: `${r.name} (${r.code})` })),
                    ]}
                    value={watchCreate('roleId')}
                    onValueChange={(nextValue) => {
                      setCreateValue('roleId', String(nextValue));
                    }}
                  >
                    <SelectTrigger className={`admin-select ${createErrors.roleId ? 'aria-invalid:border-destructive' : ''}`} id="user-role" aria-invalid={!!createErrors.roleId}>
                      <SelectValue />
                      <SelectIcon>
                        <SelectChevronUpDownIcon />
                      </SelectIcon>
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner sideOffset={8}>
                        <SelectPopup>
                          <SelectScrollUpArrow />
                          <SelectList>
                            {[
                              { value: '', label: '— Pilih Role —' },
                              ...roles.map(r => ({ value: r.id, label: `${r.name} (${r.code})` })),
                            ].map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <SelectItemIndicator>
                                  <SelectCheckIcon />
                                </SelectItemIndicator>
                                <SelectItemText>{option.label}</SelectItemText>
                              </SelectItem>
                            ))}
                          </SelectList>
                          <SelectScrollDownArrow />
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                  {createErrors.roleId && (
                    <small className="text-admin-danger text-xs">{createErrors.roleId.message}</small>
                  )}
                </div>
                <div className="admin-field admin-field-full">
                  <label htmlFor="user-name">Nama Lengkap <span className="text-admin-danger">*</span></label>
                  <input
                    id="user-name"
                    type="text"
                    {...registerCreate('name')}
                    placeholder="Budi Santoso"
                    className="admin-input"
                    autoComplete="off"
                    required
                    aria-invalid={!!createErrors.name}
                    aria-describedby={createErrors.name ? 'user-name-error' : undefined}
                  />
                  {createErrors.name && (
                    <small id="user-name-error" className="text-admin-danger text-xs">{createErrors.name.message}</small>
                  )}
                </div>
                <div className="admin-field">
                  <label htmlFor="user-email">Email <span className="text-admin-danger">*</span></label>
                  <input
                    id="user-email"
                    type="email"
                    {...registerCreate('email')}
                    placeholder="budi@company.com"
                    className="admin-input"
                    autoComplete="off"
                    aria-invalid={!!createErrors.email}
                    aria-describedby={createErrors.email ? 'user-email-error' : undefined}
                  />
                  {createErrors.email && (
                    <small id="user-email-error" className="text-admin-danger text-xs">{createErrors.email.message}</small>
                  )}
                </div>
                <div className="admin-field">
                  <label htmlFor="user-phone">Nomor HP</label>
                  <input
                    id="user-phone"
                    type="tel"
                    {...registerCreate('phone')}
                    placeholder="08xxxxxxxxx"
                    className="admin-input"
                    autoComplete="off"
                    aria-invalid={!!createErrors.phone}
                    aria-describedby={createErrors.phone ? 'user-phone-error' : undefined}
                    {...phoneInput}
                  />
                  {createErrors.phone && (
                    <small id="user-phone-error" className="text-admin-danger text-xs">{createErrors.phone.message}</small>
                  )}
                </div>
                <div className="admin-field">
                  <label htmlFor="user-employee-code">Kode Karyawan</label>
                  <div className="admin-input-action relative">
                    <input
                      id="user-employee-code"
                      type="text"
                      {...registerCreate('employeeCode')}
                      placeholder={watchCreate('roleId') ? 'Klik generate kode' : 'Pilih role dulu'}
                      className="admin-input pr-10"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="admin-btn-icon-sm"
                      title="Generate kode karyawan"
                      disabled={!watchCreate('roleId') || generatingCode}
                      onClick={() => handleGenerateEmployeeCode('create')}
                    >
                      <RefreshCw size={14} className={generatingCode ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <small className="admin-field-hint">Format otomatis: KODE_COMPANY-urutan. Tetap bisa diisi manual.</small>
                </div>
                <div className="admin-field">
                  <label htmlFor="user-password">Password <span className="text-admin-danger">*</span></label>
                  <div className="admin-password-field">
                    <input
                      id="user-password"
                      type={createPasswordVisible ? 'text' : 'password'}
                      {...registerCreate('password')}
                      placeholder="Minimal 6 karakter"
                      className="admin-input"
                      autoComplete="new-password"
                      required
                      minLength={6}
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
                   {createErrors.password && (
                     <small className="text-admin-danger text-xs">{createErrors.password.message}</small>
                   )}
                 </div>
              </div>
            </AdminDialogBody>
            <AdminDialogFooter>
              <button onClick={() => { setShowCreate(false); resetCreateForm(); }} className="admin-btn-ghost" type="button">Batal</button>
              <button
                id="users-submit-create"
                onClick={handleSubmitCreate(handleCreate)}
                className="admin-btn-primary"
                type="button"
                disabled={saving}
              >
                {saving ? 'Menyimpan...' : 'Buat User'}
              </button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialogPortal>
      </AdminDialog>

      {/* Edit User Modal */}
      <AdminDialog open={!!editTarget} onOpenChange={(open) => { if (!open) { setEditTarget(null); resetEditForm(); } }} disablePointerDismissal={saving}>
        <AdminDialogPortal>
          <AdminDialogBackdrop />
          <AdminDialogContent className="admin-page">
            <AdminDialogHeader>
              <div>
                <AdminDialogTitle>Edit User</AdminDialogTitle>
                <AdminDialogSubtitle>{editTarget?.name}</AdminDialogSubtitle>
              </div>
              <AdminDialogClose aria-label="Tutup"><X size={18} /></AdminDialogClose>
            </AdminDialogHeader>
            <AdminDialogBody>
              <div className="admin-form-grid">
                <div className="admin-field admin-field-full">
                  <label htmlFor="edit-user-role">Role <span className="text-admin-danger">*</span></label>
                  <Select
                    items={[
                      { value: '', label: '— Pilih Role —' },
                      ...roles.map(r => ({ value: r.id, label: `${r.name} (${r.code})` })),
                    ]}
                    value={watchEdit('roleId')}
                    onValueChange={(nextValue) => {
                      setEditValue('roleId', String(nextValue));
                    }}
                  >
                    <SelectTrigger className={`admin-select ${editErrors.roleId ? 'aria-invalid:border-destructive' : ''}`} id="edit-user-role" aria-invalid={!!editErrors.roleId}>
                      <SelectValue />
                      <SelectIcon>
                        <SelectChevronUpDownIcon />
                      </SelectIcon>
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner sideOffset={8}>
                        <SelectPopup>
                          <SelectScrollUpArrow />
                          <SelectList>
                            {[
                              { value: '', label: '— Pilih Role —' },
                              ...roles.map(r => ({ value: r.id, label: `${r.name} (${r.code})` })),
                            ].map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <SelectItemIndicator>
                                  <SelectCheckIcon />
                                </SelectItemIndicator>
                                <SelectItemText>{option.label}</SelectItemText>
                              </SelectItem>
                            ))}
                          </SelectList>
                          <SelectScrollDownArrow />
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                  {editErrors.roleId && (
                    <small className="text-admin-danger text-xs">{editErrors.roleId.message}</small>
                  )}
                </div>
                <div className="admin-field admin-field-full">
                  <label htmlFor="edit-user-name">Nama Lengkap <span className="text-admin-danger">*</span></label>
                  <input
                    id="edit-user-name"
                    type="text"
                    {...registerEdit('name')}
                    className="admin-input"
                    aria-invalid={!!editErrors.name}
                    aria-describedby={editErrors.name ? 'edit-user-name-error' : undefined}
                  />
                  {editErrors.name && (
                    <small id="edit-user-name-error" className="text-admin-danger text-xs">{editErrors.name.message}</small>
                  )}
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-user-email">Email <span className="text-admin-danger">*</span></label>
                  <input
                    id="edit-user-email"
                    type="email"
                    {...registerEdit('email')}
                    className="admin-input"
                    aria-invalid={!!editErrors.email}
                    aria-describedby={editErrors.email ? 'edit-user-email-error' : undefined}
                  />
                  {editErrors.email && (
                    <small id="edit-user-email-error" className="text-admin-danger text-xs">{editErrors.email.message}</small>
                  )}
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-user-phone">Nomor HP</label>
                  <input
                    id="edit-user-phone"
                    type="tel"
                    {...registerEdit('phone')}
                    className="admin-input"
                    aria-invalid={!!editErrors.phone}
                    aria-describedby={editErrors.phone ? 'edit-user-phone-error' : undefined}
                    {...phoneInput}
                  />
                  {editErrors.phone && (
                    <small id="edit-user-phone-error" className="text-admin-danger text-xs">{editErrors.phone.message}</small>
                  )}
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-user-employee-code">Kode Karyawan</label>
                  <div className="admin-input-action relative">
                    <input
                      id="edit-user-employee-code"
                      type="text"
                      {...registerEdit('employeeCode')}
                      placeholder={watchEdit('roleId') ? 'Klik generate kode' : 'Pilih role dulu'}
                      className="admin-input pr-10"
                    />
                    <button
                      type="button"
                      className="admin-btn-icon-sm"
                      title="Generate kode karyawan"
                      disabled={!watchEdit('roleId') || generatingCode}
                      onClick={() => handleGenerateEmployeeCode('edit')}
                    >
                      <RefreshCw size={14} className={generatingCode ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <small className="admin-field-hint">Klik generate bila ingin mengganti ke format KODE_COMPANY-urutan; input manual tetap diperbolehkan.</small>
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-user-status">Status</label>
                  <Select
                    items={[
                      { value: 'active', label: 'Aktif' },
                      { value: 'inactive', label: 'Nonaktif' },
                      { value: 'suspended', label: 'Suspended' },
                    ]}
                    value={watchEdit('status')}
                    onValueChange={(nextValue) => {
                      setEditValue('status', nextValue as 'active' | 'inactive' | 'suspended');
                    }}
                  >
                    <SelectTrigger className="admin-select" id="edit-user-status">
                      <SelectValue />
                      <SelectIcon>
                        <SelectChevronUpDownIcon />
                      </SelectIcon>
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner sideOffset={8}>
                        <SelectPopup>
                          <SelectScrollUpArrow />
                          <SelectList>
                            {[
                              { value: 'active', label: 'Aktif' },
                              { value: 'inactive', label: 'Nonaktif' },
                              { value: 'suspended', label: 'Suspended' },
                            ].map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <SelectItemIndicator>
                                  <SelectCheckIcon />
                                </SelectItemIndicator>
                                <SelectItemText>{option.label}</SelectItemText>
                              </SelectItem>
                            ))}
                          </SelectList>
                          <SelectScrollDownArrow />
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                </div>
              </div>
            </AdminDialogBody>
            <AdminDialogFooter>
              <button onClick={() => { setEditTarget(null); resetEditForm(); }} className="admin-btn-ghost" type="button">Batal</button>
              <button
                id="users-submit-edit"
                onClick={handleSubmitEdit(handleUpdate)}
                className="admin-btn-primary"
                type="button"
                disabled={saving}
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialogPortal>
      </AdminDialog>

      {/* Reset Password Modal */}
      <AdminDialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); resetPasswordForm(); } }} disablePointerDismissal={saving}>
        <AdminDialogPortal>
          <AdminDialogBackdrop />
          <AdminDialogContent size="sm" className="admin-page">
            <AdminDialogHeader>
              <AdminDialogTitle>Reset Password</AdminDialogTitle>
              <AdminDialogClose aria-label="Tutup"><X size={18} /></AdminDialogClose>
            </AdminDialogHeader>
            <AdminDialogBody>
              <p className="text-admin-muted mb-4">
                Reset password untuk <strong>{resetTarget?.name}</strong>.
              </p>
              <div className="admin-field">
                <label htmlFor="new-password">Password Baru <span className="text-admin-danger">*</span></label>
                <div className="admin-password-field">
                  <input
                    id="new-password"
                    type={resetPasswordVisible ? 'text' : 'password'}
                    {...registerReset('password')}
                    placeholder="Minimal 6 karakter"
                    className="admin-input"
                    aria-invalid={!!resetPasswordErrors.password}
                    aria-describedby={resetPasswordErrors.password ? 'new-password-error' : undefined}
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
                {resetPasswordErrors.password && (
                  <small id="new-password-error" className="text-admin-danger text-xs">{resetPasswordErrors.password.message}</small>
                )}
              </div>
            </AdminDialogBody>
            <AdminDialogFooter>
              <button onClick={() => { setResetTarget(null); resetPasswordForm(); }} className="admin-btn-ghost" type="button">Batal</button>
              <button
                id="users-confirm-reset"
                onClick={handleSubmitReset(handleResetPassword)}
                className="admin-btn-primary"
                type="button"
                disabled={saving}
              >
                {saving ? 'Mereset...' : 'Reset Password'}
              </button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialogPortal>
      </AdminDialog>

      {/* Face Enrollment Modal */}
      <AdminDialog open={!!faceTarget} onOpenChange={(open) => { if (!open) { setFaceTarget(null); setFaceFile(null); setFacePreview(''); } }} disablePointerDismissal={faceSaving}>
        <AdminDialogPortal>
          <AdminDialogBackdrop />
          <AdminDialogContent size="sm" className="admin-page">
            <AdminDialogHeader>
              <div>
                <AdminDialogTitle>Data Wajah User</AdminDialogTitle>
                <AdminDialogSubtitle>{faceTarget?.name}</AdminDialogSubtitle>
              </div>
              <AdminDialogClose aria-label="Tutup"><X size={18} /></AdminDialogClose>
            </AdminDialogHeader>
            <AdminDialogBody>
              <div className="admin-alert admin-alert-info" style={{ marginBottom: '1rem' }}>
                <Camera size={15} />
                Foto ini menjadi template wajah aktif user. Template lama akan otomatis dinonaktifkan.
              </div>
              <FaceCaptureField
                id="user-face-file"
                preview={facePreview}
                targetName={faceTarget?.name ?? ''}
                onCapture={handleFaceFileChange}
              />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="admin-detail-box flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-admin-muted">Status Template</span>
                  <strong className="text-sm font-black text-admin-foreground">{faceTarget && activeFaceTemplateByUser.has(faceTarget.id) ? 'Sudah aktif' : 'Belum ada'}</strong>
                </div>
                <div className="admin-detail-box flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-admin-muted">File Baru</span>
                  <strong className="text-sm font-black text-admin-foreground">{faceFile ? `${Math.round(faceFile.size / 1024)} KB` : '-'}</strong>
                </div>
              </div>
            </AdminDialogBody>
            <AdminDialogFooter>
              <button onClick={() => { setFaceTarget(null); setFaceFile(null); setFacePreview(''); }} className="admin-btn-ghost" type="button">Batal</button>
              <button onClick={handleEnrollFace} className="admin-btn-primary" type="button" disabled={faceSaving || !facePreview}>
                {faceSaving ? 'Menyimpan...' : 'Simpan Wajah'}
              </button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialogPortal>
      </AdminDialog>
    </div>
  );
}
