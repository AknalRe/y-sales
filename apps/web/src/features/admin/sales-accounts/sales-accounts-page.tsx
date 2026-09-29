import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileUp,
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
import * as XLSX from 'xlsx-js-style';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '../../auth/auth-provider';
import {
  createUser,
  deleteUser,
  enrollFaceTemplate,
  getFaceTemplates,
  getRoles,
  getUsers,
  resetPassword,
  suggestEmployeeCode,
  updateUser,
  type FaceTemplate,
  type Role,
  type TenantUser,
} from '@/lib/api/platform';
import { usePhoneInput } from '@/hooks/use-phone-input';
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

type SalesAccount = TenantUser;

const statusIcon = {
  active: <CheckCircle2 size={13} className="text-admin-success" />,
  inactive: <UserX size={13} className="text-admin-muted" />,
  suspended: <AlertTriangle size={13} className="text-admin-danger" />,
};

const salesCategorySchema = z.enum(['motoris', 'dropping']);
type SalesCategory = z.infer<typeof salesCategorySchema>;

const createSalesSchema = z.object({
  roleId: z.string().min(1, 'Role sales wajib dipilih.'),
  name: z.string().min(1, 'Nama sales wajib diisi.'),
  email: z
    .string()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Format email tidak valid.',
    }),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9+\-\s()]+$/.test(val), {
      message: 'Nomor HP hanya boleh angka.',
    }),
  employeeCode: z.string().optional(),
  password: z.string().min(6, 'Password minimal 6 karakter.'),
  salesCategory: salesCategorySchema,
});

type CreateSalesForm = z.infer<typeof createSalesSchema>;

const editSalesSchema = z.object({
  roleId: z.string().min(1, 'Role sales wajib dipilih.'),
  name: z.string().min(1, 'Nama sales wajib diisi.'),
  email: z
    .string()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Format email tidak valid.',
    }),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9+\-\s()]+$/.test(val), {
      message: 'Nomor HP hanya boleh angka.',
    }),
  employeeCode: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']),
  salesCategory: salesCategorySchema,
});

type EditSalesForm = z.infer<typeof editSalesSchema>;

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password minimal 6 karakter.'),
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Gagal membaca file foto wajah.'));
    reader.readAsDataURL(file);
  });
}

