/**
 * Admin / Owner / Office Staff Dashboard  v2
 * ─ Removed: fake Trend chart, fake Velocity chart, fake Monthly Pipeline chart,
 *            fake System Health card, hardcoded perf bars in Staff card.
 * ─ Kept:    Stage Pipeline (real data), Regional Concentration (real),
 *            Areawise Distribution (real), Financial Overview (real),
 *            Staff Counts, Quick Actions, clickable KPI drilldown.
 * ─ Fixed:   drilldown now passes stage filter to backend query.
 */
import { useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  Tractor, Landmark, CheckCircle, Clock, Users, TrendingUp,
  BarChart2, AlertTriangle, ArrowRight, Building2,
  FileText, Hammer, X, type LucideProps,
} from 'lucide-react';
import { getProjects } from '../../api/client';
import '../../pages/Dashboard.css';
import type { AuthUser } from '../../context/AuthContext';

// ─── Stage label map — slug-based only ───────────────────────────────────────
export const STAGE_LABELS: Record<string, string> = {
  draft:                'Draft (Dealer Submitted)',
  farmer_onboarding:    'Farmer Onboarding',
  document_collection:  'Document Collection',
  site_visit:           'Site Visit',
  design_boq:           'Design & BOQ',
  dpr_ready:            'DPR Ready',
  bank_processing:      'Bank Processing',
  goc_registration:     'GOC Registration',
  m1_foundation:        'M1 – Foundation',
  m2_structure_erection:'M2 – Structure Erection',
  m3_covering_material: 'M3 – Covering Material',
  m4_trellising:        'M4 – Trellising',
  m5_drip_fitting:      'M5 – Drip Fitting',
  m6_bed_preparation:   'M6 – Bed Preparation',
  m7_plantation:        'M7 – Plantation',
  subsidy_claim:        'Subsidy Claim Filed',
  agency_inspection:    'Agency Inspection',
  committee_meeting:    'Committee Meeting',
  subsidy_released:     'Subsidy Released',
  completed:            'Project Completed',
};

export const stageLabel = (key: string): string => STAGE_LABELS[key] || key.replace(/_/g, ' ');

interface StageGroup {
  label: string;
  color: string;
  bg: string;
  keys: string[];
}

// ─── Stage groups with colors ─────────────────────────────────────────────────
const STAGE_GROUPS: StageGroup[] = [
  {
    label: 'Onboarding',
    color: '#6366f1',
    bg: '#eef2ff',
    keys: ['draft', 'farmer_onboarding', 'document_collection'],
  },
  {
    label: 'Financial',
    color: '#f59e0b',
    bg: '#fffbeb',
    keys: ['bank_processing', 'goc_registration'],
  },
  {
    label: 'Construction',
    color: '#ea580c',
    bg: '#fff7ed',
    keys: [
      'site_visit', 'design_boq', 'dpr_ready',
      'm1_foundation', 'm2_structure_erection', 'm3_covering_material',
      'm4_trellising', 'm5_drip_fitting', 'm6_bed_preparation', 'm7_plantation',
    ],
  },
  {
    label: 'Subsidy',
    color: '#0ea5e9',
    bg: '#e0f2fe',
    keys: ['subsidy_claim', 'agency_inspection', 'committee_meeting'],
  },
  {
    label: 'Completed',
    color: '#22c55e',
    bg: '#f0fdf4',
    keys: ['subsidy_released', 'completed'],
  },
];

const formatCrore = (n: number | null | undefined): string => {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

interface KpiCardProps {
  icon: ComponentType<LucideProps>;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
  alert?: boolean;
  onClick?: () => void;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = 'primary', alert, onClick }: KpiCardProps) => (
  <div
    className={`kpi-card ${color}${alert ? ' kpi-card-alert' : ''}${onClick ? ' cursor-pointer' : ''}`}
    onClick={onClick}
    style={onClick ? { cursor: 'pointer' } : {}}
  >
    <div className={`kpi-icon ${color}`}>
      <Icon size={24} />
    </div>
    <div className="kpi-content">
      <p className="kpi-label">{label}</p>
      <h3 className="kpi-value">{value}</h3>
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
    {onClick && (
      <ArrowRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
    )}
  </div>
);

