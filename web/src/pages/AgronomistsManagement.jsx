import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { RefreshCw, Edit2, Ban, CheckCircle, X, Save, Plus, Leaf,
         AlertTriangle, ClipboardCheck, TrendingUp, Tractor } from 'lucide-react';
import { getUsers, createUser, updateUser, getRoleKpis } from '../api/client';
import AgTable from '../components/AgTable';
import { useToast } from '../context/ToastContext';

// ─── Shared KPI card ────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = '#22c55e', bg = '#f0fdf4' }) => (
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

const BarRow = ({ label, value, max, color = '#22c55e' }) => (
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
const AgroKpiPanel = ({ kpis }) => {
  if (!kpis) return null;
  const agroMax = Math.max(...(kpis.agro_breakdown?.map(a => a.consultations) || [1]), 1);
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
            ? kpis.agro_breakdown.map(a => (
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
  const { user: _user } = useAuth();
  // Guard: admin, owner, office_staff only
  if (!['admin', 'owner', 'office_staff'].includes(_user.role))
    return <Navigate to="/" replace />;

  const { toast } = useToast();
  const [agronomists, setAgronomists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState(null);

  const [activeTab, setActiveTab] = useState('list');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setAgronomists(await getUsers({ role: 'agronomist' })); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to load agronomists.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getRoleKpis('agronomist').then(setKpis).catch(() => setKpis(null));
  }, []);


  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setFormError(''); setActiveTab('add'); };
  const openEdit = (a) => {
    setEditId(a.id);
    setForm({
      first_name: a.first_name||'', last_name: a.last_name||'', phone_primary: a.phone_primary||'',
      email: a.email||'', designation: a.designation||'', district: a.district||'', state: a.state||'', new_password: '',
    });
    setFormError(''); setActiveTab('edit');
  };

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.first_name.trim()) { setFormError('First name is required.'); return; }
    if (!editId && !form.phone_primary.trim()) { setFormError('Phone is required.'); return; }
    setSaving(true); setFormError('');
    try {
      if (editId) {
        const payload = {};
        Object.entries(form).forEach(([k, v]) => { if (k !== 'phone_primary' && v !== '') payload[k] = v; });
        await updateUser(editId, payload);
      } else {
        await createUser({ ...form, role: 'agronomist' });
      }
      setActiveTab('list'); load();
    } catch (err) { setFormError(err.response?.data?.detail || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (a) => {
    if (!window.confirm(`${a.is_active ? 'Suspend' : 'Reactivate'} ${a.first_name}?`)) return;
    try { await updateUser(a.id, { is_active: a.is_active ? 0 : 1 }); load(); }
    catch (err) { toast(err.response?.data?.detail || 'Failed.', 'error'); }
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
        <div className="form-group"><label className="form-label">First Name *</label><input className="input-field" name="first_name" value={form.first_name} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">Last Name</label><input className="input-field" name="last_name" value={form.last_name} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">Phone {!editId && '*'}</label><input className="input-field" name="phone_primary" value={form.phone_primary} onChange={handleChange} disabled={!!editId} /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="input-field" name="email" value={form.email} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">Designation</label><input className="input-field" name="designation" value={form.designation} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">District</label><input className="input-field" name="district" value={form.district} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">State</label><input className="input-field" name="state" value={form.state} onChange={handleChange} /></div>
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
          <h1 className="page-title">Agronomists</h1>
          <p className="page-subtitle">Crop science consultants for greenhouse projects.</p>
        </div>
      </div>

      {/* Agronomist KPI Report Panel */}
      <AgroKpiPanel kpis={kpis} />

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>List View</button>
        <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => openCreate()}><Plus size={14} /> Add Agronomist</button>
      </div>

      {activeTab === 'list' ? (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid var(--glass-border)' }}>
              <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={14} /></button>
            </div>
            <AgTable
              rowData={agronomists}
              loading={loading}
              columnDefs={[
                { headerName: 'Name', valueGetter: p => `${p.data.first_name} ${p.data.last_name || ''}` },
                { headerName: 'Phone', field: 'phone_primary' },
                { headerName: 'Email', field: 'email', valueFormatter: p => p.value || '—' },
                { headerName: 'Designation', field: 'designation', valueFormatter: p => p.value || '—' },
                { headerName: 'District', field: 'district', valueFormatter: p => p.value || '—' },
                { headerName: 'Status', field: 'is_active', maxWidth: 120, cellRenderer: p => p.value
                  ? <span className="badge badge-success">Active</span>
                  : <span className="badge badge-danger">Suspended</span> },
                { headerName: 'Actions', filter: false, sortable: false, pinned: 'right', maxWidth: 110,
                  cellRenderer: p => (
                    <div className="flex-center-gap">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p.data)}><Edit2 size={13} /></button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleToggle(p.data)} style={{ color: p.data.is_active ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {p.data.is_active ? <Ban size={13} /> : <CheckCircle size={13} />}
                      </button>
                    </div>
                  )
                }
              ]}
            />
          </div>
        </>
      ) : renderForm()}
    </div>
  );
};

export default AgronomistsManagement;
