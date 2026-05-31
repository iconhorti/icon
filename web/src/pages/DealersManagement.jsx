import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { RefreshCw, UserPlus, Edit2, Ban, CheckCircle, X, Save, Phone, Plus, Users, Tractor } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { getDealers, createUser, updateUser } from '../api/client';
import AgTable from '../components/AgTable';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = {
  first_name: '', last_name: '', phone_primary: '',
  email: '', firm_name: '', gst_number: '',
  address_line1: '', new_password: '',
};

const DealersManagement = () => {
  const { user: user } = useAuth();
  const isAdmin = ['admin', 'owner'].includes(user.role);

  // Guard: only internal staff may manage dealers
  const ALLOWED = ['admin', 'owner', 'office_staff'];
  if (!ALLOWED.includes(user.role)) return <Navigate to="/" replace />;

  const { toast } = useToast();
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('list');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadDealers = useCallback(async () => {
    setLoading(true); setError('');
    try { setDealers(await getDealers()); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to load dealers.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDealers(); }, [loadDealers]);


  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setFormError(''); setActiveTab('add'); };
  const openEdit = (d) => {
    setEditId(d.id);
    setForm({
      first_name: d.first_name||'', last_name: d.last_name||'', phone_primary: d.phone_primary||'',
      email: d.email||'', firm_name: d.business_profile?.firm_name||'', gst_number: d.business_profile?.gst_number||'',
      address_line1: d.address_line1||'', new_password: '',
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
        await createUser({ ...form, role: 'dealer' });
      }
      setActiveTab('list'); loadDealers();
    } catch (err) { setFormError(err.response?.data?.detail || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (d) => {
    if (!window.confirm(`${d.is_active ? 'Suspend' : 'Reactivate'} ${d.first_name}?`)) return;
    try { await updateUser(d.id, { is_active: d.is_active ? 0 : 1 }); loadDealers(); }
    catch (err) { toast(err.response?.data?.detail || 'Failed.', 'error'); }
  };

  const closeForm = () => { setActiveTab('list'); setEditId(null); setFormError(''); };

  const F = ({ label, name, placeholder, disabled }) => (
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
        <F label="First Name *" name="first_name" />
        <F label="Last Name" name="last_name" />
        <F label={`Phone ${!editId ? '*' : ''}`} name="phone_primary" disabled={!!editId} />
        <F label="Email" name="email" />
        <F label="Firm Name" name="firm_name" />
        <F label="GST Number" name="gst_number" />
        <F label="Address" name="address_line1" />
        {!editId && <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Password (default: icon123)</label><input className="input-field" name="new_password" value={form.new_password || ''} onChange={handleChange} placeholder="Leave blank for default" /></div>}
      </div>
      <div className="form-actions" style={{ marginTop: '1.5rem' }}>
        <button className="btn btn-outline" onClick={closeForm} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );

  const totalDealers = dealers.filter(d => d.is_active).length;
  const totalFarmers = dealers.reduce((acc, d) => acc + (d.farmer_count || 0), 0);
  const totalProjects = dealers.reduce((acc, d) => acc + (d.project_count || 0), 0);
  const conversionRate = totalFarmers ? ((totalProjects / totalFarmers) * 100).toFixed(1) : 0;

  const topDealersData = [...dealers]
    .filter(d => d.is_active)
    .sort((a, b) => (b.project_count || 0) - (a.project_count || 0))
    .slice(0, 10)
    .map(d => ({
       name: `${d.first_name} ${d.last_name || ''}`.trim(),
       Projects: d.project_count || 0,
       Farmers: d.farmer_count || 0
    }));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dealers</h1>
          <p className="page-subtitle">Manage dealer profiles, farmers, and projects.</p>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>List View</button>
        {isAdmin && <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => openCreate()}><Plus size={14} /> Add Dealer</button>}
      </div>

      {activeTab === 'list' ? (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          
          {/* --- DEALER ANALYTICS DASHBOARD --- */}
          {dealers.length > 0 && (
            <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
              <div className="kpi-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="kpi-card"><div className="kpi-icon primary"><Users size={24}/></div><div className="kpi-content"><p className="kpi-label">Active Dealers</p><h3 className="kpi-value">{totalDealers}</h3></div></div>
                <div className="kpi-card"><div className="kpi-icon info"><UserPlus size={24}/></div><div className="kpi-content"><p className="kpi-label">Network Farmers</p><h3 className="kpi-value">{totalFarmers}</h3></div></div>
                <div className="kpi-card"><div className="kpi-icon warning"><Tractor size={24}/></div><div className="kpi-content"><p className="kpi-label">Network Projects</p><h3 className="kpi-value">{totalProjects}</h3></div></div>
                <div className="kpi-card"><div className="kpi-icon success"><CheckCircle size={24}/></div><div className="kpi-content"><p className="kpi-label">Conversion Rate</p><h3 className="kpi-value">{conversionRate}%</h3><p className="kpi-sub">Projects per Farmer</p></div></div>
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
              rowData={dealers}
              loading={loading}
              columnDefs={[
                { headerName: 'Name', valueGetter: d => `${d.data.first_name} ${d.data.last_name || ''}` },
                { headerName: 'Firm', field: 'firm_name', valueFormatter: p => p.value || '—' },
                { headerName: 'Phone', field: 'phone_primary' },
                { headerName: 'District', valueGetter: d => d.data.village?.taluka?.district?.name || '—' },
                { headerName: 'Farmers', field: 'farmer_count' },
                { headerName: 'Projects', field: 'project_count' },
                { headerName: 'Status', field: 'is_active', cellRenderer: p => p.value
                  ? <span className="badge badge-success">Active</span>
                  : <span className="badge badge-danger">Suspended</span> },
                { headerName: 'Actions', filter: false, sortable: false, pinned: 'right', maxWidth: 100,
                  cellRenderer: p => (
                    <div className="flex-center-gap">
                      {isAdmin && <button className="btn btn-outline btn-sm" onClick={() => openEdit(p.data)}><Edit2 size={13} /></button>}
                      {isAdmin && <button className="btn btn-outline btn-sm" onClick={() => handleToggle(p.data)} style={{ color: p.data.is_active ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {p.data.is_active ? <Ban size={13} /> : <CheckCircle size={13} />}
                      </button>}
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

export default DealersManagement;
