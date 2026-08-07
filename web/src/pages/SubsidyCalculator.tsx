/**
 * ICON — Subsidy Calculator (Redesigned)
 *
 * Key improvements over previous version:
 *  - Live calculation: results update instantly as inputs change — no "Calculate" button
 *  - Structure selection as visual radio cards (not a cramped dropdown)
 *  - Always-visible results panel on the right — shows ₹0 state before any selection
 *  - Top summary bar: 4 KPI chips always showing the current totals
 *  - Form split into two logical tabs: "Structure & Area" and "Add-ons"
 *  - Breakdown table simplified from 9 columns → 5 columns
 *  - Clean CSS (no duplicates)
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Building2, Leaf, Cpu, AlertTriangle, Trash2,
  ChevronDown, ChevronUp, CheckCircle, Info, Landmark,
  Layers, Calculator
} from 'lucide-react';
import { getSubsidyRates } from '../api/client';
import './SubsidyCalculator.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inr = (n: number | null | undefined): string => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const inrL = (n: number | null | undefined): string => {
  if (!n) return '₹0';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)   return `₹${(n / 100_000).toFixed(2)} L`;
  return inr(n);
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Structure {
  id: string;
  code: string;
  label: string;
  costPerSqm: number;
  eligible: boolean;
}
interface Crop {
  id: string;
  label: string;
  category: string;
  costPerSqm: number;
}
interface AreaType {
  id: string;
  label: string;
  multiplier: number;
}
interface SubsidyComponent {
  id: string;
  name: string;
  costPerUnit: number;
  unit: string;
  unitType: string;
}
interface SelectedComponent extends SubsidyComponent {
  qty: number;
}
interface CalcLine {
  type: string;
  name: string;
  code?: string;
  category?: string;
  area: number;
  rate: number;
  unit: string;
  eligible: number;
  subsidy: number;
  qty?: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Structure radio card */
const StructureCard = ({ structure, selected, onSelect }: { structure: Structure; selected: boolean; onSelect: (id: string) => void }) => (
  <button
    type="button"
    className={`sc-struct-card ${selected ? 'selected' : ''} ${!structure.eligible ? 'ineligible' : ''}`}
    onClick={() => structure.eligible && onSelect(structure.id)}
    title={!structure.eligible ? 'Not eligible for government subsidy' : ''}
  >
    <div className="sc-struct-top">
      <span className="sc-struct-code">{structure.code || structure.id}</span>
      {!structure.eligible
        ? <span className="sc-struct-badge ineligible">Not Eligible</span>
        : selected
          ? <CheckCircle size={16} className="sc-struct-check" />
          : null
      }
    </div>
    <p className="sc-struct-name">{structure.label}</p>
    {structure.eligible
      ? <p className="sc-struct-rate">₹{structure.costPerSqm.toLocaleString()}<span>/sqm</span></p>
      : <p className="sc-struct-rate ineligible-rate">—</p>
    }
  </button>
);

/** Single line in the breakdown table */
interface BreakdownRowProps {
  num: number;
  type: string;
  name: string;
  area: number;
  rate: number;
  eligible: number;
  subsidy: number;
  unit?: string;
  qty?: number;
}
const BreakdownRow = ({ num, type, name, area, rate, eligible, subsidy, unit = 'SQM', qty }: BreakdownRowProps) => (
  <tr>
    <td className="sc-td-num">{num}</td>
    <td><span className={`sc-type-badge ${type.toLowerCase()}`}>{type}</span></td>
    <td className="sc-td-name">{name}</td>
    <td className="sc-td-right">{unit === 'SQM' ? `${Number(area).toLocaleString()} sqm` : `${qty} ${unit}`}</td>
    <td className="sc-td-right sc-td-rate">₹{Number(rate).toLocaleString()}/{unit === 'SQM' ? 'sqm' : unit}</td>
    <td className="sc-td-right">{inr(eligible)}</td>
    <td className="sc-td-right sc-td-subsidy">{inr(subsidy)}</td>
  </tr>
);

