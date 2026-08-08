import { type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { ArrowRight, Building2, MapPin, Landmark, Users, UserCheck, X } from 'lucide-react';
import LocationPicker from '../LocationPicker';
import LandRegistrySection, {
  type LandParcelRow, type LandOwnerRow, type LandRegistryMeta,
} from './LandRegistrySection';

interface ProjectFormDetailsProps {
  form: Record<string, any>;
  setForm: Dispatch<SetStateAction<Record<string, any>>>;
  isEditMode: boolean;
  userRole: string;
  lookups: Record<string, any[]>;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  coApplicants: string[];
  toggleCoApplicant: (fid: string) => void;
  coAppSearch: string;
  setCoAppSearch: (val: string) => void;
  coAppDropdownOpen: boolean;
  setCoAppDropdownOpen: (open: boolean) => void;
  branches: any[];
  canEditRates: boolean;
  navigate: (delta: number) => void;
  setActiveTab: (tab: string) => void;
  landMeta: LandRegistryMeta;
  setLandMeta: Dispatch<SetStateAction<LandRegistryMeta>>;
  landParcels: LandParcelRow[];
  setLandParcels: Dispatch<SetStateAction<LandParcelRow[]>>;
  landOwners: LandOwnerRow[];
  setLandOwners: Dispatch<SetStateAction<LandOwnerRow[]>>;
}

export default function ProjectFormDetails({
  form, setForm, isEditMode, userRole, lookups, handleChange,
  coApplicants, toggleCoApplicant, coAppSearch, setCoAppSearch,
  coAppDropdownOpen, setCoAppDropdownOpen, branches, canEditRates,
  navigate, setActiveTab, landMeta, setLandMeta, landParcels, setLandParcels, landOwners, setLandOwners,
}: ProjectFormDetailsProps) {
  const coApplicantOptions = (lookups?.farmers || []).filter(
    (f: any) => String(f.id || f.farmer_id) !== String(form.farmer_id)
  );

  return (
    <div className="animate-fade-in">
          {/* Project Info */}
          <div className="form-section">
            <div className="form-section-header">
              <Building2 size={18} className="form-section-icon" />
              <h3 className="form-section-title">Project Details</h3>
            </div>
            <div className="form-section-body">
              <div className="form-group">
                <label className="form-label">Dealer *</label>
                <select
                  className="form-control"
                  name="dealer_id"
                  value={form.dealer_id}
                  onChange={handleChange}
                  disabled={isEditMode || userRole === 'dealer'}
                >
                  <option value="">Select Dealer...</option>
                  {(lookups.dealers || []).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}{d.firm_name ? ` (${d.firm_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  className="form-control"
                  name="project_name"
                  value={form.project_name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh NVPH Phase 1"
                />
              </div>
            </div>
          </div>

          {/* Applicants */}
          <div className="form-section">
            <div className="form-section-header">
              <Users size={18} className="form-section-icon" />
              <h3 className="form-section-title">Applicants</h3>
            </div>
            <div className="form-section-body" style={{ gridColumn: '1 / -1' }}>

              {/* Main Applicant */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UserCheck size={15} style={{ color: 'var(--color-primary)' }} />
                  Main Applicant *
                </label>
                <select
                  className="form-control"
                  name="farmer_id"
                  value={form.farmer_id}
                  onChange={handleChange}
                  disabled={!form.dealer_id || isEditMode}
                >
                  <option value="">{form.dealer_id ? 'Select Main Applicant...' : 'Select a dealer first...'}</option>
                  {(lookups.farmers || []).map(f => (
                    <option key={f.id || f.farmer_id} value={f.id || f.farmer_id}>
                      {f.first_name} {f.last_name} ({f.phone_primary})
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  One farmer is always the Main Applicant. Additional farmers can be added as Co-Applicants below.
                </p>
              </div>

              {/* Co-Applicants — Search + Chips */}
              {form.dealer_id && coApplicantOptions.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Users size={15} style={{ color: 'var(--color-text-muted)' }} />
                    Co-Applicants
                    <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      (optional — additional farmers on this project)
                    </span>
                  </label>

                  {/* Selected chips */}
                  {coApplicants.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      {coApplicants.map(fid => {
                        const f = coApplicantOptions.find(o => String(o.id || o.farmer_id) === fid);
                        if (!f) return null;
                        return (
                          <span
                            key={fid}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: 'var(--color-primary)', color: '#fff',
                              borderRadius: 20, padding: '0.3rem 0.65rem 0.3rem 0.75rem',
                              fontSize: '0.8rem', fontWeight: 500,
                            }}
                          >
                            {f.first_name} {f.last_name}
                            <button
                              type="button"
                              onClick={() => toggleCoApplicant(fid)}
                              style={{
                                background: 'rgba(255,255,255,0.25)', border: 'none',
                                borderRadius: '50%', width: 18, height: 18, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: 0, color: '#fff',
                              }}
                              title="Remove"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {/* Search input */}
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-control"
                      placeholder="Search farmer by name or phone…"
                      value={coAppSearch}
                      onChange={e => { setCoAppSearch(e.target.value); setCoAppDropdownOpen(true); }}
                      onFocus={() => setCoAppDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setCoAppDropdownOpen(false), 180)}
                      style={{ width: '100%' }}
                    />
                    {coAppDropdownOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: 'var(--color-bg-card)', border: '1px solid var(--glass-border)',
                        borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        maxHeight: 220, overflowY: 'auto', marginTop: 2,
                      }}>
                        {coApplicantOptions
                          .filter(f => {
                            const q = coAppSearch.toLowerCase();
                            return !q
                              || `${f.first_name} ${f.last_name}`.toLowerCase().includes(q)
                              || (f.phone_primary || '').includes(q);
                          })
                          .filter(f => !coApplicants.includes(String(f.id || f.farmer_id)))
                          .slice(0, 30)
                          .map(f => {
                            const fid = String(f.id || f.farmer_id);
                            return (
                              <div
                                key={fid}
                                onMouseDown={() => { toggleCoApplicant(fid); setCoAppSearch(''); }}
                                style={{
                                  padding: '0.5rem 0.875rem', cursor: 'pointer',
                                  borderBottom: '1px solid var(--glass-border)',
                                  display: 'flex', flexDirection: 'column', gap: 1,
                                }}
                                className="co-app-option"
                              >
                                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-main)' }}>
                                  {f.first_name} {f.last_name}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                  {f.phone_primary}
                                </span>
                              </div>
                            );
                          })}
                        {coApplicantOptions.filter(f => {
                          const q = coAppSearch.toLowerCase();
                          return !coApplicants.includes(String(f.id || f.farmer_id)) && (!q || `${f.first_name} ${f.last_name}`.toLowerCase().includes(q) || (f.phone_primary || '').includes(q));
                        }).length === 0 && (
                          <div style={{ padding: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                            {coAppSearch ? 'No matching farmers found' : 'All farmers already selected or none available'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="form-section">
            <div className="form-section-header">
              <MapPin size={18} className="form-section-icon" />
              <h3 className="form-section-title">Location & Land</h3>
            </div>
            <div className="form-section-body">
              <div style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                <LocationPicker
                  value={form.village_id}
                  onChange={(vid) => setForm(prev => ({ ...prev, village_id: vid }))}
                  compact={true}
                />
              </div>
              <LandRegistrySection
                meta={landMeta}
                setMeta={setLandMeta}
                landParcels={landParcels}
                setLandParcels={setLandParcels}
                landOwners={landOwners}
                setLandOwners={setLandOwners}
              />
              <div className="form-group">
                <label className="form-label">Total Land Area *</label>
                <input className="form-control" type="number" name="land_area" value={form.land_area} onChange={handleChange} />
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Auto-filled from owner/parcel totals when saved; override if needed.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-control" name="land_unit" value={form.land_unit} onChange={handleChange}>
                  <option value="SQM">SQM</option>
                  <option value="HECTARE">HECTARE</option>
                  <option value="ACRE">ACRE</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Area Type *</label>
                <select className="form-control" name="area_type_id" value={form.area_type_id} onChange={handleChange}>
                  <option value="">Select...</option>
                  {(lookups.areaTypes || []).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.multiplier}x)</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bank & Financial */}
          <div className="form-section">
            <div className="form-section-header">
              <Landmark size={18} className="form-section-icon" />
              <h3 className="form-section-title">Bank & Financial</h3>
            </div>
            <div className="form-section-body">
              <div className="form-group">
                <label className="form-label">Bank</label>
                <select className="form-control" name="bank_id" value={form.bank_id} onChange={handleChange}>
                  <option value="">Select Bank...</option>
                  {(lookups.banks || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bank Branch</label>
                <select className="form-control" name="bank_branch_id" value={form.bank_branch_id} onChange={handleChange} disabled={!form.bank_id}>
                  <option value="">{form.bank_id ? 'Select Branch...' : 'Select a bank first...'}</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name || b.branch_code || `Branch #${b.id}`}{b.ifsc ? ` (${b.ifsc})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subsidy Agency</label>
                <select className="form-control" name="subsidy_agency_id" value={form.subsidy_agency_id} onChange={handleChange}>
                  <option value="">Select Agency...</option>
                  {(lookups.agencies || []).map(a => (
                    <option key={a.id} value={a.id}>{a.short_code} - {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Eligible Project Cost (Rs.)</label>
                <input className="form-control" type="number" name="eligible_project_cost" value={form.eligible_project_cost} onChange={handleChange} readOnly={!canEditRates} />
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Total Cost (Rs.)</label>
                <input className="form-control" type="number" name="estimated_total_cost" value={form.estimated_total_cost} onChange={handleChange} readOnly={!canEditRates} />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => setActiveTab('components')}>
              Next: Components <ArrowRight size={16} />
            </button>
          </div>
    </div>
  );
}