interface TeamRole {
  key: string;
  icon: string;
  label: string;
  bg: string;
  color: string;
}

// ─── Team role definitions ────────────────────────────────────────────────────
const TEAM_ROLES: TeamRole[] = [
  { key: 'project_manager', icon: '🧭', label: 'Project Managers', bg: '#eef2ff', color: '#6366f1' },
  { key: 'bank_officer',    icon: '🏦', label: 'Bank Officers',    bg: '#e0f2fe', color: '#0ea5e9' },
  { key: 'agency_officer',  icon: '🏛️', label: 'Agency Officers',  bg: '#fffbeb', color: '#f59e0b' },
  { key: 'agronomist',      icon: '🌿', label: 'Agronomists',      bg: '#f0fdf4', color: '#22c55e' },
  { key: 'office_staff',    icon: '📋', label: 'Office Staff',     bg: '#f5f3ff', color: '#8b5cf6' },
  { key: 'dealer',          icon: '🤝', label: 'Dealers',          bg: '#fdf2f8', color: '#ec4899' },
];

interface AdminDashboardProps {
  stats: any;
  error?: string | null;
  user: AuthUser;
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────
const AdminDashboard = ({ stats, error, user }: AdminDashboardProps) => {
  const rc             = stats?.role_counts    ?? {};
  const stageBreakdown = stats?.stage_breakdown ?? {};
  const adminMetrics   = stats?.admin_metrics  || {};
  const kpis           = adminMetrics.kpis        || {};

  // Grouped stage counts
  const sumStages = (keys: string[]): number => keys.reduce((s, k) => s + (stageBreakdown[k] || 0), 0);
  const planningCount     = sumStages(STAGE_GROUPS[0].keys);
  const constructionCount = sumStages(STAGE_GROUPS[2].keys);
  const subsidyCount      = sumStages(STAGE_GROUPS[3].keys);
  const releasedCount     = sumStages(STAGE_GROUPS[4].keys);

  const roleIcon = user.role === 'owner' ? '👑' : user.role === 'admin' ? '🛡️' : '📋';

  // ─── Drilldown modal ─────────────────────────────────────────────────────
  const [modalOpen,    setModalOpen]    = useState<boolean>(false);
  const [modalTitle,   setModalTitle]   = useState<string>('');
  const [modalData,    setModalData]    = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError,   setModalError]   = useState<string | null>(null);

  const openDrillDown = async (title: string, stageKeys: string[]): Promise<void> => {
    setModalTitle(title);
    setModalOpen(true);
    setModalLoading(true);
    setModalData([]);
    setModalError(null);
    try {
      // Pass stage filter to the backend — avoids loading all projects client-side
      const params = { stage: stageKeys.join(','), limit: 100 };
      const rawData: any = await getProjects(params as any);
      // getProjects may return {items, total} or a plain array depending on version
      const rows = Array.isArray(rawData) ? rawData : (rawData.items ?? []);
      setModalData(rows);
    } catch (e) {
      console.error(e);
      setModalError('Could not load cases. Check your connection and try again.');
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-greeting">
          <h1 className="dashboard-title">
            {roleIcon} Welcome, {user.first_name || 'Admin'}
          </h1>
          <p className="dashboard-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span className="section-chip" style={{ background: '#e0f2fe', color: '#0369a1' }}>
              <Users size={12} /> {stats?.total_farmers ?? 0} Farmers
            </span>
            <span className="section-chip" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <Tractor size={12} /> {stats?.total_projects ?? 0} Projects
            </span>
            <span className="section-chip" style={{ background: '#fef9c3', color: '#a16207' }}>
              <Clock size={12} /> {Math.max(0, (stats?.total_farmers ?? 0) - (stats?.total_projects ?? 0))} Pending Leads
            </span>
          </p>
        </div>
        <div className="dashboard-actions">
          <Link to="/reports" className="btn btn-outline">
            <BarChart2 size={16} /> Reports
          </Link>
          <Link to="/projects" className="btn btn-primary">
            <Tractor size={16} /> All Projects
          </Link>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="alert-banner danger animate-fade-in">
          <AlertTriangle size={18} />
          <span className="alert-content">{error}</span>
        </div>
      )}
      {subsidyCount > 0 && (
        <div className="alert-banner warning animate-fade-in">
          <AlertTriangle size={18} />
          <span className="alert-content">
            <strong>{subsidyCount}</strong> project{subsidyCount > 1 ? 's' : ''} pending subsidy inspection or committee meeting
          </span>
          <Link to="/projects?stage=agency_inspection" className="btn btn-sm btn-outline alert-action">
            Review →
          </Link>
        </div>
      )}

