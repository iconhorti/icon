import { useState, type ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireRole } from '../components/RequireRole';
import { ROLE_SETS, hasRole } from '../lib/roles';
import { pct } from '../lib/format';
import { errorMessage } from '../lib/logger';
import { useDealers, useSaveDealer, useToggleDealer } from '../hooks/useDealers';
import { useTranslation } from '../i18n/useTranslation';
import { RefreshCw, UserPlus, Edit2, Ban, CheckCircle, X, Save, Plus, Users, Tractor } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import AgTable from '../components/AgTable';
import type { ColDef } from 'ag-grid-community';
import { useToast } from '../context/ToastContext';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';

const EMPTY_FORM = {
  first_name: '', last_name: '', phone_primary: '',
  email: '', firm_name: '', gst_number: '',
  address_line1: '', new_password: '',
};

const DealersManagement = () => {
  const { user } = useAuth();
  const isAdmin = hasRole(user?.role, ROLE_SETS.ADMIN_OWNER);

  // Guard: only internal staff may manage dealers
  const denied = useRequireRole(ROLE_SETS.INTERNAL_STAFF);
  if (denied) return denied;

  const { toast } = useToast();
  const { t } = useTranslation();
  // ── Server state via TanStack Query (caching, dedupe, background refresh) ──
  const { data: dealers = [], isLoading: loading, error: queryError, refetch } = useDealers();
  const saveDealer = useSaveDealer();
  const toggleDealer = useToggleDealer();
  const error = queryError ? errorMessage(queryError, 'Failed to load dealers.') : '';

  const [activeTab, setActiveTab] = useState<string>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, any>>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const loadDealers = () => { refetch(); };


  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setFormError(''); setActiveTab('add'); };
  const openEdit = (d: any) => {
    setEditId(d.id);
    setForm({
      first_name: d.first_name||'', last_name: d.last_name||'', phone_primary: d.phone_primary||'',
      email: d.email||'', firm_name: d.business_profile?.firm_name||'', gst_number: d.business_profile?.gst_number||'',
      address_line1: d.address_line1||'', new_password: '',
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
      payload = { ...form };
    }
    try {
      await saveDealer.mutateAsync({ id: editId, payload });
      setActiveTab('list');
    } catch (err) { setFormError(errorMessage(err, 'Save failed.')); }
    finally { setSaving(false); }
  };

  const handleToggle = async (d: any): Promise<void> => {
    if (!window.confirm(`${d.is_active ? 'Suspend' : 'Reactivate'} ${d.first_name}?`)) return;
    try { await toggleDealer.mutateAsync(d); }
    catch (err) { toast(errorMessage(err, 'Failed.'), 'error'); }
  };

  const closeForm = () => { setActiveTab('list'); setEditId(null); setFormError(''); };

  const F = ({ label, name, placeholder, disabled }: { label: string; name: string; placeholder?: string; disabled?: boolean }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="input-field" name={name} value={form[name] || ''} onChange={handleChange}
        placeholder={placeholder || ''} disabled={disabled} />
    </div>
  );

  const renderForm = () => (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '1.3rem' }}>{editId ? 'Edit Dealer' : 'Add New Dealer'}</h2>
          <p className="page-subtitle">{editId ? 'Update dealer profile' : 'Register a new dealer for the distribution network'}</p>
        </div>
        <button className="btn btn-outline" onClick={closeForm}><X size={16} /> Back to List</button>
      </div>
      {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}
      <div className="form-grid">
        <F label={`${t('field.firstName')} *`} name="first_name" />
        <F label={t('field.lastName')} name="last_name" />
        <F label={`Phone ${!editId ? '*' : ''}`} name="phone_primary" disabled={!!editId} />
        <F label={t('field.email')} name="email" />
        <F label={t('field.firmName')} name="firm_name" />
        <F label={t('field.gstNumber')} name="gst_number" />
        <F label={t('field.address')} name="address_line1" />
        {!editId && <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Password (default: icon123)</label><input className="input-field" name="new_password" value={form.new_password || ''} onChange={handleChange} placeholder="Leave blank for default" /></div>}
      </div>
      <div className="form-actions" style={{ marginTop: '1.5rem' }}>
        <button className="btn btn-outline" onClick={closeForm} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );

  const totalDealers = dealers.filter((d: any) => d.is_active).length;
  const totalFarmers = dealers.reduce((acc: number, d: any) => acc + (d.farmer_count || 0), 0);
  const totalProjects = dealers.reduce((acc: number, d: any) => acc + (d.project_count || 0), 0);
  const conversionRate = pct(totalProjects, totalFarmers); // always a string, never 0:number

  const topDealersData = [...dealers]
    .filter((d: any) => d.is_active)
    .sort((a: any, b: any) => (b.project_count || 0) - (a.project_count || 0))
    .slice(0, 10)
    .map((d: any) => ({
       name: `${d.first_name} ${d.last_name || ''}`.trim(),
       Projects: d.project_count || 0,
       Farmers: d.farmer_count || 0
    }));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dealers.title')}</h1>
          <p className="page-subtitle">{t('dealers.subtitle')}</p>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>List View</button>
        {isAdmin && <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => openCreate()}><Plus size={14} /> {t('dealers.add')}</button>}
      </div>

      {activeTab === 'list' ? (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          
          {/* --- DEALER ANALYTICS DASHBOARD --- */}
          {dealers.length > 0 && (
            <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
              <div className="kpi-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="kpi-card"><div className="kpi-icon primary"><Users size={24}/></div><div className="kpi-content"><p className="kpi-label">{t('dealers.activeDealers')}</p><h3 className="kpi-value">{totalDealers}</h3></div></div>
                <div className="kpi-card"><div className="kpi-icon info"><UserPlus size={24}/></div><div className="kpi-content"><p className="kpi-label">{t('dealers.networkFarmers')}</p><h3 className="kpi-value">{totalFarmers}</h3></div></div>
                <div className="kpi-card"><div className="kpi-icon warning"><Tractor size={24}/></div><div className="kpi-content"><p className="kpi-label">{t('dealers.networkProjects')}</p><h3 className="kpi-value">{totalProjects}</h3></div></div>
                <div className="kpi-card"><div className="kpi-icon success"><CheckCircle size={24}/></div><div className="kpi-content"><p className="kpi-label">{t('dealers.conversionRate')}</p><h3 className="kpi-value">{conversionRate}%</h3><p className="kpi-sub">Projects per Farmer</p></div></div>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem', height: '350px' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1rem' }}>Top 10 Dealers Performance</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={topDealersData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)"/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)'}} angle={-45} textAnchor="end" interval={0} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)'}}/>
                    <RechartsTooltip cursor={{fill: 'var(--color-bg-subtle)'}} contentStyle={{borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)'}}/>
                    <Legend verticalAlign="top" height={36}/>
                    <Bar dataKey="Projects" fill="#f59e0b" radius={[4,4,0,0]} barSize={20} />
                    <Bar dataKey="Farmers" fill="#0ea5e9" radius={[4,4,0,0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid var(--glass-border)' }}>
              <button className="btn btn-outline btn-sm" onClick={loadDealers}><RefreshCw size={14} /></button>
            </div>
            <AgTable
              exportFileName="dealers"
              rowData={dealers}
              loading={loading}
              columnDefs={[
                { headerName: t('col.name'), valueGetter: (d: any) => `${d.data.first_name} ${d.data.last_name || ''}`,
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
                { headerName: t('col.firm'), field: 'firm_name', valueFormatter: (p: any) => p.value || '—' },
                { headerName: t('col.phone'), field: 'phone_primary' },
                { headerName: t('col.district'), valueGetter: (d: any) => d.data.village?.taluka?.district?.name || '—' },
                { headerName: t('col.farmers'), field: 'farmer_count' },
                { headerName: t('col.projects'), field: 'project_count' },
                { headerName: t('col.status'), field: 'is_active',
                  cellRenderer: (p: any) => p.value
                    ? <Badge tone="success">Active</Badge>
                    : <Badge tone="danger">Suspended</Badge>,
                },
                { headerName: t('col.actions'), filter: false, sortable: false, pinned: 'right' as const, maxWidth: 100,
                  cellRenderer: (p: any) => (
                    <div className="flex-center-gap">
                      {isAdmin && <button className="btn btn-outline btn-sm" onClick={() => openEdit(p.data)}><Edit2 size={13} /></button>}
                      {isAdmin && <button className="btn btn-outline btn-sm" onClick={() => handleToggle(p.data)} style={{ color: p.data.is_active ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {p.data.is_active ? <Ban size={13} /> : <CheckCircle size={13} />}
                      </button>}
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

export default DealersManagement;
