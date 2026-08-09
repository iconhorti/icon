import { Plus, Trash2, Users, UserCheck, AlertTriangle } from 'lucide-react';
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
  notes: string;
}

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
}

export const emptyRegistryMeta = (): LandRegistryMeta => ({
  khatauni_number: '',
  ownership_type: 'single',
});

export const emptyParcel = (): LandParcelRow => ({
  khatauni_number: '', khasra_no: '', survey_no: '', area_sqm: '',
  land_type: 'agricultural', encumbrance: false, notes: '',
});

export const emptyOwner = (): LandOwnerRow => ({
  owner_name: '', father_name: '', relation: '', khasra_no: '',
  area_sqm: '', area_hectare: '', share_fraction: '', share_percentage: '',
  is_primary_owner: false,
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

/** Best total SQM from parcels first, then owner rows. */
export function registryTotalSqm(parcels: LandParcelRow[], owners: LandOwnerRow[]): number {
  const parcelTotal = parcels.reduce((s, p) => s + (parseFloat(p.area_sqm) || 0), 0);
  if (parcelTotal > 0) return parcelTotal;
  return owners.reduce((s, o) => s + (parseFloat(o.area_sqm) || 0), 0);
}

interface Props {
  meta: LandRegistryMeta;
  setMeta: Dispatch<SetStateAction<LandRegistryMeta>>;
  landParcels: LandParcelRow[];
  setLandParcels: Dispatch<SetStateAction<LandParcelRow[]>>;
  landOwners: LandOwnerRow[];
  setLandOwners: Dispatch<SetStateAction<LandOwnerRow[]>>;
  /** Main applicant name — used for one-click primary owner fill */
  farmerName?: string;
}

export function landRegistryToApi(
  meta: LandRegistryMeta,
  parcels: LandParcelRow[],
  owners: LandOwnerRow[],
) {
  const ownerRows = owners.filter(o => o.owner_name.trim());
  const ownership = meta.ownership_type === 'joint' || ownerRows.length >= 2 ? 'joint' : 'single';
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
        sort_order: i,
      };
    }),
  };
}

