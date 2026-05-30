import { useEffect, useMemo, useState } from 'react';
import {
  Users, RefreshCw, Search, Eye, AlertTriangle,
  CheckCircle2, Phone, Mail, Clock
} from 'lucide-react';
import { useAuth } from '../../auth/auth-provider';
import { getUsers, getRoles, type TenantUser } from '@/lib/api/platform';
import { EmptyState } from '@/components/ui';

type SalesAccount = TenantUser;

const statusIcon = {
  active: <CheckCircle2 size={13} className="text-success" />,
  inactive: <AlertTriangle size={13} className="text-muted-foreground" />,
};

export function SalesAccountsPage() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [salesAccounts, setSalesAccounts] = useState<SalesAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSales, setSelectedSales] = useState<SalesAccount | null>(null);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [u, r] = await Promise.all([getUsers(accessToken), getRoles(accessToken)]);
      setUsers(u.users ?? []);
      setRoles(r.roles ?? []);

      // Filter users with sales role
      const salesUsers = u.users.filter(user => {
        const code = user.roleCode?.toUpperCase() ?? '';
        const name = user.roleName?.toLowerCase() ?? '';
        return (
          code.includes('SALES') ||
          code.includes('AGENT') ||
          code.includes('FIELD') ||
          name.includes('sales') ||
          name.includes('lapangan') ||
          name.includes('agent')
        );
      });

      setSalesAccounts(salesUsers);
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data akun sales.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accessToken]);

  const filtered = useMemo(() => {
    return salesAccounts.filter(s => {
      if (statusFilter === 'active' && s.status !== 'active') return false;
      if (statusFilter === 'inactive' && s.status === 'active') return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.email ?? '').toLowerCase().includes(q) ||
          (s.phone ?? '').includes(q) ||
          (s.employeeCode ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [salesAccounts, statusFilter, search]);

  const stats = useMemo(() => {
    const active = salesAccounts.filter(s => s.status === 'active').length;
    const inactive = salesAccounts.filter(s => s.status !== 'active').length;
    return { active, inactive, total: salesAccounts.length };
  }, [salesAccounts]);

  function viewDetail(sales: SalesAccount) {
    setSelectedSales(sales);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Users size={24} style={{ color: '#8b5cf6' }} />
            Manajemen Akun Sales
          </h1>
          <p className="admin-page-subtitle">Kelola akun sales lapangan dan agent penawaran.</p>
        </div>
        <button
          onClick={load}
          className="admin-btn-ghost"
          style={{ padding: '.6rem', borderRadius: 14 }}
          disabled={loading}
        >
          <RefreshCw size={20} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error mb-4">
          <AlertTriangle size={18} /> {error}
          <button onClick={() => setError('')} className="admin-alert-close">×</button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
            <Users size={20} />
          </div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Sales</span>
            <strong className="text-2xl font-bold text-foreground">{stats.total}</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aktif</span>
            <strong className="text-2xl font-bold text-foreground">{stats.active}</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nonaktif</span>
            <strong className="text-2xl font-bold text-foreground">{stats.inactive}</strong>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="admin-filter-row">
        <div className="admin-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Cari nama, email, HP, kode karyawan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="admin-select"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <span className="admin-count-badge">{filtered.length} akun sales</span>
      </div>

      {/* Sales Accounts Table */}
      <div className="admin-card">
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
                {filtered.map(sales => (
                  <tr key={sales.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="admin-user-avatar">
                          {sales.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="admin-user-name">{sales.name}</div>
                          <div className="text-xs text-muted-foreground">{sales.roleName ?? sales.roleCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">
                      {sales.email && <div className="text-sm">{sales.email}</div>}
                      {sales.phone && <div className="text-sm">{sales.phone}</div>}
                    </td>
                    <td>
                      <code className="bg-muted px-2 py-1 rounded text-xs text-muted-foreground">
                        {sales.employeeCode ?? '—'}
                      </code>
                    </td>
                    <td>
                      <button className={`admin-status-pill admin-status-pill-${sales.status}`}>
                        {statusIcon[sales.status as keyof typeof statusIcon]}
                        {sales.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="text-muted text-sm">
                      {sales.lastLoginAt
                        ? new Date(sales.lastLoginAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Belum pernah'}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          onClick={() => viewDetail(sales)}
                          className="admin-btn-icon-sm"
                          title="Lihat Detail"
                        >
                          <Eye size={14} />
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

      {/* Sales Detail Modal */}
      {selectedSales && (
        <div className="admin-modal-overlay" onClick={() => setSelectedSales(null)}>
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Detail Akun Sales</h2>
              <button onClick={() => setSelectedSales(null)} className="admin-modal-close">×</button>
            </div>
            <div className="admin-modal-body">
              {/* Profile Section */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-muted rounded-xl">
                <div className="admin-user-avatar" style={{ width: 56, height: 56, fontSize: '1.5rem' }}>
                  {selectedSales.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-foreground">{selectedSales.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedSales.roleName ?? selectedSales.roleCode}</div>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    {selectedSales.email && (
                      <div className="flex items-center gap-1">
                        <Mail size={12} /> {selectedSales.email}
                      </div>
                    )}
                    {selectedSales.phone && (
                      <div className="flex items-center gap-1">
                        <Phone size={12} /> {selectedSales.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className={`admin-status-pill admin-status-pill-${selectedSales.status}`}>
                  {selectedSales.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-muted rounded-xl">
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Role</div>
                  <div className="font-bold text-foreground">{selectedSales.roleName ?? selectedSales.roleCode}</div>
                </div>
                <div className="p-4 bg-muted rounded-xl">
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Status</div>
                  <div className={`admin-status-pill admin-status-pill-${selectedSales.status}`}>
                    {selectedSales.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </div>
                </div>
              </div>

              {selectedSales.lastLoginAt && (
                <div className="p-4 bg-muted rounded-xl flex items-center gap-3">
                  <Clock size={16} className="text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold">Login Terakhir</div>
                    <div className="font-bold text-foreground">
                      {new Date(selectedSales.lastLoginAt).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setSelectedSales(null)} className="admin-btn-ghost">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}