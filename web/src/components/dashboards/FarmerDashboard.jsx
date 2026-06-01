/**
 * Farmer Dashboard  v3
 * — Gradient green hero header: project name + code as subtitle, current stage chip
 * — Hero progress card: thick progress bar + current/next stage
 * — 3 info cards in a row: Govt Subsidy, Your Investment, Days Running
 * — Action required: documents checklist per stage (clean card with checkbox icons)
 * — Project details: clean data rows
 * — "No project yet" empty state unchanged
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle, Clock, ArrowRight, FileText, Landmark, Building2,
  MapPin, Calendar, Bell, Home, IndianRupee,
  MessageCircle, Activity, Leaf,
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

// Stage current-status chip
const getStageBadge = (stage) => {
  if (!stage)                            return { label: 'Not Started',        color: '#64748b', bg: '#f1f5f9' };
  if (stage === 'completed')             return { label: 'Completed',          color: '#16a34a', bg: '#dcfce7' };
  if (stage === 'subsidy_released')      return { label: 'Subsidy Released',   color: '#22c55e', bg: '#f0fdf4' };
  if (['agency_inspection', 'committee_meeting', 'subsidy_claim'].includes(stage))
                                         return { label: 'Subsidy Processing', color: '#0ea5e9', bg: '#e0f2fe' };
  if (stage.startsWith('m'))             return { label: 'Under Construction', color: '#f59e0b', bg: '#fffbeb' };
  if (['bank_processing', 'goc_registration'].includes(stage))
                                         return { label: 'Financial Stage',    color: '#3b82f6', bg: '#eff6ff' };
  return                                        { label: 'In Progress',        color: '#f59e0b', bg: '#fffbeb' };
};

const fmtInr = (n) => {
  if (!n || n <= 0) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

const daysSince = (iso) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

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

  const projectCost = project?.estimated_project_cost ?? 0;
  const subsidyAmt  = project?.total_subsidy_proposed
                        ? project.total_subsidy_proposed
                        : projectCost * 0.5;
  const yourCost    = projectCost - subsidyAmt;

  const startDate   = project?.actual_start_date || project?.created_at;
  const daysRunning = daysSince(startDate);

  // ── No project yet ────────────────────────────────────────────────────────
  if (!project) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header animate-fade-in">
          <div className="dashboard-greeting">
            <h1 className="dashboard-title">My Project</h1>
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

      {/* ── Hero Header — gradient green ──────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #15803d 50%, #16a34a 100%)',
        borderRadius: 'var(--radius-xl)', padding: '1.75rem 2rem', marginBottom: '1.5rem',
        boxShadow: '0 8px 32px rgba(20,83,45,0.3)',
      }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              {project.project_name || `Project #${project.id}`}
            </h1>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {project.project_code && (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600 }}>
                  {project.project_code}
                </span>
              )}
              <span style={{
                background: `${stageBadge.bg}cc`, color: stageBadge.color,
                padding: '0.2rem 0.75rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700,
              }}>
                {stageBadge.label}
              </span>
            </div>
          </div>
          <Link to={`/projects/${project.id}`} style={{
            background: 'white', color: '#166534',
            padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 700,
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Building2 size={15} /> View Full Details
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

      {/* ── Hero Progress Card (dark) ─────────────────────────────────────── */}
      <div className="dashboard-card glass-card-dark animate-fade-in animate-delay-1" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body" style={{ padding: '1.75rem 2rem' }}>
          <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginBottom: '0.3rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Stage {stageIdx + 1} of {STAGES.length} — {currentStageData?.group} Phase
            </p>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', margin: '0 0 1.5rem', fontFamily: 'var(--font-display)' }}>
              {currentStageData?.label ?? 'Not Started'}
            </h2>

            {/* Thick progress bar */}
            <div style={{ marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>Overall Progress</span>
                <span style={{ color: '#fbbf24', fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{pct}%</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 999, height: 16, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', borderRadius: 999,
                  background: 'linear-gradient(90deg, #22c55e 0%, #fbbf24 100%)',
                  transition: 'width 1s ease',
                  boxShadow: '0 0 12px rgba(251,191,36,0.35)',
                }} />
              </div>
            </div>

            {nextStage ? (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                Next: <strong style={{ color: 'white' }}>{nextStage.label}</strong> <ArrowRight size={13} />
              </p>
            ) : (
              <p style={{ color: '#22c55e', fontSize: '0.9rem', fontWeight: 700, marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CheckCircle size={16} /> Project Complete!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 3 Info Cards ─────────────────────────────────────────────────── */}
      <div className="kpi-grid animate-fade-in animate-delay-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.25rem' }}>
        {/* Government Subsidy */}
        <div className="dashboard-card" style={{ borderLeft: '4px solid #16a34a', textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <IndianRupee size={20} color="#16a34a" />
          </div>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>Government Subsidy</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', margin: '0 0 0.25rem', fontFamily: 'var(--font-display)' }}>
            {fmtInr(subsidyAmt)}
          </h3>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
            {project.total_subsidy_proposed ? 'Proposed subsidy' : 'est. 50% of project cost'}
          </p>
        </div>

        {/* Your Investment */}
        <div className="dashboard-card" style={{ borderLeft: '4px solid #d97706', textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <Home size={20} color="#d97706" />
          </div>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>Your Investment</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', margin: '0 0 0.25rem', fontFamily: 'var(--font-display)' }}>
            {fmtInr(yourCost)}
          </h3>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
            Project cost minus subsidy
          </p>
        </div>

        {/* Days Running */}
        <div className="dashboard-card" style={{ borderLeft: '4px solid #0ea5e9', textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <Calendar size={20} color="#0ea5e9" />
          </div>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>Days Running</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0ea5e9', margin: '0 0 0.25rem', fontFamily: 'var(--font-display)' }}>
            {daysRunning !== null ? daysRunning : '—'}
          </h3>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
            {startDate ? `Started ${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Start date pending'}
          </p>
        </div>
      </div>

      {/* ── Main content grid ─────────────────────────────────────────────── */}
      <div className="dashboard-grid grid-main animate-fade-in animate-delay-3" style={{ gap: '1.25rem' }}>

        {/* Left column — Stage Timeline */}
        <div className="flex flex-col gap-3">
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title"><Clock size={16} /> Project Timeline</h3>
            </div>
            <div className="card-body" style={{ maxHeight: 360, overflowY: 'auto', padding: '1rem 1.375rem' }}>
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

          {/* Action Required — document checklist */}
          <div className="dashboard-card">
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
                      <div key={d} className="data-row" style={{ padding: '0.625rem 0', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{d}</span>
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
          <div className="dashboard-card">
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

          {/* Need Help */}
          <div className="dashboard-card" style={{ border: '1px dashed rgba(0,0,0,0.1)' }}>
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