export default function LandRegistrySection({
  meta, setMeta, landParcels, setLandParcels, landOwners, setLandOwners, farmerName,
}: Props) {
  const updateParcel = (idx: number, field: keyof LandParcelRow, value: string | boolean) => {
    setLandParcels(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
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

  const ownerTotalSqm = landOwners.reduce((s, o) => s + (parseFloat(o.area_sqm) || 0), 0);
  const parcelTotalSqm = landParcels.reduce((s, p) => s + (parseFloat(p.area_sqm) || 0), 0);
  const ownerCount = landOwners.filter(o => o.owner_name.trim()).length;
  const shareTotal = landOwners.reduce((s, o) => s + (parseFloat(o.share_percentage) || 0), 0);
  const hasShares = landOwners.some(o => o.share_percentage || o.share_fraction);
  const primaryKhasra = landParcels.find(p => p.khasra_no.trim())?.khasra_no || '';
  const isJoint = meta.ownership_type === 'joint' || ownerCount >= 2;

  const fillPrimaryFromFarmer = () => {
    if (!farmerName?.trim()) return;
    const khasra = primaryKhasra;
    setLandOwners(prev => {
      if (prev.length === 0) return [{ ...emptyOwner(), owner_name: farmerName.trim(), khasra_no: khasra, is_primary_owner: true }];
      return prev.map((row, i) => i === 0
        ? { ...row, owner_name: farmerName.trim(), khasra_no: row.khasra_no || khasra, is_primary_owner: true }
        : row);
    });
    if (ownerCount >= 2) setMeta(m => ({ ...m, ownership_type: 'joint' }));
  };

  return (
    <div className="land-registry-section">
      <div className="land-registry-hint">
        <strong>Land details from 7/12 &amp; NOC</strong> — Enter the khasra number and all owners exactly as printed on the land papers.
        For joint family land, choose <em>Joint</em> and add every owner from the NOC.
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
            value={isJoint ? 'joint' : meta.ownership_type}
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
          <h3 className="form-section-title">Khasra / plot numbers</h3>
        </div>
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <p className="text-muted land-registry-block-desc">
            One line per khasra. Example: <strong>421/187</strong> with area in square metres (SQM).
          </p>
          <div className="land-registry-parcel-list">
            {landParcels.map((row, idx) => (
              <div key={idx} className="land-registry-parcel-card">
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
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setLandParcels(p => p.filter((_, i) => i !== idx))} title="Remove this khasra">
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Notes</label>
                  <input className="form-control" value={row.notes} onChange={e => updateParcel(idx, 'notes', e.target.value)} />
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setLandParcels(p => [...p, emptyParcel()])}>
              <Plus size={14} /> Add another khasra
            </button>
            {parcelTotalSqm > 0 && (
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                Total plot area: {parcelTotalSqm.toLocaleString('en-IN')} SQM ({(parcelTotalSqm / 10000).toFixed(4)} hectares)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="form-section land-registry-block">
        <div className="form-section-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} className="form-section-icon" />
            <h3 className="form-section-title" style={{ margin: 0 }}>Land owners (from NOC)</h3>
          </div>
          {farmerName && (
            <button type="button" className="btn btn-outline btn-sm" onClick={fillPrimaryFromFarmer}>
              <UserCheck size={14} /> Use farmer &quot;{farmerName}&quot; as primary owner
            </button>
          )}
        </div>
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <p className="text-muted land-registry-block-desc">
            List every name on the NOC. Mark the main applicant as <strong>Primary</strong>. Share can be entered as a fraction (e.g. 1/6).
          </p>

          {isJoint && ownerCount < 2 && (
            <div className="land-registry-warn" style={{ marginBottom: '0.75rem' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Joint ownership is selected but only one owner is listed. Add all co-owners from the NOC.</span>
            </div>
          )}
          {hasShares && ownerCount >= 2 && shareTotal > 0 && Math.abs(shareTotal - 100) > 2 && (
            <div className="land-registry-warn" style={{ marginBottom: '0.75rem' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Owner shares add up to {shareTotal.toFixed(1)}% — they should total about 100%. Please check the NOC.</span>
            </div>
          )}
          {parcelTotalSqm > 0 && ownerTotalSqm > 0 && Math.abs(parcelTotalSqm - ownerTotalSqm) > parcelTotalSqm * 0.05 && (
            <div className="land-registry-warn" style={{ marginBottom: '0.75rem' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Plot area ({parcelTotalSqm.toLocaleString('en-IN')} SQM) and owner areas ({ownerTotalSqm.toLocaleString('en-IN')} SQM) do not match closely. One may be per-share — verify against the NOC.</span>
            </div>
          )}

          <div className="land-registry-owner-list">
            {landOwners.map((row, idx) => (
              <div key={idx} className={`land-registry-owner-card${row.is_primary_owner ? ' is-primary' : ''}`}>
                <div className="land-registry-field-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Owner name *</label>
                    <input className="form-control" value={row.owner_name} onChange={e => updateOwner(idx, 'owner_name', e.target.value)} placeholder="Nathu Ram" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Father&apos;s name</label>
                    <input className="form-control" value={row.father_name} onChange={e => updateOwner(idx, 'father_name', e.target.value)} placeholder="Pemaram" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Relation</label>
                    <input className="form-control" value={row.relation} onChange={e => updateOwner(idx, 'relation', e.target.value)} placeholder="S/o" />
                  </div>
                </div>
                <div className="land-registry-field-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Khasra</label>
                    <input className="form-control" value={row.khasra_no} onChange={e => updateOwner(idx, 'khasra_no', e.target.value)} placeholder={primaryKhasra || '421/187'} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Area (Ha)</label>
                    <input className="form-control" type="number" step="0.0001" value={row.area_hectare} onChange={e => updateOwner(idx, 'area_hectare', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Share</label>
                    <input className="form-control" value={row.share_fraction} onChange={e => updateOwner(idx, 'share_fraction', e.target.value)} placeholder="1/6" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">%</label>
                    <input className="form-control" type="number" step="0.01" value={row.share_percentage} onChange={e => updateOwner(idx, 'share_percentage', e.target.value)} />
                  </div>
                </div>
                <div className="land-registry-owner-footer">
                  <label className="land-registry-primary-label" title="Main applicant on this project">
                    <input type="checkbox" checked={row.is_primary_owner} onChange={e => updateOwner(idx, 'is_primary_owner', e.target.checked)} />
                    Primary owner
                  </label>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setLandOwners(o => o.filter((_, i) => i !== idx))}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setLandOwners(o => [...o, emptyOwner()])}>
              <Plus size={14} /> Add another owner
            </button>
            {ownerTotalSqm > 0 && (
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                Total owner area: {ownerTotalSqm.toLocaleString('en-IN')} SQM ({(ownerTotalSqm / 10000).toFixed(4)} hectares)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