      {/* ── KPI Row — 4 pipeline phases ────────────────────────────────────── */}
      <div className="kpi-grid animate-fade-in animate-delay-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard
          icon={FileText}
          label="In Planning"
          value={planningCount}
          color="primary"
          sub={`Onboarding: ${stageBreakdown['farmer_onboarding'] || 0}  ·  Docs: ${stageBreakdown['document_collection'] || 0}`}
          onClick={() => openDrillDown('Projects In Planning', STAGE_GROUPS[0].keys)}
        />
        <KpiCard
          icon={Hammer}
          label="Under Construction"
          value={constructionCount}
          color="warning"
          sub={`Site/Design/DPR: ${(stageBreakdown['site_visit']||0)+(stageBreakdown['design_boq']||0)+(stageBreakdown['dpr_ready']||0)}  ·  M1–M7: ${['m1_foundation','m2_structure_erection','m3_covering_material','m4_trellising','m5_drip_fitting','m6_bed_preparation','m7_plantation'].reduce((s,k)=>s+(stageBreakdown[k]||0),0)}`}
          onClick={() => openDrillDown('Projects Under Construction', STAGE_GROUPS[2].keys)}
        />
        <KpiCard
          icon={Clock}
          label="Subsidy Processing"
          value={subsidyCount}
          color="info"
          sub={`Claim: ${stageBreakdown['subsidy_claim']||0}  ·  Insp: ${stageBreakdown['agency_inspection']||0}  ·  Comm: ${stageBreakdown['committee_meeting']||0}`}
          alert={subsidyCount > 0}
          onClick={() => openDrillDown('Subsidy Processing', STAGE_GROUPS[3].keys)}
        />
        <KpiCard
          icon={CheckCircle}
          label="Released / Completed"
          value={releasedCount}
          color="success"
          sub={`Released: ${stageBreakdown['subsidy_released']||0}  ·  Done: ${stageBreakdown['completed']||0}`}
          onClick={() => openDrillDown('Completed & Subsidy Released', STAGE_GROUPS[4].keys)}
        />
      </div>

      {/* ── Bank / GOC / Erection secondary KPIs ─────────────────────────── */}
      {(kpis.bank_wip != null || kpis.goc_applied != null) && (
        <div className="kpi-grid animate-fade-in animate-delay-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <KpiCard
            icon={Landmark}
            label="Bank Pipeline"
            value={(kpis.bank_wip || 0) + (kpis.bank_sanctioned || 0)}
            color="warning"
            sub={`WIP: ${kpis.bank_wip || 0}  ·  Sanctioned: ${kpis.bank_sanctioned || 0}`}
            onClick={() => openDrillDown('Bank Pipeline', ['bank_processing'])}
          />
          <KpiCard
            icon={Building2}
            label="GOC Pipeline"
            value={(kpis.goc_applied || 0) + (kpis.goc_approved || 0)}
            color="info"
            sub={`Applied: ${kpis.goc_applied || 0}  ·  Approved: ${kpis.goc_approved || 0}`}
            onClick={() => openDrillDown('GOC Pipeline', ['goc_registration'])}
          />
          <KpiCard
            icon={Hammer}
            label="Erection Progress"
            value={(kpis.erection_wip || 0) + (kpis.erection_completed || 0)}
            color="primary"
            sub={`WIP (M1–M7): ${kpis.erection_wip || 0}  ·  Done: ${kpis.erection_completed || 0}`}
            onClick={() => openDrillDown('Erection Progress', STAGE_GROUPS[2].keys)}
          />
        </div>
      )}

