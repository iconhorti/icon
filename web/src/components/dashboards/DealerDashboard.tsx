/**
 * Dealer Dashboard  v2
 * — Gradient green hero header with chips (farmers, projects, completed)
 * — Hero commission card (dark green, full-width): big earned number + pending + rate + subsidy portfolio
 * — 3 KPI cards: In Onboarding (purple), In Construction (orange), Completed (green)
 * — Pipeline breakdown: vertical tappable rows with left-color-border
 * — Leaderboard: clean rank/name/count rows; "You" row highlighted in light green
 */
import { type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Tractor, CheckCircle, UserPlus, ArrowRight,
  TrendingUp, Target, Bell, ChevronRight, Award, IndianRupee,
  type LucideProps,
} from 'lucide-react';
import '../../pages/Dashboard.css';
import type { AuthUser } from '../../context/AuthContext';

const formatInr = (n: number | null | undefined): string => {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
};

interface DKpiCardProps {
  icon: ComponentType<LucideProps>;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
  bg?: string;
  onClick?: () => void;
}

// ─── 3 pipeline KPI cards ─────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color, bg, onClick }: DKpiCardProps) => (
  <div
    className="kpi-card"
    style={{ cursor: onClick ? 'pointer' : 'default', borderLeft: `4px solid ${color}` }}
    onClick={onClick}
  >
    <div style={{ background: bg, borderRadius: 10, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={20} color={color} />
    </div>
    <div className="kpi-content">
      <p className="kpi-label">{label}</p>
      <h3 className="kpi-value" style={{ color }}>{value}</h3>
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
    {onClick && <ArrowRight size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />}
  </div>
);

interface PipelineRowProps {
  label: string;
  count: number;
  color: string;
  stage: string;
}

// ─── Pipeline row — tappable, left-color-border ───────────────────────────────
const PipelineRow = ({ label, count, color, stage }: PipelineRowProps) => (
  <Link
    to={`/projects?stage=${stage}`}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.65rem 1rem', borderRadius: 10, textDecoration: 'none',
      borderLeft: `3px solid ${color}`, background: `${color}08`,
      marginBottom: '0.45rem', transition: 'background 0.15s',
    }}
  >
    <span style={{ fontSize: '0.83rem', fontWeight: count > 0 ? 600 : 400, color: count > 0 ? '#374151' : '#94a3b8' }}>
      {label}
    </span>
    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: count > 0 ? color : '#cbd5e1', minWidth: '2ch', textAlign: 'right' }}>
      {count}
    </span>
  </Link>
);

interface PipelineStage {
  key: string;
  label: string;
  color: string;
}

interface PipelineGroup {
  heading: string;
  color: string;
  stages: PipelineStage[];
}

// ─── Stage groups for pipeline breakdown ──────────────────────────────────────
const PIPELINE_GROUPS: PipelineGroup[] = [
  {
    heading: 'Onboarding & Design',
    color: '#6366f1',
    stages: [
      { key: 'draft',               label: 'Draft (Submitted)',    color: '#a78bfa' },
      { key: 'farmer_onboarding',   label: 'Farmer Onboarding',    color: '#6366f1' },
      { key: 'document_collection', label: 'Document Collection',   color: '#8b5cf6' },
      { key: 'site_visit',          label: 'Site Visit',            color: '#0ea5e9' },
      { key: 'design_boq',          label: 'Design & BOQ',         color: '#06b6d4' },
      { key: 'dpr_ready',           label: 'DPR Ready',            color: '#14b8a6' },
    ],
  },
  {
    heading: 'Financial',
    color: '#f59e0b',
    stages: [
      { key: 'bank_processing',  label: 'Bank Processing',  color: '#f59e0b' },
      { key: 'goc_registration', label: 'GOC Registration', color: '#d97706' },
    ],
  },
  {
    heading: 'Construction',
    color: '#ea580c',
    stages: [
      { key: 'm1_foundation',         label: 'M1 – Foundation',    color: '#f97316' },
      { key: 'm2_structure_erection', label: 'M2 – Structure',     color: '#ea580c' },
      { key: 'm3_covering_material',  label: 'M3 – Covering',      color: '#dc2626' },
      { key: 'm4_trellising',         label: 'M4 – Trellising',    color: '#b91c1c' },
      { key: 'm5_drip_fitting',       label: 'M5 – Drip Fitting',  color: '#7c3aed' },
      { key: 'm6_bed_preparation',    label: 'M6 – Bed Prep',      color: '#a855f7' },
      { key: 'm7_plantation',         label: 'M7 – Plantation',    color: '#6d28d9' },
    ],
  },
  {
    heading: 'Subsidy & Done',
    color: '#22c55e',
    stages: [
      { key: 'subsidy_claim',     label: 'Subsidy Claim',     color: '#0ea5e9' },
      { key: 'agency_inspection', label: 'Agency Inspection', color: '#2563eb' },
      { key: 'committee_meeting', label: 'Committee Meeting', color: '#1d4ed8' },
      { key: 'subsidy_released',  label: 'Subsidy Released',  color: '#22c55e' },
      { key: 'completed',         label: 'Completed',         color: '#16a34a' },
    ],
  },
];

