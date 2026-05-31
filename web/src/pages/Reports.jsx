/**
 * ICON — Reports & Analytics
 *
 * Fixed:
 *  - useAuth() was called inside useEffect (Rules-of-Hooks violation)
 *  - getProjectStats() called with wrong args (user.id, user.role are unused)
 *  - period filter was wired to <select> but never sent to the API
 *  - stats.total_construction / stats.completed — wrong field names
 *  - Stage labels showed raw slugs ("goc_registration" not "GOC Registration")
 *  - Export PDF button was permanently disabled
 *
 * Added:
 *  - Financial section (subsidy portfolio, received, eligible cost)
 *  - Monthly Pipeline Trend chart (admin_metrics.pipeline_stack)
 *  - Regional Distribution chart (admin_metrics.region_data)
 *  - Working CSV export (client-side, no server call)
 *  - Stage group coloring (matches AdminDashboard groups)
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart2, TrendingUp, FileDown, Users, Landmark,
  MapPin, Building2, CheckCircle, Clock, Hammer,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { getProjectStats } from '../api/client';
import './Reports.css';

// ─── Stage labels & groups — matches AdminDashboard ──────────────────────────
const STAGE_LABELS = {
  draft:                'Draft',
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
  subsidy_claim:        'Subsidy Claim',
  agency_inspection:    'Agency Inspection',
  committee_meeting:    'Committee Meeting',
  subsidy_released:     'Subsidy Released',
  completed:            'Completed',
};
const sl = (key) => STAGE_LABELS[key] || key.replace(/_/g, ' ');

const STAGE_GROUPS = [
  { label: 'Onboarding',   color: '#6366f1', keys: ['draft', 'farmer_onboarding', 'document_collection'] },
  { label: 'Design',       color: '#0ea5e9', keys: ['site_visit', 'design_boq', 'dpr_ready'] },
  { label: 'Financial',    color: '#f59e0b', keys: ['bank_processing', 'goc_registration'] },
  { label: 'Construction', color: '#ea580c', keys: ['m1_foundation', 'm2_structure_erection', 'm3_covering_material', 'm4_trellising', 'm5_drip_fitting', 'm6_bed_preparation', 'm7_plantation'] },
  { label: 'Subsidy',      color: '#0ea5e9', keys: ['subsidy_claim', 'agency_inspection', 'committee_meeting'] },
  { label: 'Terminal',     color: '#22c55e', keys: ['subsidy_released', 'completed'] },
];

// Map each stage key → its group color
const STAGE_COLOR = {};
STAGE_GROUPS.forEach(g => g.keys.forEach(k => { STAGE_COLOR[k] = g.color; }));

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmtCrore = (n) => {
  if (!n) return '₹0';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

// ─── CSV export helper ───────────────────────────────────────────────────────
const exportCSV = (stats) => {
  if (!stats) return;
  const sb   = stats.stage_breakdown ?? {};
  const rc   = stats.role_counts     ?? {};
  const am   = stats.admin_metrics   ?? {};

  const rows = [
    ['Section', 'Metric', 'Value'],
    // Summary
    ['Summary', 'Total Farmers',             stats.total_farmers       ?? 0],
    ['Summary', 'Total Projects',            stats.total_projects      ?? 0],
    ['Summary', 'Active Sites',              stats.active_sites        ?? 0],
    ['Summary', 'Pending Subsidy',           stats.pending_subsidy     ?? 0],
    ['Summary', 'Completed',                 stats.completed           ?? 0],
    // Financial
    ['Financials', 'Total Eligible Cost',    fmtCrore(stats.total_eligible_cost)],
    ['Financials', 'Subsidy Proposed',       fmtCrore(stats.total_subsidy_proposed)],
    ['Financials', 'Subsidy Received',       fmtCrore(stats.total_subsidy_received)],
    // Stage breakdown
    ...Object.entries(sb).map(([k, v]) => ['Stage Breakdown', sl(k), v]),
    // Team
    ...Object.entries(rc).map(([k, v]) => ['Team', k.replace(/_/g, ' '), v]),
    // Regional
    ...(am.region_data ?? []).map(r => ['Region', r.name, r.count]),
  ];

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ICON_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Section header component ─────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, sub }) => (
  <div className="report-section-header">
    <div className="report-section-title">
      <Icon size={17} />
      <span>{title}</span>
    </div>
    {sub && <span className="report-section-sub">{sub}</span>}
  </div>
);

// ─── Reports page ─────────────────────────────────────────────────────────────
const Reports = () => {
  const { user } = useAuth();                // ← must be at top level, not inside useEffect
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!user) return;
    getProjectStats()                        // ← no args; role/id come from JWT in the request header
      .then(data  => setStats(data))
      .catch(()   => setError('Could not load report data. Check your connection.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  // ── Derived values ──────────────────────────────────────────────────────────
  const sb   = stats?.stage_breakdown ?? {};
  const rc   = stats?.role_counts     ?? {};
  const am   = stats?.admin_metrics   ?? {};
  const kpis = am.kpis                ?? {};

  const totalStages = Object.values(sb).reduce((a, b) => a + b, 0);
  const maxStage    = Math.max(...Object.values(sb), 1);

  // ── Summary KPI cards ───────────────────────────────────────────────────────
  const summaryKPIs = loading ? [] : [
    { icon: Users,       label: 'Total Farmers',         value: stats?.total_farmers    ?? '—', color: '#6366f1' },
    { icon: Building2,   label: 'Total Projects',         value: stats?.total_projects   ?? '—', color: '#0ea5e9' },
    { icon: Hammer,      label: 'Active Sites',           value: stats?.active_sites     ?? '—', color: '#f59e0b' },
    { icon: CheckCircle, label: 'Completed',              value: stats?.completed        ?? '—', color: '#22c55e' },
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '0 0 3rem' }}>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">
            Performance overview — project pipeline, financials, and field operations.
            {totalStages > 0 && (
              <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                ({totalStages} projects across {Object.keys(sb).length} stages)
              </span>
            )}
          </p>
        </div>
        <div className="report-actions">
          <button
            className="btn btn-primary"
            onClick={() => exportCSV(stats)}
            disabled={!stats}
            title="Download CSV report"
          >
            <FileDown size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-banner danger" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
          Loading report data…
        </div>
      ) : (
        <>
          {/* ── Summary KPI strip ───────────────────────────────────────────── */}
          <div className="kpi-strip animate-delay-1">
            {summaryKPIs.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="glass-card kpi-strip-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                  <p className="kpi-strip-label" style={{ margin: 0 }}>{label}</p>
                </div>
                <h3 className="kpi-strip-value" style={{ color }}>{value}</h3>
              </div>
            ))}
          </div>

          {/* ── Financial summary ───────────────────────────────────────────── */}
          <div className="glass-card-dark report-section animate-delay-2" style={{ marginBottom: '1.5rem' }}>
            <SectionHeader icon={TrendingUp} title="Financial Overview" sub="Subsidy portfolio across all projects" />
            <div className="report-financials-grid">
              {[
                { label: 'Total Eligible Cost',  value: fmtCrore(stats?.total_eligible_cost),     color: '#60a5fa' },
                { label: 'Subsidy Proposed',      value: fmtCrore(stats?.total_subsidy_proposed),  color: '#fbbf24', bold: true },
                { label: 'Subsidy Received',      value: fmtCrore(stats?.total_subsidy_received),  color: '#34d399' },
                { label: 'Pending Claims',         value: stats?.pending_subsidy ?? 0,              color: '#f87171' },
              ].map(({ label, value, color, bold }) => (
                <div key={label} className="report-fin-item">
                  <span className="report-fin-label">{label}</span>
                  <span className="report-fin-value" style={{ color, fontWeight: bold ? 800 : 700 }}>{value}</span>
                </div>
              ))}
            </div>
            {(kpis.bank_wip != null) && (
              <div className="report-financials-grid" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '1rem', paddingTop: '1rem' }}>
                {[
                  { label: 'Bank WIP',         value: kpis.bank_wip       ?? 0, color: '#fbbf24' },
                  { label: 'Bank Sanctioned',   value: kpis.bank_sanctioned ?? 0, color: '#34d399' },
                  { label: 'GOC Applied',       value: kpis.goc_applied    ?? 0, color: '#60a5fa' },
                  { label: 'GOC Approved',      value: kpis.goc_approved   ?? 0, color: '#a78bfa' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="report-fin-item">
                    <span className="report-fin-label">{label}</span>
                    <span className="report-fin-value" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Two-column: Stage Pipeline + Regional ───────────────────────── */}
          <div className="charts-grid animate-delay-2" style={{ marginBottom: '1.5rem' }}>

            {/* Stage Pipeline */}
            <div className="glass-card chart-card">
              <SectionHeader icon={BarChart2} title="Stage Pipeline" sub={`${Object.keys(sb).length} active stages`} />
              {Object.keys(sb).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
                  {STAGE_GROUPS.map(group => {
                    const items = group.keys
                      .map(k => ({ key: k, count: sb[k] || 0 }))
                      .filter(x => x.count > 0);
                    if (items.length === 0) return null;
                    const maxG = Math.max(...items.map(x => x.count), 1);
                    return (
                      <div key={group.label}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: group.color }} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: group.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            {group.label}
                          </span>
                        </div>
                        <div className="bar-chart" style={{ gap: '0.4rem', paddingLeft: '0.75rem', borderLeft: `2px solid ${group.color}30` }}>
                          {items.map(({ key, count }) => (
                            <div key={key} className="bar-row">
                              <span className="bar-label" style={{ width: 140 }}>{sl(key)}</span>
                              <div className="bar-track">
                                <div className="bar-fill" style={{ width: `${(count / maxG) * 100}%`, background: group.color }} />
                              </div>
                              <span className="bar-value">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>No stage data.</p>
              )}
            </div>

            {/* Regional + Area stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Regional Distribution */}
              {(am.region_data ?? []).length > 0 && (
                <div className="glass-card chart-card">
                  <SectionHeader icon={MapPin} title="District Distribution" />
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={am.region_data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} width={22} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: 'none', fontSize: '0.8rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      />
                      <Bar dataKey="count" name="Projects" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Area-type Distribution */}
              {(am.area_data ?? []).length > 0 && (
                <div className="glass-card chart-card">
                  <SectionHeader icon={MapPin} title="Area-type Distribution" />
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={am.area_data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} width={22} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: 'none', fontSize: '0.8rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      />
                      <Bar dataKey="count" name="Projects" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Team Roster */}
              <div className="glass-card chart-card">
                <SectionHeader icon={Users} title="Team Roster" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                  {Object.entries(rc).map(([role, count]) => (
                    <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.5rem', borderRadius: 8, background: '#f8fafc' }}>
                      <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                        {role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', minWidth: '2ch', textAlign: 'right' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Monthly Pipeline Trend ───────────────────────────────────────── */}
          {(am.pipeline_stack ?? []).length > 0 && (
            <div className="glass-card chart-card animate-delay-3" style={{ marginBottom: '1.5rem' }}>
              <SectionHeader icon={TrendingUp} title="Monthly Pipeline Trend" sub="Projects registered per month by stage group (last 6 months)" />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={am.pipeline_stack} margin={{ top: 8, right: 16, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', fontSize: '0.8rem', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem', paddingTop: 8 }} />
                  <Bar dataKey="Sourcing"  stackId="a" fill="#6366f1" radius={[0,0,0,0]} />
                  <Bar dataKey="DPR"       stackId="a" fill="#0ea5e9" />
                  <Bar dataKey="Banking"   stackId="a" fill="#f59e0b" />
                  <Bar dataKey="GOC"       stackId="a" fill="#f97316" />
                  <Bar dataKey="Erection"  stackId="a" fill="#ea580c" />
                  <Bar dataKey="Subsidy"   stackId="a" fill="#0284c7" />
                  <Bar dataKey="Completed" stackId="a" fill="#22c55e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Summary table ───────────────────────────────────────────────── */}
          <div className="glass-card table-container animate-delay-3">
            <div className="report-section-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)' }}>
              <div className="report-section-title"><BarChart2 size={17} /><span>Full Data Summary</span></div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Metric</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr><td rowSpan={5} style={{ fontWeight: 700, color: 'var(--color-primary)', verticalAlign: 'top', paddingTop: '1rem' }}>Overview</td>
                    <td>Total Farmers</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{stats?.total_farmers ?? '—'}</td></tr>
                <tr><td>Total Projects</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{stats?.total_projects ?? '—'}</td></tr>
                <tr><td>Active Sites (Construction)</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{stats?.active_sites ?? '—'}</td></tr>
                <tr><td>Pending Subsidy</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{stats?.pending_subsidy ?? '—'}</td></tr>
                <tr><td>Completed</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{stats?.completed ?? '—'}</td></tr>

                <tr><td rowSpan={3} style={{ fontWeight: 700, color: '#f59e0b', verticalAlign: 'top', paddingTop: '1rem' }}>Financials</td>
                    <td>Total Eligible Project Cost</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCrore(stats?.total_eligible_cost)}</td></tr>
                <tr><td>Subsidy Proposed</td><td style={{ textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>{fmtCrore(stats?.total_subsidy_proposed)}</td></tr>
                <tr><td>Subsidy Received</td><td style={{ textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>{fmtCrore(stats?.total_subsidy_received)}</td></tr>

                {Object.keys(sb).length > 0 && <>
                  <tr><td rowSpan={Object.keys(sb).length} style={{ fontWeight: 700, color: '#0ea5e9', verticalAlign: 'top', paddingTop: '1rem' }}>Stage Breakdown</td>
                      <td>{sl(Object.keys(sb)[0])}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{Object.values(sb)[0]}</td></tr>
                  {Object.entries(sb).slice(1).map(([k, v]) => (
                    <tr key={k}><td>{sl(k)}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{v}</td></tr>
                  ))}
                </>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
