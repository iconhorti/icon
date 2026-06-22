import { useState, type ChangeEvent, type ComponentType } from 'react';
import { useRequireRole } from '../components/RequireRole';
import { ROLE_SETS } from '../lib/roles';
import { errorMessage } from '../lib/logger';
import { useContractors, useSkills, useInvalidateContractors } from '../hooks/useContractors';
import { useRoleKpis } from '../hooks/useRoleKpis';
import { useTranslation } from '../i18n/useTranslation';
import { RefreshCw, Edit2, Ban, CheckCircle, X, Save, Plus, ChevronRight,
         Users, HardHat, Wrench, Activity, Award, type LucideProps } from 'lucide-react';
import { createUser, updateUser,
         assignSkillToContractor, removeSkillFromContractor } from '../api/client';
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

// ─── Shared sub-components ─────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = '#6366f1', bg = '#eef2ff' }: KpiCardProps) => (
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
      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 500,
                  textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</h3>
      {sub && <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>{sub}</p>}
    </div>
  </div>
);

const HBar = ({ label, value, max, color = '#6366f1', suffix = '' }: { label: string; value: any; max: number; color?: string; suffix?: string }) => (
  <div style={{ marginBottom: '0.65rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ fontSize: '0.78rem', color: '#475569' }}>{label}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>{value}{suffix}</span>
    </div>
    <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min((value / (max || 1)) * 100, 100)}%`,
                    background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
    </div>
  </div>
);

// ─── Contractor KPI Panel ─────────────────────────────────────────────────────────────
const ContractorKpiPanel = ({ kpis }: { kpis: any }) => {
  if (!kpis) return null;
  const typeMax  = Math.max(...(kpis.type_breakdown?.map((t: any) => t.contractors) || [1]), 1);
  const assignMax = Math.max(...(kpis.type_breakdown?.map((t: any) => t.assignments) || [1]), 1);
  const skillMax = Math.max(...(kpis.skill_breakdown?.map((s: any) => s.count) || [1]), 1);

  const TYPE_COLORS: Record<string, string> = {
    'Structure':  '#6366f1',
    'Drip':       '#0ea5e9',
    'Bed':        '#22c55e',
    'Plantation': '#f59e0b',
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* KPI Strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <KpiCard icon={Users}     label="Total Contractors"   value={kpis.total_contractors}    color="#6366f1" bg="#eef2ff" />
        <KpiCard icon={CheckCircle} label="Active"           value={kpis.active_contractors}   color="#22c55e" bg="#f0fdf4" />
        <KpiCard icon={Ban}       label="Inactive"           value={kpis.inactive_contractors}  color="#f59e0b" bg="#fffbeb" />
        <KpiCard icon={Activity}  label="Active Assignments" value={kpis.active_assignments}    color="#0ea5e9" bg="#e0f2fe"
                 sub={`${kpis.total_assignments} total`} />
        <KpiCard icon={Award}     label="Completed Jobs"     value={kpis.completed_assignments} color="#22c55e" bg="#f0fdf4" />
        <KpiCard icon={HardHat}   label="Skill Coverage"     value={kpis.contractors_with_skill} color="#8b5cf6" bg="#f5f3ff"
                 sub={`${kpis.total_skill_assignments} skill tags`} />
      </div>

      {/* Detail cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>

        {/* Workforce by type */}
        <div className="glass-card p-4">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b',
                       display: 'flex', alignItems: 'center', gap: 6 }}>
            <HardHat size={15} color="#6366f1" /> Workforce by Type
          </h3>
          {kpis.type_breakdown?.map((t: any) => (
            <HBar
              key={t.type}
              label={t.type}
              value={t.contractors}
              max={typeMax}
              color={TYPE_COLORS[t.type] || '#6366f1'}
            />
          ))}
        </div>

        {/* Project assignments per type */}
        <div className="glass-card p-4">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b',
                       display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={15} color="#0ea5e9" /> Project Assignments by Type
          </h3>
          {kpis.type_breakdown?.map((t: any) => (
            <HBar
              key={t.type}
              label={t.type}
              value={t.assignments}
              max={assignMax}
              color={TYPE_COLORS[t.type] || '#0ea5e9'}
            />
          ))}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9',
                        display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
            <span style={{ color: '#64748b' }}>Active assignments</span>
            <span style={{ fontWeight: 700, color: '#0ea5e9' }}>{kpis.active_assignments}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: 4 }}>
            <span style={{ color: '#64748b' }}>Completed jobs</span>
            <span style={{ fontWeight: 700, color: '#22c55e' }}>{kpis.completed_assignments}</span>
          </div>
        </div>

        {/* Top skills in use */}
        <div className="glass-card p-4">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b',
                       display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wrench size={15} color="#8b5cf6" /> Top Skills in Use
          </h3>
          {kpis.skill_breakdown?.length > 0
            ? kpis.skill_breakdown.map((s: any) => (
                <HBar key={s.skill} label={s.skill} value={s.count} max={skillMax} color="#8b5cf6" />
              ))
            : <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No skills assigned yet.</p>}
        </div>

      </div>
    </div>
  );
};

const CONTRACTOR_ROLES = [
  { value: 'structure_contractor',    label: 'Structure Contractor' },
  { value: 'drip_contractor',          label: 'Drip Irrigation' },
  { value: 'bed_contractor',          label: 'Bed Preparation' },
  { value: 'plantation_contractor',    label: 'Plantation' },
];

const ROLE_COLORS = {
  structure_contractor:  'badge-info',
  drip_contractor:        'badge-warning',
  bed_contractor:        'badge-success',
  plantation_contractor:  'badge-secondary',
};

const EMPTY_FORM = {
  first_name: '', last_name: '', role: 'structure_contractor',
  phone_primary: '', email: '', firm_name: '',
  district: '', state: '', new_password: '',
};

const ContractorsManagement = () => {
  // Guard: admin, owner, office_staff, project_manager only
  const denied = useRequireRole(ROLE_SETS.EXTENDED_STAFF);
  if (denied) return denied;

  const { toast } = useToast();
  const { t } = useTranslation();
  const [roleFilter, setRoleFilter] = useState<string>('');

  // ── Server state via TanStack Query ──
  const { data: cData, isLoading: loading, error: queryError, refetch } = useContractors(roleFilter || undefined);
  const { data: allSkills = [] } = useSkills();
  const { data: kpis = null } = useRoleKpis('contractor');
  const invalidateContractors = useInvalidateContractors();
  const contractors = cData?.contractors ?? [];
  const contractorSkillIds = cData?.skillMap ?? {};
  const error = queryError ? errorMessage(queryError, 'Failed to load contractors.') : '';
  const loadContractors = () => { refetch(); };

  const [activeTab, setActiveTab] = useState<string>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, any>>(EMPTY_FORM);
  const [selectedSkillIds, setSelectedSkillIds] = useState<any[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');


  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSelectedSkillIds([]);
    setFormError('');
    setActiveTab('add');
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      first_name: c.first_name||'', last_name: c.last_name||'', role: c.role,
      phone_primary: c.phone_primary||'', email: c.email||'', firm_name: c.firm_name||'',
      district: c.district||'', state: c.state||'', new_password: '',
    });
    const existing = contractorSkillIds[c.id] || [];
    setSelectedSkillIds(existing.map((cs: any) => cs.skill_id));
    setFormError('');
    setActiveTab('edit');
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const toggleSkill = (skillId: any) => {
    setSelectedSkillIds(prev =>
      prev.includes(skillId) ? prev.filter((id: any) => id !== skillId) : [...prev, skillId]
    );
  };

  const handleSave = async (): Promise<void> => {
    if (!form.first_name.trim()) { setFormError('First name is required.'); return; }
    if (!editId && !form.phone_primary.trim()) { setFormError('Phone is required.'); return; }
    setSaving(true); setFormError('');
    try {
      if (editId) {
        const payload: Record<string, any> = {};
        Object.entries(form).forEach(([k, v]) => { if (k !== 'phone_primary' && v !== '') payload[k] = v; });
        await updateUser(editId, payload);
        const existing = contractorSkillIds[editId] || [];
        const existingIds = existing.map((cs: any) => cs.skill_id);
        const toAdd = selectedSkillIds.filter((id: any) => !existingIds.includes(id));
        const toRemove = existing.filter((cs: any) => !selectedSkillIds.includes(cs.skill_id));
        await Promise.all([
          ...toAdd.map((sid: any) => assignSkillToContractor({ contractor_id: editId, skill_id: sid } as any)),
          ...toRemove.map((cs: any) => removeSkillFromContractor(cs.id)),
        ]);
      } else {
        const created: any = await createUser({ ...form } as any);
        await Promise.all(selectedSkillIds.map((sid: any) =>
          assignSkillToContractor({ contractor_id: created.id, skill_id: sid } as any)
        ));
      }
      setActiveTab('list');
      invalidateContractors();
    } catch (err) { setFormError(errorMessage(err, 'Save failed.')); }
    finally { setSaving(false); }
  };

  const handleToggle = async (c: any): Promise<void> => {
    if (!window.confirm(`${c.is_active ? 'Suspend' : 'Reactivate'} ${c.first_name}?`)) return;
    try { await updateUser(c.id, { is_active: c.is_active ? 0 : 1 } as any); invalidateContractors(); }
    catch (err) { toast(errorMessage(err, 'Failed.'), 'error'); }
  };

  const closeForm = () => { setActiveTab('list'); setEditId(null); setFormError(''); };

  const getContractorSkillNames = (contractorId: any) => {
    const skills = contractorSkillIds[contractorId] || [];
    return skills.map((cs: any) => cs.skill?.name).filter(Boolean);
  };

  const renderForm = () => (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '1.3rem' }}>{editId ? 'Edit Contractor' : 'Add New Contractor'}</h2>
          <p className="page-subtitle">{editId ? 'Update details and skills' : 'Register a new contractor'}</p>
        </div>
        <button className="btn btn-outline" onClick={closeForm}><X size={16} /> Back</button>
      </div>
      {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}
      <div className="form-grid">
        <div className="form-group"><label className="form-label">{t('field.firstName')} *</label><input className="input-field" name="first_name" value={form.first_name} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{t('field.lastName')}</label><input className="input-field" name="last_name" value={form.last_name} onChange={handleChange} /></div>
        <div className="form-group">
          <label className="form-label">Contractor Type *</label>
          <select className="input-field" name="role" value={form.role} onChange={handleChange} disabled={!!editId}>
            {CONTRACTOR_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Phone {!editId && '*'}</label>
          <input className="input-field" name="phone_primary" value={form.phone_primary} onChange={handleChange} disabled={!!editId} />
        </div>
        <div className="form-group"><label className="form-label">{t('field.email')}</label><input className="input-field" name="email" value={form.email} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">Firm Name</label><input className="input-field" name="firm_name" value={form.firm_name} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{t('field.district')}</label><input className="input-field" name="district" value={form.district} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{t('field.state')}</label><input className="input-field" name="state" value={form.state} onChange={handleChange} /></div>
        {!editId && <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Password</label><input className="input-field" name="new_password" value={form.new_password} onChange={handleChange} placeholder="Leave blank for default (icon123)" /></div>}
      </div>

      <div className="form-section" style={{ marginTop: '1.5rem' }}>
        <div className="form-section-title">Skills (select one or more)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {allSkills.map((skill: any) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => toggleSkill(skill.id)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${selectedSkillIds.includes(skill.id) ? 'var(--color-primary)' : 'rgba(0,0,0,0.15)'}`,
                background: selectedSkillIds.includes(skill.id) ? 'rgba(26,71,42,0.08)' : 'white',
                color: selectedSkillIds.includes(skill.id) ? 'var(--color-primary)' : 'var(--color-text)',
                cursor: 'pointer',
                fontWeight: selectedSkillIds.includes(skill.id) ? 600 : 400,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'var(--transition)',
              }}
            >
              {selectedSkillIds.includes(skill.id) ? (
                <CheckCircle size={14} />
              ) : (
                <Plus size={14} />
              )}
              {skill.name}
            </button>
          ))}
          {allSkills.length === 0 && (
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>No skills found. Create skills in Masters first.</p>
          )}
        </div>
        {selectedSkillIds.length > 0 && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {selectedSkillIds.length} skill(s) selected
          </p>
        )}
      </div>

      <div className="form-actions">
        <button className="btn btn-outline" onClick={closeForm} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏗️ {t('contractors.title')}</h1>
          <p className="page-subtitle">{t('contractors.subtitle')}</p>
        </div>
      </div>

      {/* Contractor KPI Panel */}
      <ContractorKpiPanel kpis={kpis} />

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>{t('common.listView')}</button>
        <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => openCreate()}><Plus size={14} /> {t('contractors.add')}</button>
        {editId && activeTab === 'edit' && (
          <button className="tab-btn active"><ChevronRight size={14} /> Edit Contractor</button>
        )}
      </div>

      {activeTab === 'list' ? (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderBottom: '1px solid var(--glass-border)' }}>
              <select className="input-field filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                <option value="">All Types</option>
                {CONTRACTOR_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button className="btn btn-outline btn-sm" onClick={loadContractors}><RefreshCw size={14} /></button>
            </div>
            <AgTable
              exportFileName="contractors"
              rowData={contractors}
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
                { headerName: t('col.type'), field: 'role', cellRenderer: (p: any) => <span className={`badge ${(ROLE_COLORS as Record<string,string>)[p.value] || 'badge-secondary'}`}>{CONTRACTOR_ROLES.find(r => r.value === p.value)?.label || p.value}</span> },
                { headerName: t('col.skills'), valueGetter: (p: any) => (getContractorSkillNames(p.data.id) || []).join(', ') || '—' },
                { headerName: t('col.phone'), field: 'phone_primary' },
                { headerName: t('col.firm'), field: 'firm_name', valueFormatter: (p: any) => p.value || '—' },
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

export default ContractorsManagement;