/** KPI chip in the summary bar */
interface SummaryChipProps {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}
const SummaryChip = ({ label, value, color, sub }: SummaryChipProps) => (
  <div className={`sc-chip sc-chip-${color}`}>
    <p className="sc-chip-label">{label}</p>
    <p className="sc-chip-value">{value}</p>
    {sub && <p className="sc-chip-sub">{sub}</p>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const SubsidyCalculator = () => {
  // ── Data from backend ──
  const [structures,  setStructures]  = useState<Structure[]>([]);
  const [crops,       setCrops]       = useState<Crop[]>([]);
  const [areaTypes,   setAreaTypes]   = useState<AreaType[]>([]);
  const [components,  setComponents]  = useState<SubsidyComponent[]>([]);
  const [ratesLoaded, setRatesLoaded] = useState<boolean>(false);

  // ── Form state ──
  const [tab,          setTab]        = useState<'structure' | 'addons'>('structure');
  const [structureId,  setStructureId] = useState<string>('');
  const [areaSqm,      setAreaSqm]    = useState<string>('4000');
  const [areaTypeId,   setAreaTypeId] = useState<string>('');
  const [includeCrop,  setIncludeCrop] = useState<boolean>(false);
  const [cropId,       setCropId]     = useState<string>('');
  const [selComponents, setSelComponents] = useState<SelectedComponent[]>([]);
  const [compSearch,   setCompSearch] = useState<string>('');
  const [showCompDD,   setShowCompDD] = useState<boolean>(false);

  // ── Load rates ──
  useEffect(() => {
    getSubsidyRates()
      .then((data: any) => {
        if (data?.structures?.length) {
          const mapped: Structure[] = data.structures.map((s: any) => ({
            id: String(s.id),
            code: s.code || '',
            label: s.name,
            costPerSqm: s.cost_per_sqm || 0,
            eligible: s.is_eligible !== false && (s.cost_per_sqm || 0) > 0,
          }));
          setStructures(mapped);
          const first = mapped.find(s => s.eligible);
          if (first) setStructureId(first.id);
        }
        if (data?.crops?.length) {
          const mapped: Crop[] = data.crops.map((c: any) => ({
            id: String(c.id),
            label: c.name,
            category: c.category || 'General',
            costPerSqm: c.cost_per_sqm || 0,
          }));
          setCrops(mapped);
          if (mapped[0]) setCropId(String(mapped[0].id));
        }
        if (data?.components?.length) {
          setComponents(data.components.map((c: any) => ({
            id: String(c.id),
            name: c.name,
            costPerUnit: c.cost || 0,
            unit: c.unit || 'NOS',
            unitType: c.unit_type || 'Per Project',
          })));
        }
        if (data?.area_types?.length) {
          const mapped: AreaType[] = data.area_types.map((a: any) => ({
            id: String(a.id),
            label: a.name,
            multiplier: a.multiplier || 1.0,
          }));
          setAreaTypes(mapped);
          if (mapped[0]) setAreaTypeId(String(mapped[0].id));
        }
        setRatesLoaded(true);
      })
      .catch(() => setRatesLoaded(true));
  }, []);

  // ── Derived ──
  const selectedStructure = structures.find(s => s.id === structureId);
  const selectedCrop      = crops.find(c => c.id === cropId);
  const selectedAreaType  = areaTypes.find(a => a.id === areaTypeId);
  const multiplier        = selectedAreaType?.multiplier || 1.0;
  const area              = parseFloat(areaSqm) || 0;

  // ── LIVE calculation (no button needed) ──
  const calc = useMemo(() => {
    if (!selectedStructure?.eligible || area <= 0) {
      return { lines: [] as CalcLine[], totalEligible: 0, totalSubsidy: 0, farmerContrib: 0, inst1: 0, inst2: 0, multiplier: undefined as number | undefined };
    }

    const structElig    = selectedStructure.costPerSqm * area * multiplier;
    const structSubsidy = structElig * 0.50;
    const structLine: CalcLine = {
      type: 'Structure', name: selectedStructure.label, code: selectedStructure.code,
      area, rate: selectedStructure.costPerSqm, unit: 'SQM',
      eligible: structElig, subsidy: structSubsidy,
    };

    const cropLine: CalcLine | null = includeCrop && selectedCrop ? (() => {
      const elig    = selectedCrop.costPerSqm * area * multiplier;
      const subsidy = elig * 0.50;
      return {
        type: 'Crop', name: selectedCrop.label, category: selectedCrop.category,
        area, rate: selectedCrop.costPerSqm, unit: 'SQM',
        eligible: elig, subsidy,
      };
    })() : null;

    const compLines: CalcLine[] = selComponents.map(c => {
      const elig    = c.costPerUnit * c.qty * multiplier;
      const subsidy = elig * 0.50;
      return { ...c, type: 'Component', unit: c.unit, rate: c.costPerUnit, area: 0, eligible: elig, subsidy };
    });

    const lines: CalcLine[] = [structLine, cropLine, ...compLines].filter((l): l is CalcLine => Boolean(l));
    const totalEligible = lines.reduce((s, l) => s + l.eligible, 0);
    const totalSubsidy  = lines.reduce((s, l) => s + l.subsidy,  0);

    return {
      lines,
      totalEligible,
      totalSubsidy,
      farmerContrib: totalEligible - totalSubsidy,
      inst1: totalSubsidy * 0.60,
      inst2: totalSubsidy * 0.40,
      multiplier,
    };
  }, [selectedStructure, selectedCrop, selComponents, area, multiplier, includeCrop]);

  // ── Component helpers ──
  const addComponent = (comp: SubsidyComponent) => {
    if (selComponents.find(c => c.id === comp.id)) return;
    setSelComponents(p => [...p, { ...comp, qty: 1 }]);
    setCompSearch('');
    setShowCompDD(false);
  };

  const removeComponent = (id: string) => setSelComponents(p => p.filter(c => c.id !== id));

  const updateQty = (id: string, qty: number | string) =>
    setSelComponents(p => p.map(c => c.id === id ? { ...c, qty: Math.max(1, parseInt(String(qty)) || 1) } : c));

  const compSearchResults = compSearch.length >= 2
    ? components.filter(c =>
        c.name.toLowerCase().includes(compSearch.toLowerCase()) &&
        !selComponents.find(sc => sc.id === c.id)
      ).slice(0, 8)
    : [];

  const isEligible = selectedStructure?.eligible && area > 0;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="sc-root animate-fade-in">

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title"><Calculator size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Subsidy Calculator</h1>
          <p className="page-subtitle">
            MIDH / NHB / NHM / NABARD — 50% government subsidy on eligible project cost
          </p>
        </div>
        <div className="sc-scheme-pills">
          {['MIDH', 'NHB', 'NHM', 'NABARD'].map(s => (
            <span key={s} className="sc-scheme-pill">{s}</span>
          ))}
        </div>
      </div>

      {/* ── Summary bar (live) ── */}
      <div className="sc-summary-bar animate-fade-in animate-delay-1">
        <SummaryChip label="Eligible Project Cost" value={inrL(calc.totalEligible)} color="blue"   sub="Base for subsidy" />
        <SummaryChip label="Government Subsidy"    value={inrL(calc.totalSubsidy)}  color="green"  sub="50% of eligible" />
        <SummaryChip label="Farmer Contribution"   value={inrL(calc.farmerContrib)} color="orange" sub="Your share" />
        <SummaryChip label="Area"                  value={area ? `${Number(areaSqm).toLocaleString()} sqm` : '—'} color="grey" sub={selectedAreaType ? `${selectedAreaType.label} (${multiplier}×)` : 'Select area type'} />
      </div>

      {/* ── Main grid ── */}
      <div className="sc-grid">

        {/* ══ LEFT — Form Panel ══ */}
        <div className="sc-form-panel glass-card">

          {/* Tab bar */}
          <div className="sc-tabs">
            <button className={`sc-tab ${tab === 'structure' ? 'active' : ''}`} onClick={() => setTab('structure')}>
              <Building2 size={15} /> Structure & Area
            </button>
            <button className={`sc-tab ${tab === 'addons' ? 'active' : ''}`} onClick={() => setTab('addons')}>
              <Layers size={15} /> Crops & Components
              {(includeCrop || selComponents.length > 0) && (
                <span className="sc-tab-badge">{(includeCrop ? 1 : 0) + selComponents.length}</span>
              )}
            </button>
          </div>

          {/* ── TAB 1: Structure & Area ── */}
          {tab === 'structure' && (
            <div className="sc-tab-content animate-fade-in">

              <div className="sc-field-group">
                <label className="sc-label">Area Classification</label>
                <div className="sc-area-type-pills">
                  {areaTypes.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      className={`sc-area-pill ${areaTypeId === a.id ? 'active' : ''}`}
                      onClick={() => setAreaTypeId(a.id)}
                    >
                      {a.label}
                      {a.multiplier > 1 && <span className="sc-multiplier">{a.multiplier}×</span>}
                    </button>
                  ))}
                </div>
                {multiplier > 1 && (
                  <p className="sc-field-hint">
                    <Info size={12} /> {selectedAreaType?.label} rate applies a <strong>{multiplier}× multiplier</strong> on eligible costs.
                  </p>
                )}
              </div>

              <div className="sc-field-group">
                <label className="sc-label" htmlFor="area-input">
                  Project Area (sqm)
                </label>
                <div className="sc-area-input-wrap">
                  <input
                    id="area-input"
                    type="number"
                    className="input-field sc-area-input"
                    value={areaSqm}
                    onChange={e => setAreaSqm(e.target.value)}
                    placeholder="e.g. 4000"
                    min="100"
                  />
                  <span className="sc-area-unit">sqm</span>
                  {area > 0 && (
                    <span className="sc-area-acres">{(area / 4047).toFixed(2)} acres</span>
                  )}
                </div>
              </div>

              <div className="sc-field-group">
                <label className="sc-label">Structure Type</label>
                <p className="sc-field-hint"><Info size={12} /> Only eligible structures qualify for government subsidy.</p>
                {ratesLoaded ? (
                  <div className="sc-struct-grid">
                    {structures.map(s => (
                      <StructureCard
                        key={s.id}
                        structure={s}
                        selected={structureId === s.id}
                        onSelect={setStructureId}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="sc-loading">Loading structures…</div>
                )}
              </div>

              {selectedStructure && !selectedStructure.eligible && (
                <div className="sc-warn-box">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Not Eligible for Subsidy</strong>
                    <p>This structure type is excluded from MIDH / NHB / NHM schemes. Please select an eligible structure.</p>
                  </div>
                </div>
              )}

              <button
                className="btn btn-outline sc-next-btn"
                onClick={() => setTab('addons')}
                disabled={!isEligible}
              >
                Next: Add Crops & Components <ChevronDown size={14} />
              </button>
            </div>
          )}

          {/* ── TAB 2: Crops & Components ── */}
          {tab === 'addons' && (
            <div className="sc-tab-content animate-fade-in">

              {/* Crop section */}
              <div className="sc-field-group">
                <div className="sc-addon-header">
                  <Leaf size={16} style={{ color: '#22c55e' }} />
                  <span className="sc-addon-title">Crop Component</span>
                  <label className="sc-toggle">
                    <input
                      type="checkbox"
                      checked={includeCrop}
                      onChange={e => setIncludeCrop(e.target.checked)}
                    />
                    <span className="sc-toggle-track">
                      <span className="sc-toggle-thumb" />
                    </span>
                    <span>{includeCrop ? 'Included' : 'Not included'}</span>
                  </label>
                </div>

                {includeCrop && (
                  <div className="sc-crop-list">
                    {crops.map(c => (
                      <label key={c.id} className={`sc-crop-option ${cropId === c.id ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="crop"
                          value={c.id}
                          checked={cropId === c.id}
                          onChange={() => setCropId(c.id)}
                        />
                        <div className="sc-crop-info">
                          <span className="sc-crop-name">{c.label}</span>
                          <span className="sc-crop-cat">{c.category}</span>
                        </div>
                        <span className="sc-crop-rate">₹{c.costPerSqm}/sqm</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Components section */}
              <div className="sc-field-group">
                <div className="sc-addon-header">
                  <Cpu size={16} style={{ color: '#6366f1' }} />
                  <span className="sc-addon-title">Additional Components</span>
                  <span className="sc-addon-hint">Borewell, Pack house, etc.</span>
                </div>

                <div className="sc-comp-search-wrap">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Type to search components…"
                    value={compSearch}
                    onChange={e => { setCompSearch(e.target.value); setShowCompDD(true); }}
                    onFocus={() => compSearch.length >= 2 && setShowCompDD(true)}
                    onBlur={() => setTimeout(() => setShowCompDD(false), 200)}
                  />
                  {showCompDD && compSearchResults.length > 0 && (
                    <div className="sc-comp-dropdown">
                      {compSearchResults.map(c => (
                        <div key={c.id} className="sc-comp-dd-item" onMouseDown={() => addComponent(c)}>
                          <span>{c.name}</span>
                          <span className="sc-comp-dd-rate">₹{c.costPerUnit?.toLocaleString()}/{c.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selComponents.length > 0 ? (
                  <div className="sc-sel-comps">
                    {selComponents.map(c => (
                      <div key={c.id} className="sc-sel-comp-row">
                        <div className="sc-sel-comp-info">
                          <span className="sc-sel-comp-name">{c.name}</span>
                          <span className="sc-sel-comp-rate">₹{c.costPerUnit?.toLocaleString()}/{c.unit}</span>
                        </div>
                        <div className="sc-sel-comp-qty">
                          <button onClick={() => updateQty(c.id, c.qty - 1)} className="sc-qty-btn">−</button>
                          <input
                            type="number"
                            min="1"
                            className="sc-qty-input"
                            value={c.qty}
                            onChange={e => updateQty(c.id, e.target.value)}
                          />
                          <button onClick={() => updateQty(c.id, c.qty + 1)} className="sc-qty-btn">+</button>
                        </div>
                        <span className="sc-sel-comp-total">{inr(c.costPerUnit * c.qty)}</span>
                        <button className="sc-comp-remove" onClick={() => removeComponent(c.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="sc-empty-comps">No components added. Search above to add borewell, pack house, etc.</p>
                )}
              </div>

              <button className="btn btn-outline sc-next-btn" onClick={() => setTab('structure')}>
                <ChevronUp size={14} /> Back to Structure
              </button>
            </div>
          )}
        </div>

        {/* ══ RIGHT — Live Results Panel ══ */}
        <div className="sc-results-panel">

          {isEligible ? (
            <>
              {/* Hero subsidy card */}
              <div className="glass-card-dark sc-hero animate-fade-in">
                <p className="sc-hero-label">Government Subsidy (50%)</p>
                <h2 className="sc-hero-value">{inrL(calc.totalSubsidy)}</h2>
                <p className="sc-hero-sub">
                  50% of {inrL(calc.totalEligible)} eligible cost
                  {multiplier > 1 ? ` · ${multiplier}× rate applied` : ''}
                </p>
              </div>

              {/* 3 summary cards */}
              <div className="sc-summary-cards">
                <div className="sc-sum-card blue">
                  <p className="sc-sum-label">Eligible Cost</p>
                  <p className="sc-sum-value">{inrL(calc.totalEligible)}</p>
                </div>
                <div className="sc-sum-card green">
                  <p className="sc-sum-label">Govt. Subsidy</p>
                  <p className="sc-sum-value">{inrL(calc.totalSubsidy)}</p>
                </div>
                <div className="sc-sum-card orange">
                  <p className="sc-sum-label">Your Share</p>
                  <p className="sc-sum-value">{inrL(calc.farmerContrib)}</p>
                </div>
              </div>

              {/* Disbursement schedule */}
              <div className="glass-card sc-disbursement animate-fade-in animate-delay-1">
                <h4 className="sc-section-title">
                  <Landmark size={15} /> Disbursement Schedule
                </h4>
                <div className="sc-dis-row">
                  <div className="sc-dis-item">
                    <span className="sc-dis-step">1st Installment</span>
                    <span className="sc-dis-amount">{inrL(calc.inst1)}</span>
                    <span className="sc-dis-note">60% — After M3 Structure Erection</span>
                  </div>
                  <div className="sc-dis-divider" />
                  <div className="sc-dis-item">
                    <span className="sc-dis-step">2nd Installment</span>
                    <span className="sc-dis-amount">{inrL(calc.inst2)}</span>
                    <span className="sc-dis-note">40% — Post Inspection & Committee</span>
                  </div>
                </div>
              </div>

              {/* Breakdown table */}
              <div className="glass-card sc-breakdown animate-fade-in animate-delay-2">
                <h4 className="sc-section-title">
                  <Layers size={15} /> Calculation Breakdown
                </h4>
                <div className="sc-table-wrap">
                  <table className="sc-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Type</th>
                        <th>Item</th>
                        <th className="sc-td-right">Qty / Area</th>
                        <th className="sc-td-right">Rate</th>
                        <th className="sc-td-right">Eligible Cost</th>
                        <th className="sc-td-right">Subsidy (50%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.lines.map((line, i) => (
                        <BreakdownRow
                          key={`${line.type}-${line.name}-${i}`}
                          num={i + 1}
                          type={line.type}
                          name={line.name}
                          area={line.area}
                          rate={line.rate}
                          eligible={line.eligible}
                          subsidy={line.subsidy}
                          unit={line.unit}
                          qty={line.qty}
                        />
                      ))}
                      <tr className="sc-total-row">
                        <td colSpan={5} className="sc-td-right">TOTAL</td>
                        <td className="sc-td-right">{inr(calc.totalEligible)}</td>
                        <td className="sc-td-right sc-td-subsidy">{inr(calc.totalSubsidy)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="sc-note animate-fade-in animate-delay-3">
                <Info size={14} />
                <p>
                  Indicative figures based on <strong>MIDH / NHB / NHM / NABARD</strong> norms.
                  Final subsidy is subject to site inspection, committee approval, and prevailing scheme rates.
                </p>
              </div>
            </>
          ) : (
            /* Empty / not-yet-eligible state */
            <div className="sc-empty-results glass-card">
              <div className="sc-empty-icon">
                <Calculator size={40} />
              </div>
              <h3>Select an eligible structure</h3>
              <p>Choose a structure type and enter project area on the left to see the live subsidy calculation.</p>

              {ratesLoaded && structures.length > 0 && (
                <div className="sc-rate-ref">
                  <p className="sc-rate-ref-title">Quick Reference — Eligible Structures</p>
                  {structures.filter(s => s.eligible).map(s => (
                    <div key={s.id} className="sc-rate-ref-row">
                      <span><strong>[{s.code || s.id}]</strong> {s.label}</span>
                      <span className="sc-rate-ref-val">₹{s.costPerSqm.toLocaleString()}/sqm</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubsidyCalculator;
