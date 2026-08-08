import { Fragment, useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useRequireRole } from '../components/RequireRole';
import { ROLE_SETS, hasRole } from '../lib/roles';
import { qk } from '../lib/queryClient';
import { useLookup, useLocationLevel } from '../hooks/useMasters';
import { useTranslation } from '../i18n/useTranslation';
import { RefreshCw, Building2, Landmark, Banknote, Wrench, Cpu, MapPin,
         Plus, Edit2, Trash2, X, Save, ChevronRight } from 'lucide-react';
import {
  createComponent, updateComponent, deleteComponent,
  createAreaType, updateAreaType, deleteAreaType,
  createAgency, updateAgency, deleteAgency,
  createBank, updateBank, deleteBank,
  createBankBranch, updateBankBranch, deleteBankBranch,
  createSkill, updateSkill, deleteSkill,
  // Location CRUD
  createState, updateState, deleteState,
  createDistrict, updateDistrict, deleteDistrict,
  createTaluka, updateTaluka, deleteTaluka,
  createVillage, updateVillage, deleteVillage,
} from '../api/client';
import AgTable from '../components/AgTable';
import Badge from '../components/Badge';
import type { ColDef } from 'ag-grid-community';
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

const EMPTY: Record<string, any> = {
  components:    { component_type: 'Structure', name: '', category: '', variant_code: '', unit: 'SQM', eligible_cost_per_unit: '', subsidy_rate_per_unit: '', unit_type: '', min_qty: '', max_qty: '', default_qty: '', is_subsidy_eligible: 1, is_active: 1, description: '' },
  area_types:    { name: '', description: '', multiplier: 1.0, is_active: 1 },
  agencies:      { name: '', short_code: '', description: '', website: '', is_active: 1 },
  banks:         { name: '', short_name: '' },
  bank_branches: { bank_id: '', branch_name: '', branch_code: '', ifsc: '', address: '', phone: '', email: '' },
  skills:        { name: '', code: '', description: '' },
};

const NUMERIC_FIELDS = new Set([
  'eligible_cost_per_unit', 'subsidy_rate_per_unit', 'min_qty', 'max_qty',
  'default_qty', 'multiplier', 'bank_id', 'is_active', 'is_subsidy_eligible',
]);

/** Optional text fields that may be cleared to null on edit. */
const NULLABLE_TEXT: Record<string, Set<string>> = {
  components:    new Set(['category', 'variant_code', 'unit_type', 'description']),
  area_types:    new Set(['description']),
  agencies:      new Set(['short_code', 'description', 'website']),
  banks:         new Set(['short_name']),
  bank_branches: new Set(['branch_code', 'ifsc', 'address', 'phone', 'email']),
  skills:        new Set(['code', 'description']),
};

