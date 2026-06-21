/**
 * Office Staff Dashboard  v2
 * — Gradient indigo hero header with chips (pending docs, DPR queue)
 * — 4 KPI cards: Farmer Onboarding (purple), DPR Pipeline (cyan, alert),
 *                Financial Queue (amber), Subsidy Queue (blue, alert)
 * — 2-column layout: full pipeline bars left, dark summary + quick actions right
 */
import { type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, UserPlus, CheckCircle, Clock, AlertTriangle,
  ClipboardCheck, BarChart2, ArrowRight, Tractor, Bell,
  type LucideProps,
} from 'lucide-react';
import '../../pages/Dashboard.css';
import type { AuthUser } from '../../context/AuthContext';

interface OKpiCardProps {
  icon: ComponentType<LucideProps>;
  label: string;
  value: number | string | null | undefined;
  sub?: string;
  color?: string;
  alert?: boolean;
  onClick?: (() => void) | undefined;
}

// ─── KPI card ────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = '#6366f1', alert, onClick }: OKpiCardProps) => (
  <div
    className={`kpi-card${alert ? ' kpi-card-alert' : ''}`}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
    onClick={onClick}
  >
    <div style={{
      background: `${color}18`, borderRadius: 10, padding: '0.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={20} color={color} />
    </div>
    <div className="kpi-content">
      <p className="kpi-label">{label}</p>
      <h3 className="kpi-value" style={{ color }}>{value ?? '—'}</h3>
      {sub && <p className="kpi-sub">{sub}</p>}
      {onClick && <p style={{ margin: 0, fontSize: '0.68rem', color, marginTop: 2, fontWeight: 600 }}>View →</p>}
    </div>
    {alert && <AlertTriangle size={14} style={{ color, flexShrink: 0 }} />}
  </div>
);

interface PipelineBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
  linkStage: string;
}

// ─── Pipeline bar ─────────────────────────────────────────────────────────────
const PipelineBar = ({ label, count, total, color, linkStage }: PipelineBarProps) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '0.7rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <Link
          to={`/projects?stage=${linkStage}`}
          style={{ fontSize: '0.8rem', color: '#475569', textDecoration: 'none', fontWeight: count > 0 ? 600 : 400 }}
        >
          {label}
        </Link>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: count > 0 ? color : '#94a3b8' }}>{count}</span>
      </div>
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
};

interface OfficeStaffDashboardProps {
  stats: any;
  error?: string | null;
  user: AuthUser;
}