      {/* ── Main Content Grid ─────────────────────────────────────────────── */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '3fr 2fr', gap: '1.25rem', marginTop: '1.25rem' }}>

        {/* Left column */}
        <div className="flex flex-col gap-3">

          {/* Stage Pipeline — real data ─────────────────────────────────── */}
          <div className="dashboard-card animate-fade-in animate-delay-2">
            <div className="card-header">
              <h3 className="card-title"><BarChart2 size={17} /> Stage Pipeline</h3>
              <Link to="/projects" className="btn btn-sm btn-outline">
                View All <ArrowRight size={13} />
              </Link>
            </div>
            <div className="card-body">
              {Object.keys(stageBreakdown).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {STAGE_GROUPS.map(group => {
                    const groupTotal = group.keys.reduce((sum, k) => sum + (stageBreakdown[k] || 0), 0);
                    if (groupTotal === 0 && group.label !== 'Completed') return null;
                    const maxInGroup = Math.max(...group.keys.map(k => stageBreakdown[k] || 0), 1);
                    return (
                      <div key={group.label}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: group.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {group.label}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 'auto', fontWeight: 600 }}>
                            {groupTotal} project{groupTotal !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="bar-chart" style={{ gap: '0.25rem', paddingLeft: '0.75rem', borderLeft: `2px solid ${group.color}30` }}>
                          {group.keys.map(key => {
                            const count = stageBreakdown[key] || 0;
                            if (count === 0) return null;
                            return (
                              <div key={key} className="bar-item">
                                <div className="bar-header">
                                  <span className="bar-label">{stageLabel(key)}</span>
                                  <span className="bar-value">{count}</span>
                                </div>
                                <div
                                  className="bar-track"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => openDrillDown(`${stageLabel(key)} Cases`, [key])}
                                >
                                  <div className="bar-fill" style={{ width: `${(count / maxInGroup) * 100}%`, background: group.color }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted text-center p-4">No project data yet.</p>
              )}
            </div>
          </div>

        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3">

          {/* Financial Overview — real data ──────────────────────────────── */}
          <div className="dashboard-card glass-card-dark animate-fade-in animate-delay-2">
            <div className="card-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <h3 className="card-title text-white"><TrendingUp size={17} /> Financial Overview</h3>
            </div>
            <div className="card-body">
              <div className="text-center" style={{ padding: '0.75rem 0 1.25rem' }}>
                <p className="revenue-label">Total Subsidy Portfolio</p>
                <h3 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'white', margin: '0.25rem 0', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                  {formatCrore(stats?.total_subsidy_proposed && stats.total_subsidy_proposed > 0 ? stats.total_subsidy_proposed : stats?.total_subsidy_potential ?? 0)}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
                  {stats?.total_subsidy_proposed > 0 ? 'Proposed subsidy across all projects' : `est. 50% of ${formatCrore(stats?.total_eligible_cost ?? 0)} project cost`}
                </p>
              </div>
              <div className="data-list" style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '1rem', gap: 0 }}>
                {[
                  { label: 'Subsidy Proposed',      value: formatCrore(stats?.total_subsidy_proposed ?? 0),  color: '#fbbf24' },
                  { label: 'Subsidy Received',       value: formatCrore(stats?.total_subsidy_received ?? 0), color: '#34d399' },
                  { label: 'Pending Subsidy Claims', value: subsidyCount,                                     color: '#60a5fa' },
                  { label: 'Projects Completed',     value: releasedCount,                                    color: '#a78bfa' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="data-row" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="data-row-sub" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                    <span className="data-row-value" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Staff Overview — real role_counts, no fake perf bars ─────────── */}
          <div className="dashboard-card animate-fade-in animate-delay-3">
            <div className="card-header">
              <h3 className="card-title"><Users size={17} /> Team Overview</h3>
              <Link to="/staff" className="btn btn-sm btn-outline">Manage →</Link>
            </div>
            <div className="card-body" style={{ padding: '0.75rem 1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {TEAM_ROLES.map(({ key, icon, label, bg, color }) => (
                  <div
                    key={key}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.625rem 0.875rem', background: bg, borderRadius: '10px' }}
                  >
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{icon}</span>
                    <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{label}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color, fontFamily: 'var(--font-display)', minWidth: '2ch', textAlign: 'right' }}>
                      {rc[key] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions ─────────────────────────────────────────────────── */}
          <div className="dashboard-card animate-fade-in animate-delay-4">
            <div className="card-header">
              <h3 className="card-title">⚡ Quick Actions</h3>
            </div>
            <div className="card-body">
              <div className="quick-actions">
                <Link to="/projects/new" className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: 'rgba(26,71,42,0.08)' }}>➕</span>
                  <span className="quick-action-label">New Project</span>
                </Link>
                <Link to="/farmers/new" className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: '#e0f2fe' }}>👨‍🌾</span>
                  <span className="quick-action-label">Add Farmer</span>
                </Link>
                {/* DPR Workflow — office_staff primary action (filter projects to DPR-ready stage) */}
                {user.role === 'office_staff' && (
                  <Link to="/projects?stage=dpr_ready" className="quick-action-btn">
                    <span className="quick-action-icon" style={{ background: '#eef2ff' }}>📐</span>
                    <span className="quick-action-label">DPR Workflow</span>
                  </Link>
                )}
                <Link to="/reports" className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: '#f5f3ff' }}>📊</span>
                  <span className="quick-action-label">Reports</span>
                </Link>
                <Link to="/dealers" className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: '#fdf2f8' }}>🤝</span>
                  <span className="quick-action-label">Dealers</span>
                </Link>
                {/* Masters — admin & owner only */}
                {(user.role === 'admin' || user.role === 'owner') && (
                  <Link to="/masters" className="quick-action-btn">
                    <span className="quick-action-icon" style={{ background: '#f8fafc' }}>🗄️</span>
                    <span className="quick-action-label">Masters</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Drilldown Modal ──────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 620, width: '92%', borderRadius: 18, background: '#fff', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e9ecef' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{modalTitle}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', borderRadius: '8px', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>
            <div style={{ padding: 0, maxHeight: '58vh', overflowY: 'auto' }}>
              {modalLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
                  Loading…
                </div>
              ) : modalError ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
                  {modalError}
                </div>
              ) : modalData.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No cases found for this category.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e9ecef' }}>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project / Farmer</th>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.map(proj => (
                      <tr key={proj.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <Link to={`/projects/${proj.id}`} style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none', fontSize: '0.9rem' }}>
                            {proj.project_name || `Project #${proj.id}`}
                          </Link>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                            {proj.farmer ? `${proj.farmer.first_name} ${proj.farmer.last_name || ''}`.trim() : `Farmer #${proj.farmer_id}`}
                            {' · '}
                            {proj.village?.taluka?.district?.name || proj.farmer?.village?.taluka?.district?.name || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{ fontSize: '0.78rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            {stageLabel(proj.project_stage)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: '10px 20px', borderTop: '1px solid #f1f5f9', textAlign: 'right', background: '#f8fafc' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Showing {modalData.length} record{modalData.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
