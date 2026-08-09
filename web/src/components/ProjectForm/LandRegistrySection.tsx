import { useState } from 'react';
import { Plus, Trash2, Users, UserCheck, AlertTriangle, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MapPin, CheckSquare } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

export interface LandRegistryMeta {
  khatauni_number: string;
  ownership_type: 'single' | 'joint';
}

export interface LandParcelRow {
  khatauni_number: string;
  khasra_no: string;
  survey_no: string;
  area_sqm: string;
  land_type: string;
  encumbrance: boolean;
  is_project_khasra: boolean;
  notes: string;
}

export type OwnerType = 'project' | 'other';

export interface LandOwnerRow {
  owner_name: string;
  father_name: string;
  relation: string;
  khasra_no: string;
  area_sqm: string;
  area_hectare: string;
  share_fraction: string;
  share_percentage: string;
  is_primary_owner: boolean;
  owner_type: OwnerType;
}

const WIZARD_STEPS = [
  { num: 1, label: 'Khasra numbers' },
  { num: 2, label: 'Owners & shares' },
  { num: 3, label: 'Project khasras' },
  { num: 4, label: 'Project owners' },
] as const;

export const emptyRegistryMeta = (): LandRegistryMeta => ({
  khatauni_number: '',
  ownership_type: 'single',
});

export const emptyParcel = (): LandParcelRow => ({
  khatauni_number: '', khasra_no: '', survey_no: '', area_sqm: '',
  land_type: 'agricultural', encumbrance: false, is_project_khasra: false, notes: '',
});

export const emptyOwner = (khasraNo = ''): LandOwnerRow => ({
  owner_name: '', father_name: '', relation: '', khasra_no: khasraNo,
  area_sqm: '', area_hectare: '', share_fraction: '', share_percentage: '',
  is_primary_owner: false, owner_type: 'other',
});

const LAND_TYPES = [
  { value: 'agricultural', label: 'Agricultural' },
  { value: 'irrigated', label: 'Irrigated' },
  { value: 'unirrigated', label: 'Unirrigated' },
  { value: 'barren', label: 'Barren' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
];

export function fractionToPct(fraction: string): string {
  if (!fraction.includes('/')) return '';
  const [a, b] = fraction.split('/').map(s => parseFloat(s.trim()));
  if (!a || !b) return '';
  return String(Math.round((a / b) * 10000) / 100);
}

/** Parse share input: "25%", "25", or "25/783". */
export function parseShareInput(input: string): { share_fraction: string; share_percentage: string } {
  const trimmed = input.trim();
  if (!trimmed) return { share_fraction: '', share_percentage: '' };

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    const a = parseFloat(parts[0]?.trim() ?? '');
    const b = parseFloat(parts[1]?.trim() ?? '');
    if (!Number.isNaN(a) && !Number.isNaN(b) && b !== 0) {
      const pct = String(Math.round((a / b) * 10000) / 100);
      return { share_fraction: `${a}/${b}`, share_percentage: pct };
    }
    return { share_fraction: trimmed, share_percentage: '' };
  }

  const pctMatch = trimmed.match(/^([\d.]+)\s*%?$/);
  if (pctMatch) {
    return { share_fraction: '', share_percentage: pctMatch[1] };
  }

  return { share_fraction: '', share_percentage: '' };
}

export function shareDisplay(o: LandOwnerRow): string {
  if (o.share_fraction) return o.share_fraction;
  if (o.share_percentage) return `${o.share_percentage}%`;
  return '';
}

export function projectKhasraNumbers(parcels: LandParcelRow[]): string[] {
  return parcels
    .filter(p => p.is_project_khasra && p.khasra_no.trim())
    .map(p => p.khasra_no.trim());
}

export function ownersForKhasra(owners: LandOwnerRow[], khasraNo: string): { owner: LandOwnerRow; index: number }[] {
  const k = khasraNo.trim();
  return owners
    .map((owner, index) => ({ owner, index }))
    .filter(({ owner }) => owner.khasra_no.trim() === k);
}

