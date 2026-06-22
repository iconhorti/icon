import { useState, type ChangeEvent, type ComponentType } from 'react';
import { useRequireRole } from '../components/RequireRole';
import { ROLE_SETS } from '../lib/roles';
import { errorMessage } from '../lib/logger';
import { useUsers, useSaveUser, useToggleUser } from '../hooks/useUsers';
import { useRoleKpis } from '../hooks/useRoleKpis';
import { useTranslation } from '../i18n/useTranslation';
import { RefreshCw, Edit2, Ban, CheckCircle, X, Save, Plus, Leaf,
         AlertTriangle, ClipboardCheck, TrendingUp, Tractor, type LucideProps } from 'lucide-react';
import AgTable from '../components/AgTable';
import type { ColDef } from 'ag-grid-community';
import { useToast } from '../context/ToastContext';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';

interface KpiCardProps {
  icon: ComponentType<LucideProps>;
  label: string;
  value: any;
  sub?: string;
  color?: string;
  bg?: string;
}

// ─── Shared KPI card ────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = '#22c55e', bg = '#f0fdf4' }: KpiCardProps) => (
  <div style={{
    background: bg, border: `1.5px solid ${color}33`,
    borderRadius: 14, padding: '1rem 1.25rem',
    display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 150,
  }}>
    <div style={{
      background: `${color}18`, borderRadius: 10, padding: '0.6rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</h3>
      {sub && <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>{sub}</p>}
    </div>
  </div>
);

const BarRow = ({ label, value, max, color = '#22c55e' }: { label: string; value: number; max: number; color?: string }) => (
  <div style={{ marginBottom: '0.6rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ fontSize: '0.78rem', color: '#475569' }}>{label}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>{value}</span>
    </div>
    <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min((value/(max||1))*100,100)}%`, background: color, borderRadius: 4 }} />
    </div>
  </div>
);

// ─── Agronomist KPI Panel ────────────────────────────────────────────────────
const AgroKpiPanel = ({ kpis }: { kpis: any }) => {
  if (!kpis) return null;
  const agroMax = Math.max(...(kpis.agro_breakdown?.map((a: any) => a.consultations) || [1]), 1);
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <KpiCard icon={ClipboardCheck} label="Total Consultations"  value={kpis.total_consultations}  color="#22c55e" bg="#f0fdf4" />
        <KpiCard icon={Tractor}        label="Active Farms Served"  value={kpis.active_farms}          color="#0ea5e9" bg="#e0f2fe" sub="Unique projects" />
        <KpiCard icon={TrendingUp}     label="Plantation Projects"  value={kpis.plantation_projects}   color="#8b5cf6" bg="#f5f3ff" sub="M7 / Completed" />
        <KpiCard icon={Leaf}           label="Follow-ups Pending"   value={kpis.follow_ups_pending}    color="#f59e0b" bg="#fffbeb" />
        <KpiCard icon={AlertTriangle}  label="Critical Pest Alerts" value={kpis.critical_alerts}       color="#ef4444" bg="#fef2f2" sub="Unresolved" />
        <KpiCard icon={CheckCircle}    label="Pest Alerts Resolved" value={kpis.resolved_alerts}       color="#22c55e" bg="#f0fdf4" />
      </div>

      {/* Detail cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {/* Pest alert breakdown */}
        <div className="glass-card p-4">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>🐛 Pest Alert Status</h3>
          {[
            { label: 'Total Alerts',          value: kpis.total_pest_alerts, color: '#64748b' },
            { label: 'Critical (Unresolved)', value: kpis.critical_alerts,   color: '#ef4444' },
            { label: 'High (Unresolved)',     value: kpis.high_alerts,       color: '#f97316' },
            { label: 'Resolved',              value: kpis.resolved_alerts,   color: '#22c55e' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.label}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Per-agronomist breakdown */}
        <div className="glass-card p-4">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>🌿 Consultations per Agronomist</h3>
          {kpis.agro_breakdown?.length > 0
            ? kpis.agro_breakdown.map((a: any) => (
                <BarRow key={a.name} label={a.name} value={a.consultations} max={agroMax} color="#22c55e" />
              ))
            : <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No consultation data yet.</p>}
        </div>
      </div>
    </div>
  );
};

const EMPTY_FORM = {
  first_name: '', last_name: '', phone_primary: '',
  email: '', designation: '', district: '', state: '', new_password: '',
};

const AgronomistsManagement = () => {
  // Guard: admin, owner, office_staff only
  const denied = useRequireRole(ROLE_SETS.INTERNAL_STAFF);
  if (denied) return denied;

  const { toast } = useToast();
  const { t } = useTranslation();

  // ── Server state via TanStack Query ──
  const { data: agronomists = [], isLoading: loading, error: queryError, refetch } = useUsers('agronomist');
  const { data: kpis = null } = useRoleKpis('agronomist');
  const saveUser = useSaveUser();
  const toggleUser = useToggleUser();
  const error = queryError ? errorMessage(queryError, 'Failed to load agronomists.') : '';
  const load = () => { refetch(); };

  const [activeTab, setActiveTab] = useState<string>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, any>>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');


  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setFormError(''); setActiveTab('add'); };
  const openEdit = (a: any) => {
    setEditId(a.id);
    setForm({
      first_name: a.first_name||'', last_name: a.last_name||'', phone_primary: a.phone_primary||'',
      email: a.email||'', designation: a.designation||'', district: a.district||'', state: a.state||'', new_password: '',
    });
    setFormError(''); setActiveTab('edit');
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async (): Promise<void> => {
    if (!form.first_name.trim()) { setFormError('First name is required.'); return; }
    if (!editId && !form.phone_primary.trim()) { setFormError('Phone is required.'); return; }
    setSaving(true); setFormError('');
    let payload: Record<string, any>;
    if (editId) {
      payload = {};
      Object.entries(form).forEach(([k, v]) => { if (k !== 'phone_primary' && v !== '') payload[k] = v; });
    } else {
      payload = { ...form, role: 'agronomist' };
    }
    try {
      await saveUser.mutateAsync({ id: editId, payload });
      setActiveTab('list');
    } catch (err) { setFormError(errorMessage(err, 'Save failed.')); }
    finally { setSaving(false); }
  };

  const handleToggle = async (a: any): Promise<void> => {
    if (!window.confirm(`${a.is_active ? 'Suspend' : 'Reactivate'} ${a.first_name}?`)) return;
    try { await toggleUser.mutateAsync(a); }
    catch (err) { toast(errorMessage(err, 'Failed.'), 'error'); }
  };

  const closeForm = () => { setActiveTab('list'); setEditId(null); setFormError(''); };

  const renderForm = () => (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '1.3rem' }}>{editId ? 'Edit Agronomist' : 'Add New Agronomist'}</h2>
          <p className="page-subtitle">{editId ? 'Update agronomist details' : 'Register a crop science consultant'}</p>
        </div>
        <button className="btn btn-outline" onClick={closeForm}><X size={16} /> Back to List</button>
      </div>
      {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}
      <div className="form-grid">
        <div className="form-group"><label className="form-label">{t('field.firstName')} *</label><input className="input-field" name="first_name" value={form.first_name} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{t('field.lastName')}</label><input className="input-field" name="last_name" value={form.last_name} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">Phone {!editId && '*'}</label><input className="input-field" name="phone_primary" value={form.phone_primary} onChange={handleChange} disabled={!!editId} /></div>
        <div className="form-group"><label className="form-label">{t('field.email')}</label><input className="input-field" name="email" value={form.email} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{t('field.designation')}</label><input className="input-field" name="designation" value={form.designation} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{t('field.district')}</label><input className="input-field" name="district" value={form.district} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{t('field.state')}</label><input className="input-field" name="state" value={form.state} onChange={handleChange} /></div>
        {!editId && <div className="form-group"><label className="form-label">Password (default: icon123)</label><input className="input-field" name="new_password" value={form.new_password} onChange={handleChange} placeholder="Leave blank" /></div>}
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
          <h1 className="page-title">{t('agronomists.title')}</h1>
          <p className="page-subtitle">{t('agronomists.subtitle')}</p>
        </div>
      </div>

      {/* Agronomist KPI Report Panel */}
      <AgroKpiPanel kpis={kpis} />

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>{t('common.listView')}</button>
        <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => openCreate()}><Plus size={14} /> {t('agronomists.add')}</button>
      </div>

      {activeTab === 'list' ? (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid var(--glass-border)' }}>
              <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={14} /></button>
            </div>
            <AgTable
              exportFileName="agronomists"
              rowData={agronomists}
              loading={loading}
              columnDefs={[
                { headerName: t('col.name'), valueGetter: (p: any) => `${p.data.first_name} ${p.data.last_name || ''}`,
                  cellRenderer: (p: any) => {
                    const name = p.value || '';
                    return (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={name} size={22} />
                        {name}
                      </span>
                    );
                  },
                },
                { headerName: t('col.phone'), field: 'phone_primary' },
                { headerName: t('col.email'), field: 'email', valueFormatter: (p: any) => p.value || '—' },
                { headerName: t('col.designation'), field: 'designation', valueFormatter: (p: any) => p.value || '—' },
                { headerName: t('col.district'), field: 'district', valueFormatter: (p: any) => p.value || '—' },
                { headerName: t('col.status'), field: 'is_active', maxWidth: 120, cellRenderer: (p: any) => p.value
                  ? <Badge tone="success">Active</Badge>
                  : <Badge tone="danger">Suspended</Badge> },
                { headerName: t('col.actions'), filter: false, sortable: false, pinned: 'right' as const, maxWidth: 110,
                  cellRenderer: (p: any) => (
                    <div className="flex-center-gap">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p.data)}><Edit2 size={13} /></button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleToggle(p.data)} style={{ color: p.data.is_active ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {p.data.is_active ? <Ban size={13} /> : <CheckCircle size={13} />}
                      </button>
                    </div>
                  )
                }
              ] as ColDef[]}
            />
          </div>
        </>
      ) : renderForm()}
    </div>
  );
};

export default AgronomistsManagement;
