import { useEffect, useState } from 'react';
import { Shield, Plus, Trash2, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { getRoles, createRole, deleteRole, type Role } from '@/lib/api/platform';

export function RolesPage() {
  const { accessToken } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

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

  async function handleCreate() {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    try {
      await createRole(accessToken, { ...form, code: form.code.toUpperCase() });
      setShowCreate(false);
      setForm({ code: '', name: '', description: '' });
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

  return (
    <div className="admin-page-wrapper">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-hero-title">
            <Shield size={22} />
            Manajemen Role
          </h1>
          <p className="admin-page-hero-subtitle">Buat dan kelola role akses untuk tim Anda.</p>
        </div>
        <button
          id="roles-create-btn"
          onClick={() => setShowCreate(true)}
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
          <p className="admin-muted">Memuat roles...</p>
        ) : (
          roles.map(role => (
            <div key={role.id} className={`admin-role-card ${role.isSystemRole ? 'admin-role-system' : ''}`}>
              <div className="admin-role-card-header">
                <div className="admin-role-icon">
                  {role.isSystemRole ? <Lock size={16} /> : <Shield size={16} />}
                </div>
                <div>
                  <h3 className="admin-role-card-name">{role.name}</h3>
                  <code className="admin-role-card-code">{role.code}</code>
                </div>
                {!role.isSystemRole && (
                  <button
                    id={`roles-delete-${role.id}`}
                    onClick={() => handleDelete(role)}
                    className="admin-btn-icon-sm admin-btn-danger-sm"
                    title="Hapus Role"
                    type="button"
                  >
                    <Trash2 size={13} />
                  </button>
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
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Buat Role Baru</h2>
              <button onClick={() => setShowCreate(false)} className="admin-modal-close" type="button">×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-field">
                <label htmlFor="role-code">Kode Role *</label>
                <input
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
                <input
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
                <textarea
                  id="role-desc"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Bertanggung jawab atas area penjualan tertentu..."
                  rows={2}
                  className="admin-input"
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setShowCreate(false)} className="admin-btn-ghost" type="button">Batal</button>
              <button
                id="roles-submit-create"
                onClick={handleCreate}
                className="admin-btn-primary"
                type="button"
                disabled={saving || !form.code || !form.name}
              >
                {saving ? 'Menyimpan...' : 'Buat Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