/** Migrate legacy flat owner lists onto khasras on load. */
export function normalizeLandRegistryOnLoad(
  parcels: LandParcelRow[],
  owners: LandOwnerRow[],
): { parcels: LandParcelRow[]; owners: LandOwnerRow[] } {
  const ps = parcels.length ? parcels.map(p => ({ ...p })) : [emptyParcel()];
  let os = owners.map(o => ({
    ...o,
    owner_type: (o.owner_type === 'project' ? 'project' : 'other') as OwnerType,
  }));

  const targetKhasra = ps.find(p => p.khasra_no.trim())?.khasra_no.trim() || '';

  if (targetKhasra) {
    os = os.map(o => ({
      ...o,
      khasra_no: o.khasra_no.trim() || targetKhasra,
      owner_type: o.owner_type || 'other',
    }));
  }

  return { parcels: ps, owners: os };
}

/** NOC required only for project khasras with joint ownership or 2+ project owners. */
export function needsNoc(
  parcels: LandParcelRow[],
  owners: LandOwnerRow[],
  meta: LandRegistryMeta,
): boolean {
  const projectKhasras = new Set(projectKhasraNumbers(parcels));
  if (projectKhasras.size === 0) return false;

  const projectOwners = owners.filter(o =>
    o.owner_name.trim()
    && (o.owner_type || 'other') === 'project'
    && projectKhasras.has(o.khasra_no.trim()),
  );

  if (meta.ownership_type === 'joint' && projectOwners.length >= 1) return true;
  if (projectOwners.length >= 2) return true;

  for (const k of projectKhasras) {
    const onKhasra = owners.filter(o => o.owner_name.trim() && o.khasra_no.trim() === k);
    if (onKhasra.length >= 2) return true;
  }
  return false;
}

/** Best total SQM from project khasras first, then all parcels, then owners. */
export function registryTotalSqm(parcels: LandParcelRow[], owners: LandOwnerRow[]): number {
  const projectParcels = parcels.filter(p => p.is_project_khasra);
  const projectTotal = projectParcels.reduce((s, p) => s + (parseFloat(p.area_sqm) || 0), 0);
  if (projectTotal > 0) return projectTotal;
  const parcelTotal = parcels.reduce((s, p) => s + (parseFloat(p.area_sqm) || 0), 0);
  if (parcelTotal > 0) return parcelTotal;
  const projectKhasras = new Set(projectKhasraNumbers(parcels));
  const projectOwners = owners.filter(o =>
    (o.owner_type || 'other') === 'project' && projectKhasras.has(o.khasra_no.trim()),
  );
  const ownerPool = projectOwners.length ? projectOwners : owners;
  return ownerPool.reduce((s, o) => s + (parseFloat(o.area_sqm) || 0), 0);
}

interface Props {
  meta: LandRegistryMeta;
  setMeta: Dispatch<SetStateAction<LandRegistryMeta>>;
  landParcels: LandParcelRow[];
  setLandParcels: Dispatch<SetStateAction<LandParcelRow[]>>;
  landOwners: LandOwnerRow[];
  setLandOwners: Dispatch<SetStateAction<LandOwnerRow[]>>;
  farmerName?: string;
}

