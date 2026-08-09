import { Plus, Trash2, Users, UserCheck, AlertTriangle, Info } from 'lucide-react';
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
  is_primary_owner: false, owner_type: 'project',
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

function fractionToPct(fraction: string): string {
  if (!fraction.includes('/')) return '';
  const [a, b] = fraction.split('/').map(s => parseFloat(s.trim()));
  if (!a || !b) return '';
  return String(Math.round((a / b) * 10000) / 100);
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
  let ps = parcels.length ? parcels.map(p => ({ ...p })) : [emptyParcel()];
  let os = owners.map(o => ({
    ...o,
    owner_type: (o.owner_type === 'other' ? 'other' : 'project') as OwnerType,
  }));

  const hasKhasra = ps.some(p => p.khasra_no.trim());
  if (hasKhasra && !ps.some(p => p.is_project_khasra)) {
    const idx = ps.findIndex(p => p.khasra_no.trim());
    if (idx >= 0) ps[idx] = { ...ps[idx], is_project_khasra: true };
  }

  const targetKhasra = ps.find(p => p.is_project_khasra && p.khasra_no.trim())?.khasra_no.trim()
    || ps.find(p => p.khasra_no.trim())?.khasra_no.trim()
    || '';

  if (targetKhasra) {
    os = os.map(o => ({
      ...o,
      khasra_no: o.khasra_no.trim() || targetKhasra,
      owner_type: o.owner_type || 'project',
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
    && (o.owner_type || 'project') === 'project'
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
    (o.owner_type || 'project') === 'project' && projectKhasras.has(o.khasra_no.trim()),
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
    (o.owner_type || 'project') === 'project'
    && (!o.khasra_no.trim() || projectKhasras.has(o.khasra_no.trim()) || projectKhasras.size === 0),
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
      const share_percentage = o.share_percentage
        ? Number(o.share_percentage)
        : (o.share_fraction ? Number(fractionToPct(o.share_fraction)) || null : null);
      return {
        owner_name: o.owner_name.trim(),
        father_name: o.father_name.trim() || null,
        relation: o.relation.trim() || null,
        khasra_no: o.khasra_no.trim() || null,
        area_sqm,
        area_hectare,
        share_fraction: o.share_fraction.trim() || null,
        share_percentage,
        is_primary_owner: o.is_primary_owner ? 1 : 0,
        owner_type: o.owner_type === 'other' ? 'other' : 'project',
        sort_order: i,
      };
    }),
  };
}

export default function LandRegistrySection({
  meta, setMeta, landParcels, setLandParcels, landOwners, setLandOwners, farmerName,
}: Props) {
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
      if (field === 'share_fraction' && typeof value === 'string') {
        const pct = fractionToPct(value);
        if (pct) next.share_percentage = pct;
      }
      return next;
    }));
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
      return [...prev, { ...emptyOwner(k), owner_name: farmerName.trim(), is_primary_owner: true, owner_type: 'project' }];
    });
    setMeta(m => ({ ...m, ownership_type: 'single' }));
  };

  const projectKhasras = projectKhasraNumbers(landParcels);
  const parcelTotalSqm = landParcels.reduce((s, p) => s + (parseFloat(p.area_sqm) || 0), 0);
  const projectOwnerCount = landOwners.filter(o =>
    o.owner_name.trim() && (o.owner_type || 'project') === 'project' && projectKhasras.includes(o.khasra_no.trim()),
  ).length;
  const nocRequired = needsNoc(landParcels, landOwners, meta);

  return (
    <div className="land-registry-section">
      <div className="land-registry-hint">
        <strong>Land details from 7/12 &amp; NOC</strong> — First add all khasra numbers on this land record.
        Then add owners under each khasra. Mark which khasras are part of the greenhouse project.
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
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Land ownership</label>
          <select
            className="form-control"
            value={meta.ownership_type}
            onChange={e => setMeta(m => ({ ...m, ownership_type: e.target.value as 'single' | 'joint' }))}
          >
            <option value="single">Single owner</option>
            <option value="joint">Joint owners (NOC required)</option>
          </select>
        </div>
      </div>

      <div className="form-section land-registry-block">
        <div className="form-section-header">
          <Users size={18} className="form-section-icon" />
          <h3 className="form-section-title">Step 1 — Khasra / plot numbers</h3>
        </div>
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <p className="text-muted land-registry-block-desc">
            One card per khasra on the land record. Check <strong>Project khasra</strong> for plots where the greenhouse will be built.
          </p>
          <div className="land-registry-parcel-list">
            {landParcels.map((row, idx) => {
              const khasraNo = row.khasra_no.trim();
              const khasraOwners = ownersForKhasra(landOwners, khasraNo);
              const projectOwnersOnKhasra = khasraOwners.filter(({ owner }) => (owner.owner_type || 'project') === 'project');
              const shareTotal = khasraOwners.reduce((s, { owner }) => s + (parseFloat(owner.share_percentage) || 0), 0);
              const hasShares = khasraOwners.some(({ owner }) => owner.share_percentage || owner.share_fraction);

              return (
                <div
                  key={idx}
                  className={`land-registry-parcel-card${row.is_project_khasra ? ' is-project-khasra' : ''}`}
                >
                  <div className="land-registry-parcel-header">
                    <label className="land-registry-project-khasra-label" title="Greenhouse will be built on this khasra">
                      <input
                        type="checkbox"
                        checked={row.is_project_khasra}
                        onChange={e => updateParcel(idx, 'is_project_khasra', e.target.checked)}
                      />
                      Project khasra
                    </label>
                    {row.is_project_khasra && khasraNo && (
                      <span className="land-registry-badge land-registry-badge-project">Greenhouse site</span>
                    )}
                  </div>

                  <div className="land-registry-field-row land-registry-parcel-row-primary">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Khasra *</label>
                      <input className="form-control" value={row.khasra_no} onChange={e => updateParcel(idx, 'khasra_no', e.target.value)} placeholder="421/187" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Survey no.</label>
                      <input className="form-control" value={row.survey_no} onChange={e => updateParcel(idx, 'survey_no', e.target.value)} />
                    </div>
                  </div>
                  <div className="land-registry-field-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Area (SQM)</label>
                      <input className="form-control" type="number" value={row.area_sqm} onChange={e => updateParcel(idx, 'area_sqm', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Land type</label>
                      <select className="form-control" value={row.land_type} onChange={e => updateParcel(idx, 'land_type', e.target.value)}>
                        {LAND_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="land-registry-parcel-actions">
                      <label className="land-registry-encumbrance" title="Check if there is a loan or charge on this land">
                        <input type="checkbox" checked={row.encumbrance} onChange={e => updateParcel(idx, 'encumbrance', e.target.checked)} />
                        Loan/charge
                      </label>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => removeParcel(idx)} title="Remove this khasra">
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Notes</label>
                    <input className="form-control" value={row.notes} onChange={e => updateParcel(idx, 'notes', e.target.value)} />
                  </div>

                  {khasraNo && (
                    <div className="land-registry-khasra-owners">
                      <div className="land-registry-khasra-owners-header">
                        <h4 className="land-registry-khasra-owners-title">Step 2 — Owners on khasra {khasraNo}</h4>
                        {row.is_project_khasra && farmerName && (
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => fillFarmerAsProjectOwner(khasraNo)}>
                            <UserCheck size={14} /> Use farmer as project owner
                          </button>
                        )}
                      </div>
                      <p className="text-muted land-registry-block-desc" style={{ margin: '0 0 0.5rem' }}>
                        Add every owner on this khasra. Mark <strong>Project owner</strong> for those participating in the greenhouse; use <strong>Other owner</strong> for co-owners not in the project.
                      </p>

                      {row.is_project_khasra && meta.ownership_type === 'joint' && projectOwnersOnKhasra.length < 2 && (
                        <div className="land-registry-warn" style={{ marginBottom: '0.5rem' }}>
                          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>Joint ownership selected — add all project owners on this khasra from the NOC.</span>
                        </div>
                      )}
                      {hasShares && khasraOwners.length >= 2 && shareTotal > 0 && Math.abs(shareTotal - 100) > 2 && (
                        <div className="land-registry-warn" style={{ marginBottom: '0.5rem' }}>
                          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>Shares on this khasra add up to {shareTotal.toFixed(1)}% — they should total about 100%.</span>
                        </div>
                      )}

                      {khasraOwners.map(({ owner, index: oIdx }) => (
                        <div key={oIdx} className={`land-registry-owner-card${owner.is_primary_owner ? ' is-primary' : ''}`}>
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
                              <label className="form-label">Area (Ha)</label>
                              <input className="form-control" type="number" step="0.0001" value={owner.area_hectare} onChange={e => updateOwner(oIdx, 'area_hectare', e.target.value)} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Share</label>
                              <input className="form-control" value={owner.share_fraction} onChange={e => updateOwner(oIdx, 'share_fraction', e.target.value)} placeholder="1/6" />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">%</label>
                              <input className="form-control" type="number" step="0.01" value={owner.share_percentage} onChange={e => updateOwner(oIdx, 'share_percentage', e.target.value)} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Owner type</label>
                              <select
                                className="form-control"
                                value={owner.owner_type || 'project'}
                                onChange={e => updateOwner(oIdx, 'owner_type', e.target.value)}
                              >
                                <option value="project">Project owner</option>
                                <option value="other">Other owner (not in project)</option>
                              </select>
                            </div>
                          </div>
                          <div className="land-registry-owner-footer">
                            {row.is_project_khasra && (
                              <label className="land-registry-primary-label" title="Main applicant on this project">
                                <input type="checkbox" checked={owner.is_primary_owner} onChange={e => updateOwner(oIdx, 'is_primary_owner', e.target.checked)} />
                                Primary owner
                              </label>
                            )}
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => removeOwner(oIdx)}>
                              <Trash2 size={14} /> Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => addOwnerToKhasra(khasraNo)}>
                        <Plus size={14} /> Add owner to this khasra
                      </button>
                    </div>
                  )}
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

      {projectKhasras.length > 0 && (
        <div className="land-registry-warn land-registry-noc-info">
          <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Step 3 — NOC reminder:</strong> NOC required for project khasras only:{' '}
            <strong>{projectKhasras.join(', ')}</strong>.
            {nocRequired
              ? ` ${projectOwnerCount} project owner${projectOwnerCount !== 1 ? 's' : ''} listed — upload signed NOC from all project owners.`
              : ' Single owner — NOC may not be required unless joint ownership applies.'}
          </span>
        </div>
      )}
    </div>
  );
}
