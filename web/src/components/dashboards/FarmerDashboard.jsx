/**
 * Farmer Dashboard  v2
 * ─ Added:   4 KPI stat cards (Progress %, Subsidy, Project Cost, Days Running)
 * ─ Fixed:   project.created_at, land_area, project_code now from real backend fields
 * ─ Removed: fake EMI Tracker (hardcoded ₹12,450 / ₹2,50,000)
 * ─ Removed: fake Weather widget (hardcoded Nashik 28°C)
 * ─ Removed: broken /appointments link (route doesn't exist)
 * ─ Removed: Construction Photos stub (non-functional placeholder)
 * ─ Replaced: Subsidy card now uses real total_subsidy_proposed from backend
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle, Clock, ArrowRight, FileText, Landmark, Building2,
  MapPin, Calendar, Bell, Home, TrendingUp, IndianRupee,
  MessageCircle, Activity, Leaf
} from 'lucide-react';
import '../../pages/Dashboard.css';

// ─── Full 19-stage pipeline ───────────────────────────────────────────────────
const STAGES = [
  { id: 'farmer_onboarding',    label: 'Lead Generation',     group: 'Onboarding',    color: '#6366f1' },
  { id: 'document_collection',  label: 'Document Collection', group: 'Onboarding',    color: '#8b5cf6' },
  { id: 'site_visit',           label: 'Site Visit',          group: 'Planning',      color: '#0ea5e9' },
  { id: 'design_boq',           label: 'Design & BOQ',        group: 'Planning',      color: '#06b6d4' },
  { id: 'dpr_ready',            label: 'DPR Ready',           group: 'Planning',      color: '#14b8a6' },
  { id: 'bank_processing',      label: 'Bank Processing',     group: 'Financial',     color: '#f59e0b' },
  { id: 'goc_registration',     label: 'GOC Registration',    group: 'Financial',     color: '#d97706' },
  { id: 'm1_foundation',        label: 'M1 – Foundation',     group: 'Construction',  color: '#f97316' },
  { id: 'm2_structure_erection',label: 'M2 – Structure',      group: 'Construction',  color: '#ea580c' },
  { id: 'm3_covering_material', label: 'M3 – Covering',       group: 'Construction',  color: '#dc2626' },
  { id: 'm4_trellising',        label: 'M4 – Trellising',     group: 'Construction',  color: '#b91c1c' },
  { id: 'm5_drip_fitting',      label: 'M5 – Drip Fitting',   group: 'Construction',  color: '#c026d3' },
  { id: 'm6_bed_preparation',   label: 'M6 – Bed Prep',       group: 'Construction',  color: '#a855f7' },
  { id: 'm7_plantation',        label: 'M7 – Plantation',     group: 'Construction',  color: '#7c3aed' },
  { id: 'subsidy_claim',        label: 'Subsidy Claim Filed', group: 'Subsidy',       color: '#0ea5e9' },
  { id: 'agency_inspection',    label: 'Agency Inspection',   group: 'Subsidy',       color: '#2563eb' },
  { id: 'committee_meeting',    label: 'Committee Meeting',   group: 'Subsidy',       color: '#1d4ed8' },
  { id: 'subsidy_released',     label: 'Subsidy Released',    group: 'Subsidy',       color: '#22c55e' },
  { id: 'completed',            label: 'Project Completed',   group: 'Done',          color: '#16a34a' },
];

// Documents required at each key stage
const STAGE_DOCS = {
  farmer_onboarding:   ['Aadhaar Card (Front + Back)', 'PAN Card', 'Passport Photo'],
  document_collection: ['7/12 Land Record (Satbara)', 'Bank Passbook', 'Affidavit'],
  bank_processing:     ['Loan Application', 'Income Certificate'],
  goc_registration:    ['GOC Form Filled', 'Agency Registration Receipt'],
  subsidy_claim:       ['All Milestone Photos', 'CA Certificate', 'Claim Form'],
};

// Stage group → friendly badge
const getStageBadge = (stage) => {
  if (!stage)                            return { label: 'Not Started',        cls: 'badge-secondary', color: '#64748b' };
  if (stage === 'completed')             return { label: 'Completed',          cls: 'badge-success',   color: '#16a34a' };
  if (stage === 'subsidy_released')      return { label: 'Subsidy Released',   cls: 'badge-success',   color: '#22c55e' };
  if (['agency_inspection','committee_meeting','subsidy_claim'].includes(stage))
                                         return { label: 'Subsidy Processing', cls: 'badge-info',      color: '#0ea5e9' };
  if (stage.startsWith('m'))             return { label: 'Under Construction', cls: 'badge-warning',   color: '#f59e0b' };
  if (['bank_processing','goc_registration'].includes(stage))
                                         return { label: 'Financial Stage',    cls: 'badge-info',      color: '#3b82f6' };
  return                                        { label: 'In Progress',        cls: 'badge-warning',   color: '#f59e0b' };
};

// Format ₹ amounts
const fmtInr = (n) => {
  if (!n || n <= 0) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

// Days since a date string
const daysSince = (iso) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = 'primary' }) => (
  <div className={`kpi-card ${color}`}>
    <div className={`kpi-icon ${color}`}><Icon size={22} /></div>
    <div className="kpi-content">
      <p className="kpi-label">{label}</p>
      <h3 className="kpi-value">{value}</h3>
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
  </div>
);

// ─── FarmerDashboard ──────────────────────────────────────────────────────────
const FarmerDashboard = ({ stats, error, user }) => {
  const project  = stats?.my_project ?? null;
  const stage    = project?.project_stage ?? null;
  const stageIdx = stage ? STAGES.findIndex(s => s.id === stage) : -1;
  const pct      = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGES.length) * 100) : 0;
  const nextStage = stageIdx >= 0 && stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;
  const currentStageData = stageIdx >= 0 ? STAGES[stageIdx] : null;
  const stageBadge = getStageBadge(stage);
  const docs = stage ? (STAGE_DOCS[stage] ?? []) : [];

  // Financials — prefer real subsidy field, fall back to 50% estimate
  const projectCost = project?.estimated_project_cost ?? 0;
  const subsidyAmt  = project?.total_subsidy_proposed
                        ? project.total_subsidy_proposed
                        : projectCost * 0.5;
  const yourCost    = projectCost - subsidyAmt;

  // Dates
  const startDate  = project?.actual_start_date || project?.created_at;
  const daysRunning = daysSince(startDate);

  // ── No project yet ────────────────────────────────────────────────────────
  if (!project) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header animate-fade-in">
          <div className="dashboard-greeting">
            <h1 className="dashboard-title">🌱 My Project</h1>
            <p className="dashboard-subtitle">Welcome, {user.first_name}!</p>
          </div>
        </div>
        <div className="dashboard-card animate-fade-in" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(26,71,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Building2 size={40} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>No Project Started Yet</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
            Contact your Dealer or ICON Office to begin your polyhouse project journey.
          </p>
          <div className="flex gap-2 justify-center">
            <Link to="/notifications" className="btn btn-outline">
              <Landmark size={16} /> Contact ICON Office
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main dashboard ────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-greeting">
          <h1 className="dashboard-title">🌱 My Project</h1>
          <p className="dashboard-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
              {project.project_name || `Project #${project.id}`}
            </span>
            {project.project_code && (
              <span className="badge badge-secondary">{project.project_code}</span>
            )}
          </p>
        </div>
        <div className="dashboard-actions">
          <Link to={`/projects/${project.id}`} className="btn btn-primary">
            <Building2 size={16} /> View Full Details
          </Link>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="alert-banner danger animate-fade-in">
          <Bell size={18} />
          <span className="alert-content">{error}</span>
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid animate-fade-in animate-delay-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard
          icon={Activity}
          label="Project Progress"
          value={`${pct}%`}
          color="primary"
          sub={`Stage ${stageIdx + 1} of ${STAGES.length}: ${currentStageData?.label ?? '—'}`}
        />
        <KpiCard
          icon={IndianRupee}
          label="Govt. Subsidy (50%)"
          value={fmtInr(subsidyAmt)}
          color="success"
          sub={`Your cost: ${fmtInr(yourCost)}`}
        />
        <KpiCard
          icon={TrendingUp}
          label="Project Cost"
          value={fmtInr(projectCost)}
          color="warning"
          sub={project.area_type ? `Type: ${project.area_type}` : 'Total eligible cost'}
        />
        <KpiCard
          icon={Calendar}
          label="Days Running"
          value={daysRunning !== null ? daysRunning : '—'}
          color="info"
          sub={startDate ? `Started ${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Start date pending'}
        />
      </div>

      {/* ── Main content grid ─────────────────────────────────────────────── */}
      <div className="dashboard-grid grid-main" style={{ gap: '1.25rem' }}>

        {/* Left column */}
        <div className="flex flex-col gap-3">

          {/* Current Stage card (dark) */}
          <div className="dashboard-card glass-card-dark animate-fade-in animate-delay-2">
            <div className="card-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <h3 className="card-title text-white"><MapPin size={16} /> Current Stage</h3>
              <span style={{
                padding: '0.2rem 0.65rem', borderRadius: '999px',
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
                background: `${stageBadge.color}30`, color: stageBadge.color,
                border: `1px solid ${stageBadge.color}50`,
              }}>
                {stageBadge.label}
              </span>
            </div>
            <div className="card-body">
              <div className="text-center" style={{ padding: '0.75rem 0' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                  Stage {stageIdx + 1} of {STAGES.length} · {currentStageData?.group} Phase
                </p>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', margin: '0 0 1.25rem', fontFamily: 'var(--font-display)' }}>
                  {currentStageData?.label ?? 'Not Started'}
                </h3>

                {/* Progress bar */}
                <div style={{ margin: '0 auto 1.25rem', maxWidth: 320 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem' }}>Overall Progress</span>
                    <span style={{ color: '#fbbf24', fontSize: '0.85rem', fontWeight: 800 }}>{pct}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 999, height: 10 }}>
                    <div style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #22c55e, #fbbf24)',
                      height: '100%', borderRadius: 999,
                      transition: 'width 1s ease',
                      boxShadow: '0 0 8px rgba(251,191,36,0.4)',
                    }} />
                  </div>
                </div>

                {nextStage ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.83rem' }}>
                    <span>Next:</span>
                    <span style={{ color: 'white', fontWeight: 700 }}>{nextStage.label}</span>
                    <ArrowRight size={13} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#22c55e', fontSize: '0.85rem', fontWeight: 700 }}>
                    <CheckCircle size={16} /> Project Complete!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stage Timeline */}
          <div className="dashboard-card animate-fade-in animate-delay-2">
            <div className="card-header">
              <h3 className="card-title"><Clock size={16} /> Project Timeline</h3>
            </div>
            <div className="card-body" style={{ maxHeight: 340, overflowY: 'auto', padding: '1rem 1.375rem' }}>
              <div className="stage-progress">
                {STAGES.map((s, i) => {
                  const done    = i < stageIdx;
                  const current = i === stageIdx;
                  return (
                    <div key={s.id} className={`stage-item ${current ? 'current' : ''}`}>
                      <div
                        className="stage-dot"
                        style={{
                          background: done ? '#22c55e' : current ? s.color : '#e2e8f0',
                          boxShadow: current ? `0 0 0 3px ${s.color}33` : 'none',
                          position: 'relative',
                        }}
                      />
                      <div className="stage-info">
                        <p className="stage-name" style={{
                          color: done ? '#94a3b8' : current ? s.color : '#cbd5e1',
                          fontWeight: current ? 700 : 500,
                        }}>
                          {s.label}
                        </p>
                        <p className="stage-status">
                          {done ? '✓ Completed' : current ? '⟳ In Progress' : s.group}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3">

          {/* Subsidy Breakdown — real data */}
          <div className="dashboard-card animate-fade-in animate-delay-2">
            <div className="card-header">
              <h3 className="card-title"><Landmark size={16} /> Subsidy Breakdown</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.875rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e9ecef' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Total Project Cost</span>
                  <strong style={{ color: 'var(--color-text-main)' }}>{fmtInr(projectCost)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.875rem', background: 'rgba(26,71,42,0.06)', borderRadius: 12, border: '1px solid rgba(26,71,42,0.12)' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                    Govt. Subsidy{project?.total_subsidy_proposed ? '' : ' (est. 50%)'}
                  </span>
                  <strong style={{ color: 'var(--color-success)', fontSize: '1.05rem' }}>{fmtInr(subsidyAmt)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.875rem', background: '#fffbeb', borderRadius: 12, border: '1px solid #fef3c7' }}>
                  <span style={{ color: '#92400e', fontSize: '0.85rem' }}>Your Investment</span>
                  <strong style={{ color: '#d97706' }}>{fmtInr(yourCost)}</strong>
                </div>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#eff6ff', borderRadius: 10, borderLeft: '3px solid #3b82f6' }}>
                <p style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600, margin: 0 }}>
                  💡 Subsidy is released after agency inspection and committee approval.
                </p>
              </div>
            </div>
          </div>

          {/* Action Required — document checklist */}
          <div className="dashboard-card animate-fade-in animate-delay-3">
            <div className="card-header">
              <h3 className="card-title"><FileText size={16} /> Action Required</h3>
            </div>
            <div className="card-body">
              {docs.length > 0 ? (
                <>
                  <p style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)', marginBottom: '0.875rem' }}>
                    Arrange these documents for the <strong style={{ color: 'var(--color-text-main)' }}>{currentStageData?.label}</strong> stage:
                  </p>
                  <div className="data-list">
                    {docs.map((d) => (
                      <div key={d} className="data-row" style={{ padding: '0.625rem 0' }}>
                        <div className="data-row-info">
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{d}</span>
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #e2e8f0', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <Link to="/documents" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                      Upload Documents <ArrowRight size={13} />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center" style={{ padding: '1rem' }}>
                  <CheckCircle size={32} style={{ color: '#22c55e', marginBottom: '0.5rem' }} />
                  <p style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.9rem' }}>No documents needed right now</p>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>You're all clear to proceed to the next stage.</p>
                </div>
              )}
            </div>
          </div>

          {/* Project Details — real fields */}
          <div className="dashboard-card animate-fade-in animate-delay-3">
            <div className="card-header">
              <h3 className="card-title"><Home size={16} /> Project Details</h3>
            </div>
            <div className="card-body" style={{ padding: '0.75rem 1.375rem' }}>
              <div className="data-list">
                {[
                  {
                    icon: <MapPin size={12} />,
                    label: 'Location',
                    value: [project.village, project.taluka, project.district].filter(Boolean).join(', ') || '—',
                  },
                  project.land_area && {
                    icon: <Leaf size={12} />,
                    label: 'Land Area',
                    value: `${project.land_area} ${project.land_unit || 'SQM'}`,
                  },
                  project.area_type && {
                    icon: <Building2 size={12} />,
                    label: 'Project Type',
                    value: project.area_type,
                  },
                  project.crop_category && {
                    icon: <Leaf size={12} />,
                    label: 'Crop',
                    value: project.crop_category,
                  },
                  {
                    icon: <Calendar size={12} />,
                    label: 'Registered On',
                    value: project.created_at
                      ? new Date(project.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—',
                  },
                  project.expected_end_date && {
                    icon: <Clock size={12} />,
                    label: 'Expected Completion',
                    value: new Date(project.expected_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                  },
                ].filter(Boolean).map(({ icon, label, value }) => (
                  <div key={label} className="data-row" style={{ padding: '0.6rem 0' }}>
                    <div className="data-row-info">
                      <span className="data-row-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {icon} {label}
                      </span>
                      <span className="data-row-title" style={{ fontSize: '0.85rem' }}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Need Help — fixed links */}
          <div className="dashboard-card animate-fade-in animate-delay-4" style={{ border: '1px dashed rgba(0,0,0,0.1)' }}>
            <div className="card-body" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <p style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text-main)' }}>Need Assistance?</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Contact your ICON dealer or check notifications</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <Link to="/notifications" className="btn btn-sm btn-outline" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                  <MessageCircle size={15} /> Messages & Notifications
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