export function landRegistryToApi(
  meta: LandRegistryMeta,
  parcels: LandParcelRow[],
  owners: LandOwnerRow[],
) {
  const ownerRows = owners.filter(o => o.owner_name.trim());
  const projectKhasras = new Set(projectKhasraNumbers(parcels));
  const projectOwners = ownerRows.filter(o =>
    (o.owner_type || 'other') === 'project'
    && (!o.khasra_no.trim() || projectKhasras.has(o.khasra_no.trim())),
  );
  const ownership = meta.ownership_type === 'joint' || projectOwners.length >= 2 ? 'joint' : 'single';
  return {
    khatauni_number: meta.khatauni_number.trim() || null,
    ownership_type: ownership,
    parcels: parcels
      .filter(p => p.khasra_no.trim())
      .map((p, i) => ({
        khatauni_number: p.khatauni_number.trim() || meta.khatauni_number.trim() || null,
        khasra_no: p.khasra_no.trim(),
        survey_no: p.survey_no.trim() || p.khasra_no.trim(),
        area_sqm: p.area_sqm ? Number(p.area_sqm) : null,
        land_type: p.land_type || 'agricultural',
        encumbrance: p.encumbrance ? 1 : 0,
        is_project_khasra: p.is_project_khasra ? 1 : 0,
        notes: p.notes.trim() || null,
        sort_order: i,
      })),
    owners: ownerRows.map((o, i) => {
      const area_sqm = o.area_sqm ? Number(o.area_sqm) : null;
      const area_hectare = o.area_hectare ? Number(o.area_hectare) : null;
      const parsed = parseShareInput(shareDisplay(o));
      const share_fraction = (o.share_fraction || parsed.share_fraction).trim() || null;
      const share_percentage = o.share_percentage
        ? Number(o.share_percentage)
        : (parsed.share_percentage ? Number(parsed.share_percentage) : (share_fraction ? Number(fractionToPct(share_fraction)) || null : null));
      return {
        owner_name: o.owner_name.trim(),
        father_name: o.father_name.trim() || null,
        relation: o.relation.trim() || null,
        khasra_no: o.khasra_no.trim() || null,
        area_sqm,
        area_hectare,
        share_fraction,
        share_percentage,
        is_primary_owner: o.is_primary_owner ? 1 : 0,
        owner_type: o.owner_type === 'project' ? 'project' : 'other',
        sort_order: i,
      };
    }),
  };
}

