import { useEffect, useMemo, useState } from 'react';
import { Shield, Plus, Trash2, Lock, AlertTriangle, CheckCircle2, Settings2, Search } from 'lucide-react';

import { useAuth } from '../../auth/auth-provider';
import {
  assignRolePermission,
  createRole,
  deleteRole,
  getPermissions,
  getRolePermissions,
  getRoles,
  removeRolePermission,
  type Permission,
  type Role,
} from '@/lib/api/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function RolesPage() {
  const { accessToken } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [permissionRole, setPermissionRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [selectedCreatePermissionIds, setSelectedCreatePermissionIds] = useState<Set<string>>(new Set());
  const [permissionSearch, setPermissionSearch] = useState('');
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await getRoles(accessToken);
      setRoles(data.roles);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  async function loadPermissionOptions() {
    if (!accessToken) return;
    setLoadingPermissions(true);
    setError('');
    try {
      const data = await getPermissions(accessToken);
      setPermissions(data.permissions);
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat daftar permission.');
    } finally {
      setLoadingPermissions(false);
    }
  }

  async function openCreateModal() {
    setShowCreate(true);
    setPermissionSearch('');
    setSelectedCreatePermissionIds(new Set());
    await loadPermissionOptions();
  }

  async function handleCreate() {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    try {
      await createRole(accessToken, {
        ...form,
        code: form.code.toUpperCase(),
        permissionIds: [...selectedCreatePermissionIds],
      });
      setShowCreate(false);
      setForm({ code: '', name: '', description: '' });
      setSelectedCreatePermissionIds(new Set());
      setSuccess(`Role "${form.name}" berhasil dibuat.`);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: Role) {
    if (!accessToken || !confirm(`Hapus role "${role.name}"? Pastikan tidak ada user yang menggunakan role ini.`)) return;
    try {
      await deleteRole(accessToken, role.id);
      setSuccess(`Role "${role.name}" berhasil dihapus.`);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function openPermissionEditor(role: Role) {
    if (!accessToken) return;
    setPermissionRole(role);
    setPermissionSearch('');
    setLoadingPermissions(true);
    setError('');
    try {
      const [all, assigned] = await Promise.all([
        getPermissions(accessToken),
        getRolePermissions(accessToken, role.id),
      ]);
      setPermissions(all.permissions);
      setSelectedPermissionIds(new Set(assigned.permissions.map((permission) => permission.id)));
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat permission role.');
      setPermissionRole(null);
    } finally {
      setLoadingPermissions(false);
    }
  }

  async function togglePermission(permission: Permission) {
    if (!accessToken || !permissionRole || saving) return;
    const active = selectedPermissionIds.has(permission.id);
    setSaving(true);
    setError('');
    try {
      if (active) {
        await removeRolePermission(accessToken, permissionRole.id, permission.id);
        setSelectedPermissionIds((current) => {
          const next = new Set(current);
          next.delete(permission.id);
          return next;
        });
      } else {
        await assignRolePermission(accessToken, permissionRole.id, permission.id);
        setSelectedPermissionIds((current) => new Set(current).add(permission.id));
      }
    } catch (e: any) {
      setError(e.message ?? 'Gagal mengubah permission role.');
    } finally {
      setSaving(false);
    }
  }

  const groupedPermissions = useMemo(() => {
    const q = permissionSearch.trim().toLowerCase();
    const filtered = permissions.filter((permission) => {
      const haystack = `${permission.module} ${permission.code} ${permission.name} ${permission.description ?? ''}`.toLowerCase();
      return !q || haystack.includes(q);
    });
    return filtered.reduce<Record<string, Permission[]>>((groups, permission) => {
      const key = permission.module || 'general';
      groups[key] = groups[key] ?? [];
      groups[key].push(permission);
      return groups;
    }, {});
  }, [permissionSearch, permissions]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Shield size={22} />
            Manajemen Role
          </h1>
          <p className="admin-page-subtitle">Buat dan kelola role akses untuk tim Anda.</p>
        </div>
        <button
          id="roles-create-btn"
          onClick={openCreateModal}
          className="admin-btn-primary"
          type="button"
        >
          <Plus size={15} />
          Buat Role
        </button>

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

      <div className="admin-roles-grid">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="admin-card admin-role-card" style={{ minHeight: 140 }}>
                <div className="admin-role-card-header">
                  <div className="admin-role-icon" style={{ background: 'var(--admin-surface-hover)', border: '1px solid var(--admin-border)' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--admin-border)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ width: '60%', height: 14, borderRadius: 4, background: 'var(--admin-border)', marginBottom: 6 }} />
                    <div style={{ width: '35%', height: 10, borderRadius: 4, background: 'var(--admin-border-subtle)' }} />
                  </div>
                </div>
                <div style={{ width: '90%', height: 10, borderRadius: 4, background: 'var(--admin-border-subtle)', marginTop: 8 }} />
                <div style={{ width: '70%', height: 10, borderRadius: 4, background: 'var(--admin-border-subtle)', marginTop: 6 }} />
              </div>
            ))}
          </>
        ) : (
          roles.map(role => (
            <div key={role.id} className={`admin-card admin-role-card ${role.isSystemRole ? 'admin-role-system' : ''}`}>
              <div className="admin-role-card-header">
                <div className="admin-role-icon">
                  {role.isSystemRole ? <Lock size={16} /> : <Shield size={16} />}
                </div>
                <div>
                  <h3 className="admin-role-card-name">{role.name}</h3>
                  <code className="admin-role-card-code">{role.code}</code>
                </div>
                {!role.isSystemRole && (
                  <>
                    <Button
                      onClick={() => openPermissionEditor(role)}
                      variant="ghost"
                      size="icon"
                      className="admin-btn-icon-sm"
                      title="Edit Permission"
                      type="button"
                    >
                      <Settings2 size={13} />
                    </Button>
                  </>
                )}
                {role.isSystemRole && (
                  <Button
                    onClick={() => openPermissionEditor(role)}
                    variant="ghost"
                    size="icon"
                    className="admin-btn-icon-sm"
                    title="Lihat Permission"
                    type="button"
                  >
                    <Settings2 size={13} />
                  </Button>
                )}
                {!role.isSystemRole && (
                  <Button
                    id={`roles-delete-${role.id}`}
                    onClick={() => handleDelete(role)}
                    variant="ghost"
                    size="icon"
                    className="admin-btn-icon-sm admin-btn-danger-sm"
                    title="Hapus Role"
                    type="button"
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
              {role.description && (
                <p className="admin-role-desc">{role.description}</p>
              )}
              {role.isSystemRole && (
                <div className="admin-role-system-badge">
                  <Lock size={11} />
                  System Role — tidak dapat dihapus
                </div>
              )}
            </div>
          ))
        )}
        {!loading && roles.length === 0 && (
          <p className="admin-muted">Belum ada role. Buat role pertama Anda.</p>
        )}
      </div>

      {/* Create Role Modal */}
      {showCreate && (
        <div className="admin-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="admin-modal admin-role-create-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Buat Role Baru</h2>
                <p className="admin-modal-subtitle">Atur identitas role dan permission dalam satu langkah.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-field">
                <label htmlFor="role-code">Kode Role *</label>
                <Input
                  id="role-code"
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '_') }))}
                  placeholder="SUPERVISOR"
                  className="admin-input"
                />
                <small className="admin-field-hint">Huruf kapital, angka, dan underscore. Contoh: SUPERVISOR, AREA_MANAGER</small>
              </div>
              <div className="admin-field">
                <label htmlFor="role-name">Nama Role *</label>
                <Input
                  id="role-name"
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Supervisor Area"
                  className="admin-input"
                />
              </div>
              <div className="admin-field">
                <label htmlFor="role-desc">Deskripsi</label>
                <Textarea
                  id="role-desc"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Bertanggung jawab atas area penjualan tertentu..."
                  rows={2}
                  className="admin-input"
                />
              </div>
              <div className="admin-field">
                <label>Permission Role</label>
                <div className="admin-permission-search">
                  <Search size={15} />
                  <input
                    value={permissionSearch}
                    onChange={(event) => setPermissionSearch(event.target.value)}
                    placeholder="Cari permission, module, atau kode..."
                  />
                </div>

                {loadingPermissions ? (
                  <div className="admin-loading">Memuat permission...</div>
                ) : (
                  <div className="admin-permission-groups admin-permission-groups-compact">
                    {Object.entries(groupedPermissions).map(([module, rows]) => (
                      <section key={module} className="admin-permission-group">
                        <h3>{module}</h3>
                        <div className="admin-permission-list">
                          {rows.map((permission) => {
                            const active = selectedCreatePermissionIds.has(permission.id);
                            return (
                              <button
                                key={permission.id}
                                type="button"
                                className={`admin-permission-row ${active ? 'active' : ''}`}
                                onClick={() => {
                                  setSelectedCreatePermissionIds((current) => {
                                    const next = new Set(current);
                                    if (next.has(permission.id)) next.delete(permission.id);
                                    else next.add(permission.id);
                                    return next;
                                  });
                                }}
                              >
                                <span className="admin-permission-check">{active ? <CheckCircle2 size={14} /> : null}</span>
                                <span>
                                  <strong>{permission.name}</strong>
                                  <small>{permission.code}</small>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                    {!Object.keys(groupedPermissions).length ? (
                      <p className="admin-muted">Permission tidak ditemukan.</p>
                    ) : null}
                  </div>
                )}
                <small className="admin-field-hint">
                  Permission tetap bisa diedit kembali dari tombol pengaturan di kartu role.
                </small>
              </div>
            </div>
            <div className="admin-modal-footer">
              <Button onClick={() => setShowCreate(false)} variant="ghost" className="admin-btn-ghost" type="button">Batal</Button>
              <Button
                id="roles-submit-create"
                onClick={handleCreate}
                className="admin-btn-primary"
                type="button"
                disabled={saving || !form.code || !form.name}
              >
                {saving ? 'Menyimpan...' : 'Buat Role'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {permissionRole && (
        <div className="admin-modal-overlay" onClick={() => setPermissionRole(null)}>
          <div className="admin-modal admin-permission-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Permission Role</h2>
                <p className="admin-modal-subtitle">{permissionRole.name} · {permissionRole.code}</p>
              </div>
              <button onClick={() => setPermissionRole(null)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-permission-search">
                <Search size={15} />
                <input
                  value={permissionSearch}
                  onChange={(event) => setPermissionSearch(event.target.value)}
                  placeholder="Cari permission, module, atau kode..."
                />
              </div>

              {loadingPermissions ? (
                <div className="admin-loading">Memuat permission...</div>
              ) : (
                <div className="admin-permission-groups">
                  {Object.entries(groupedPermissions).map(([module, rows]) => (
                    <section key={module} className="admin-permission-group">
                      <h3>{module}</h3>
                      <div className="admin-permission-list">
                        {rows.map((permission) => {
                          const active = selectedPermissionIds.has(permission.id);
                          return (
                            <button
                              key={permission.id}
                              type="button"
                              className={`admin-permission-row ${active ? 'active' : ''}`}
                              onClick={() => togglePermission(permission)}
                              disabled={saving}
                            >
                              <span className="admin-permission-check">{active ? <CheckCircle2 size={14} /> : null}</span>
                              <span>
                                <strong>{permission.name}</strong>
                                <small>{permission.code}</small>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                  {!Object.keys(groupedPermissions).length ? (
                    <p className="admin-muted">Permission tidak ditemukan.</p>
                  ) : null}
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <Button onClick={() => setPermissionRole(null)} className="admin-btn-primary" type="button">Selesai</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
