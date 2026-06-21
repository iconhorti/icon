import { useState, type ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireRole } from '../components/RequireRole';
import { ROLE_SETS, hasRole } from '../lib/roles';
import { errorMessage } from '../lib/logger';
import { useUsers, useSaveUser, useToggleUser } from '../hooks/useUsers';
import { useTranslation } from '../i18n/useTranslation';
import { RefreshCw, Edit2, Ban, CheckCircle, X, Save, Plus, Eye, EyeOff } from 'lucide-react';
import AgTable from '../components/AgTable';
import type { ColDef } from 'ag-grid-community';
import { useToast } from '../context/ToastContext';

const ROLE_COLORS: Record<string, string> = {
  admin: 'badge-danger', owner: 'badge-danger', dealer: 'badge-info',
  farmer: 'badge-success', office_staff: 'badge-warning',
  project_manager: 'badge-warning', bank_officer: 'badge-warning',
  agency_officer: 'badge-info', agronomist: 'badge-info',
  structure_contractor: 'badge-secondary', drip_contractor: 'badge-secondary',
  bed_contractor: 'badge-secondary', plantation_contractor: 'badge-secondary',
};

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'office_staff', label: 'Office Staff' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'bank_officer', label: 'Bank Officer' },
  { value: 'agency_officer', label: 'Agency Officer' },
  { value: 'agronomist', label: 'Agronomist' },
  { value: 'structure_contractor', label: 'Structure Contractor' },
  { value: 'drip_contractor', label: 'Drip Contractor' },
  { value: 'bed_contractor', label: 'Bed Contractor' },
  { value: 'plantation_contractor', label: 'Plantation Contractor' },
  { value: 'farmer', label: 'Farmer' },
];

const EMPTY_FORM = {
  first_name: '', last_name: '', role: 'office_staff',
  phone_primary: '', email: '', district: '', state: '', designation: '', new_password: '',
};

