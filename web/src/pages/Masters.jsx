import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { RefreshCw, Building2, Landmark, Banknote, Wrench, Cpu, MapPin,
         Plus, Edit2, Trash2, X, Save, ChevronRight } from 'lucide-react';
import {
  getComponents, createComponent, updateComponent, deleteComponent,
  getAreaTypes, createAreaType, updateAreaType, deleteAreaType,
  getAgencies, createAgency, updateAgency, deleteAgency,
  getBanks, createBank, updateBank, deleteBank,
  getBankBranches, createBankBranch, updateBankBranch, deleteBankBranch,
  getSkills, createSkill, updateSkill, deleteSkill,
  // Location CRUD
  getStates, createState, updateState, deleteState,
  getDistricts, createDistrict, updateDistrict, deleteDistrict,
  getTalukas, createTaluka, updateTaluka, deleteTaluka,
  getVillages, createVillage, updateVillage, deleteVillage,
} from '../api/client';
import AgTable from '../components/AgTable';
import { useToast } from '../context/ToastContext';

const TABS = [
  { key: 'components',   label: 'Components',   icon: Cpu },
  { key: 'area_types',   label: 'Area Types',   icon: Landmark },
  { key: 'agencies',     label: 'Agencies',     icon: Landmark },
  { key: 'banks',        label: 'Banks',        icon: Banknote },
  { key: 'bank_branches',label: 'Bank Branches',icon: Building2 },
  { key: 'skills',       label: 'Skills',       icon: Wrench },
  { key: 'locations',    label: 'Locations',    icon: MapPin },
];

const EMPTY = {
  components:    { component_type: 'Structure', name: '', category: '', variant_code: '', unit: 'SQM', eligible_cost_per_unit: '', subsidy_rate_per_unit: '', unit_type: '', min_qty: '', max_qty: '', default_qty: '', is_subsidy_eligible: 1, is_active: 1, description: '' },
  area_types:    { name: '', description: '', multiplier: 1.0, is_active: 1 },
  agencies:      { name: '', short_code: '', description: '', website: '', is_active: 1 },
  banks:         { name: '', short_name: '' },
  bank_branches: { bank_id: '', branch_name: '', branch_code: '', ifsc: '', address: '', phone: '', email: '' },
  skills:        { name: '', code: '', description: '' },
};

// ─── Locations sub‑tab config ─────────────────────────────────────────────────
const LOC_LEVELS = [
  { key: 'states',    label: 'State',    plural: 'States' },
  { key: 'districts', label: 'District', plural: 'Districts' },
  { key: 'talukas',   label: 'Taluka',   plural: 'Talukas' },
  { key: 'villages',  label: 'Village',  plural: 'Villages' },
];

