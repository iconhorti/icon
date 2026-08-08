import { Plus, Trash2, Users } from 'lucide-react';
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
  'agricultural', 'irrigated', 'unirrigated', 'barren', 'residential', 'commercial', 'other',
];

function fractionToPct(fraction: string): string {
  if (!fraction.includes('/')) return '';
  const [a, b] = fraction.split('/').map(s => parseFloat(s.trim()));
  if (!a || !b) return '';
  return String(Math.round((a / b) * 10000) / 100);
}

interface Props {
  meta: LandRegistryMeta;
  setMeta: Dispatch<SetStateAction<LandRegistryMeta>>;
  landParcels: LandParcelRow[];
  setLandParcels: Dispatch<SetStateAction<LandParcelRow[]>>;
  landOwners: LandOwnerRow[];
  setLandOwners: Dispatch<SetStateAction<LandOwnerRow[]>>;
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
  meta, setMeta, landParcels, setLandParcels, landOwners, setLandOwners,
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

  return (
    <>
      <div className="form-section" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Khatauni No. (8A)</label>
            <input
              className="form-control"
              value={meta.khatauni_number}
              onChange={e => setMeta(m => ({ ...m, khatauni_number: e.target.value }))}
              placeholder="Khata / account number"
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Ownership type</label>
            <select
              className="form-control"
              value={ownerCount >= 2 ? 'joint' : meta.ownership_type}
              onChange={e => setMeta(m => ({ ...m, ownership_type: e.target.value as 'single' | 'joint' }))}
            >
              <option value="single">Single</option>
              <option value="joint">Joint</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <Users size={18} className="form-section-icon" />
          <h3 className="form-section-title">Khasra / Survey Parcels</h3>
        </div>
        <p className="text-muted" style={{ fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
          One row per khasra on the 7/12 or NOC (e.g. 421/187). Add multiple rows when plots differ.
        </p>
        <div className="form-section-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {landParcels.map((row, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 0.9fr 1fr 0.7fr auto', gap: '0.5rem', alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Khasra *</label>
                <input className="form-control" value={row.khasra_no} onChange={e => updateParcel(idx, 'khasra_no', e.target.value)} placeholder="421/187" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Survey no.</label>
                <input className="form-control" value={row.survey_no} onChange={e => updateParcel(idx, 'survey_no', e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Area (SQM)</label>
                <input className="form-control" type="number" value={row.area_sqm} onChange={e => updateParcel(idx, 'area_sqm', e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Land type</label>
                <select className="form-control" value={row.land_type} onChange={e => updateParcel(idx, 'land_type', e.target.value)}>
                  {LAND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Notes</label>
                <input className="form-control" value={row.notes} onChange={e => updateParcel(idx, 'notes', e.target.value)} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', marginBottom: 8 }}>
                <input type="checkbox" checked={row.encumbrance} onChange={e => updateParcel(idx, 'encumbrance', e.target.checked)} />
                Encumbrance
              </label>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setLandParcels(p => p.filter((_, i) => i !== idx))}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setLandParcels(p => [...p, emptyParcel()])}>
            <Plus size={14} /> Add Khasra
          </button>
          {parcelTotalSqm > 0 && (
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              Parcel total: {parcelTotalSqm.toLocaleString('en-IN')} SQM ({(parcelTotalSqm / 10000).toFixed(4)} Ha)
            </span>
          )}
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <Users size={18} className="form-section-icon" />
          <h3 className="form-section-title">Joint Land Owners (NOC)</h3>
        </div>
        <p className="text-muted" style={{ fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
          All owners on the NOC — primary project owner plus co-owners with share and area.
        </p>
        <div className="form-section-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {landOwners.map((row, idx) => (
            <div key={idx} style={{
              display: 'grid',
              gridTemplateColumns: '1.3fr 0.9fr 0.9fr 0.8fr 0.7fr 0.6fr 0.6fr 0.5fr auto',
              gap: '0.5rem', alignItems: 'end', padding: '0.5rem',
              background: row.is_primary_owner ? 'var(--color-primary-soft)' : 'transparent',
              borderRadius: 8,
            }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Owner *</label>
                <input className="form-control" value={row.owner_name} onChange={e => updateOwner(idx, 'owner_name', e.target.value)} placeholder="Nathu Ram" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Father</label>
                <input className="form-control" value={row.father_name} onChange={e => updateOwner(idx, 'father_name', e.target.value)} placeholder="Pemaram" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Relation</label>
                <input className="form-control" value={row.relation} onChange={e => updateOwner(idx, 'relation', e.target.value)} placeholder="S/o" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Khasra</label>
                <input className="form-control" value={row.khasra_no} onChange={e => updateOwner(idx, 'khasra_no', e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Ha</label>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', marginBottom: 8 }}>
                <input type="checkbox" checked={row.is_primary_owner} onChange={e => updateOwner(idx, 'is_primary_owner', e.target.checked)} />
                Primary
              </label>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setLandOwners(o => o.filter((_, i) => i !== idx))}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setLandOwners(o => [...o, emptyOwner()])}>
            <Plus size={14} /> Add Owner
          </button>
          {ownerTotalSqm > 0 && (
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              Owners total: {ownerTotalSqm.toLocaleString('en-IN')} SQM ({(ownerTotalSqm / 10000).toFixed(4)} Ha)
            </span>
          )}
        </div>
      </div>
    </>
  );
}