const UserManagement = () => {
  const { user } = useAuth();
  const isAdmin = hasRole(user?.role, ROLE_SETS.ADMIN_OWNER);

  // Guard: only admin may access user management
  const denied = useRequireRole(ROLE_SETS.ADMIN_OWNER);
  if (denied) return denied;

  const { toast } = useToast();
  const { t } = useTranslation();
  const [roleFilter, setRoleFilter] = useState<string>('');

  // ── Server state via TanStack Query ──
  const { data: users = [], isLoading: loading, error: queryError, refetch } = useUsers(roleFilter || undefined);
  const saveUser = useSaveUser();
  const toggleUser = useToggleUser();
  const error = queryError ? errorMessage(queryError, 'Failed to load users.') : '';
  const loadUsers = () => { refetch(); };

  const [activeTab, setActiveTab] = useState<string>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, any>>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [showPwd, setShowPwd] = useState<boolean>(false);


  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setFormError(''); setShowPwd(false); setActiveTab('add'); };
  const openEdit = (u: any) => {
    setEditId(u.id);
    setForm({
      first_name: u.first_name||'', last_name: u.last_name||'', role: u.role,
      phone_primary: u.phone_primary||'', email: u.email||'',
      district: u.district||'', state: u.state||'', designation: u.designation||'', new_password: '',
    });
    setFormError(''); setShowPwd(false); setActiveTab('edit');
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async (): Promise<void> => {
    if (!form.first_name.trim()) { setFormError('First name is required.'); return; }
    if (!editId && !form.phone_primary.trim()) { setFormError('Phone is required.'); return; }
    setSaving(true); setFormError('');
    let payload: Record<string, any>;
    if (editId) {
      payload = {};
      Object.entries(form).forEach(([k, v]) => { if (k !== 'phone_primary' && v !== '') payload[k] = v; });
    } else {
      payload = { ...form };
    }
    try {
      await saveUser.mutateAsync({ id: editId, payload });
      setActiveTab('list');
    } catch (err) { setFormError(errorMessage(err, 'Save failed.')); }
    finally { setSaving(false); }
  };

  const handleToggle = async (u: any): Promise<void> => {
    if (!window.confirm(`${u.is_active ? 'Suspend' : 'Reactivate'} ${u.first_name}?`)) return;
    try { await toggleUser.mutateAsync(u); }
    catch (err) { toast(errorMessage(err, 'Failed.'), 'error'); }
  };

  const closeForm = () => { setActiveTab('list'); setEditId(null); setFormError(''); };

  const renderForm = () => (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '1.3rem' }}>{editId ? `Edit User — ${form.first_name}` : 'Add New User'}</h2>
          <p className="page-subtitle">{editId ? 'Update user details' : 'Register a new system user'}</p>
        </div>
        <button className="btn btn-outline" onClick={closeForm}><X size={16} /> Back to List</button>
      </div>
      {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}
      <div className="form-grid">
        <div className="form-group"><label className="form-label">{t('field.firstName')} *</label><input className="input-field" name="first_name" value={form.first_name} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{t('field.lastName')}</label><input className="input-field" name="last_name" value={form.last_name} onChange={handleChange} /></div>
        <div className="form-group">
          <label className="form-label">Role *</label>
          <select className="input-field" name="role" value={form.role} onChange={handleChange} disabled={!!editId}>
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Phone {!editId && '*'}</label>
          <input className="input-field" name="phone_primary" value={form.phone_primary} onChange={handleChange} disabled={!!editId} />
        </div>
        <div className="form-group"><label className="form-label">{t('field.email')}</label><input className="input-field" name="email" value={form.email} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{t('field.designation')}</label><input className="input-field" name="designation" value={form.designation} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{t('field.district')}</label><input className="input-field" name="district" value={form.district} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{t('field.state')}</label><input className="input-field" name="state" value={form.state} onChange={handleChange} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">{editId ? 'Reset Password (leave blank to keep)' : 'Password (default: icon123)'}</label>
          <div style={{ position: 'relative' }}>
            <input className="input-field" name="new_password" type={showPwd ? 'text' : 'password'} value={form.new_password} onChange={handleChange}
              placeholder={editId ? 'Leave blank to keep existing' : 'Default: icon123'} style={{ paddingRight: '2.5rem' }} />
            <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>
      <div className="form-actions" style={{ marginTop: '1.5rem' }}>
        <button className="btn btn-outline" onClick={closeForm} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('users.title')}</h1>
          <p className="page-subtitle">{t('users.subtitle')}</p>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>{t('common.listView')}</button>
        {isAdmin && <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => openCreate()}><Plus size={14} /> {t('users.add')}</button>}
      </div>

      {activeTab === 'list' ? (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderBottom: '1px solid var(--glass-border)' }}>
              <select className="input-field filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                <option value="">All Roles</option>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button className="btn btn-outline btn-sm" onClick={loadUsers}><RefreshCw size={14} /></button>
            </div>
            <AgTable
              exportFileName="users"
              rowData={users}
              loading={loading}
              columnDefs={[
                { headerName: t('col.id'), valueFormatter: (p: any) => `U-${String(p.data.id).padStart(4,'0')}`, field: 'id', maxWidth: 100 },
                { headerName: t('col.name'), valueGetter: (p: any) => `${p.data.first_name} ${p.data.last_name || ''}` },
                { headerName: t('col.role'), field: 'role', cellRenderer: (p: any) => <span className={`badge ${ROLE_COLORS[p.value] || 'badge-secondary'}`}>{p.value.replace(/_/g,' ')}</span> },
                { headerName: t('col.phone'), field: 'phone_primary' },
                { headerName: t('col.district'), field: 'district', valueFormatter: (p: any) => p.value || '—' },
                { headerName: t('col.status'), field: 'is_active', maxWidth: 120, cellRenderer: (p: any) => p.value
                  ? <span className="badge badge-success">Active</span>
                  : <span className="badge badge-danger">Suspended</span> },
                ...(isAdmin ? [{ headerName: t('col.actions'), filter: false, sortable: false, pinned: 'right' as const, maxWidth: 110,
                  cellRenderer: (p: any) => (
                    <div className="flex-center-gap">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p.data)}><Edit2 size={14} /></button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleToggle(p.data)} style={{ color: p.data.is_active ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {p.data.is_active ? <Ban size={14} /> : <CheckCircle size={14} />}
                      </button>
                    </div>
                  )
                }] : [])
              ] as ColDef[]}
            />
          </div>
        </>
      ) : renderForm()}
    </div>
  );
};

export default UserManagement;
