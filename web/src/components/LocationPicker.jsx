/**
 * LocationPicker — Cascading State → District → Taluka → Village selector
 *
 * Props:
 *   value      : number | ''   (village_id currently selected)
 *   onChange   : (village_id: number | '') => void
 *   required   : bool  (marks Village label with *)
 *   compact    : bool  (renders all four in a single row)
 *   disabled   : bool
 */
import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader } from 'lucide-react';
import { getStates, getDistricts, getTalukas, getVillages } from '../api/client';

const SEL_STYLE = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  borderRadius: '8px',
  border: '1.5px solid var(--glass-border, #e2e8f0)',
  background: 'var(--color-bg-card, #fff)',
  color: 'var(--color-text-main, #1e293b)',
  fontSize: '0.875rem',
  outline: 'none',
};

const LABEL_STYLE = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--color-text-muted, #64748b)',
  marginBottom: '0.3rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const LocationPicker = ({ value = '', onChange, required = false, compact = false, disabled = false }) => {
  const [states,    setStates]    = useState([]);
  const [districts, setDistricts] = useState([]);
  const [talukas,   setTalukas]   = useState([]);
  const [villages,  setVillages]  = useState([]);

  const [stateId,    setStateId]    = useState('');
  const [districtId, setDistrictId] = useState('');
  const [talukaId,   setTalukaId]   = useState('');
  const [villageId,  setVillageId]  = useState('');

  const [resolving, setResolving] = useState(false);

  // ── Load state list once ──────────────────────────────────────────────────────
  useEffect(() => {
    getStates().then(setStates).catch(() => setStates([]));
  }, []);

  // ── Reverse-resolve when value arrives (edit mode) ────────────────────────────
  useEffect(() => {
    if (!value) {
      setStateId(''); setDistrictId(''); setTalukaId(''); setVillageId('');
      setDistricts([]); setTalukas([]); setVillages([]);
      return;
    }
    if (String(value) === String(villageId)) return; // already resolved

    (async () => {
      setResolving(true);
      try {
        const allTalukas = await getTalukas(); // no filter — ALL
        for (const t of allTalukas) {
          const vs = await getVillages(t.id);
          const found = vs.find(v => String(v.id) === String(value));
          if (found) {
            // Now find the district & state for this taluka
            const allDistricts = await getDistricts();
            const dist = allDistricts.find(d => d.id === t.district_id);
            setStateId(dist ? String(dist.state_id) : '');
            setDistrictId(String(t.district_id));
            setTalukaId(String(t.id));
            setVillageId(String(found.id));
            if (dist) {
              setDistricts(allDistricts.filter(d => String(d.state_id) === String(dist.state_id)));
            }
            setTalukas(allTalukas.filter(tt => String(tt.district_id) === String(t.district_id)));
            setVillages(vs);
            break;
          }
        }
      } catch { /* ignore */ }
      finally { setResolving(false); }
    })();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cascade handlers ──────────────────────────────────────────────────────────
  const handleStateChange = useCallback(async (e) => {
    const sid = e.target.value;
    setStateId(sid); setDistrictId(''); setTalukaId(''); setVillageId('');
    setTalukas([]); setVillages([]);
    onChange('');
    if (!sid) { setDistricts([]); return; }
    try { setDistricts(await getDistricts(sid)); } catch { setDistricts([]); }
  }, [onChange]);

  const handleDistrictChange = useCallback(async (e) => {
    const did = e.target.value;
    setDistrictId(did); setTalukaId(''); setVillageId('');
    setVillages([]);
    onChange('');
    if (!did) { setTalukas([]); return; }
    try { setTalukas(await getTalukas(did)); } catch { setTalukas([]); }
  }, [onChange]);

  const handleTalukaChange = useCallback(async (e) => {
    const tid = e.target.value;
    setTalukaId(tid); setVillageId('');
    onChange('');
    if (!tid) { setVillages([]); return; }
    try { setVillages(await getVillages(tid)); } catch { setVillages([]); }
  }, [onChange]);

  const handleVillageChange = (e) => {
    const vid = e.target.value;
    setVillageId(vid);
    onChange(vid ? Number(vid) : '');
  };

  const gridStyle = compact
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }
    : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' };

  const selProps = (isDisabled) => ({
    style: { ...SEL_STYLE, opacity: isDisabled ? 0.55 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' },
    disabled: disabled || isDisabled,
  });

  if (resolving) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', padding: '0.75rem 0', fontSize: '0.85rem' }}>
        <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Resolving location…
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <MapPin size={14} color="#6366f1" />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Location
        </span>
      </div>

      <div style={gridStyle}>
        {/* State */}
        <div>
          <label style={LABEL_STYLE}>State</label>
          <select {...selProps(false)} value={stateId} onChange={handleStateChange}>
            <option value="">Select State…</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* District */}
        <div>
          <label style={LABEL_STYLE}>District</label>
          <select {...selProps(!stateId)} value={districtId} onChange={handleDistrictChange}>
            <option value="">Select District…</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Taluka */}
        <div>
          <label style={LABEL_STYLE}>Taluka</label>
          <select {...selProps(!districtId)} value={talukaId} onChange={handleTalukaChange}>
            <option value="">Select Taluka…</option>
            {talukas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Village */}
        <div>
          <label style={LABEL_STYLE}>Village {required && <span style={{ color: '#ef4444' }}>*</span>}</label>
          <select {...selProps(!talukaId)} value={villageId} onChange={handleVillageChange}>
            <option value="">Select Village…</option>
            {villages.map(v => <option key={v.id} value={v.id}>{v.name}{v.pincode ? ` (${v.pincode})` : ''}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