// ════════════════════════════════════════════════════════════════════════════════
const Masters = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = ['admin', 'owner'].includes(currentUser?.role);

  // Guard: only admin / owner may access this page
  if (!isAdmin) return <Navigate to="/" replace />;

  const { toast } = useToast();
  const [activeTab, setActiveTab]   = useState('components');
  const [data, setData]             = useState({});
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const [mode, setMode]             = useState('list');
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState({});
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(25);

  // ── Location sub‑state ──────────────────────────────────────────────────────
  const [locLevel, setLocLevel]         = useState('states');   // which level is active
  const [locFilter, setLocFilter]       = useState({});         // { district_id: 3, taluka_id: 5, … }
  const [locForm, setLocForm]           = useState({});
  const [locEditId, setLocEditId]       = useState(null);
  const [locMode, setLocMode]           = useState('list');     // list | add | edit
  const [locSaving, setLocSaving]       = useState(false);
  const [locFormError, setLocFormError] = useState('');

  // ── Location CRUD map ───────────────────────────────────────────────────────
  const LOC_API = {
    states:    { get: getStates,    create: createState,    update: updateState,    del: deleteState },
    districts: { get: () => getDistricts(locFilter.state_id), create: createDistrict, update: updateDistrict, del: deleteDistrict },
    talukas:   { get: () => getTalukas(locFilter.district_id), create: createTaluka,   update: updateTaluka,   del: deleteTaluka },
    villages:  { get: () => getVillages(locFilter.taluka_id),  create: createVillage,  update: updateVillage,  del: deleteVillage },
  };

  const loadLocLevel = useCallback(async (level, filter = locFilter) => {
    setLoading(true); setError('');
    try {
      let results;
      if (level === 'states')    results = await getStates();
      else if (level === 'districts') results = await getDistricts(filter.state_id);
      else if (level === 'talukas')   results = await getTalukas(filter.district_id);
      else                            results = await getVillages(filter.taluka_id);
      setData(prev => ({ ...prev, [level]: results }));
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to load ${level}.`);
    } finally { setLoading(false); }
  }, [locFilter]);

  // ── Standard loaders ────────────────────────────────────────────────────────
  const LOADERS = {
    components:    getComponents,
    area_types:    () => getAreaTypes(true),
    agencies:      getAgencies,
    banks:         getBanks,
    bank_branches: async () => {
      if (!data.banks) getBanks().then(banks => setData(p => ({ ...p, banks }))).catch(() => {});
      return await getBankBranches();
    },
    skills:        getSkills,
    locations:     () => Promise.resolve([]),   // handled by loadLocLevel
  };

  const loadTab = useCallback(async (tab, force = false) => {
    if (tab === 'locations') { loadLocLevel(locLevel); return; }
    if (data[tab] && !force) return;
    setLoading(true); setError('');
    try {
      const result = await LOADERS[tab]();
      setData(prev => ({ ...prev, [tab]: result }));
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to load ${tab}.`);
    } finally { setLoading(false); }
  // eslint-disable-next-line
  }, [data, locLevel]);

  useEffect(() => { setMode('list'); setLocMode('list'); setPage(1); loadTab(activeTab); }, [activeTab]); // eslint-disable-line

  useEffect(() => {
    if (activeTab === 'locations') loadLocLevel(locLevel);
  }, [locLevel, locFilter]); // eslint-disable-line

  const reload = () => {
    if (activeTab === 'locations') { loadLocLevel(locLevel); return; }
    setData(prev => { const n = { ...prev }; delete n[activeTab]; return n; });
    setTimeout(() => loadTab(activeTab, true), 0);
  };

  // ── Standard save/delete ────────────────────────────────────────────────────
  const CREATORS = { components: createComponent, area_types: createAreaType, agencies: createAgency, banks: createBank, bank_branches: createBankBranch, skills: createSkill };
  const UPDATERS = { components: updateComponent, area_types: updateAreaType, agencies: updateAgency, banks: updateBank, bank_branches: updateBankBranch, skills: updateSkill };
  const DELETERS = { components: deleteComponent, area_types: deleteAreaType, agencies: deleteAgency, banks: deleteBank, bank_branches: deleteBankBranch, skills: deleteSkill };

  const openCreate = () => { setEditId(null); setForm({ ...EMPTY[activeTab] }); setFormError(''); setMode('add'); };

  const openEdit = (item) => {
    setEditId(item.id);
    const blank = EMPTY[activeTab];
    const filled = {};
    Object.keys(blank).forEach(k => { filled[k] = item[k] !== undefined && item[k] !== null ? item[k] : blank[k]; });
    setForm(filled); setFormError(''); setMode('edit');
  };

  const handleChange = (e) => { const { name, value } = e.target; setForm(p => ({ ...p, [name]: value })); };

  const handleSave = async () => {
    if (!form.name) { setFormError('Name is required.'); return; }
    setSaving(true); setFormError('');
    const payload = { ...form };
    ['eligible_cost_per_unit','subsidy_rate_per_unit','min_qty','max_qty','default_qty','multiplier','bank_id']
      .forEach(k => { if (payload[k] !== '' && payload[k] !== undefined) payload[k] = Number(payload[k]); });
    Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
    try {
      if (editId) await UPDATERS[activeTab](editId, payload);
      else        await CREATORS[activeTab](payload);
      setMode('list');
      setData(prev => { const n = { ...prev }; delete n[activeTab]; return n; });
      loadTab(activeTab, true);
    } catch (err) { setFormError(err.response?.data?.detail || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    const label = item.name || item.branch_name || `ID ${item.id}`;
    if (!DELETERS[activeTab]) { toast('Delete not supported for this tab.', 'info'); return; }
    if (!window.confirm(`Delete "${label}"?`)) return;
    try {
      await DELETERS[activeTab](item.id);
      setData(prev => { const n = { ...prev }; delete n[activeTab]; return n; });
      loadTab(activeTab, true);
    } catch (err) { toast(err.response?.data?.detail || 'Delete failed.', 'error'); }
  };

  // ── Location CRUD handlers ──────────────────────────────────────────────────
  const openLocCreate = () => {
    const defaults = {};
    if (locLevel === 'districts') defaults.state_id = locFilter.state_id ? Number(locFilter.state_id) : '';
    if (locLevel === 'talukas')   defaults.district_id = locFilter.district_id ? Number(locFilter.district_id) : '';
    if (locLevel === 'villages')  defaults.taluka_id = locFilter.taluka_id ? Number(locFilter.taluka_id) : '';
    setLocEditId(null); setLocForm({ name: '', pincode: '', ...defaults }); setLocFormError(''); setLocMode('add');
  };

  const openLocEdit = (item) => {
    setLocEditId(item.id);
    setLocForm({ name: item.name || '', short_name: item.short_name || '', pincode: item.pincode || '',
                 state_id: item.state_id || '', district_id: item.district_id || '', taluka_id: item.taluka_id || '' });
    setLocFormError(''); setLocMode('edit');
  };

  const handleLocSave = async () => {
    if (!locForm.name?.trim()) { setLocFormError('Name is required.'); return; }
    setLocSaving(true); setLocFormError('');
    const api = LOC_API[locLevel];
    const payload = { name: locForm.name.trim() };
    if (locLevel === 'states' && locForm.short_name?.trim()) payload.short_name = locForm.short_name.trim();
    if (locLevel === 'districts') payload.state_id    = Number(locForm.state_id);
    if (locLevel === 'talukas')   payload.district_id = Number(locForm.district_id);
    if (locLevel === 'villages')  { payload.taluka_id = Number(locForm.taluka_id); if (locForm.pincode) payload.pincode = locForm.pincode; }
    try {
      if (locEditId) await api.update(locEditId, payload);
      else           await api.create(payload);
      setLocMode('list'); loadLocLevel(locLevel);
    } catch (err) { setLocFormError(err.response?.data?.detail || 'Save failed.'); }
    finally { setLocSaving(false); }
  };

  const handleLocDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This will also remove all child records.`)) return;
    try { await LOC_API[locLevel].del(item.id); loadLocLevel(locLevel); }
    catch (err) { toast(err.response?.data?.detail || 'Delete failed. Ensure no child records exist.', 'error'); }
  };

  // ── Drill-down: click a row to filter next level ────────────────────────────
  const drillDown = (level, item) => {
    if (level === 'states') {
      setLocFilter({ state_id: item.id }); setLocLevel('districts');
    } else if (level === 'districts') {
      setLocFilter(f => ({ ...f, district_id: item.id })); setLocLevel('talukas');
    } else if (level === 'talukas') {
      setLocFilter(f => ({ ...f, taluka_id: item.id })); setLocLevel('villages');
    }
  };

  const allRows = data[activeTab] || [];
  const paginatedRows = allRows.slice((page - 1) * pageSize, page * pageSize);
  const tabLabel = TABS.find(t => t.key === activeTab)?.label?.replace(/s$/, '') || activeTab;

  // ── Form renderers ──────────────────────────────────────────────────────────
  const ig = (label, field, type = 'text', required = false) => (
    <div className="input-group">
      <label className="input-label">{label}{required && ' *'}</label>
      <input className="input-field" name={field} type={type} value={form[field] ?? ''} onChange={handleChange} />
    </div>
  );
  const sg = (label, field, options) => (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <select className="input-field" name={field} value={form[field] ?? ''} onChange={handleChange}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
  const tg = (label, field) => (
    <div className="input-group" style={{ gridColumn:'1/-1' }}>
      <label className="input-label">{label}</label>
      <textarea className="input-field" name={field} rows={2} value={form[field] ?? ''} onChange={handleChange} />
    </div>
  );

  const renderForm = () => {
    switch (activeTab) {
      case 'components': return (<>
        <div className="form-section"><div className="form-section-title">Basic Info</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem' }}>
            {sg('Type', 'component_type', ['Structure','Crop','Component'])}{ig('Name', 'name', 'text', true)}
            {ig('Category', 'category')}{ig('Variant Code', 'variant_code')}
          </div></div>
        <div className="form-section"><div className="form-section-title">Financial Details</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem' }}>
            {ig('Unit', 'unit')}{sg('Unit Type', 'unit_type', ['Per Project','Per Acre','Per SQM'])}
            {ig('Eligible Cost/Unit (₹)', 'eligible_cost_per_unit', 'number', true)}
            {ig('Subsidy Rate/Unit (₹)', 'subsidy_rate_per_unit', 'number', true)}
            {ig('Min Qty', 'min_qty', 'number')}{ig('Max Qty', 'max_qty', 'number')}{ig('Default Qty', 'default_qty', 'number')}
          </div></div>
        <div className="form-section"><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem' }}>
          {sg('Subsidy Eligible', 'is_subsidy_eligible', [{value:1,label:'Yes'},{value:0,label:'No'}])}
          {sg('Status', 'is_active', [{value:1,label:'Active'},{value:0,label:'Inactive'}])}
        </div>{tg('Description', 'description')}</div>
      </>);
      case 'area_types': return (<div className="form-section"><div className="form-section-title">Basic Info</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem' }}>
          {ig('Name', 'name', 'text', true)}{ig('Multiplier', 'multiplier', 'number', true)}
          {sg('Status', 'is_active', [{value:1,label:'Active'},{value:0,label:'Inactive'}])}
        </div>{tg('Description', 'description')}</div>);
      case 'agencies': return (<div className="form-section"><div className="form-section-title">Basic Info</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem' }}>
          {ig('Name', 'name', 'text', true)}{ig('Short Code', 'short_code')}{ig('Website', 'website')}
          {sg('Status', 'is_active', [{value:1,label:'Active'},{value:0,label:'Inactive'}])}
        </div>{tg('Description', 'description')}</div>);
      case 'banks': return (<div className="form-section"><div className="form-section-title">Basic Info</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem' }}>
          {ig('Bank Name', 'name', 'text', true)}{ig('Short Name', 'short_name')}
        </div></div>);
      case 'bank_branches': return (<>
        <div className="form-section"><div className="form-section-title">Branch Info</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem' }}>
            {sg('Bank *', 'bank_id', [{value:'',label:'Select Bank...'}].concat((data.banks||[]).map(b => ({value:b.id, label:b.name}))))}
            {ig('Branch Name', 'branch_name', 'text', true)}{ig('Branch Code', 'branch_code')}
            {ig('IFSC Code', 'ifsc')}{ig('Phone', 'phone')}{ig('Email', 'email')}
          </div></div>
        <div className="form-section"><div className="form-section-title">Address</div>
          {tg('Address', 'address')}</div>
      </>);
      case 'skills': return (<div className="form-section"><div className="form-section-title">Skill Details</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem' }}>
          {ig('Skill Name *', 'name', 'text', true)}{ig('Code', 'code')}
        </div>{tg('Description', 'description')}</div>);
      default: return null;
    }
  };

  // ── Table renderers ─────────────────────────────────────────────────────────
  const ActionCell = ({ item }) => isAdmin ? (
    <td>
      <div className="flex-center-gap">
        <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)} title="Edit"><Edit2 size={13} /></button>
        {DELETERS[activeTab] && (
          <button className="btn btn-outline btn-sm" onClick={() => handleDelete(item)} title="Delete"
            style={{ color: 'var(--color-warning)' }}><Trash2 size={13} /></button>
        )}
      </div>
    </td>
  ) : null;

  const StatusBadge = ({ val }) => val
    ? <span className="badge badge-success">Active</span>
    : <span className="badge badge-danger">Inactive</span>;

  const renderTable = () => {
    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>;

    const actionCol = isAdmin ? [{
      headerName: 'Actions', field: 'actions', pinned: 'right', width: 100, sortable: false, filter: false,
      cellRenderer: (params) => {
        const item = params.data;
        return (
          <div className="flex-center-gap" style={{ height: '100%' }}>
            <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)} title="Edit" style={{ padding: '0 4px', minWidth: 'auto', border: 'none' }}><Edit2 size={13} /></button>
            {DELETERS[activeTab] && (
              <button className="btn btn-outline btn-sm" onClick={() => handleDelete(item)} title="Delete" style={{ color: 'var(--color-warning)', padding: '0 4px', minWidth: 'auto', border: 'none' }}><Trash2 size={13} /></button>
            )}
          </div>
        );
      }
    }] : [];

    const statusCol = [{
      headerName: 'Status', field: 'is_active', width: 100,
      cellRenderer: params => <StatusBadge val={params.value} />
    }];

    let colDefs = [];
    switch (activeTab) {
      case 'components':
        colDefs = [
          { headerName: 'ID', field: 'id', width: 70 },
          { headerName: 'Type', field: 'component_type', width: 120, cellRenderer: p => <span className="badge">{p.value}</span> },
          { headerName: 'Name', field: 'name', minWidth: 200 },
          { headerName: 'Category', field: 'category' },
          { headerName: 'Unit', field: 'unit', width: 90 },
          { headerName: 'Eligible/Unit ₹', field: 'eligible_cost_per_unit', valueFormatter: p => p.value ? `₹${p.value.toLocaleString()}` : '₹0' },
          { headerName: 'Subsidy/Unit ₹', field: 'subsidy_rate_per_unit', valueFormatter: p => p.value ? `₹${p.value.toLocaleString()}` : '₹0' },
          { headerName: 'Min', field: 'min_qty', width: 90 },
          { headerName: 'Max', field: 'max_qty', width: 90 },
          { headerName: 'Default', field: 'default_qty', width: 90 },
          ...statusCol, ...actionCol
        ];
        break;
      case 'area_types':
        colDefs = [
          { headerName: 'ID', field: 'id', width: 70 },
          { headerName: 'Name', field: 'name', minWidth: 200 },
          { headerName: 'Multiplier', field: 'multiplier', width: 120, cellRenderer: p => <span className="badge badge-info">{p.value}×</span> },
          { headerName: 'Description', field: 'description', flex: 2 },
          ...statusCol, ...actionCol
        ];
        break;
      case 'agencies':
        colDefs = [
          { headerName: 'ID', field: 'id', width: 70 },
          { headerName: 'Name', field: 'name', minWidth: 200 },
          { headerName: 'Code', field: 'short_code', cellRenderer: p => <code>{p.value || '—'}</code> },
          { headerName: 'Website', field: 'website', cellRenderer: p => p.value ? <a href={p.value} target="_blank" rel="noreferrer" style={{ color:'var(--color-primary)' }}>{p.value}</a> : '—' },
          ...statusCol, ...actionCol
        ];
        break;
      case 'banks':
        colDefs = [
          { headerName: 'ID', field: 'id', width: 70 },
          { headerName: 'Bank Name', field: 'name', minWidth: 200 },
          { headerName: 'Short Name', field: 'short_name' },
          { headerName: 'Added', field: 'created_at', valueFormatter: p => p.value ? p.value.slice(0, 10) : '—' },
          ...actionCol
        ];
        break;
      case 'bank_branches':
        colDefs = [
          { headerName: 'ID', field: 'id', width: 70 },
          { headerName: 'Bank', field: 'bank_id', minWidth: 150, valueGetter: p => p.data.bank?.name || (data.banks?.find(b => b.id === p.data.bank_id)?.name || `Bank ID ${p.data.bank_id}`) },
          { headerName: 'Branch', field: 'branch_name', minWidth: 150 },
          { headerName: 'Code / IFSC', field: 'branch_code', cellRenderer: p => <div><div>{p.value || '—'}</div><div className="text-muted" style={{fontSize:'0.85em'}}>{p.data.ifsc || '—'}</div></div> },
          { headerName: 'Address', field: 'address', flex: 2 },
          ...actionCol
        ];
        break;
      case 'skills':
        colDefs = [
          { headerName: 'ID', field: 'id', width: 70 },
          { headerName: 'Name', field: 'name', minWidth: 200 },
          { headerName: 'Code', field: 'code', cellRenderer: p => <code>{p.value || '—'}</code> },
          { headerName: 'Description', field: 'description', flex: 2 },
          ...actionCol
        ];
        break;
      default: return null;
    }
    
    return <AgTable rowData={allRows} columnDefs={colDefs} pageSize={25} height="70vh" />;
  };


  

  // ══════════════════════════════════════════════════════════════════════════════
  // LOCATION TAB — its own self-contained UI
  // ══════════════════════════════════════════════════════════════════════════════
  const renderLocations = () => {
    const locRows = data[locLevel] || [];
    const curLevel = LOC_LEVELS.find(l => l.key === locLevel);
    const levelIdx = LOC_LEVELS.findIndex(l => l.key === locLevel);

    // Breadcrumb chips showing active filters
    const Breadcrumbs = () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {LOC_LEVELS.slice(0, levelIdx).map((l, i) => {
          const filterId = { states: null, districts: 'state_id', talukas: 'district_id', villages: 'taluka_id' }[l.key];
          const id = filterId ? locFilter[filterId] : null;
          const refList = data[l.key] || [];
          const label = id ? (refList.find(r => r.id === id)?.name || `ID ${id}`) : l.plural;
          return (
            <React.Fragment key={l.key}>
              <button
                onClick={() => { setLocLevel(l.key); }}
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px',
                         padding: '0.25rem 0.75rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                {label}
              </button>
              <ChevronRight size={13} color="var(--color-text-muted)" />
            </React.Fragment>
          );
        })}
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>
          {curLevel?.plural}
        </span>
      </div>
    );

    // Location sub-level tabs
    const LevelTabs = () => (
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
        {LOC_LEVELS.map((l, i) => (
          <button key={l.key}
            onClick={() => { setLocLevel(l.key); setLocMode('list'); }}
            style={{
              padding: '0.4rem 1rem', borderRadius: '6px', fontWeight: locLevel === l.key ? 700 : 400,
              background: locLevel === l.key ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
              color: locLevel === l.key ? '#fff' : 'var(--color-text)', border: 'none', cursor: 'pointer',
              fontSize: '0.82rem',
            }}>
            {l.plural}
            {data[l.key] && <span style={{ marginLeft: '5px', opacity: 0.75, fontSize: '0.72rem' }}>({data[l.key].length})</span>}
          </button>
        ))}
      </div>
    );


    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <LevelTabs />
            <Breadcrumbs />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isAdmin && locMode === 'list' && (
              <button className="btn btn-primary" onClick={openLocCreate}>
                <Plus size={15} /> Add {curLevel?.label}
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={() => loadLocLevel(locLevel)} title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* ── Inline form (NOT a sub-component — avoids remount-on-keystroke) ── */}
        {locMode !== 'list' && (
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>
                {locEditId ? `Edit ${curLevel?.label}` : `Add New ${curLevel?.label}`}
              </h4>
              <button className="btn btn-ghost btn-sm" onClick={() => setLocMode('list')}><X size={15} /></button>
            </div>
            {locFormError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{locFormError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              {/* Name — always */}
              <div className="input-group">
                <label className="input-label">Name *</label>
                <input
                  className="input-field"
                  type="text"
                  value={locForm.name ?? ''}
                  onChange={e => setLocForm(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
              </div>
              {/* Short Name — states only */}
              {locLevel === 'states' && (
                <div className="input-group">
                  <label className="input-label">Short Name</label>
                  <input
                    className="input-field"
                    type="text"
                    maxLength={10}
                    placeholder="e.g. MH"
                    value={locForm.short_name ?? ''}
                    onChange={e => setLocForm(p => ({ ...p, short_name: e.target.value }))}
                  />
                </div>
              )}
              {/* Parent selector for Districts */}
              {locLevel === 'districts' && (
                <div className="input-group">
                  <label className="input-label">State *</label>
                  <select className="input-field" value={locForm.state_id ?? ''} onChange={e => setLocForm(p => ({ ...p, state_id: e.target.value }))}>
                    <option value="">Select…</option>
                    {(data.states || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              {/* Parent selector for Talukas */}
              {locLevel === 'talukas' && (
                <div className="input-group">
                  <label className="input-label">District *</label>
                  <select className="input-field" value={locForm.district_id ?? ''} onChange={e => setLocForm(p => ({ ...p, district_id: e.target.value }))}>
                    <option value="">Select…</option>
                    {(data.districts || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              {/* Parent selector + pincode for Villages */}
              {locLevel === 'villages' && (
                <>
                  <div className="input-group">
                    <label className="input-label">Taluka *</label>
                    <select className="input-field" value={locForm.taluka_id ?? ''} onChange={e => setLocForm(p => ({ ...p, taluka_id: e.target.value }))}>
                      <option value="">Select…</option>
                      {(data.talukas || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Pincode</label>
                    <input className="input-field" type="text" value={locForm.pincode ?? ''} onChange={e => setLocForm(p => ({ ...p, pincode: e.target.value }))} />
                  </div>
                </>
              )}
            </div>
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setLocMode('list')} disabled={locSaving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleLocSave} disabled={locSaving}>
                <Save size={15} /> {locSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {loading
          ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
          : (
            <AgTable 
              rowData={locRows} 
              pageSize={25} 
              height="60vh"
              columnDefs={[
                { headerName: 'ID', field: 'id', width: 70 },
                ...(locLevel === 'states' ? [{ headerName: 'Short', field: 'short_name', width: 100, cellRenderer: p => <code style={{fontSize:'0.8rem'}}>{p.value || '—'}</code> }] : []),
                { headerName: 'Name', field: 'name', minWidth: 200 },
                ...(locLevel === 'villages' ? [{ headerName: 'Pincode', field: 'pincode', width: 120 }] : []),
                ...(locLevel !== 'states' ? [{ headerName: 'Parent', field: 'parentName', valueGetter: p => {
                   if (locLevel === 'districts') return (data.states||[]).find(s => s.id === p.data.state_id)?.name;
                   if (locLevel === 'talukas') return (data.districts||[]).find(d => d.id === p.data.district_id)?.name;
                   if (locLevel === 'villages') return (data.talukas||[]).find(t => t.id === p.data.taluka_id)?.name;
                   return null;
                } }] : []),
                ...(levelIdx < 3 ? [{ headerName: 'Drill Down', field: 'drill', cellRenderer: p => <button className="btn btn-outline btn-sm" onClick={() => drillDown(locLevel, p.data)} style={{ fontSize: '0.75rem', padding: '0 8px', border: 'none', background: 'transparent' }}>View {LOC_LEVELS[levelIdx + 1]?.plural} <ChevronRight size={12} /></button>, width: 150 }] : []),
                ...(isAdmin ? [{ headerName: 'Actions', field: 'actions', pinned: 'right', width: 100, sortable: false, filter: false, cellRenderer: p => <div className="flex-center-gap"><button className="btn btn-outline btn-sm" onClick={() => openLocEdit(p.data)} style={{ padding: '0 4px', minWidth: 'auto', border: 'none', background: 'transparent' }}><Edit2 size={13} /></button><button className="btn btn-outline btn-sm" onClick={() => handleLocDelete(p.data)} style={{ color: 'var(--color-warning)', padding: '0 4px', minWidth: 'auto', border: 'none', background: 'transparent' }}><Trash2 size={13} /></button></div> }] : [])
              ]}
            />
          )
        }
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Masters / Lookup Tables</h1>
          <p className="page-subtitle">Manage reference data for structures, crops, components, area types, banks, and locations.</p>
        </div>
        <div className="flex-center-gap">
          {isAdmin && mode === 'list' && activeTab !== 'locations' && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add {tabLabel}
            </button>
          )}
          <button className="btn btn-outline" onClick={reload}><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.75rem 1.25rem', whiteSpace: 'nowrap',
              fontWeight: activeTab === key ? 700 : 400,
              border: 'none', borderBottom: `2px solid ${activeTab === key ? 'var(--color-primary)' : 'transparent'}`,
              background: 'none', cursor: 'pointer',
              color: activeTab === key ? 'var(--color-primary)' : 'var(--color-text)',
              fontSize: '0.9rem',
            }}>
              <Icon size={15} /> {label}
              {key !== 'locations' && data[key] && (
                <span style={{ fontSize:'0.72rem', background:'rgba(0,0,0,0.07)', borderRadius:'99px', padding:'0 6px', marginLeft:2 }}>
                  {data[key].length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Location tab */}
      {activeTab === 'locations' ? (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
          {renderLocations()}
        </div>
      ) : (
        <>
          {/* Standard-tab add/edit form */}
          {isAdmin && mode !== 'list' ? (
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
                <button className={`tab-btn ${mode === 'add' ? 'active' : ''}`} onClick={() => setMode('add')} disabled={loading}>
                  <Plus size={14} /> Add {tabLabel}
                </button>
                <button className={`tab-btn ${mode === 'edit' ? 'active' : ''}`} onClick={() => setMode('edit')} disabled={loading}>
                  <Edit2 size={14} /> Edit {tabLabel}
                </button>
              </div>
              <h3 style={{ marginBottom: '1.25rem', color: 'var(--color-primary-dark)', fontFamily:'var(--font-display)' }}>
                {mode === 'add' ? `Add New ${tabLabel}` : `Edit ${tabLabel}`}
              </h3>
              {formError && <div className="alert alert-danger">{formError}</div>}
              {renderForm()}
              <div className="form-actions">
                <button className="btn btn-outline" onClick={() => setMode('list')} disabled={saving}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : null}

          {/* Standard-tab list table */}
          <div className="glass-card table-container">
            {error && <div className="alert alert-danger" style={{ margin: '1rem 1.5rem 0' }}>{error}</div>}
            {renderTable()}
            {allRows.length > 0 }
          </div>
        </>
      )}
    </div>
  );
};

export default Masters;
