import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Trash2, Plus, X, Save, FileCheck2, UserX,
         ChevronRight, Users, CheckCircle, MapPin, Landmark,
         FileText, BarChart2, TrendingUp, Leaf } from 'lucide-react';
import { getFarmers, getFarmerStats, createUser, updateFarmer, deleteFarmer } from '../api/client';
import AgTable from '../components/AgTable';
import LocationPicker from '../components/LocationPicker';
import './FarmerManagement.css';
import { useToast } from '../context/ToastContext';

// ─── Tiny helpers ──────────────────────────────────────────────────────────────
const fmtNum = (n) => (n ?? 0).toLocaleString('en-IN');

// ─── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = '#6366f1', bg = '#eef2ff', alert }) => (
  <div style={{
    background: bg,
    border: `1.5px solid ${color}${alert ? '' : '33'}`,
    borderRadius: 14, padding: '1rem 1.25rem',
    display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 150,
    boxShadow: alert ? `0 0 0 2px ${color}55` : 'none',
  }}>
    <div style={{
      background: `${color}18`, borderRadius: 10, padding: '0.6rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 500,
                  textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</h3>
      {sub && <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>{sub}</p>}
    </div>
  </div>
);

// ─── Horizontal Bar ────────────────────────────────────────────────────────────
const HBar = ({ label, value, max, color = '#6366f1', suffix = '' }) => (
  <div style={{ marginBottom: '0.65rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ fontSize: '0.78rem', color: '#475569' }}>{label}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>{value}{suffix}</span>
    </div>
    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${Math.min((value / (max || 1)) * 100, 100)}%`,
        background: color, borderRadius: 4,
        transition: 'width 0.5s ease',
      }} />
    </div>
  </div>
);

// ─── Vertical Bar (monthly trend) ──────────────────────────────────────────────
const VBarChart = ({ data, color = '#6366f1' }) => {
  const maxVal = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', align: 'flex-end', gap: '0.4rem', height: 120,
                  alignItems: 'flex-end', marginTop: '0.5rem' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                              alignItems: 'center', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{d.count}</span>
          <div style={{
            width: '100%', borderRadius: '4px 4px 0 0',
            height: `${Math.max((d.count / maxVal) * 90, d.count > 0 ? 6 : 2)}px`,
            background: i === data.length - 1 ? color : `${color}88`,
            transition: 'height 0.4s ease',
            minHeight: 2,
          }} />
          <span style={{ fontSize: '0.6rem', color: '#64748b', textAlign: 'center',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: '100%' }}>
            {d.month.split(' ')[0]}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Donut gauge for KYC % ─────────────────────────────────────────────────────
const KycGauge = ({ pct }) => {
  const r = 36; const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={r} fill="none" stroke="#e2e8f0" strokeWidth={9} />
        <circle cx={45} cy={45} r={r} fill="none" stroke="#22c55e" strokeWidth={9}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x={45} y={49} textAnchor="middle" fontSize={15}
              fontWeight={700} fill="#22c55e">{pct}%</text>
      </svg>
      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>KYC Complete</p>
    </div>
  );
};

// ─── Farmer Stats Panel ────────────────────────────────────────────────────────
const FarmerStatsPanel = ({ stats, loading }) => {
  if (loading) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
      Loading analytics…
    </div>
  );
  if (!stats) return null;

  const distMax = Math.max(...(stats.district_breakdown?.map(d => d.count) || [1]), 1);
  const landMax = Math.max(...(stats.top_by_land?.map(f => f.land_area) || [1]), 1);

  return (
    <div style={{ marginBottom: '1.5rem' }}>

      {/* ── KPI Row ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <KpiCard icon={Users}       label="Total Farmers"    value={fmtNum(stats.total_farmers)}  color="#6366f1" bg="#eef2ff" />
        <KpiCard icon={CheckCircle} label="Active"           value={fmtNum(stats.active_farmers)} color="#22c55e" bg="#f0fdf4" />
        <KpiCard icon={UserX}       label="Inactive"         value={fmtNum(stats.inactive_farmers)} color="#f59e0b" bg="#fffbeb" />
        <KpiCard icon={BarChart2}   label="With Projects"    value={fmtNum(stats.with_project)}   color="#0ea5e9" bg="#e0f2fe"
                 sub="Has ≥1 project" />
        <KpiCard icon={FileText}    label="Aadhaar Linked"   value={fmtNum(stats.with_aadhaar)}   color="#8b5cf6" bg="#f5f3ff" />
        <KpiCard icon={Landmark}    label="PAN Linked"       value={fmtNum(stats.with_pan)}       color="#ec4899" bg="#fdf2f8" />
        <KpiCard icon={Leaf}        label="Total Land (SQM)" value={fmtNum(stats.total_land_sqm)} color="#16a34a" bg="#f0fdf4"
                 sub={`Avg ${fmtNum(stats.avg_land_sqm)} SQM`} />
        <KpiCard icon={TrendingUp}  label="KYC Rate"         value={`${stats.kyc_pct}%`}         color="#22c55e" bg="#f0fdf4"
                 sub={`${fmtNum(stats.kyc_complete)} complete`} />
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>

        {/* District Breakdown */}
        <div className="glass-card p-4">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={15} color="#6366f1" /> Farmers by District
          </h3>
          {stats.district_breakdown?.length > 0
            ? stats.district_breakdown.map(d => (
                <HBar key={d.district} label={d.district} value={d.count} max={distMax} color="#6366f1" />
              ))
            : <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No data yet.</p>
          }
        </div>

        {/* Monthly Onboarding Trend */}
        <div className="glass-card p-4">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={15} color="#0ea5e9" /> Monthly Onboarding (6 Months)
          </h3>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', color: '#94a3b8' }}>New farmers registered each month</p>
          <VBarChart data={stats.monthly_onboarding || []} color="#0ea5e9" />
        </div>

        {/* KYC Gauge + Details */}
        <div className="glass-card p-4" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <KycGauge pct={stats.kyc_pct} />
          <div style={{ flex: 1, minWidth: 120 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e293b' }}>
              KYC Status Breakdown
            </h3>
            {[
              { label: 'Aadhaar Linked', value: stats.with_aadhaar, total: stats.total_farmers, color: '#8b5cf6' },
              { label: 'PAN Linked',     value: stats.with_pan,     total: stats.total_farmers, color: '#ec4899' },
              { label: 'Land Recorded',  value: stats.with_land,    total: stats.total_farmers, color: '#16a34a' },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: '0.75rem', color: '#475569' }}>{r.label}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: r.color }}>{r.value}/{r.total}</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((r.value / (r.total || 1)) * 100, 100)}%`,
                                background: r.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 by Land Area */}
        {stats.top_by_land?.length > 0 && (
          <div className="glass-card p-4">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Leaf size={15} color="#16a34a" /> Top 5 by Land Area
            </h3>
            {stats.top_by_land.map((f, i) => (
              <HBar
                key={i}
                label={`${f.name} (${f.district})`}
                value={fmtNum(f.land_area)}
                max={landMax}
                color="#16a34a"
                suffix=" SQM"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Form blank ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  role: 'farmer',
  first_name: '', last_name: '',
  phone_primary: '', whatsapp_number: '',
  village_id: '',          // relational FK — drives LocationPicker
  address_line1: '',
  aadhaar_number: '', pan_number: '',
  land_area: '', land_unit: 'SQM',
};

// ═══════════════════════════════════════════════════════════════════════════════
const FarmerManagement = () => {
  const { toast } = useToast();
  const [farmers,    setFarmers]    = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error,      setError]      = useState('');

  const [activeTab,  setActiveTab]  = useState('list');
  const [editId,     setEditId]     = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');

  const fetchFarmers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFarmers();
      setFarmers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to load farmers.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getFarmerStats();
      setStats(data);
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchFarmers(); fetchStats(); }, [fetchFarmers, fetchStats]);

  const refresh = () => { fetchFarmers(); fetchStats(); };

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  const handleDelete = async (farmer) => {
    if (!window.confirm(`Deactivate farmer "${farmer.first_name}"?`)) return;
    try {
      await deleteFarmer(farmer.id);
      refresh();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to deactivate farmer.', 'error');
    }
  };

  const openCreate = () => {
    setEditId(null); setForm(EMPTY_FORM); setFormError(''); setActiveTab('add');
  };

  const openEdit = (f) => {
    setEditId(f.id);
    setForm({
      role: 'farmer',
      first_name: f.first_name || '', last_name: f.last_name || '',
      phone_primary: f.phone_primary || '', whatsapp_number: f.whatsapp_number || '',
      village_id: f.village_id || '',
      address_line1: f.address_line1 || '',
      aadhaar_number: f.farmer_profile?.aadhaar_number || '',
      pan_number:     f.farmer_profile?.pan_number     || '',
      land_area:      f.farmer_profile?.land_area      || '',
      land_unit:      f.farmer_profile?.land_unit      || 'SQM',
    });
    setFormError(''); setActiveTab('edit');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setFormError(''); setSubmitting(true);
    try {
      if (!form.first_name || !form.phone_primary)
        throw new Error('First Name and Primary Phone are required.');

      const payload = { ...form };
      // Coerce types
      if (payload.village_id) payload.village_id = Number(payload.village_id);
      else delete payload.village_id;
      if (payload.land_area) payload.land_area = parseFloat(payload.land_area);
      else delete payload.land_area;

      if (editId) {
        const up = { ...payload };
        delete up.role; delete up.phone_primary;
        await updateFarmer(editId, up);
      } else {
        await createUser(payload);
      }
      setActiveTab('list'); refresh();
    } catch (err) {
      setFormError(err.response?.data?.detail || err.message);
    } finally { setSubmitting(false); }
  };

  const closeForm = () => { setActiveTab('list'); setEditId(null); setFormError(''); };

  // ─── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🌾 Farmer Network</h1>
          <p className="page-subtitle">Manage onboarded farmers, KYC status, land records and analytics.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={refresh} title="Refresh all">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── ANALYTICS PANEL (always visible above tabs) ── */}
      <FarmerStatsPanel stats={stats} loading={statsLoading} />

      {/* ── Tab Bar ── */}
      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
          List View
        </button>
        <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => openCreate()}>
          <Plus size={14} /> Register Farmer
        </button>
        {editId && activeTab === 'edit' && (
          <button className="tab-btn active">
            <ChevronRight size={14} /> Edit Farmer
          </button>
        )}
      </div>

      {/* ── LIST TAB ── */}
      {activeTab === 'list' && (
        <>
          {error && (
            <div className="glass-card" style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: '1rem' }}>
              ⚠️ {error} — <button onClick={fetchFarmers} style={{ background: 'none', border: 'none',
                color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Retry</button>
            </div>
          )}

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'flex-end',
                          borderBottom: '1px solid var(--glass-border)' }}>
              <button className="btn btn-outline btn-sm" onClick={refresh}><RefreshCw size={14} /></button>
            </div>
            <AgTable
              rowData={farmers}
              loading={loading}
              columnDefs={[
                { headerName: 'Farmer ID', valueFormatter: p => `F-${String(p.data.id).padStart(4,'0')}`, field: 'id', maxWidth: 110 },
                { headerName: 'Name', valueGetter: p => `${p.data.first_name} ${p.data.last_name || ''}` },
                { headerName: 'Phone', field: 'phone_primary' },
                { headerName: 'District', valueGetter: p => p.data.village?.taluka?.district?.name || 'N/A' },
                { headerName: 'Land (SQM)', valueGetter: p => p.data.farmer_profile?.land_area ? `${p.data.farmer_profile.land_area}` : 'N/A' },
                { headerName: 'Aadhaar', valueGetter: p => p.data.farmer_profile?.aadhaar_number, maxWidth: 130,
                  cellRenderer: p => p.value
                    ? <span className="badge badge-success">✔ Linked</span>
                    : <span className="badge badge-secondary">—</span> },
                { headerName: 'PAN', valueGetter: p => p.data.farmer_profile?.pan_number, maxWidth: 120,
                  cellRenderer: p => p.value
                    ? <span className="badge badge-success">✔ Linked</span>
                    : <span className="badge badge-secondary">—</span> },
                { headerName: 'Status', field: 'is_active', maxWidth: 110,
                  cellRenderer: p => p.value === 1
                    ? <span className="badge badge-success"><FileCheck2 size={12} /> Active</span>
                    : <span className="badge badge-warning"><UserX size={12} /> Inactive</span> },
                { headerName: 'Actions', filter: false, sortable: false, pinned: 'right', maxWidth: 120,
                  cellRenderer: p => (
                    <div className="flex-center-gap">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p.data)}>Edit</button>
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--color-danger)' }}
                              onClick={() => handleDelete(p.data)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                }
              ]}
            />
          </div>
        </>
      )}

      {/* ── ADD / EDIT FORM TAB ── */}
      {(activeTab === 'add' || activeTab === 'edit') && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div className="page-header" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h2 className="page-title" style={{ fontSize: '1.3rem' }}>
                {editId ? `Edit Farmer — F-${String(editId).padStart(4, '0')}` : 'Register New Farmer'}
              </h2>
              <p className="page-subtitle">
                {editId ? 'Update KYC details' : 'Onboard a farmer for polyhouse subsidies (KYC Entry)'}
              </p>
            </div>
            <button className="btn btn-outline" onClick={closeForm}><X size={16} /> Back to List</button>
          </div>

          {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>⚠️ {formError}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3 className="form-section-title">Personal Details</h3>
              <div className="form-grid">
                <div className="form-group"><label className="form-label">First Name *</label>
                  <input className="input-field" name="first_name" value={form.first_name} onChange={handleChange} required /></div>
                <div className="form-group"><label className="form-label">Last Name</label>
                  <input className="input-field" name="last_name" value={form.last_name} onChange={handleChange} /></div>
                <div className="form-group"><label className="form-label">Primary Phone *</label>
                  <input className="input-field" name="phone_primary" type="tel" maxLength={10}
                    value={form.phone_primary} onChange={handleChange} required disabled={!!editId}
                    placeholder="10-digit mobile" /></div>
                <div className="form-group"><label className="form-label">WhatsApp</label>
                  <input className="input-field" name="whatsapp_number" type="tel" maxLength={10}
                    value={form.whatsapp_number} onChange={handleChange} placeholder="10-digit" /></div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Address & Location</h3>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Address / Street</label>
                  <input className="input-field" name="address_line1" value={form.address_line1} onChange={handleChange} placeholder="Building / street" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <LocationPicker
                    value={form.village_id}
                    onChange={(vid) => setForm(p => ({ ...p, village_id: vid }))}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Documents & KYC</h3>
              <div className="form-grid">
                <div className="form-group"><label className="form-label">Aadhaar Card Number</label>
                  <input className="input-field" name="aadhaar_number" maxLength={12}
                    value={form.aadhaar_number} onChange={handleChange} placeholder="12-digit Aadhaar" /></div>
                <div className="form-group"><label className="form-label">PAN Card Number</label>
                  <input className="input-field" name="pan_number" maxLength={10}
                    style={{ textTransform: 'uppercase' }}
                    value={form.pan_number} onChange={handleChange} placeholder="ABCDE1234F" /></div>
                <div className="form-group"><label className="form-label">Land Area (SQM)</label>
                  <input className="input-field" name="land_area" type="number"
                    value={form.land_area} onChange={handleChange} placeholder="Total land holdings" /></div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={closeForm} disabled={submitting}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <Save size={16} /> {submitting ? 'Saving...' : editId ? 'Save Changes' : 'Register Farmer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FarmerManagement;