function buildMasterPayload(tab: string, form: Record<string, any>, isEdit: boolean): Record<string, any> {
  const payload: Record<string, any> = {};
  const nullable = NULLABLE_TEXT[tab] ?? new Set<string>();
  for (const key of Object.keys(EMPTY[tab] ?? {})) {
    let value = form[key];
    if (typeof value === 'string') value = value.trim();
    if (value === '' || value === undefined) {
      if (isEdit && nullable.has(key)) payload[key] = null;
      continue;
    }
    payload[key] = NUMERIC_FIELDS.has(key) ? Number(value) : value;
  }
  return payload;
}

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
  const isAdmin = hasRole(currentUser?.role, ROLE_SETS.ADMIN_OWNER);

  // Guard: only admin / owner may access this page
  const denied = useRequireRole(ROLE_SETS.ADMIN_OWNER);
  if (denied) return denied;

  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [activeTab, setActiveTab]   = useState<string>('components');

  const [mode, setMode]             = useState<string>('list');
  const [editId, setEditId]         = useState<number | null>(null);
  const [form, setForm]             = useState<Record<string, any>>({});
  const [saving, setSaving]         = useState<boolean>(false);
  const [formError, setFormError]   = useState<string>('');

  // ── Location sub‑state ──────────────────────────────────────────────────────
  const [locLevel, setLocLevel]         = useState<string>('states');   // which level is active
  const [locFilter, setLocFilter]       = useState<Record<string, any>>({});         // { district_id: 3, taluka_id: 5, … }
  const [locForm, setLocForm]           = useState<Record<string, any>>({});
  const [locEditId, setLocEditId]       = useState<number | null>(null);
  const [locMode, setLocMode]           = useState<string>('list');     // list | add | edit
  const [locSaving, setLocSaving]       = useState<boolean>(false);
  const [locFormError, setLocFormError] = useState<string>('');

  const formRef = useRef<HTMLDivElement | null>(null);

  const isLocations = activeTab === 'locations';

  // ── Location CRUD map (reads handled by TanStack Query below) ────────────────
  const LOC_API: Record<string, any> = {
    states:    { create: createState,    update: updateState,    del: deleteState },
    districts: { create: createDistrict, update: updateDistrict, del: deleteDistrict },
    talukas:   { create: createTaluka,   update: updateTaluka,   del: deleteTaluka },
    villages:  { create: createVillage,  update: updateVillage,  del: deleteVillage },
  };

  // ── Server state via TanStack Query ──────────────────────────────────────────
  const lookupQ = useLookup(activeTab, !isLocations);
  const banksQ  = useLookup('banks', true); // always loaded (branch dropdown + count)

  const statesQ    = useLocationLevel('states',    {},                                    isLocations);
  const districtsQ = useLocationLevel('districts', { state_id: locFilter.state_id },       isLocations && !!locFilter.state_id);
  const talukasQ   = useLocationLevel('talukas',   { district_id: locFilter.district_id }, isLocations && !!locFilter.district_id);
  const villagesQ  = useLocationLevel('villages',  { taluka_id: locFilter.taluka_id },     isLocations && !!locFilter.taluka_id);
  const locQ: Record<string, any> = { states: statesQ, districts: districtsQ, talukas: talukasQ, villages: villagesQ };

  // Assemble the `data` map the JSX reads. Counts for previously visited standard
  // tabs are recovered from the query cache so they persist across tab switches.
  const data: Record<string, any> = useMemo(() => {
    const d: Record<string, any> = {};
    ['components', 'area_types', 'agencies', 'banks', 'bank_branches', 'skills'].forEach(tab => {
      const cached = qc.getQueryData(qk.lookup(tab));
      if (cached) d[tab] = cached;
    });
    if (lookupQ.data) d[activeTab] = lookupQ.data;
    if (banksQ.data)  d.banks = banksQ.data;
    d.states = statesQ.data; d.districts = districtsQ.data; d.talukas = talukasQ.data; d.villages = villagesQ.data;
    return d;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, activeTab, lookupQ.data, banksQ.data, statesQ.data, districtsQ.data, talukasQ.data, villagesQ.data]);

  const loading = isLocations ? !!locQ[locLevel]?.isLoading : lookupQ.isLoading;
  const error = isLocations
    ? (locQ[locLevel]?.error ? `Failed to load ${locLevel}.` : '')
    : (lookupQ.error ? `Failed to load ${activeTab}.` : '');

  // Reset form mode whenever the active tab changes
  useEffect(() => { setMode('list'); setLocMode('list'); }, [activeTab]);

  const reload = () => {
    if (isLocations) { qc.invalidateQueries({ queryKey: ['locations'] }); return; }
    qc.invalidateQueries({ queryKey: qk.lookup(activeTab) });
  };

  // ── Standard save/delete ────────────────────────────────────────────────────
  const CREATORS: Record<string, any> = { components: createComponent, area_types: createAreaType, agencies: createAgency, banks: createBank, bank_branches: createBankBranch, skills: createSkill };
  const UPDATERS: Record<string, any> = { components: updateComponent, area_types: updateAreaType, agencies: updateAgency, banks: updateBank, bank_branches: updateBankBranch, skills: updateSkill };
  const DELETERS: Record<string, any> = { components: deleteComponent, area_types: deleteAreaType, agencies: deleteAgency, banks: deleteBank, bank_branches: deleteBankBranch, skills: deleteSkill };

  const openCreate = () => { setEditId(null); setForm({ ...EMPTY[activeTab] }); setFormError(''); setMode('add'); };

  const openEdit = (item: any) => {
    setEditId(item.id);
    const blank = EMPTY[activeTab];
    const filled: Record<string, any> = {};
    Object.keys(blank).forEach(k => { filled[k] = item[k] !== undefined && item[k] !== null ? item[k] : blank[k]; });
    setForm(filled); setFormError(''); setMode('edit');
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setForm(p => ({ ...p, [name]: value })); };

  const handleSave = async (): Promise<void> => {
    if (activeTab === 'bank_branches') {
      if (!String(form.branch_name ?? '').trim()) {
        setFormError('Branch name is required.');
        return;
      }
      if (!form.bank_id) {
        setFormError('Please select a bank.');
        return;
      }
    } else if (!String(form.name ?? '').trim()) {
      setFormError('Name is required.');
      return;
    }
    setSaving(true); setFormError('');
    const payload = buildMasterPayload(activeTab, form, !!editId);
    try {
      if (editId) await UPDATERS[activeTab](editId, payload);
      else        await CREATORS[activeTab](payload);
      setMode('list');
      await qc.refetchQueries({ queryKey: qk.lookup(activeTab) });
      if (activeTab === 'bank_branches') await qc.refetchQueries({ queryKey: qk.lookup('banks') });
      toast(`${tabLabel} saved.`, 'success');
    } catch (err: any) { setFormError(err.response?.data?.detail || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: any): Promise<void> => {
    const label = item.name || item.branch_name || `ID ${item.id}`;
    if (!DELETERS[activeTab]) { toast('Delete not supported for this tab.', 'info'); return; }
    if (!window.confirm(`Delete "${label}"?`)) return;
    try {
      await DELETERS[activeTab](item.id);
      qc.invalidateQueries({ queryKey: qk.lookup(activeTab) });
    } catch (err: any) { toast(err.response?.data?.detail || 'Delete failed.', 'error'); }
  };

  // ── Location CRUD handlers ──────────────────────────────────────────────────
  const openLocCreate = () => {
    const defaults: Record<string, any> = {};
    if (locLevel === 'districts') defaults.state_id = locFilter.state_id ? Number(locFilter.state_id) : '';
    if (locLevel === 'talukas')   defaults.district_id = locFilter.district_id ? Number(locFilter.district_id) : '';
    if (locLevel === 'villages')  defaults.taluka_id = locFilter.taluka_id ? Number(locFilter.taluka_id) : '';
    setLocEditId(null); setLocForm({ name: '', pincode: '', ...defaults }); setLocFormError(''); setLocMode('add');
  };

  const openLocEdit = (item: any) => {
    setLocEditId(item.id);
    setLocForm({ name: item.name || '', short_name: item.short_name || '', pincode: item.pincode || '',
                 state_id: item.state_id || '', district_id: item.district_id || '', taluka_id: item.taluka_id || '' });
    setLocFormError(''); setLocMode('edit');
  };

  const handleLocSave = async (): Promise<void> => {
    if (!locForm.name?.trim()) { setLocFormError('Name is required.'); return; }
    setLocSaving(true); setLocFormError('');
    const api = LOC_API[locLevel];
    const payload: Record<string, any> = { name: locForm.name.trim() };
    if (locLevel === 'states') payload.short_name = locForm.short_name?.trim() || null;
    if (locLevel === 'districts') payload.state_id    = Number(locForm.state_id);
    if (locLevel === 'talukas')   payload.district_id = Number(locForm.district_id);
    if (locLevel === 'villages')  { payload.taluka_id = Number(locForm.taluka_id); if (locForm.pincode) payload.pincode = locForm.pincode; }
    try {
      if (locEditId) await api.update(locEditId, payload);
      else           await api.create(payload);
      setLocMode('list');
      await qc.refetchQueries({ queryKey: ['locations'] });
      const levelLabel = LOC_LEVELS.find(l => l.key === locLevel)?.label ?? 'Location';
      toast(`${levelLabel} saved.`, 'success');
    } catch (err: any) { setLocFormError(err.response?.data?.detail || 'Save failed.'); }
    finally { setLocSaving(false); }
  };

  const handleLocDelete = async (item: any): Promise<void> => {
    if (!window.confirm(`Delete "${item.name}"? This will also remove all child records.`)) return;
    try { await LOC_API[locLevel].del(item.id); qc.invalidateQueries({ queryKey: ['locations'] }); }
    catch (err: any) { toast(err.response?.data?.detail || 'Delete failed. Ensure no child records exist.', 'error'); }
  };

  // ── Drill-down: click a row to filter next level ────────────────────────────
  const drillDown = (level: string, item: any) => {
    if (level === 'states') {
      setLocFilter({ state_id: item.id }); setLocLevel('districts');
    } else if (level === 'districts') {
      setLocFilter(f => ({ ...f, district_id: item.id })); setLocLevel('talukas');
    } else if (level === 'talukas') {
      setLocFilter(f => ({ ...f, taluka_id: item.id })); setLocLevel('villages');
    }
  };

  const allRows = isLocations ? (data[locLevel] || []) : (lookupQ.data ?? []);
  const tabLabel = TABS.find((t: any) => t.key === activeTab)?.label?.replace(/s$/, '') || activeTab;

  // ── Form renderers ──────────────────────────────────────────────────────────
  const ig = (label: string, field: string, type: string = 'text', required: boolean = false) => (
    <div className="input-group">
      <label className="input-label">{label}{required && ' *'}</label>
      <input className="input-field" name={field} type={type} value={form[field] ?? ''} onChange={handleChange} />
    </div>
  );
  const sg = (label: string, field: string, options: any[]) => (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <select className="input-field" name={field} value={form[field] ?? ''} onChange={handleChange}>
        {options.map((o: any) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
  const tg = (label: string, field: string) => (
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
            {sg('Bank *', 'bank_id', [{value:'',label:'Select Bank...'}].concat((data.banks||[]).map((b: any) => ({value:b.id, label:b.name}))))}
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
  const StatusBadge = ({ val }: { val: any }) => val
    ? <Badge tone="success">Active</Badge>
    : <Badge tone="danger">Inactive</Badge>;

  const renderTable = () => {
    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>;

    const actionCol = isAdmin ? [{
      headerName: t('col.actions'), field: 'actions', pinned: 'right', width: 100, sortable: false, filter: false,
      cellRenderer: (params: any) => {
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
      headerName: t('col.status'), field: 'is_active', width: 100,
      cellRenderer: (params: any) => <StatusBadge val={params.value} />
    }];

    let colDefs: any[] = [];
    switch (activeTab) {
      case 'components':
        colDefs = [
          { headerName: t('col.id'), field: 'id', width: 70 },
          { headerName: t('col.type'), field: 'component_type', width: 120, cellRenderer: (p: any) => <Badge tone="neutral">{p.value}</Badge> },
          { headerName: t('col.name'), field: 'name', minWidth: 200 },
          { headerName: 'Category', field: 'category' },
          { headerName: 'Unit', field: 'unit', width: 90 },
          { headerName: 'Eligible/Unit ₹', field: 'eligible_cost_per_unit', valueFormatter: (p: any) => p.value ? `₹${p.value.toLocaleString()}` : '₹0' },
          { headerName: 'Subsidy/Unit ₹', field: 'subsidy_rate_per_unit', valueFormatter: (p: any) => p.value ? `₹${p.value.toLocaleString()}` : '₹0' },
          { headerName: 'Min', field: 'min_qty', width: 90 },
          { headerName: 'Max', field: 'max_qty', width: 90 },
          { headerName: 'Default', field: 'default_qty', width: 90 },
          ...statusCol, ...actionCol
        ];
        break;
      case 'area_types':
        colDefs = [
          { headerName: t('col.id'), field: 'id', width: 70 },
          { headerName: t('col.name'), field: 'name', minWidth: 200 },
          { headerName: 'Multiplier', field: 'multiplier', width: 120, cellRenderer: (p: any) => <Badge tone="financial">{p.value}×</Badge> },
          { headerName: 'Description', field: 'description', flex: 2 },
          ...statusCol, ...actionCol
        ];
        break;
      case 'agencies':
        colDefs = [
          { headerName: t('col.id'), field: 'id', width: 70 },
          { headerName: t('col.name'), field: 'name', minWidth: 200 },
          { headerName: 'Code', field: 'short_code', cellRenderer: (p: any) => <code>{p.value || '—'}</code> },
          { headerName: 'Website', field: 'website', cellRenderer: (p: any) => p.value ? <a href={p.value} target="_blank" rel="noreferrer" style={{ color:'var(--color-primary)' }}>{p.value}</a> : '—' },
          ...statusCol, ...actionCol
        ];
        break;
      case 'banks':
        colDefs = [
          { headerName: t('col.id'), field: 'id', width: 70 },
          { headerName: 'Bank Name', field: 'name', minWidth: 200 },
          { headerName: 'Short Name', field: 'short_name' },
          { headerName: 'Added', field: 'created_at', valueFormatter: (p: any) => p.value ? p.value.slice(0, 10) : '—' },
          ...actionCol
        ];
        break;
      case 'bank_branches':
        colDefs = [
          { headerName: t('col.id'), field: 'id', width: 70 },
          { headerName: t('col.bank'), field: 'bank_id', minWidth: 150, valueGetter: (p: any) => p.data.bank?.name || (data.banks?.find((b: any) => b.id === p.data.bank_id)?.name || `Bank ID ${p.data.bank_id}`) },
          { headerName: t('col.branch'), field: 'branch_name', minWidth: 150 },
          { headerName: 'Code / IFSC', field: 'branch_code', cellRenderer: (p: any) => <div><div>{p.value || '—'}</div><div className="text-muted" style={{fontSize:'0.85em'}}>{p.data.ifsc || '—'}</div></div> },
          { headerName: 'Address', field: 'address', flex: 2 },
          ...actionCol
        ];
        break;
      case 'skills':
        colDefs = [
          { headerName: t('col.id'), field: 'id', width: 70 },
          { headerName: t('col.name'), field: 'name', minWidth: 200 },
          { headerName: 'Code', field: 'code', cellRenderer: (p: any) => <code>{p.value || '—'}</code> },
          { headerName: 'Description', field: 'description', flex: 2 },
          ...actionCol
        ];
        break;
      default: return null;
    }
    
    return <AgTable rowData={allRows} columnDefs={colDefs as ColDef[]} pageSize={25} height="70vh" exportFileName={activeTab} />;
  };


  

  // ══════════════════════════════════════════════════════════════════════════════
  // LOCATION TAB — its own self-contained UI
  // ══════════════════════════════════════════════════════════════════════════════
  const renderLocations = () => {
    const locRows = data[locLevel] || [];
    const curLevel = LOC_LEVELS.find((l: any) => l.key === locLevel);
    const levelIdx = LOC_LEVELS.findIndex((l: any) => l.key === locLevel);

    // Breadcrumb chips showing active filters
    const Breadcrumbs = () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {LOC_LEVELS.slice(0, levelIdx).map((l: any, _i: number) => {
          const filterId = ({ states: null, districts: 'state_id', talukas: 'district_id', villages: 'taluka_id' } as Record<string, any>)[l.key];
          const id = filterId ? locFilter[filterId] : null;
          const refList = data[l.key] || [];
          const label = id ? (refList.find((r: any) => r.id === id)?.name || `ID ${id}`) : l.plural;
          return (
            <Fragment key={l.key}>
              <button
                onClick={() => { setLocLevel(l.key); }}
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px',
                         padding: '0.25rem 0.75rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                {label}
              </button>
              <ChevronRight size={13} color="var(--color-text-muted)" />
            </Fragment>
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
        {LOC_LEVELS.map((l: any, _i: number) => (
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
            <button className="btn btn-outline btn-sm" onClick={() => qc.invalidateQueries({ queryKey: ['locations'] })} title="Refresh">
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
                    {(data.states || []).map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              {/* Parent selector for Talukas */}
              {locLevel === 'talukas' && (
                <div className="input-group">
                  <label className="input-label">District *</label>
                  <select className="input-field" value={locForm.district_id ?? ''} onChange={e => setLocForm(p => ({ ...p, district_id: e.target.value }))}>
                    <option value="">Select…</option>
                    {(data.districts || []).map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
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
                      {(data.talukas || []).map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
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
              exportFileName={locLevel}
              rowData={locRows} 
              pageSize={25} 
              height="60vh"
              columnDefs={([
                { headerName: t('col.id'), field: 'id', width: 70 },
                ...(locLevel === 'states' ? [{ headerName: 'Short', field: 'short_name', width: 100, cellRenderer: (p: any) => <code style={{fontSize:'0.8rem'}}>{p.value || '—'}</code> }] as ColDef[] : []),
                { headerName: t('col.name'), field: 'name', minWidth: 200 },
                ...(locLevel === 'villages' ? [{ headerName: 'Pincode', field: 'pincode', width: 120 }] as ColDef[] : []),
                ...(locLevel !== 'states' ? [{ headerName: 'Parent', field: 'parentName', valueGetter: (p: any) => {
                   if (locLevel === 'districts') return (data.states||[]).find((s: any) => s.id === p.data.state_id)?.name;
                   if (locLevel === 'talukas') return (data.districts||[]).find((d: any) => d.id === p.data.district_id)?.name;
                   if (locLevel === 'villages') return (data.talukas||[]).find((t: any) => t.id === p.data.taluka_id)?.name;
                   return null;
                } }] as ColDef[] : []),
                ...(levelIdx < 3 ? [{ headerName: 'Drill Down', field: 'drill', cellRenderer: (p: any) => <button className="btn btn-outline btn-sm" onClick={() => drillDown(locLevel, p.data)} style={{ fontSize: '0.75rem', padding: '0 8px', border: 'none', background: 'transparent' }}>View {LOC_LEVELS[levelIdx + 1]?.plural} <ChevronRight size={12} /></button>, width: 150 }] as ColDef[] : []),
                ...(isAdmin ? [{ headerName: t('col.actions'), field: 'actions', pinned: 'right' as const, width: 100, sortable: false, filter: false, cellRenderer: (p: any) => <div className="flex-center-gap"><button className="btn btn-outline btn-sm" onClick={() => openLocEdit(p.data)} style={{ padding: '0 4px', minWidth: 'auto', border: 'none', background: 'transparent' }}><Edit2 size={13} /></button><button className="btn btn-outline btn-sm" onClick={() => handleLocDelete(p.data)} style={{ color: 'var(--color-warning)', padding: '0 4px', minWidth: 'auto', border: 'none', background: 'transparent' }}><Trash2 size={13} /></button></div> }] as ColDef[] : [])
              ] as any) as ColDef[]}
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
            <div ref={formRef} className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
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
          </div>
        </>
      )}
    </div>
  );
};

export default Masters;