export default function LandRegistrySection({
  meta, setMeta, landParcels, setLandParcels, landOwners, setLandOwners, farmerName,
}: Props) {
  const [wizardStep, setWizardStep] = useState(1);
  const [expandedParcels, setExpandedParcels] = useState<Set<number>>(new Set());
  const [stepError, setStepError] = useState('');

  const validParcels = landParcels.filter(p => p.khasra_no.trim());
  const projectKhasras = projectKhasraNumbers(landParcels);
  const parcelTotalSqm = validParcels.reduce((s, p) => s + (parseFloat(p.area_sqm) || 0), 0);
  const projectOwnerCount = landOwners.filter(o =>
    o.owner_name.trim() && o.owner_type === 'project' && projectKhasras.includes(o.khasra_no.trim()),
  ).length;
  const nocRequired = needsNoc(landParcels, landOwners, meta);

  const toggleParcelExpanded = (idx: number) => {
    setExpandedParcels(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const updateParcel = (idx: number, field: keyof LandParcelRow, value: string | boolean) => {
    setLandParcels(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const next = { ...row, [field]: value };
      if (field === 'khasra_no' && typeof value === 'string') {
        const oldK = row.khasra_no.trim();
        const newK = value.trim();
        if (oldK && newK && oldK !== newK) {
          setLandOwners(owners => owners.map(o =>
            o.khasra_no.trim() === oldK ? { ...o, khasra_no: newK } : o,
          ));
        }
      }
      return next;
    }));
  };

  const updateOwner = (idx: number, field: keyof LandOwnerRow, value: string | boolean) => {
    setLandOwners(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const next = { ...row, [field]: value };
      if (field === 'area_hectare' && typeof value === 'string' && value) {
        const ha = parseFloat(value);
        if (!Number.isNaN(ha)) next.area_sqm = String(ha * 10000);
      }
      if (field === 'area_sqm' && typeof value === 'string' && value) {
        const sqm = parseFloat(value);
        if (!Number.isNaN(sqm)) next.area_hectare = String(sqm / 10000);
      }
      return next;
    }));
  };

  const updateOwnerShare = (idx: number, raw: string) => {
    const parsed = parseShareInput(raw);
    setLandOwners(prev => prev.map((row, i) =>
      i === idx ? { ...row, share_fraction: parsed.share_fraction, share_percentage: parsed.share_percentage } : row,
    ));
  };

  const addOwnerToKhasra = (khasraNo: string) => {
    setLandOwners(prev => [...prev, emptyOwner(khasraNo.trim())]);
  };

  const removeOwner = (idx: number) => {
    setLandOwners(prev => prev.filter((_, i) => i !== idx));
  };

  const removeParcel = (idx: number) => {
    const khasra = landParcels[idx]?.khasra_no.trim();
    setLandParcels(prev => prev.filter((_, i) => i !== idx));
    if (khasra) {
      setLandOwners(prev => prev.filter(o => o.khasra_no.trim() !== khasra));
    }
  };

  const toggleProjectOwner = (idx: number, isProject: boolean) => {
    setLandOwners(prev => prev.map((row, i) =>
      i === idx
        ? { ...row, owner_type: isProject ? 'project' as OwnerType : 'other', is_primary_owner: isProject ? row.is_primary_owner : false }
        : row,
    ));
  };

  const fillFarmerAsProjectOwner = (khasraNo: string) => {
    if (!farmerName?.trim() || !khasraNo.trim()) return;
    const k = khasraNo.trim();
    setLandOwners(prev => {
      const existing = prev.findIndex(o => o.khasra_no.trim() === k && o.is_primary_owner);
      if (existing >= 0) {
        return prev.map((row, i) => i === existing
          ? { ...row, owner_name: farmerName.trim(), owner_type: 'project' as OwnerType, is_primary_owner: true }
          : row);
      }
      const nameMatch = prev.findIndex(o => o.khasra_no.trim() === k && o.owner_name.trim() === farmerName.trim());
      if (nameMatch >= 0) {
        return prev.map((row, i) => i === nameMatch
          ? { ...row, owner_type: 'project' as OwnerType, is_primary_owner: true }
          : row);
      }
      return [...prev, { ...emptyOwner(k), owner_name: farmerName.trim(), is_primary_owner: true, owner_type: 'project' }];
    });
  };

  const validateStep = (step: number): string => {
    if (step === 1) {
      if (!validParcels.length) return 'Add at least one khasra number before continuing.';
      const missingArea = validParcels.some(p => !p.area_sqm || parseFloat(p.area_sqm) <= 0);
      if (missingArea) return 'Enter area (SQM) for each khasra.';
    }
    if (step === 3 && validParcels.length > 0 && projectKhasras.length === 0) {
      return 'Select at least one project khasra (greenhouse site).';
    }
    if (step === 4 && projectKhasras.length > 0 && projectOwnerCount === 0) {
      return 'Select at least one project owner from the list.';
    }
    return '';
  };

  const goNext = () => {
    const err = validateStep(wizardStep);
    if (err) { setStepError(err); return; }
    setStepError('');
    setWizardStep(s => Math.min(4, s + 1));
  };

  const goBack = () => {
    setStepError('');
    setWizardStep(s => Math.max(1, s - 1));
  };

  const projectKhasraOwners = landOwners
    .map((owner, index) => ({ owner, index }))
    .filter(({ owner }) =>
      owner.owner_name.trim() && projectKhasras.includes(owner.khasra_no.trim()),
    );

  return (
    <div className="land-registry-section">
      <div className="land-registry-hint">
        <strong>Land details from 7/12 &amp; NOC</strong> — Work through each step in order:
        add khasra numbers, then owners, then mark project khasras, then pick project owners.
      </div>

      <div className="land-registry-meta">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Khatauni / 8A number</label>
          <input
            className="form-control"
            value={meta.khatauni_number}
            onChange={e => setMeta(m => ({ ...m, khatauni_number: e.target.value }))}
            placeholder="As on 8A certificate"
          />
        </div>
      </div>

      <nav className="land-registry-wizard-steps" aria-label="Land registry steps">
        {WIZARD_STEPS.map(({ num, label }) => (
          <button
            key={num}
            type="button"
            className={`land-registry-wizard-step${wizardStep === num ? ' is-active' : ''}${wizardStep > num ? ' is-done' : ''}`}
            onClick={() => { setStepError(''); setWizardStep(num); }}
          >
            <span className="land-registry-wizard-step-num">{num}</span>
            <span className="land-registry-wizard-step-label">{label}</span>
          </button>
        ))}
      </nav>

      {stepError && (
        <div className="land-registry-warn">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{stepError}</span>
        </div>
      )}

      {/* Step 1 — Khasra numbers only */}
      {wizardStep === 1 && (
        <div className="form-section land-registry-block">
          <div className="form-section-header">
            <MapPin size={18} className="form-section-icon" />
            <h3 className="form-section-title">1. Khasra numbers</h3>
          </div>
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <p className="text-muted land-registry-block-desc">
              Enter each khasra number and its area from the 7/12 land record.
              You will add owners in the next step.
            </p>
            <div className="land-registry-parcel-list">
              {landParcels.map((row, idx) => {
                const expanded = expandedParcels.has(idx);
                return (
                  <div key={idx} className="land-registry-parcel-card">
                    <div className="land-registry-field-row land-registry-parcel-row-primary">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Khasra number *</label>
                        <input
                          className="form-control"
                          value={row.khasra_no}
                          onChange={e => updateParcel(idx, 'khasra_no', e.target.value)}
                          placeholder="421/187"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Area (SQM) *</label>
                        <input
                          className="form-control"
                          type="number"
                          value={row.area_sqm}
                          onChange={e => updateParcel(idx, 'area_sqm', e.target.value)}
                          placeholder="e.g. 5000"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="land-registry-expand-btn"
                      onClick={() => toggleParcelExpanded(idx)}
                    >
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expanded ? 'Hide optional fields' : 'More fields (survey no., land type…)'}
                    </button>

                    {expanded && (
                      <>
                        <div className="land-registry-field-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Survey no.</label>
                            <input className="form-control" value={row.survey_no} onChange={e => updateParcel(idx, 'survey_no', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Land type</label>
                            <select className="form-control" value={row.land_type} onChange={e => updateParcel(idx, 'land_type', e.target.value)}>
                              {LAND_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="land-registry-parcel-actions">
                          <label className="land-registry-encumbrance" title="Check if there is a loan or charge on this land">
                            <input type="checkbox" checked={row.encumbrance} onChange={e => updateParcel(idx, 'encumbrance', e.target.checked)} />
                            Loan/charge on this khasra
                          </label>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Notes</label>
                          <input className="form-control" value={row.notes} onChange={e => updateParcel(idx, 'notes', e.target.value)} />
                        </div>
                      </>
                    )}

                    <div className="land-registry-parcel-actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => removeParcel(idx)} title="Remove this khasra">
                        <Trash2 size={14} /> Remove khasra
                      </button>
                    </div>
                  </div>
                );
              })}
              <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setLandParcels(p => [...p, emptyParcel()])}>
                <Plus size={14} /> Add khasra
              </button>
              {parcelTotalSqm > 0 && (
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Total plot area: {parcelTotalSqm.toLocaleString('en-IN')} SQM ({(parcelTotalSqm / 10000).toFixed(4)} hectares)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Owners per khasra */}
      {wizardStep === 2 && (
        <div className="form-section land-registry-block">
          <div className="form-section-header">
            <Users size={18} className="form-section-icon" />
            <h3 className="form-section-title">2. Owners &amp; shares</h3>
          </div>
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <p className="text-muted land-registry-block-desc">
              For each khasra, add every owner listed on the 7/12 record.
              Enter share as a percentage (e.g. <strong>25%</strong>) or proportion (e.g. <strong>25/783</strong>).
              You will choose project owners in step 4.
            </p>
            {validParcels.length === 0 && (
              <p className="text-muted">No khasras yet — go back to step 1 and add khasra numbers first.</p>
            )}
            {validParcels.map((parcel, pIdx) => {
              const khasraNo = parcel.khasra_no.trim();
              const khasraOwners = ownersForKhasra(landOwners, khasraNo);
              const shareTotal = khasraOwners.reduce((s, { owner }) => s + (parseFloat(owner.share_percentage) || 0), 0);
              const hasShares = khasraOwners.some(({ owner }) => owner.share_percentage || owner.share_fraction);

              return (
                <div key={pIdx} className="land-registry-parcel-card" style={{ marginBottom: '0.75rem' }}>
                  <div className="land-registry-khasra-owners-header">
                    <h4 className="land-registry-khasra-owners-title">
                      Khasra {khasraNo}
                      {parcel.area_sqm && (
                        <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.82rem', marginLeft: 8 }}>
                          {parseFloat(parcel.area_sqm).toLocaleString('en-IN')} SQM
                        </span>
                      )}
                    </h4>
                  </div>

                  {hasShares && khasraOwners.length >= 2 && shareTotal > 0 && Math.abs(shareTotal - 100) > 2 && (
                    <div className="land-registry-warn" style={{ marginBottom: '0.5rem' }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>Shares on this khasra add up to {shareTotal.toFixed(1)}% — they should total about 100%.</span>
                    </div>
                  )}

                  {khasraOwners.map(({ owner, index: oIdx }) => (
                    <div key={oIdx} className="land-registry-owner-card">
                      <div className="land-registry-field-row">
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Owner name *</label>
                          <input className="form-control" value={owner.owner_name} onChange={e => updateOwner(oIdx, 'owner_name', e.target.value)} placeholder="Nathu Ram" />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Father&apos;s name</label>
                          <input className="form-control" value={owner.father_name} onChange={e => updateOwner(oIdx, 'father_name', e.target.value)} placeholder="Pemaram" />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Relation</label>
                          <input className="form-control" value={owner.relation} onChange={e => updateOwner(oIdx, 'relation', e.target.value)} placeholder="S/o" />
                        </div>
                      </div>
                      <div className="land-registry-field-row">
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Area (SQM)</label>
                          <input className="form-control" type="number" value={owner.area_sqm} onChange={e => updateOwner(oIdx, 'area_sqm', e.target.value)} placeholder="Optional if share set" />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Share</label>
                          <input
                            className="form-control"
                            value={shareDisplay(owner)}
                            onChange={e => updateOwnerShare(oIdx, e.target.value)}
                            placeholder="25% or 25/783"
                          />
                          {owner.share_percentage && owner.share_fraction && (
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                              = {owner.share_percentage}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="land-registry-owner-footer">
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => removeOwner(oIdx)}>
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => addOwnerToKhasra(khasraNo)}>
                    <Plus size={14} /> Add owner to khasra {khasraNo}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3 — Project khasras */}
      {wizardStep === 3 && (
        <div className="form-section land-registry-block">
          <div className="form-section-header">
            <MapPin size={18} className="form-section-icon" />
            <h3 className="form-section-title">3. Project khasras</h3>
          </div>
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <p className="text-muted land-registry-block-desc">
              Select which khasras are part of the greenhouse project site.
              Other khasras on the same land record stay listed but are not part of the project.
            </p>
            {validParcels.length === 0 ? (
              <p className="text-muted">No khasras yet — go back to step 1.</p>
            ) : (
              <div className="land-registry-project-khasra-list">
                {landParcels.map((row, idx) => {
                  const khasraNo = row.khasra_no.trim();
                  if (!khasraNo) return null;
                  const ownerCount = ownersForKhasra(landOwners, khasraNo).length;
                  return (
                    <label
                      key={idx}
                      className={`land-registry-project-khasra-item${row.is_project_khasra ? ' is-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={row.is_project_khasra}
                        onChange={e => updateParcel(idx, 'is_project_khasra', e.target.checked)}
                      />
                      <div className="land-registry-project-khasra-info">
                        <strong>Khasra {khasraNo}</strong>
                        <span className="text-muted">
                          {row.area_sqm ? `${parseFloat(row.area_sqm).toLocaleString('en-IN')} SQM` : '—'}
                          {ownerCount > 0 ? ` · ${ownerCount} owner${ownerCount !== 1 ? 's' : ''}` : ''}
                        </span>
                      </div>
                      {row.is_project_khasra && (
                        <span className="land-registry-badge land-registry-badge-project">Greenhouse site</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4 — Project owners */}
      {wizardStep === 4 && (
        <div className="form-section land-registry-block">
          <div className="form-section-header">
            <CheckSquare size={18} className="form-section-icon" />
            <h3 className="form-section-title">4. Project owners</h3>
          </div>
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <p className="text-muted land-registry-block-desc">
              From owners already listed on project khasras, select who is participating in the greenhouse project.
              Everyone else is automatically an &ldquo;other owner&rdquo; — no need to re-type names.
            </p>
            {projectKhasras.length === 0 ? (
              <p className="text-muted">No project khasras selected — go back to step 3.</p>
            ) : projectKhasraOwners.length === 0 ? (
              <p className="text-muted">No owners on project khasras — go back to step 2 and add owners.</p>
            ) : (
              <>
                {farmerName && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        for (const k of projectKhasras) fillFarmerAsProjectOwner(k);
                      }}
                    >
                      <UserCheck size={14} /> Select farmer as project owner
                    </button>
                  </div>
                )}
                <div className="land-registry-project-owner-list">
                  {projectKhasras.map(khasraNo => {
                    const kOwners = projectKhasraOwners.filter(({ owner }) => owner.khasra_no.trim() === khasraNo);
                    if (!kOwners.length) return null;
                    return (
                      <div key={khasraNo} className="land-registry-parcel-card">
                        <h4 className="land-registry-khasra-owners-title" style={{ margin: '0 0 0.5rem' }}>
                          Khasra {khasraNo}
                        </h4>
                        {kOwners.map(({ owner, index: oIdx }) => (
                          <label
                            key={oIdx}
                            className={`land-registry-project-owner-item${owner.owner_type === 'project' ? ' is-project' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={owner.owner_type === 'project'}
                              onChange={e => toggleProjectOwner(oIdx, e.target.checked)}
                            />
                            <div className="land-registry-project-owner-info">
                              <strong>{owner.owner_name || 'Unnamed owner'}</strong>
                              <span className="text-muted">
                                {[owner.relation, owner.father_name && `father: ${owner.father_name}`].filter(Boolean).join(' · ')}
                                {shareDisplay(owner) ? ` · Share: ${shareDisplay(owner)}` : ''}
                              </span>
                            </div>
                            {owner.owner_type === 'project' && (
                              <label className="land-registry-primary-label" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={owner.is_primary_owner}
                                  onChange={e => updateOwner(oIdx, 'is_primary_owner', e.target.checked)}
                                />
                                Primary
                              </label>
                            )}
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {projectKhasras.length > 0 && (
              <div className="land-registry-warn land-registry-noc-info" style={{ marginTop: '1rem' }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>NOC reminder:</strong> Required for project khasras: <strong>{projectKhasras.join(', ')}</strong>.
                  {nocRequired
                    ? ` ${projectOwnerCount} project owner${projectOwnerCount !== 1 ? 's' : ''} selected — upload signed NOC from all project owners.`
                    : ' Single project owner — NOC may not be required unless joint ownership applies.'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="land-registry-wizard-nav">
        <button
          type="button"
          className="btn btn-outline"
          onClick={goBack}
          disabled={wizardStep === 1}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <span className="land-registry-wizard-nav-label">
          Step {wizardStep} of 4 — {WIZARD_STEPS[wizardStep - 1].label}
        </span>
        {wizardStep < 4 ? (
          <button type="button" className="btn btn-primary" onClick={goNext}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <span className="text-muted" style={{ fontSize: '0.82rem' }}>Save project to keep land details</span>
        )}
      </div>
    </div>
  );
}
