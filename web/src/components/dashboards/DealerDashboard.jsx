/**
 * Dealer Dashboard
 * Portfolio-focused view with funnel stages, farmer metrics, and quick actions.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Tractor, CheckCircle, Clock, UserPlus, ArrowRight,
  TrendingUp, Landmark, Wallet, Target, Bell, ChevronRight, Activity, Award, IndianRupee, MapPin
} from 'lucide-react';
import { FunnelChart, Funnel, LabelList, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import '../../pages/Dashboard.css';

const formatInr = (n) => {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)} L`;
  return `₹${Math.round(n||0).toLocaleString('en-IN')}`;
};

const KpiCard = ({ icon: Icon, label, value, sub, color = 'primary' }) => (
  <div className="kpi-card">
    <div className={`kpi-icon ${color}`}>
      <Icon size={24} />
    </div>
    <div className="kpi-content">
      <p className="kpi-label">{label}</p>
      <h3 className="kpi-value">{value}</h3>
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
  </div>
);

const STAGE_FUNNEL = [
  { key: 'farmer_onboarding',   label: 'Lead Generation',    color: '#6366f1' },
  { key: 'document_collection', label: 'Document Collection', color: '#8b5cf6' },
  { key: 'site_visit',          label: 'Site Visit',          color: '#0ea5e9' },
  { key: 'design_boq',          label: 'Design & BOQ',       color: '#06b6d4' },
  { key: 'dpr_ready',           label: 'DPR Ready',          color: '#14b8a6' },
];

const SUBSIDY_STAGES = [
  { key: 'bank_processing',      label: 'Bank Processing',     color: '#f59e0b' },
  { key: 'goc_registration',    label: 'GOC Registration',    color: '#d97706' },
  { key: 'subsidy_claim',       label: 'Subsidy Claim',       color: '#0ea5e9' },
  { key: 'agency_inspection',   label: 'Agency Inspection',  color: '#2563eb' },
  { key: 'committee_meeting',   label: 'Committee Meeting',   color: '#7c3aed' },
  { key: 'subsidy_released',    label: 'Subsidy Released',    color: '#22c55e' },
];

// --- MOCK DATA FOR DEALER ---
// Replaced by stats.dealer_metrics


const DealerDashboard = ({ stats, error, user }) => {
  const dealerMetrics = stats?.dealer_metrics || {};
  const FUNNEL_DATA = dealerMetrics.funnel_data || [];
  const LEADERBOARD = dealerMetrics.leaderboard || [];
  const DISTRICT_DATA = dealerMetrics.district_data || [];

  const myProjects  = stats?.total_projects   ?? 0;
  const myFarmers   = stats?.total_farmers    ?? 0;
  const completed   = stats?.completed        ?? 0;
  const breakdown   = stats?.stage_breakdown  ?? {};
  const commission  = dealerMetrics.commission || {};

  const inPipeline = breakdown.farmer_onboarding || 0;
  const inDocs = breakdown.document_collection || 0;
  const inFinancial = (breakdown.bank_processing || 0) + (breakdown.goc_registration || 0);
  const inConstruction = (breakdown.m1_foundation || 0) + (breakdown.m2_structure_erection || 0) +
                         (breakdown.m3_covering_material || 0) + (breakdown.m4_trellising || 0) +
                         (breakdown.m5_drip_fitting || 0) + (breakdown.m6_bed_preparation || 0) +
                         (breakdown.m7_plantation || 0);
  const inSubsidy = (breakdown.subsidy_claim || 0) + (breakdown.agency_inspection || 0) + (breakdown.committee_meeting || 0);

  const subsidyPotential = stats?.total_subsidy_potential ?? 0;

  const maxFunnelCount = Math.max(...STAGE_FUNNEL.map(s => breakdown[s.key] || 0), 1);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-greeting">
          <h1 className="dashboard-title">
            🤝 My Portfolio
          </h1>
          <p className="dashboard-subtitle">
            Welcome back, {user.first_name}! Track your {myFarmers} farmers and {myProjects} projects.
          </p>
        </div>
        <div className="dashboard-actions">
          <Link to="/farmers/new" className="btn btn-primary">
            <UserPlus size={16} /> Register Farmer
          </Link>
        </div>
      </div>

      {/* Alerts */}
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
          <Link to="/projects" className="btn btn-sm btn-outline alert-action">View →</Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid animate-fade-in animate-delay-1">
        <KpiCard
          icon={Users}
          label="My Farmers"
          value={myFarmers}
          color="primary"
          sub="Registered under you"
        />
        <KpiCard
          icon={Tractor}
          label="Total Projects"
          value={myProjects}
          color="warning"
          sub="In your portfolio"
        />
        <KpiCard
          icon={Target}
          label="In Pipeline"
          value={inPipeline + inDocs}
          color="info"
          sub="Leads & docs"
        />
        <KpiCard
          icon={CheckCircle}
          label="Completed"
          value={completed}
          color="success"
          sub="Subsidy released"
        />
      </div>

      {/* Main Content */}
      <div className="dashboard-grid grid-main" style={{ gridTemplateColumns: '7fr 3fr' }}>
        {/* Left Column */}
        <div className="flex flex-col gap-3">
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Funnel Chart */}
            <div className="dashboard-card animate-fade-in animate-delay-2">
              <div className="card-header">
                <h3 className="card-title"><Activity size={18} /> Conversion Funnel</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)', background: 'var(--color-bg-card)', color: 'var(--color-text-main)' }}/>
                    <Funnel dataKey="value" data={FUNNEL_DATA} isAnimationActive>
                      <LabelList position="right" fill="var(--color-text-main)" stroke="none" dataKey="name" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Commissions Tracker */}
            <div className="dashboard-card animate-fade-in animate-delay-2" style={{ background: 'var(--color-bg-base)' }}>
              <div className="card-header" style={{ background: 'var(--color-bg-card)', borderRadius: '8px 8px 0 0' }}>
                <h3 className="card-title"><IndianRupee size={18} /> Commission Tracker</h3>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingTop: '1.5rem' }}>
                <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', borderLeft: '4px solid #10b981', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Earned</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
                    {commission.earned != null ? formatInr(commission.earned) : '—'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>From {completed} completed project{completed !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', borderLeft: '4px solid #f59e0b', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Pending Payouts</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                    {commission.pending != null ? formatInr(commission.pending) : '—'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Active &amp; subsidy-stage projects</div>
                </div>
                <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', borderLeft: '4px solid #6366f1', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Commission Rate</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>
                    {commission.rate_pct != null ? `${commission.rate_pct}%` : '—'}
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}> of project cost</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Lead Pipeline */}
          <div className="dashboard-card animate-fade-in animate-delay-2">
            <div className="card-header">
              <h3 className="card-title">
                <TrendingUp size={18} /> Lead Pipeline
              </h3>
              <Link to="/projects" className="btn btn-sm btn-outline">
                All Projects <ArrowRight size={14} />
              </Link>
            </div>
            <div className="card-body">
              <div className="bar-chart">
                {STAGE_FUNNEL.map(({ key, label, color }) => {
                  const count = breakdown[key] || 0;
                  return (
                    <div key={key} className="bar-item">
                      <div className="bar-header">
                        <span className="bar-label">{label}</span>
                        <span className="bar-value">{count}</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(count / maxFunnelCount) * 100}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Construction Progress */}
          <div className="dashboard-card animate-fade-in animate-delay-3">
            <div className="card-header">
              <h3 className="card-title">
                <Clock size={18} /> Construction Progress
              </h3>
            </div>
            <div className="card-body">
              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 0 }}>
                <div className="text-center">
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{inConstruction}</p>
                  <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Active Sites</p>
                </div>
                <div className="text-center">
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0ea5e9' }}>{inFinancial}</p>
                  <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Bank Stage</p>
                </div>
                <div className="text-center">
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>{inSubsidy}</p>
                  <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Subsidy</p>
                </div>
                <div className="text-center">
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{completed}</p>
                  <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Done</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-3">
          {/* Leaderboard */}
          <div className="dashboard-card animate-fade-in animate-delay-2">
            <div className="card-header">
              <h3 className="card-title"><Award size={18} /> Regional Ranking</h3>
            </div>
            <div className="card-body" style={{ padding: '0.5rem 0' }}>
               {LEADERBOARD.map((l, i) => (
                 <div key={i} style={{ 
                   display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                   padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--glass-border)',
                   background: l.isMe ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                     <div style={{ 
                       width: '28px', height: '28px', borderRadius: '50%', 
                       background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : '#cd7f32',
                       color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold'
                     }}>
                       #{i+1}
                     </div>
                     <div>
                       <div style={{ fontWeight: l.isMe ? 700 : 500, color: l.isMe ? 'var(--color-primary)' : 'var(--color-text-main)' }}>
                         {l.name} {l.isMe ? '(You)' : ''}
                       </div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <MapPin size={10} /> {l.location}
                       </div>
                     </div>
                   </div>
                   <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                     {l.projects}
                   </div>
                 </div>
               ))}
               {(() => {
                 if (!LEADERBOARD.length) return null;
                 const rank1 = LEADERBOARD[0];
                 const me = LEADERBOARD.find(l => l.isMe);
                 if (!me) return null;
                 if (rank1.isMe) return (
                   <div style={{ padding: '0.75rem 1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#22c55e', fontWeight: 600 }}>
                     You&apos;re #1 in your region!
                   </div>
                 );
                 const gap = rank1.projects - me.projects;
                 return (
                   <div style={{ padding: '0.75rem 1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                     You are {gap} project{gap !== 1 ? 's' : ''} away from Rank #1.
                   </div>
                 );
               })()}
            </div>
          </div>
          {/* Subsidy Portfolio */}
          <div className="dashboard-card glass-card-dark animate-fade-in animate-delay-2">
            <div className="card-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <h3 className="card-title text-white">
                <Wallet size={18} /> Subsidy Portfolio
              </h3>
            </div>
            <div className="card-body">
              <div className="text-center" style={{ padding: '1rem 0' }}>
                <p className="revenue-label">Total Potential Subsidy</p>
                <h3 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                  {formatInr(subsidyPotential)}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                  50% government subsidy on eligible costs
                </p>
              </div>
              <div className="data-list" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                <div className="data-row" style={{ color: 'white' }}>
                  <span className="data-row-sub" style={{ color: 'rgba(255,255,255,0.6)' }}>Farmers</span>
                  <span className="data-row-value" style={{ color: 'white' }}>{myFarmers}</span>
                </div>
                <div className="data-row" style={{ color: 'white' }}>
                  <span className="data-row-sub" style={{ color: 'rgba(255,255,255,0.6)' }}>In Pipeline</span>
                  <span className="data-row-value" style={{ color: '#fbbf24' }}>{inPipeline + inDocs}</span>
                </div>
                <div className="data-row" style={{ color: 'white' }}>
                  <span className="data-row-sub" style={{ color: 'rgba(255,255,255,0.6)' }}>In Construction</span>
                  <span className="data-row-value" style={{ color: '#f59e0b' }}>{inConstruction}</span>
                </div>
                <div className="data-row" style={{ color: 'white' }}>
                  <span className="data-row-sub" style={{ color: 'rgba(255,255,255,0.6)' }}>Subsidy Processing</span>
                  <span className="data-row-value" style={{ color: '#60a5fa' }}>{inSubsidy}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card animate-fade-in animate-delay-3">
            <div className="card-header">
              <h3 className="card-title">⚡ Quick Actions</h3>
            </div>
            <div className="card-body" style={{ padding: '0.75rem' }}>
              {[
                { label: 'Register New Farmer', to: '/farmers/new', icon: '👨‍🌾', bg: 'rgba(26,71,42,0.1)', color: 'var(--color-primary)' },
                { label: 'View My Projects', to: '/projects', icon: '📋', bg: '#e0f2fe', color: '#0ea5e9' },
                { label: 'My Farmer List', to: '/farmers', icon: '👥', bg: '#f5f3ff', color: '#8b5cf6' },
              ].map(action => (
                <Link
                  key={action.to + action.label}
                  to={action.to}
                  className="quick-action-btn"
                  style={{ padding: '0.875rem' }}
                >
                  <span className="quick-action-icon" style={{ background: action.bg }}>
                    {action.icon}
                  </span>
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