function UserAvatar(props: { name: string; imageUrl?: string | null; size?: number }) {
  const size = props.size ?? 36;
  if (props.imageUrl) {
    return (
      <img
        className="admin-user-avatar admin-user-avatar-img"
        src={props.imageUrl}
        alt={`Foto wajah ${props.name}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div className="admin-user-avatar" style={{ width: size, height: size }}>
      {props.name.charAt(0).toUpperCase()}
    </div>
  );
}

async function dataUrlToFile(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], `face-template-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
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
  const [salesCategoryFilter, setSalesCategoryFilter] = useState('');
  const [selectedSales, setSelectedSales] = useState<SalesAccount | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<SalesAccount | null>(null);
  const [resetTarget, setResetTarget] = useState<SalesAccount | null>(null);
  const [faceTarget, setFaceTarget] = useState<SalesAccount | null>(null);
  const [faceTemplates, setFaceTemplates] = useState<FaceTemplate[]>([]);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState('');
  const [faceSaving, setFaceSaving] = useState(false);
  const [createPasswordVisible, setCreatePasswordVisible] = useState(false);
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);

  const phoneInput = usePhoneInput();

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: createErrors },
    reset: resetCreateForm,
    setValue: setCreateValue,
    watch: watchCreate,
  } = useForm<CreateSalesForm>({
    resolver: zodResolver(createSalesSchema),
    mode: 'onBlur',
    defaultValues: { roleId: '', name: '', email: '', phone: '', employeeCode: '', password: '', salesCategory: 'motoris' },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors },
    reset: resetEditForm,
    setValue: setEditValue,
    watch: watchEdit,
  } = useForm<EditSalesForm>({
    resolver: zodResolver(editSalesSchema),
    mode: 'onBlur',
    defaultValues: { roleId: '', name: '', email: '', phone: '', employeeCode: '', status: 'active', salesCategory: 'motoris' },
  });

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetPasswordErrors },
    reset: resetPasswordForm,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: { password: '' },
  });

  const salesRoles = useMemo(() => roles.filter((role) => isSalesRole(role.code, role.name)), [roles]);

  const salesAccounts = useMemo(() => {
    return users.filter((user) => isSalesRole(user.roleCode, user.roleName));
  }, [users]);

  const filtered = useMemo(() => {
    return salesAccounts.filter((sales) => {
      if (statusFilter && sales.status !== statusFilter) return false;
      if (salesCategoryFilter && sales.salesCategory !== salesCategoryFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        sales.name.toLowerCase().includes(q) ||
        (sales.email ?? '').toLowerCase().includes(q) ||
        (sales.phone ?? '').includes(search) ||
        (sales.employeeCode ?? '').toLowerCase().includes(q)
      );
    });
  }, [salesAccounts, statusFilter, salesCategoryFilter, search]);

  const stats = useMemo(() => {
    const active = salesAccounts.filter((s) => s.status === 'active').length;
    const suspended = salesAccounts.filter((s) => s.status === 'suspended').length;
    const inactive = salesAccounts.filter((s) => s.status === 'inactive').length;
    return { active, inactive, suspended, total: salesAccounts.length };
  }, [salesAccounts]);

  const activeFaceTemplateByUser = useMemo(() => {
    return new Map(faceTemplates.filter((t) => t.status === 'active').map((t) => [t.userId, t]));
  }, [faceTemplates]);

  const salesCategoryOptions = [
    { value: '', label: 'Semua Kategori' },
    { value: 'motoris', label: 'Motoris' },
    { value: 'dropping', label: 'Dropping' },
  ];

  const statusOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
    { value: 'suspended', label: 'Suspended' },
  ];

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [userRes, roleRes, faceRes] = await Promise.allSettled([getUsers(accessToken), getRoles(accessToken), getFaceTemplates(accessToken)]);
      if (userRes.status === 'fulfilled') setUsers(userRes.value.users ?? []);
      if (roleRes.status === 'fulfilled') setRoles(roleRes.value.roles ?? []);
      if (faceRes.status === 'fulfilled') setFaceTemplates(faceRes.value.templates ?? []);
      const failed = [userRes, roleRes].find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
      if (failed) throw failed.reason;
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data akun sales.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  function openCreate() {
    resetCreateForm({
      roleId: salesRoles[0]?.id ?? '',
      name: '', email: '', phone: '', employeeCode: '', password: '',
      salesCategory: 'motoris',
    });
    setCreatePasswordVisible(false);
    setShowCreate(true);
  }

  function openEdit(sales: SalesAccount) {
    setEditTarget(sales);
    resetEditForm({
      roleId: sales.roleId ?? salesRoles.find((role) => role.code === sales.roleCode)?.id ?? '',
      name: sales.name,
      email: sales.email ?? '',
      phone: sales.phone ?? '',
      employeeCode: sales.employeeCode ?? '',
      status: sales.status,
      salesCategory: (sales.salesCategory as SalesCategory) ?? 'motoris',
    });
  }

  async function handleGenerateEmployeeCode(mode: 'create' | 'edit') {
    if (!accessToken) return;
    const effectiveRoleId = mode === 'create' ? watchCreate('roleId') : watchEdit('roleId');
    const excludeUserId = mode === 'edit' ? editTarget?.id : undefined;
    if (!effectiveRoleId) return;
    setGeneratingCode(true);
    setError('');
    try {
      const data = await suggestEmployeeCode(accessToken, effectiveRoleId, excludeUserId);
      if (mode === 'create') setCreateValue('employeeCode', data.employeeCode);
      else setEditValue('employeeCode', data.employeeCode);
    } catch (e: any) {
      const message = e.message ?? 'Gagal generate kode karyawan.';
      setError(message);
      showAppToast({ title: 'Gagal Generate Kode Karyawan', message, tone: 'error', duration: 5000 });
    } finally {
      setGeneratingCode(false);
    }
  }

  async function handleCreate(data: CreateSalesForm) {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    try {
      await createUser(accessToken, {
        roleId: data.roleId,
        name: data.name.trim(),
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        employeeCode: data.employeeCode?.trim() || undefined,
        password: data.password,
        salesCategory: data.salesCategory,
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

  async function handleUpdate(data: EditSalesForm) {
    if (!accessToken || !editTarget) return;
    setSaving(true);
    setError('');
    try {
      await updateUser(accessToken, editTarget.id, {
        roleId: data.roleId,
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        employeeCode: data.employeeCode?.trim() || null,
        status: data.status,
        salesCategory: data.salesCategory,
      });
      setEditTarget(null);
      setSelectedSales(null);
      setSuccess(`Akun sales ${data.name} berhasil diperbarui.`);
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

  async function handleResetPassword(data: ResetPasswordForm) {
    if (!accessToken || !resetTarget) return;
    setSaving(true);
    setError('');
    try {
      await resetPassword(accessToken, resetTarget.id, data.password);
      setResetTarget(null);
      resetPasswordForm();
      setResetPasswordVisible(false);
      setSuccess(`Password ${resetTarget.name} berhasil direset.`);
    } catch (e: any) {
      setError(e.message ?? 'Gagal reset password.');
    } finally {
      setSaving(false);
    }
  }

  function openFaceEnrollment(sales: SalesAccount) {
    setFaceTarget(sales);
    setFaceFile(null);
    setFacePreview('');
  }

  async function handleFaceFileChange(file?: File | null) {
    if (!file) { setFaceFile(null); setFacePreview(''); return; }
    if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type)) { setError('Foto wajah harus berupa JPEG, PNG, atau WEBP.'); return; }
    if (file.size > 4_000_000) { setError('Ukuran foto wajah maksimal 4MB.'); return; }
    setFaceFile(file);
    setFacePreview(await fileToDataUrl(file));
  }

  async function handleEnrollFace() {
    if (!accessToken || !faceTarget || !facePreview) return;
    setFaceSaving(true);
    setError('');
    try {
      const uploadFile = faceFile ?? (await dataUrlToFile(facePreview));
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

  const importInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; skipped: number; errors: string[] } | null>(null);

  function exportExcel() {
    if (!filtered.length) return;
    const exportRows = filtered.map((sales) => ({
      'Kode Karyawan': sales.employeeCode || '-',
      'Nama Sales': sales.name,
      Email: sales.email || '-',
      'No. HP': sales.phone || '-',
      'Role / Jabatan': sales.roleName || '-',
      'Kategori Sales': sales.salesCategory === 'motoris' ? 'Motoris' : sales.salesCategory === 'dropping' ? 'Dropping' : '-',
      Status: sales.status === 'active' ? 'Aktif' : sales.status === 'suspended' ? 'Disuspen' : 'Nonaktif',
      'Terakhir Login': sales.lastLoginAt ? new Date(sales.lastLoginAt).toLocaleString('id-ID') : '-',
      'Tanggal Dibuat': sales.createdAt ? new Date(sales.createdAt).toLocaleDateString('id-ID') : '-',
    }));
    const sheet = XLSX.utils.json_to_sheet(exportRows);
    sheet['!cols'] = [{wch:18},{wch:25},{wch:25},{wch:18},{wch:20},{wch:16},{wch:14},{wch:22},{wch:16}];
    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:I1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      if (cell) {
        cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'C75A18' } }, alignment: { horizontal: 'center' } };
      }
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Akun Sales');
    XLSX.writeFile(workbook, `master-akun-sales-${new Date().toISOString().slice(0, 10)}.xlsx`, { compression: true });
  }

  function downloadImportTemplate() {
    const defaultRoleName = salesRoles[0]?.name || 'Sales Lapangan';
    const templateRows = [
      { 'Kode Karyawan': 'SALES-001', 'Nama Lengkap': 'Budi Santoso', Email: 'budi.sales@company.com', 'No. HP': '081234567890', Password: 'SalesPassword123', Role: defaultRoleName, 'Kategori Sales': 'motoris', Status: 'active' },
      { 'Kode Karyawan': 'SALES-002', 'Nama Lengkap': 'Siti Rahma', Email: 'siti.sales@company.com', 'No. HP': '085712345678', Password: 'SalesPassword123', Role: defaultRoleName, 'Kategori Sales': 'dropping', Status: 'active' },
    ];
    const sheet = XLSX.utils.json_to_sheet(templateRows);
    sheet['!cols'] = [{wch:18},{wch:25},{wch:28},{wch:18},{wch:20},{wch:22},{wch:16},{wch:14}];
    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:H1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      if (cell) { cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'C75A18' } }, alignment: { horizontal: 'center' } }; }
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Template Akun Sales');
    XLSX.writeFile(workbook, 'template-import-akun-sales.xlsx');
  }

  async function handleImportExcel(file: File) {
    if (!accessToken) return;
    setImporting(true);
    setImportResult(null);
    setError('');
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames.find((n) => ['sales','akun','user','karyawan','template'].some((k) => n.toLowerCase().includes(k))) ?? workbook.SheetNames[0];
      if (!sheetName) throw new Error('Sheet tidak ditemukan di file Excel.');
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]);
      if (!rows.length) throw new Error('File Excel kosong atau tidak ada data akun sales.');

      let ok = 0; let skipped = 0; const errors: string[] = [];
      const defaultRole = salesRoles[0];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        const name = String(row['Nama Lengkap'] ?? row['Nama Sales'] ?? row['Nama'] ?? row['name'] ?? '').trim();
        if (!name) { skipped++; continue; }
        const emailRaw = String(row['Email'] ?? row['email'] ?? '').trim();
        const email = emailRaw ? emailRaw : undefined;
        const phoneRaw = String(row['No. HP'] ?? row['No HP'] ?? row['HP'] ?? row['Telepon'] ?? row['phone'] ?? '').trim();
        const phone = phoneRaw ? phoneRaw : undefined;
        const employeeCodeRaw = String(row['Kode Karyawan'] ?? row['Kode Sales'] ?? row['Kode'] ?? row['employeeCode'] ?? '').trim();
        const employeeCode = employeeCodeRaw ? employeeCodeRaw : undefined;
        const passwordRaw = String(row['Password'] ?? row['Kata Sandi'] ?? row['password'] ?? '').trim();

        const roleInput = String(row['Role'] ?? row['Jabatan'] ?? row['role'] ?? '').trim().toLowerCase();
        let roleId = defaultRole?.id;
        if (roleInput) {
          const foundRole = salesRoles.find((r) => r.name.toLowerCase() === roleInput || r.code.toLowerCase() === roleInput) || roles.find((r) => r.name.toLowerCase() === roleInput || r.code.toLowerCase() === roleInput);
          if (foundRole) roleId = foundRole.id;
        }
        if (!roleId) { errors.push(`Baris ${rowNum} (${name}): Role sales tidak ditemukan.`); continue; }

        const catInput = String(row['Kategori Sales'] ?? row['Kategori'] ?? row['salesCategory'] ?? '').trim().toLowerCase();
        let salesCategory: SalesCategory = 'motoris';
        if (['dropping','drop'].includes(catInput)) salesCategory = 'dropping';
        else if (['motoris','motor'].includes(catInput)) salesCategory = 'motoris';

        const statusInput = String(row['Status'] ?? row['status'] ?? '').trim().toLowerCase();
        let status: TenantUser['status'] = 'active';
        if (['inactive','nonaktif'].includes(statusInput)) status = 'inactive';
        else if (['suspended','suspen','disuspen'].includes(statusInput)) status = 'suspended';

        const existing = salesAccounts.find((u) => {
          if (employeeCode && u.employeeCode && u.employeeCode.toUpperCase() === employeeCode.toUpperCase()) return true;
          if (email && u.email && u.email.toLowerCase() === email.toLowerCase()) return true;
          if (phone && u.phone && u.phone === phone) return true;
          if (u.name.toLowerCase() === name.toLowerCase()) return true;
          return false;
        });

        try {
          if (existing) {
            await updateUser(accessToken, existing.id, { name, email: email || null, phone: phone || null, employeeCode: employeeCode || null, roleId, status, salesCategory });
            ok++;
          } else {
            const password = passwordRaw || 'Sales123!';
            if (password.length < 6) { errors.push(`Baris ${rowNum} (${name}): Password minimal 6 karakter.`); continue; }
            await createUser(accessToken, { roleId, name, email, phone, employeeCode, password, salesCategory });
            ok++;
          }
        } catch (e: any) {
          errors.push(`Baris ${rowNum} (${name}): ${e.message ?? 'Gagal menyimpan ke server'}`);
        }
      }

      setImportResult({ ok, skipped, errors });
      if (ok > 0) { setSuccess(`Import selesai: ${ok} akun sales berhasil diproses.`); await load(); }
    } catch (e: any) {
      setError(e.message ?? 'Gagal membaca file Excel.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><Users size={22} />Manajemen Akun Sales</h1>
          <p className="admin-page-subtitle">Kelola akun sales lapangan untuk absensi, visit outlet, transaksi, dan nota.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImportExcel(f); e.currentTarget.value = ''; }} />
          <button onClick={load} className="admin-btn-ghost" disabled={loading} type="button" title="Refresh data"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button>
          <button onClick={exportExcel} className="admin-btn-ghost" type="button" disabled={loading || !salesAccounts.length} title="Export data akun sales ke Excel"><Download size={15} />Export Excel</button>
          <button onClick={() => { setImportResult(null); setImportOpen(true); }} className="admin-btn-ghost" type="button" disabled={importing || !salesRoles.length} title="Import data akun sales dari Excel"><FileSpreadsheet size={15} />Import Excel</button>
          <button onClick={openCreate} className="admin-btn-primary" type="button" disabled={!salesRoles.length}><Plus size={15} />Tambah Sales</button>
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
          <div className="admin-stat-icon"><Users size={20} /></div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Total Sales</span>
            <strong className="text-2xl font-bold text-admin-foreground">{stats.total}</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><CheckCircle2 size={20} /></div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Aktif</span>
            <strong className="text-2xl font-bold text-admin-foreground">{stats.active}</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><UserX size={20} /></div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Nonaktif</span>
            <strong className="text-2xl font-bold text-admin-foreground">{stats.inactive}</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><AlertTriangle size={20} /></div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Suspended</span>
            <strong className="text-2xl font-bold text-admin-foreground">{stats.suspended}</strong>
          </div>
        </div>
      </div>

      <div className="grid gap-3 items-center sm:grid-cols-[minmax(260px,1fr)_160px_160px] mb-5">
        <div className="admin-search-box !mb-0 h-[42px] !py-0 px-3">
          <Search size={18} />
          <input className="h-full" type="text" placeholder="Cari nama, email, HP, kode karyawan..." value={search} onChange={(event) => setSearch(event.target.value)} />
          {search ? (
            <button className="admin-search-clear" type="button" onClick={() => setSearch('')} title="Bersihkan pencarian"><X size={14} /></button>
          ) : null}
        </div>
        <Select items={salesCategoryOptions} value={salesCategoryFilter} onValueChange={(nextValue) => setSalesCategoryFilter(String(nextValue))}>
          <SelectTrigger className="admin-select w-full h-[42px]">
            <SelectValue /><SelectIcon><SelectChevronUpDownIcon /></SelectIcon>
          </SelectTrigger>
          <SelectPortal><SelectPositioner sideOffset={8}><SelectPopup><SelectScrollUpArrow /><SelectList>{salesCategoryOptions.map((option) => (<SelectItem key={option.value} value={option.value}><SelectItemIndicator><SelectCheckIcon /></SelectItemIndicator><SelectItemText>{option.label}</SelectItemText></SelectItem>))}</SelectList><SelectScrollDownArrow /></SelectPopup></SelectPositioner></SelectPortal>
        </Select>
        <Select items={statusOptions} value={statusFilter} onValueChange={(nextValue) => setStatusFilter(String(nextValue))}>
          <SelectTrigger className="admin-select w-full h-[42px]">
            <SelectValue /><SelectIcon><SelectChevronUpDownIcon /></SelectIcon>
          </SelectTrigger>
          <SelectPortal><SelectPositioner sideOffset={8}><SelectPopup><SelectScrollUpArrow /><SelectList>{statusOptions.map((option) => (<SelectItem key={option.value} value={option.value}><SelectItemIndicator><SelectCheckIcon /></SelectItemIndicator><SelectItemText>{option.label}</SelectItemText></SelectItem>))}</SelectList><SelectScrollDownArrow /></SelectPopup></SelectPositioner></SelectPortal>
        </Select>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading"><RefreshCw size={18} className="animate-spin" /><span>Memuat data akun sales...</span></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Sales</th><th>Kontak</th><th>Kode Karyawan</th><th>Status</th><th>Login Terakhir</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                {filtered.map((sales) => (
                  <tr key={sales.id}>
                    <td>
                      <div className="admin-user-cell">
                        <UserAvatar name={sales.name} imageUrl={activeFaceTemplateByUser.get(sales.id)?.fileUrl} />
                        <div>
                          <div className="admin-user-name">{sales.name}</div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="admin-role-badge capitalize">{sales.roleName ?? sales.roleCode} ({sales.salesCategory || 'motoris'})</span>
                            <span className={`admin-role-badge inline-flex items-center gap-1.5 whitespace-nowrap ${activeFaceTemplateByUser.has(sales.id) ? 'text-admin-success' : 'text-admin-muted'}`}>
                              <Camera size={11} />{activeFaceTemplateByUser.has(sales.id) ? 'Wajah aktif' : 'Belum wajah'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-admin-muted">
                      {sales.email ? <div>{sales.email}</div> : null}
                      {sales.phone ? <div>{sales.phone}</div> : null}
                    </td>
                    <td><code className="admin-role-badge">{sales.employeeCode ?? '-'}</code></td>
                    <td>
                      <button className={`admin-status-pill admin-status-pill-${sales.status}`} onClick={() => toggleStatus(sales)} type="button">
                        {statusIcon[sales.status]}{sales.status}
                      </button>
                    </td>
                    <td className="text-admin-muted">{sales.lastLoginAt ? new Date(sales.lastLoginAt).toLocaleDateString('id-ID') : 'Belum pernah'}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button onClick={() => setSelectedSales(sales)} className="admin-btn-icon-sm" title="Lihat Detail" type="button"><Eye size={14} /></button>
                        <button onClick={() => openEdit(sales)} className="admin-btn-icon-sm" title="Edit Sales" type="button"><Pencil size={14} /></button>
                        <button onClick={() => { resetPasswordForm(); setResetTarget(sales); }} className="admin-btn-icon-sm" title="Reset Password" type="button"><KeyRound size={14} /></button>
                        <button onClick={() => openFaceEnrollment(sales)} className="admin-btn-icon-sm" title="Data Wajah" type="button"><Camera size={14} /></button>
                        <button onClick={() => handleDelete(sales)} className="admin-btn-icon-sm admin-btn-danger-sm" title="Hapus Sales" type="button"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <EmptyState colSpan={6} icon={<Users size={40} className="mx-auto text-admin-muted" />} title="Tidak Ada Akun Sales" description="Belum ada akun sales yang terdaftar." />
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminDialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetCreateForm(); } else { resetCreateForm(); } }} disablePointerDismissal={saving}>
        <AdminDialogPortal>
          <AdminDialogBackdrop />
          <AdminDialogContent className="admin-page">
            <AdminDialogHeader>
              <div>
                <AdminDialogTitle>Tambah Sales</AdminDialogTitle>
                <AdminDialogSubtitle>Akun sales otomatis masuk ke alur absensi, visit outlet, transaksi, dan nota.</AdminDialogSubtitle>
              </div>
              <AdminDialogClose aria-label="Tutup"><X size={18} /></AdminDialogClose>
            </AdminDialogHeader>
            <AdminDialogBody>
              <div className="admin-form-grid">
                <div className="admin-field admin-field-full">
                  <label htmlFor="sales-role">Role Sales <span className="text-admin-danger">*</span></label>
                  <Select items={[{ value: '', label: '— Pilih Role Sales —' }, ...salesRoles.map(r => ({ value: r.id, label: `${r.name} (${r.code})` }))]} value={watchCreate('roleId')} onValueChange={(nextValue) => setCreateValue('roleId', String(nextValue))}>
                    <SelectTrigger className={`admin-select ${createErrors.roleId ? 'aria-invalid:border-destructive' : ''}`} id="sales-role" aria-invalid={!!createErrors.roleId}>
                      <SelectValue /><SelectIcon><SelectChevronUpDownIcon /></SelectIcon>
                    </SelectTrigger>
                    <SelectPortal><SelectPositioner sideOffset={8}><SelectPopup><SelectScrollUpArrow /><SelectList>{[{ value: '', label: '— Pilih Role Sales —' }, ...salesRoles.map(r => ({ value: r.id, label: `${r.name} (${r.code})` }))].map((option) => (<SelectItem key={option.value} value={option.value}><SelectItemIndicator><SelectCheckIcon /></SelectItemIndicator><SelectItemText>{option.label}</SelectItemText></SelectItem>))}</SelectList><SelectScrollDownArrow /></SelectPopup></SelectPositioner></SelectPortal>
                  </Select>
                  {createErrors.roleId && <small className="text-admin-danger text-xs">{createErrors.roleId.message}</small>}
                </div>
                <div className="admin-field admin-field-full">
                  <label htmlFor="sales-name">Nama Sales <span className="text-admin-danger">*</span></label>
                  <input id="sales-name" type="text" {...registerCreate('name')} placeholder="Budi Santoso" className="admin-input" autoComplete="off" aria-invalid={!!createErrors.name} aria-describedby={createErrors.name ? 'sales-name-error' : undefined} />
                  {createErrors.name && <small id="sales-name-error" className="text-admin-danger text-xs">{createErrors.name.message}</small>}
                </div>
                <div className="admin-field">
                  <label htmlFor="sales-email">Email</label>
                  <input id="sales-email" type="email" {...registerCreate('email')} placeholder="budi.sales@company.com" className="admin-input" autoComplete="off" aria-invalid={!!createErrors.email} aria-describedby={createErrors.email ? 'sales-email-error' : undefined} />
                  {createErrors.email && <small id="sales-email-error" className="text-admin-danger text-xs">{createErrors.email.message}</small>}
                </div>
                <div className="admin-field">
                  <label htmlFor="sales-phone">Nomor HP</label>
                  <input id="sales-phone" type="tel" {...registerCreate('phone')} placeholder="08xxxxxxxxx" className="admin-input" autoComplete="off" aria-invalid={!!createErrors.phone} aria-describedby={createErrors.phone ? 'sales-phone-error' : undefined} {...phoneInput} />
                  {createErrors.phone && <small id="sales-phone-error" className="text-admin-danger text-xs">{createErrors.phone.message}</small>}
                </div>
                <div className="admin-field">
                  <label htmlFor="sales-category">Kategori Sales</label>
                  <Select items={[{ value: 'motoris', label: 'Motoris' }, { value: 'dropping', label: 'Dropping' }]} value={watchCreate('salesCategory')} onValueChange={(nextValue) => setCreateValue('salesCategory', nextValue as SalesCategory)}>
                    <SelectTrigger className="admin-select" id="sales-category"><SelectValue /><SelectIcon><SelectChevronUpDownIcon /></SelectIcon></SelectTrigger>
                    <SelectPortal><SelectPositioner sideOffset={8}><SelectPopup><SelectScrollUpArrow /><SelectList>{[{ value: 'motoris', label: 'Motoris' }, { value: 'dropping', label: 'Dropping' }].map((option) => (<SelectItem key={option.value} value={option.value}><SelectItemIndicator><SelectCheckIcon /></SelectItemIndicator><SelectItemText>{option.label}</SelectItemText></SelectItem>))}</SelectList><SelectScrollDownArrow /></SelectPopup></SelectPositioner></SelectPortal>
                  </Select>
                </div>
                <div className="admin-field">
                  <label htmlFor="sales-code">Kode Karyawan</label>
                  <div className="admin-input-action relative">
                    <input id="sales-code" type="text" {...registerCreate('employeeCode')} placeholder={watchCreate('roleId') ? 'Klik generate kode' : 'Pilih role dulu'} className="admin-input pr-10" autoComplete="off" />
                    <button type="button" className="admin-btn-icon-sm" title="Generate kode karyawan" disabled={!watchCreate('roleId') || generatingCode} onClick={() => handleGenerateEmployeeCode('create')}>
                      <RefreshCw size={14} className={generatingCode ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <small className="admin-field-hint">Format otomatis dari backend: KODE_COMPANY-urutan. Tetap bisa diisi manual.</small>
                </div>
                <div className="admin-field">
                  <label htmlFor="sales-password">Password <span className="text-admin-danger">*</span></label>
                  <div className="admin-password-field">
                    <input id="sales-password" type={createPasswordVisible ? 'text' : 'password'} {...registerCreate('password')} placeholder="Minimal 6 karakter" className="admin-input" autoComplete="new-password" minLength={6} aria-invalid={!!createErrors.password} aria-describedby={createErrors.password ? 'sales-password-error' : undefined} />
                    <button type="button" className="admin-password-toggle" onClick={() => setCreatePasswordVisible((current) => !current)} title={createPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}>
                      {createPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {createErrors.password && <small id="sales-password-error" className="text-admin-danger text-xs">{createErrors.password.message}</small>}
                </div>
              </div>
            </AdminDialogBody>
            <AdminDialogFooter>
              <button onClick={() => { setShowCreate(false); resetCreateForm(); }} className="admin-btn-ghost" type="button">Batal</button>
              <button onClick={handleSubmitCreate(handleCreate)} className="admin-btn-primary" type="button" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Buat Sales'}
              </button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialogPortal>
      </AdminDialog>

      <AdminDialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }} disablePointerDismissal={saving}>
        <AdminDialogPortal>
          <AdminDialogBackdrop />
          <AdminDialogContent className="admin-page">
            <AdminDialogHeader>
              <div>
                <AdminDialogTitle>Edit Sales</AdminDialogTitle>
                <AdminDialogSubtitle>{editTarget?.name}</AdminDialogSubtitle>
              </div>
              <AdminDialogClose aria-label="Tutup"><X size={18} /></AdminDialogClose>
            </AdminDialogHeader>
            <AdminDialogBody>
              <div className="admin-form-grid">
                <div className="admin-field admin-field-full">
                  <label htmlFor="edit-sales-role">Role Sales <span className="text-admin-danger">*</span></label>
                  <Select items={[{ value: '', label: '— Pilih Role Sales —' }, ...salesRoles.map(r => ({ value: r.id, label: `${r.name} (${r.code})` }))]} value={watchEdit('roleId')} onValueChange={(nextValue) => setEditValue('roleId', String(nextValue))}>
                    <SelectTrigger className={`admin-select ${editErrors.roleId ? 'aria-invalid:border-destructive' : ''}`} id="edit-sales-role" aria-invalid={!!editErrors.roleId}>
                      <SelectValue /><SelectIcon><SelectChevronUpDownIcon /></SelectIcon>
                    </SelectTrigger>
                    <SelectPortal><SelectPositioner sideOffset={8}><SelectPopup><SelectScrollUpArrow /><SelectList>{[{ value: '', label: '— Pilih Role Sales —' }, ...salesRoles.map(r => ({ value: r.id, label: `${r.name} (${r.code})` }))].map((option) => (<SelectItem key={option.value} value={option.value}><SelectItemIndicator><SelectCheckIcon /></SelectItemIndicator><SelectItemText>{option.label}</SelectItemText></SelectItem>))}</SelectList><SelectScrollDownArrow /></SelectPopup></SelectPositioner></SelectPortal>
                  </Select>
                  {editErrors.roleId && <small className="text-admin-danger text-xs">{editErrors.roleId.message}</small>}
                </div>
                <div className="admin-field admin-field-full">
                  <label htmlFor="edit-sales-name">Nama Sales <span className="text-admin-danger">*</span></label>
                  <input id="edit-sales-name" type="text" {...registerEdit('name')} className="admin-input" aria-invalid={!!editErrors.name} aria-describedby={editErrors.name ? 'edit-sales-name-error' : undefined} />
                  {editErrors.name && <small id="edit-sales-name-error" className="text-admin-danger text-xs">{editErrors.name.message}</small>}
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-sales-email">Email</label>
                  <input id="edit-sales-email" type="email" {...registerEdit('email')} className="admin-input" aria-invalid={!!editErrors.email} aria-describedby={editErrors.email ? 'edit-sales-email-error' : undefined} />
                  {editErrors.email && <small id="edit-sales-email-error" className="text-admin-danger text-xs">{editErrors.email.message}</small>}
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-sales-phone">Nomor HP</label>
                  <input id="edit-sales-phone" type="tel" {...registerEdit('phone')} className="admin-input" aria-invalid={!!editErrors.phone} aria-describedby={editErrors.phone ? 'edit-sales-phone-error' : undefined} {...phoneInput} />
                  {editErrors.phone && <small id="edit-sales-phone-error" className="text-admin-danger text-xs">{editErrors.phone.message}</small>}
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-sales-category">Kategori Sales</label>
                  <Select items={[{ value: 'motoris', label: 'Motoris' }, { value: 'dropping', label: 'Dropping' }]} value={watchEdit('salesCategory')} onValueChange={(nextValue) => setEditValue('salesCategory', nextValue as SalesCategory)}>
                    <SelectTrigger className="admin-select" id="edit-sales-category"><SelectValue /><SelectIcon><SelectChevronUpDownIcon /></SelectIcon></SelectTrigger>
                    <SelectPortal><SelectPositioner sideOffset={8}><SelectPopup><SelectScrollUpArrow /><SelectList>{[{ value: 'motoris', label: 'Motoris' }, { value: 'dropping', label: 'Dropping' }].map((option) => (<SelectItem key={option.value} value={option.value}><SelectItemIndicator><SelectCheckIcon /></SelectItemIndicator><SelectItemText>{option.label}</SelectItemText></SelectItem>))}</SelectList><SelectScrollDownArrow /></SelectPopup></SelectPositioner></SelectPortal>
                  </Select>
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-sales-code">Kode Karyawan</label>
                  <div className="admin-input-action relative">
                    <input id="edit-sales-code" type="text" {...registerEdit('employeeCode')} placeholder={watchEdit('roleId') ? 'Klik generate kode' : 'Pilih role dulu'} className="admin-input pr-10" />
                    <button type="button" className="admin-btn-icon-sm" title="Generate kode karyawan" disabled={!watchEdit('roleId') || generatingCode} onClick={() => handleGenerateEmployeeCode('edit')}>
                      <RefreshCw size={14} className={generatingCode ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <small className="admin-field-hint">Format otomatis dari backend: KODE_COMPANY-urutan. Tetap bisa diisi manual.</small>
                </div>
                <div className="admin-field">
                  <label htmlFor="edit-sales-status">Status</label>
                  <Select items={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }, { value: 'suspended', label: 'Suspended' }]} value={watchEdit('status')} onValueChange={(nextValue) => setEditValue('status', nextValue as TenantUser['status'])}>
                    <SelectTrigger className="admin-select" id="edit-sales-status"><SelectValue /><SelectIcon><SelectChevronUpDownIcon /></SelectIcon></SelectTrigger>
                    <SelectPortal><SelectPositioner sideOffset={8}><SelectPopup><SelectScrollUpArrow /><SelectList>{[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }, { value: 'suspended', label: 'Suspended' }].map((option) => (<SelectItem key={option.value} value={option.value}><SelectItemIndicator><SelectCheckIcon /></SelectItemIndicator><SelectItemText>{option.label}</SelectItemText></SelectItem>))}</SelectList><SelectScrollDownArrow /></SelectPopup></SelectPositioner></SelectPortal>
                  </Select>
                </div>
              </div>
            </AdminDialogBody>
            <AdminDialogFooter>
              <button onClick={() => setEditTarget(null)} className="admin-btn-ghost" type="button">Batal</button>
              <button onClick={handleSubmitEdit(handleUpdate)} className="admin-btn-primary" type="button" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialogPortal>
      </AdminDialog>

      <AdminDialog open={!!selectedSales} onOpenChange={(open) => { if (!open) setSelectedSales(null); }}>
        <AdminDialogPortal>
          <AdminDialogBackdrop />
          <AdminDialogContent size="sm" className="admin-page">
            <AdminDialogHeader>
              <AdminDialogTitle>Detail Akun Sales</AdminDialogTitle>
              <AdminDialogClose aria-label="Tutup"><X size={18} /></AdminDialogClose>
            </AdminDialogHeader>
            <AdminDialogBody>
              <div className="flex items-center gap-4 mb-6 p-4 rounded-xl" style={{ background: 'var(--admin-bg)' }}>
                <UserAvatar name={selectedSales?.name ?? ''} imageUrl={selectedSales && activeFaceTemplateByUser.get(selectedSales.id)?.fileUrl} size={56} />
                <div className="flex-1">
                  <div className="text-lg font-bold text-admin-foreground">{selectedSales?.name}</div>
                  <div className="text-sm text-admin-muted">{selectedSales?.roleName ?? selectedSales?.roleCode}</div>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-admin-muted">
                    {selectedSales?.email ? <span className="inline-flex items-center gap-1"><Mail size={12} />{selectedSales.email}</span> : null}
                    {selectedSales?.phone ? <span className="inline-flex items-center gap-1"><Phone size={12} />{selectedSales.phone}</span> : null}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
                  <div className="text-xs text-admin-muted font-semibold uppercase tracking-wider mb-1">Kode Karyawan</div>
                  <div className="font-bold text-admin-foreground">{selectedSales?.employeeCode ?? '-'}</div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
                  <div className="text-xs text-admin-muted font-semibold uppercase tracking-wider mb-1">Status</div>
                  <div className="font-bold text-admin-foreground">{selectedSales?.status ?? ''}</div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
                  <div className="text-xs text-admin-muted font-semibold uppercase tracking-wider mb-1">Role</div>
                  <div className="font-bold text-admin-foreground">{selectedSales?.roleName ?? selectedSales?.roleCode ?? ''}</div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
                  <div className="text-xs text-admin-muted font-semibold uppercase tracking-wider mb-1">Template Wajah</div>
                  <div className="font-bold text-admin-foreground">{selectedSales && activeFaceTemplateByUser.has(selectedSales.id) ? 'Aktif' : 'Belum diinput'}</div>
                </div>
                <div className="p-4 rounded-xl col-span-2" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
                  <div className="text-xs text-admin-muted font-semibold uppercase tracking-wider mb-1">Login Terakhir</div>
                  <div className="font-bold text-admin-foreground">{selectedSales?.lastLoginAt ? new Date(selectedSales.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah'}</div>
                </div>
              </div>
            </AdminDialogBody>
            <AdminDialogFooter>
              <button onClick={() => selectedSales && openFaceEnrollment(selectedSales)} className="admin-btn-ghost" type="button"><Camera size={14} /> Data Wajah</button>
              <button onClick={() => selectedSales && openEdit(selectedSales)} className="admin-btn-primary" type="button"><Pencil size={14} /> Edit</button>
              <button onClick={() => setSelectedSales(null)} className="admin-btn-ghost" type="button">Tutup</button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialogPortal>
      </AdminDialog>

      <AdminDialog open={!!faceTarget} onOpenChange={(open) => { if (!open) { setFaceTarget(null); setFaceFile(null); setFacePreview(''); } }} disablePointerDismissal={faceSaving}>
        <AdminDialogPortal>
          <AdminDialogBackdrop />
          <AdminDialogContent size="sm" className="admin-page">
            <AdminDialogHeader>
              <div>
                <AdminDialogTitle>Data Wajah Sales</AdminDialogTitle>
                <AdminDialogSubtitle>{faceTarget?.name}</AdminDialogSubtitle>
              </div>
              <AdminDialogClose aria-label="Tutup"><X size={18} /></AdminDialogClose>
            </AdminDialogHeader>
            <AdminDialogBody>
              <div className="admin-alert admin-alert-info" style={{ marginBottom: '1rem' }}>
                <Camera size={15} />
                Foto ini menjadi template wajah aktif untuk validasi absensi dan visit. Template lama akan otomatis dinonaktifkan.
              </div>
              <FaceCaptureField id="sales-face-file" preview={facePreview} targetName={faceTarget?.name ?? ''} onCapture={handleFaceFileChange} />
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

      <AdminDialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); resetPasswordForm(); setResetPasswordVisible(false); } }} disablePointerDismissal={saving}>
        <AdminDialogPortal>
          <AdminDialogBackdrop />
          <AdminDialogContent size="sm" className="admin-page">
            <AdminDialogHeader>
              <AdminDialogTitle>Reset Password</AdminDialogTitle>
              <AdminDialogClose aria-label="Tutup"><X size={18} /></AdminDialogClose>
            </AdminDialogHeader>
            <AdminDialogBody>
              <p className="text-admin-muted mb-4">Reset password untuk <strong>{resetTarget?.name}</strong>.</p>
              <div className="admin-field">
                <label htmlFor="sales-reset-password">Password Baru <span className="text-admin-danger">*</span></label>
                <div className="admin-password-field">
                  <input id="sales-reset-password" type={resetPasswordVisible ? 'text' : 'password'} {...registerReset('password')} placeholder="Minimal 6 karakter" className="admin-input" aria-invalid={!!resetPasswordErrors.password} aria-describedby={resetPasswordErrors.password ? 'sales-reset-password-error' : undefined} />
                  <button type="button" className="admin-password-toggle" onClick={() => setResetPasswordVisible((current) => !current)} title={resetPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}>
                    {resetPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {resetPasswordErrors.password && <small id="sales-reset-password-error" className="text-admin-danger text-xs">{resetPasswordErrors.password.message}</small>}
              </div>
            </AdminDialogBody>
            <AdminDialogFooter>
              <button onClick={() => { setResetTarget(null); resetPasswordForm(); }} className="admin-btn-ghost" type="button">Batal</button>
              <button onClick={handleSubmitReset(handleResetPassword)} className="admin-btn-primary" type="button" disabled={saving}>
                {saving ? 'Mereset...' : 'Reset Password'}
              </button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialogPortal>
      </AdminDialog>

      <AdminDialog open={importOpen} onOpenChange={(open) => { if (!open) { setImportOpen(false); setImportResult(null); } }}>
        <AdminDialogPortal>
          <AdminDialogBackdrop />
          <AdminDialogContent size="default" className="admin-page">
            <AdminDialogHeader>
              <div>
                <AdminDialogTitle className="flex items-center gap-2"><FileSpreadsheet size={20} className="text-admin-accent" />Import Akun Sales dari Excel</AdminDialogTitle>
                <AdminDialogSubtitle>Tambah atau perbarui akun sales secara masal dengan mengunggah file Excel (.xlsx/.xls).</AdminDialogSubtitle>
              </div>
              <AdminDialogClose aria-label="Tutup"><X size={18} /></AdminDialogClose>
            </AdminDialogHeader>
            <AdminDialogBody>
              <div className="space-y-4">
                <div className="rounded-2xl border border-admin-border bg-admin-bg p-4">
                  <p className="text-xs font-black text-admin-foreground mb-1">Langkah 1: Unduh Format Template</p>
                  <p className="text-xs font-medium text-admin-muted mb-3">Gunakan template resmi agar susunan kolom sesuai dengan sistem.</p>
                  <button onClick={downloadImportTemplate} className="admin-btn-ghost text-xs" type="button"><Download size={14} /> Download Template Excel</button>
                </div>
                <div className="rounded-2xl border border-admin-border bg-admin-bg p-4">
                  <p className="text-xs font-black text-admin-foreground mb-1">Langkah 2: Unggah File Excel</p>
                  <p className="text-xs font-medium text-admin-muted mb-3">Pilih file .xlsx atau .xls yang sudah diisi data akun sales.</p>
                  <button onClick={() => importInputRef.current?.click()} className="admin-btn-primary w-full justify-center py-3 text-xs" disabled={importing} type="button">
                    {importing ? <RefreshCw size={16} className="animate-spin" /> : <FileUp size={16} />}
                    {importing ? 'Memproses File Excel...' : 'Pilih File Excel & Import'}
                  </button>
                </div>
                {importResult && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700 border border-emerald-200">✓ {importResult.ok} Berhasil</span>
                      {importResult.skipped > 0 && (
                        <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-700 border border-amber-200">! {importResult.skipped} Dilewati</span>
                      )}
                      {importResult.errors.length > 0 && (
                        <span className="rounded-lg bg-rose-50 px-3 py-1.5 text-rose-700 border border-rose-200">✕ {importResult.errors.length} Gagal</span>
                      )}
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-xs font-medium text-rose-700 space-y-1">
                        <p className="font-bold text-rose-800 mb-1">Detail Baris Bermasalah:</p>
                        {importResult.errors.map((err, idx) => (
                          <p key={idx}>{err}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AdminDialogBody>
            <AdminDialogFooter>
              <button onClick={() => { setImportOpen(false); setImportResult(null); }} className="admin-btn-ghost" type="button">Selesai</button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialogPortal>
      </AdminDialog>
    </div>
  );
}