interface DealerDashboardProps {
  stats: any;
  error?: string | null;
  user: AuthUser;
}

// ─── DealerDashboard ──────────────────────────────────────────────────────────
const DealerDashboard = ({ stats, error, user }: DealerDashboardProps) => {
  const dealerMetrics    = stats?.dealer_metrics || {};
  const LEADERBOARD: any[] = dealerMetrics.leaderboard || [];
  const commission       = dealerMetrics.commission || {};

  const myProjects       = stats?.total_projects   ?? 0;
  const myFarmers        = stats?.total_farmers    ?? 0;
  const completed        = stats?.completed        ?? 0;
  const breakdown        = stats?.stage_breakdown  ?? {};
  const subsidyPotential = stats?.total_subsidy_potential ?? 0;

  const inOnboarding  = (breakdown['draft'] ?? 0) + (breakdown['farmer_onboarding'] ?? 0) + (breakdown['document_collection'] ?? 0);
  const inConstruction = ['m1_foundation', 'm2_structure_erection', 'm3_covering_material',
    'm4_trellising', 'm5_drip_fitting', 'm6_bed_preparation', 'm7_plantation']
    .reduce((s, k) => s + (breakdown[k] ?? 0), 0);
  const inSubsidy     = (breakdown['subsidy_claim'] ?? 0) + (breakdown['agency_inspection'] ?? 0) + (breakdown['committee_meeting'] ?? 0);

  return (
    <div className="dashboard-container">

      {/* ── Hero Header — gradient green ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 100%)',
        borderRadius: 'var(--radius-xl)', padding: '1.75rem 2rem', marginBottom: '1.5rem',
        boxShadow: '0 8px 32px rgba(20,83,45,0.3)',
      }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              My Portfolio
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.25rem 0 0.75rem', fontSize: '0.9rem' }}>
              Welcome back, {user.first_name}!
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                <Users size={11} style={{ display: 'inline', marginRight: 4 }} />{myFarmers} Farmers
              </span>
              <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                <Tractor size={11} style={{ display: 'inline', marginRight: 4 }} />{myProjects} Projects
              </span>
              <span style={{ background: 'rgba(34,197,94,0.3)', color: '#bbf7d0', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700 }}>
                <CheckCircle size={11} style={{ display: 'inline', marginRight: 4 }} />{completed} Completed
              </span>
            </div>
          </div>
          <Link to="/farmers/new" style={{
            background: 'white', color: '#166534',
            padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 700,
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <UserPlus size={15} /> Register Farmer
          </Link>
        </div>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="alert-banner danger animate-fade-in">
          <Bell size={18} />
          <span className="alert-content">{error}</span>
        </div>
      )}
      {inSubsidy > 0 && (
        <div className="alert-banner info animate-fade-in">
          <TrendingUp size={18} />
          <span className="alert-content">
            <strong>{inSubsidy}</strong> project{inSubsidy > 1 ? 's' : ''} in subsidy processing
          </span>
          <Link to="/projects?stage=subsidy_claim" className="btn btn-sm btn-outline alert-action">View →</Link>
        </div>
      )}

      {/* ── Hero Commission Card — dark green, full width ───────────────────── */}
      <div className="dashboard-card glass-card-dark animate-fade-in animate-delay-1" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <h3 className="card-title text-white"><IndianRupee size={17} /> Commission & Subsidy Portfolio</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', padding: '0.5rem 0 1rem', textAlign: 'center' }}>
            {/* Big earned number */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commission Earned</p>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#34d399', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                {commission.earned != null ? formatInr(commission.earned) : '—'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 4 }}>
                From {completed} completed project{completed !== 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Payout</p>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fbbf24', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                {commission.pending != null ? formatInr(commission.pending) : '—'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 4 }}>Active & subsidy-stage projects</p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commission Rate</p>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#a78bfa', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                {commission.rate_pct != null ? `${commission.rate_pct}%` : '—'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 4 }}>of project cost</p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subsidy Portfolio</p>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#60a5fa', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                {formatInr(subsidyPotential)}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 4 }}>50% govt subsidy potential</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3 KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid animate-fade-in animate-delay-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <KpiCard
          icon={UserPlus}    label="In Onboarding"      value={inOnboarding}
          color="#6366f1"   bg="#eef2ff"
          sub={`Draft: ${breakdown['draft'] ?? 0}  ·  Onboarding: ${breakdown['farmer_onboarding'] ?? 0}  ·  Docs: ${breakdown['document_collection'] ?? 0}`}
          onClick={() => { window.location.href = '/projects?stage=farmer_onboarding'; }}
        />
        <KpiCard
          icon={Target}      label="In Construction"    value={inConstruction}
          color="#ea580c"   bg="#fff7ed"
          sub={`Sites active: M1–M7`}
          onClick={() => { window.location.href = '/projects?stage=m1_foundation'; }}
        />
        <KpiCard
          icon={CheckCircle} label="Completed"           value={completed}
          color="#16a34a"   bg="#f0fdf4"
          sub="Subsidy released"
          onClick={() => { window.location.href = '/projects?stage=completed'; }}
        />
      </div>

      {/* ── Main content: pipeline left, leaderboard right ───────────────────── */}
      <div className="dashboard-grid animate-fade-in animate-delay-3" style={{ gridTemplateColumns: '3fr 2fr', gap: '1.25rem', marginTop: '1.25rem' }}>

        {/* Left — Pipeline breakdown ── */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title"><TrendingUp size={17} /> Pipeline Breakdown</h3>
            <Link to="/projects" className="btn btn-sm btn-outline">All Projects <ArrowRight size={13} /></Link>
          </div>
          <div className="card-body">
            {PIPELINE_GROUPS.map(group => {
              const groupTotal = group.stages.reduce((s, st) => s + (breakdown[st.key] ?? 0), 0);
              return (
                <div key={group.heading} style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: group.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {group.heading}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 'auto', fontWeight: 600 }}>
                      {groupTotal} project{groupTotal !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {group.stages.map(({ key, label, color }) => (
                    <PipelineRow key={key} stage={key} label={label} count={breakdown[key] ?? 0} color={color} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — Leaderboard + quick actions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Leaderboard */}
          <div className="dashboard-card animate-fade-in">
            <div className="card-header">
              <h3 className="card-title"><Award size={17} /> Regional Ranking</h3>
            </div>
            <div className="card-body" style={{ padding: '0.5rem 0' }}>
              {LEADERBOARD.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: '1.5rem' }}>No ranking data yet.</p>
              ) : (
                <>
                  {LEADERBOARD.map((l, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.875rem',
                        padding: '0.65rem 1.25rem',
                        borderBottom: '1px solid #f1f5f9',
                        background: l.isMe ? '#f0fdf4' : 'transparent',
                        borderLeft: l.isMe ? '3px solid #22c55e' : '3px solid transparent',
                      }}
                    >
                      {/* Rank badge */}
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#e2e8f0',
                        color: i < 3 ? 'white' : '#64748b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800,
                      }}>
                        #{i + 1}
                      </div>
                      {/* Name */}
                      <span style={{ flex: 1, fontWeight: l.isMe ? 700 : 500, color: l.isMe ? '#166534' : '#374151', fontSize: '0.85rem' }}>
                        {l.name}{l.isMe ? ' (You)' : ''}
                      </span>
                      {/* Projects count */}
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: l.isMe ? '#16a34a' : '#1e293b', fontFamily: 'var(--font-display)' }}>
                        {l.projects}
                      </span>
                    </div>
                  ))}
                  {/* Rank gap message */}
                  {(() => {
                    const me = LEADERBOARD.find(l => l.isMe);
                    const rank1 = LEADERBOARD[0];
                    if (!me) return null;
                    if (rank1.isMe) return (
                      <p style={{ padding: '0.75rem 1.25rem', textAlign: 'center', fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>
                        You are #1 in your region!
                      </p>
                    );
                    const gap = rank1.projects - me.projects;
                    return (
                      <p style={{ padding: '0.75rem 1.25rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                        {gap} project{gap !== 1 ? 's' : ''} away from Rank #1
                      </p>
                    );
                  })()}
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card animate-fade-in">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="card-body" style={{ padding: '0.75rem' }}>
              {[
                { label: 'Register New Farmer', to: '/farmers/new',  icon: '👨‍🌾', bg: 'rgba(26,71,42,0.1)' },
                { label: 'View My Projects',    to: '/projects',      icon: '📋', bg: '#e0f2fe'           },
                { label: 'My Farmer List',      to: '/farmers',       icon: '👥', bg: '#f5f3ff'           },
              ].map(action => (
                <Link key={action.to + action.label} to={action.to} className="quick-action-btn" style={{ padding: '0.875rem' }}>
                  <span className="quick-action-icon" style={{ background: action.bg }}>{action.icon}</span>
                  <span className="quick-action-label" style={{ textAlign: 'left', flex: 1 }}>{action.label}</span>
                  <ChevronRight size={16} style={{ color: '#94a3b8' }} />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DealerDashboard;