// ─── OfficeStaffDashboard ─────────────────────────────────────────────────────
const OfficeStaffDashboard = ({ stats, error, user }: OfficeStaffDashboardProps) => {
  const sb: Record<string, number> = stats?.stage_breakdown ?? {};

  const draftCount       = sb['draft']               ?? 0;
  const onboardingCount  = sb['farmer_onboarding']   ?? 0;
  const docCollCount     = sb['document_collection'] ?? 0;
  const siteVisitCount   = sb['site_visit']          ?? 0;
  const designCount      = sb['design_boq']          ?? 0;
  const dprReadyCount    = sb['dpr_ready']           ?? 0;
  const bankCount        = sb['bank_processing']     ?? 0;
  const gocCount         = sb['goc_registration']    ?? 0;
  const subsidyCount     = (sb['subsidy_claim'] ?? 0) + (sb['agency_inspection'] ?? 0) + (sb['committee_meeting'] ?? 0);

  const earlyPipeline  = draftCount + onboardingCount + docCollCount;
  const designPipeline = siteVisitCount + designCount + dprReadyCount;
  const pendingLeads   = Math.max(0, (stats?.total_farmers ?? 0) - (stats?.total_projects ?? 0));
  const totalActive    = Object.values(sb).reduce((a, b) => a + b, 0);

  return (
    <div className="dashboard-container">

      {/* ── Hero Header — gradient indigo ──────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
        borderRadius: 'var(--radius-xl)', padding: '1.75rem 2rem', marginBottom: '1.5rem',
        boxShadow: '0 8px 32px rgba(79,70,229,0.25)',
      }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              Good day, {user.first_name || 'Office Staff'}
            </h1>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.18)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, backdropFilter: 'blur(4px)' }}>
                <Tractor size={12} /> {stats?.total_projects ?? 0} Projects
              </span>
              {docCollCount > 0 && (
                <span style={{ background: 'rgba(251,191,36,0.25)', color: '#fef3c7', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <FileText size={12} /> {docCollCount} Pending Docs
                </span>
              )}
              {dprReadyCount > 0 && (
                <span style={{ background: 'rgba(239,68,68,0.22)', color: '#fecaca', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ClipboardCheck size={12} /> {dprReadyCount} DPR Ready
                </span>
              )}
              {pendingLeads > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.85)', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={12} /> {pendingLeads} Without Project
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <Link to="/projects?stage=dpr_ready" style={{
              background: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)',
            }}>
              <ClipboardCheck size={15} /> DPR Queue
            </Link>
            <Link to="/farmers/new" style={{
              background: 'white', color: '#4f46e5',
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 700,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <UserPlus size={15} /> Add Farmer
            </Link>
          </div>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="alert-banner danger animate-fade-in">
          <AlertTriangle size={18} />
          <span className="alert-content">{error}</span>
        </div>
      )}

      {/* ── Alert banners ───────────────────────────────────────────────────── */}
      {dprReadyCount > 0 && (
        <div className="alert-banner warning animate-fade-in">
          <AlertTriangle size={18} />
          <span className="alert-content">
            <strong>{dprReadyCount}</strong> project{dprReadyCount > 1 ? 's' : ''} at DPR Ready — prepare and submit to bank
          </span>
          <Link to="/projects?stage=dpr_ready" className="btn btn-sm btn-outline alert-action">View DPR queue →</Link>
        </div>
      )}
      {subsidyCount > 0 && (
        <div className="alert-banner warning animate-fade-in">
          <AlertTriangle size={18} />
          <span className="alert-content">
            <strong>{subsidyCount}</strong> project{subsidyCount > 1 ? 's' : ''} pending subsidy inspection or committee meeting
          </span>
          <Link to="/projects?stage=agency_inspection" className="btn btn-sm btn-outline alert-action">Review →</Link>
        </div>
      )}

      {/* ── 4 KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid animate-fade-in animate-delay-1">
        <KpiCard
          icon={UserPlus}       label="Farmer Onboarding"    color="#6366f1"
          value={earlyPipeline}
          sub={`Draft: ${draftCount}  ·  Onboarding: ${onboardingCount}  ·  Docs: ${docCollCount}`}
          onClick={() => { window.location.href = '/projects?stage=farmer_onboarding'; }}
        />
        <KpiCard
          icon={ClipboardCheck} label="DPR Pipeline"         color="#0891b2"
          value={designPipeline}
          sub={`Site: ${siteVisitCount}  ·  BOQ: ${designCount}  ·  DPR Ready: ${dprReadyCount}`}
          alert={dprReadyCount > 0}
          onClick={() => { window.location.href = '/projects?stage=dpr_ready'; }}
        />
        <KpiCard
          icon={CheckCircle}    label="Financial Queue"       color="#d97706"
          value={bankCount + gocCount}
          sub={`Bank: ${bankCount}  ·  GOC: ${gocCount}`}
        />
        <KpiCard
          icon={Bell}           label="Subsidy Queue"         color="#0ea5e9"
          value={subsidyCount}
          alert={subsidyCount > 0}
          sub={`Claim: ${sb['subsidy_claim'] ?? 0}  ·  Insp: ${sb['agency_inspection'] ?? 0}  ·  Comm: ${sb['committee_meeting'] ?? 0}`}
          onClick={subsidyCount > 0 ? () => { window.location.href = '/projects?stage=agency_inspection'; } : undefined}
        />
      </div>

      {/* ── Main grid: pipeline left, summary + actions right ──────────────── */}
      <div className="dashboard-grid animate-fade-in animate-delay-2" style={{ gridTemplateColumns: '3fr 2fr', gap: '1.25rem', marginTop: '1.25rem' }}>

        {/* Left — full pipeline ── */}
        <div>
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title"><BarChart2 size={17} /> Full Project Pipeline</h3>
              <Link to="/projects" className="btn btn-sm btn-outline">All Projects <ArrowRight size={13} /></Link>
            </div>
            <div className="card-body">
              {totalActive > 0 ? (
                <>
                  <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Onboarding</p>
                  {[
                    { stage: 'draft',               label: 'Draft (Dealer Submitted)', color: '#a78bfa' },
                    { stage: 'farmer_onboarding',   label: 'Farmer Onboarding',        color: '#6366f1' },
                    { stage: 'document_collection', label: 'Document Collection',       color: '#8b5cf6' },
                  ].map(({ stage, label, color }) => (
                    <PipelineBar key={stage} label={label} count={sb[stage] ?? 0} total={totalActive} color={color} linkStage={stage} />
                  ))}

                  <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1rem 0 0.6rem' }}>Design & DPR</p>
                  {[
                    { stage: 'site_visit',  label: 'Site Visit',    color: '#0ea5e9' },
                    { stage: 'design_boq',  label: 'Design & BOQ',  color: '#06b6d4' },
                    { stage: 'dpr_ready',   label: 'DPR Ready',     color: '#14b8a6' },
                  ].map(({ stage, label, color }) => (
                    <PipelineBar key={stage} label={label} count={sb[stage] ?? 0} total={totalActive} color={color} linkStage={stage} />
                  ))}

                  <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1rem 0 0.6rem' }}>Financial</p>
                  {[
                    { stage: 'bank_processing',  label: 'Bank Processing',  color: '#f59e0b' },
                    { stage: 'goc_registration', label: 'GOC Registration',  color: '#d97706' },
                  ].map(({ stage, label, color }) => (
                    <PipelineBar key={stage} label={label} count={sb[stage] ?? 0} total={totalActive} color={color} linkStage={stage} />
                  ))}

                  <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1rem 0 0.6rem' }}>Construction (M1–M7)</p>
                  {['m1_foundation', 'm2_structure_erection', 'm3_covering_material', 'm4_trellising', 'm5_drip_fitting', 'm6_bed_preparation', 'm7_plantation'].map((stage, i) => (
                    <PipelineBar
                      key={stage}
                      label={`M${i + 1} – ${stage.replace('m' + (i + 1) + '_', '').replace(/_/g, ' ')}`}
                      count={sb[stage] ?? 0} total={totalActive} color="#ea580c" linkStage={stage}
                    />
                  ))}

                  <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1rem 0 0.6rem' }}>Subsidy & Completion</p>
                  {[
                    { stage: 'subsidy_claim',     label: 'Subsidy Claim Filed', color: '#0ea5e9' },
                    { stage: 'agency_inspection', label: 'Agency Inspection',   color: '#2563eb' },
                    { stage: 'committee_meeting', label: 'Committee Meeting',   color: '#1d4ed8' },
                    { stage: 'subsidy_released',  label: 'Subsidy Released',    color: '#22c55e' },
                    { stage: 'completed',         label: 'Completed',           color: '#16a34a' },
                  ].map(({ stage, label, color }) => (
                    <PipelineBar key={stage} label={label} count={sb[stage] ?? 0} total={totalActive} color={color} linkStage={stage} />
                  ))}
                </>
              ) : (
                <p className="text-muted text-center p-4">No project data yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right — dark summary + quick actions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Dark summary card */}
          <div className="dashboard-card glass-card-dark">
            <div className="card-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <h3 className="card-title text-white"><BarChart2 size={17} /> Summary</h3>
            </div>
            <div className="card-body">
              {[
                { label: 'Total Farmers',   value: stats?.total_farmers  ?? 0, color: '#60a5fa' },
                { label: 'Total Projects',  value: stats?.total_projects ?? 0, color: '#fbbf24' },
                { label: 'Pending Leads',   value: pendingLeads,               color: '#f87171' },
                { label: 'Active Sites',    value: stats?.active_sites   ?? 0, color: '#34d399' },
                { label: 'Subsidy Pending', value: stats?.pending_subsidy ?? 0, color: '#a78bfa' },
                { label: 'Completed',       value: stats?.completed       ?? 0, color: '#34d399' },
              ].map(({ label, value, color }) => (
                <div key={label} className="data-row" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <span className="data-row-sub" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                  <span className="data-row-value" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card animate-fade-in animate-delay-3">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="card-body">
              <div className="quick-actions">
                <Link to="/farmers/new" className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: '#e0f2fe' }}>👨‍🌾</span>
                  <span className="quick-action-label">Add Farmer</span>
                </Link>
                <Link to="/projects/new" className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: 'rgba(26,71,42,0.08)' }}>➕</span>
                  <span className="quick-action-label">New Project</span>
                </Link>
                <Link to="/projects?stage=dpr_ready" className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: '#eef2ff' }}>📐</span>
                  <span className="quick-action-label">DPR Queue</span>
                </Link>
                <Link to="/projects?stage=document_collection" className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: '#fef9c3' }}>📄</span>
                  <span className="quick-action-label">Docs Queue</span>
                </Link>
                <Link to="/projects?stage=farmer_onboarding" className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: '#f0fdf4' }}>🌱</span>
                  <span className="quick-action-label">Onboarding</span>
                </Link>
                <Link to="/reports" className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: '#f5f3ff' }}>📊</span>
                  <span className="quick-action-label">Reports</span>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OfficeStaffDashboard;
