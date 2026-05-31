import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { RefreshCw, Edit2, Ban, CheckCircle, Phone, X, Save, Plus,
         Tractor, MapPin, ClipboardCheck, AlertTriangle, TrendingUp,
         Landmark, ShieldCheck, CheckSquare, Banknote, ExternalLink,
         FileText, ArrowRight, ChevronRight } from 'lucide-react';
import { getUsers, createUser, updateUser, getRoleKpis,
         getProjects, updateProjectStage } from '../api/client';
import AgTable from '../components/AgTable';
import { useToast } from '../context/ToastContext';

// ─── Stage labels ────────────────────────────────────────────────────────────
const STAGE_LABELS = {
  farmer_onboarding:    'Farmer Onboarding',
  document_collection:  'Document Collection',
  site_visit:           'Site Visit',
  design_boq:           'Design & BOQ',
  dpr_ready:            'DPR Ready',
  bank_processing:      'Bank Processing',
  goc_registration:     'GOC Registration',
};

// ─── Shared KPI card ────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = '#6366f1', onClick }) => (
  <div
    className="kpi-card"
    style={{ flex: 1, minWidth: 150, '--kpi-accent': color, cursor: onClick ? 'pointer' : 'default' }}
    onClick={onClick}
    title={onClick ? 'Click to view details' : undefined}
  >
    <div className="kpi-icon" style={{ background: `${color}18`, borderRadius: 10, padding: '0.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={20} color={color} />
    </div>
    <div style={{ minWidth: 0 }}>
      <p className="kpi-label">{label}</p>
      <h3 className="kpi-value" style={{ color, fontSize: '1.6rem' }}>{value ?? '—'}</h3>
      {sub && <p className="kpi-sub">{sub}</p>}
      {onClick && <p style={{ margin: 0, fontSize: '0.68rem', color, marginTop: 2, fontWeight: 600 }}>View →</p>}
    </div>
  </div>
);

// ─── Bar row helper ──────────────────────────────────────────────────────────
const BarRow = ({ label, value, max, color = '#6366f1' }) => (
  <div style={{ marginBottom: '0.6rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ fontSize: '0.78rem', color: '#475569', textTransform: 'capitalize' }}>{label.replace(/_/g,' ')}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>{value}</span>
    </div>
    <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min((value/(max||1))*100, 100)}%`, background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
    </div>
  </div>
);

// ─── Action queue table (shared by PM / Bank / Agency panels) ────────────────
const QueueTable = ({ rows = [], emptyMsg = 'All clear — no pending actions.' }) => {
  if (!rows.length) return <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>{emptyMsg}</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            {['Project','Farmer','District','Stage','Priority'].map(h => (
              <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={{ background: i % 2 === 0 ? 'transparent' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.45rem 0.6rem', fontWeight: 600, color: '#334155' }}>{r.id}</td>
              <td style={{ padding: '0.45rem 0.6rem', color: '#475569' }}>{r.farmer}</td>
              <td style={{ padding: '0.45rem 0.6rem', color: '#64748b' }}>{r.district}</td>
              <td style={{ padding: '0.45rem 0.6rem' }}>
                <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 6px', textTransform: 'capitalize' }}>
                  {(r.stage || '').replace(/_/g,' ')}
                </span>
              </td>
              <td style={{ padding: '0.45rem 0.6rem' }}>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600, borderRadius: 4, padding: '2px 7px',
                  background: r.urgency === 'High' ? '#fef2f2' : '#fffbeb',
                  color: r.urgency === 'High' ? '#ef4444' : '#f59e0b',
                }}>{r.urgency}</span>
              </td>
              <td style={{ padding: '0.45rem 0.6rem' }}>
                <Link to={`/projects/${r.projectId}`} style={{ color: '#6366f1', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ExternalLink size={12} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const fmt = (n) => {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

// ─── Project Manager KPI Panel ───────────────────────────────────────────────
const PmKpiPanel = ({ kpis }) => {
  if (!kpis) return null;
  const pmMax = Math.max(...(kpis.pm_breakdown?.map(p => p.projects) || [1]), 1);
  const stageMax = Math.max(...Object.values(kpis.stage_breakdown || {}), 1);
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
        <KpiCard icon={Tractor}       label="Assigned Projects"   value={kpis.total_assigned_projects} color="#6366f1" />
        <KpiCard icon={TrendingUp}    label="Active Construction"  value={kpis.active_construction}     color="#f59e0b" sub="In erection stages" />
        <KpiCard icon={CheckCircle}   label="Completed"            value={kpis.completed_projects}      color="#22c55e" />
        <KpiCard icon={MapPin}        label="Site Visits Logged"   value={kpis.total_site_visits}       color="#0ea5e9" />
        <KpiCard icon={ClipboardCheck} label="Follow-ups Pending" value={kpis.follow_up_pending}       color="#ef4444" />
        <KpiCard icon={Landmark}      label="Districts Covered"    value={kpis.districts_covered}       color="#8b5cf6" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div className="dashboard-card">
          <h3 className="card-title">🧭 Projects per Manager</h3>
          {kpis.pm_breakdown?.length > 0 ? kpis.pm_breakdown.map(pm => (
            <div key={pm.name} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>{pm.name}</span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{pm.completed}/{pm.projects} done</span>
              </div>
              <BarRow label="" value={pm.projects} max={pmMax} color={pm.is_me ? '#6366f1' : '#94a3b8'} />
            </div>
          )) : <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No assignments yet.</p>}
        </div>
        <div className="dashboard-card">
          <h3 className="card-title">📊 Stage Pipeline</h3>
          {Object.entries(kpis.stage_breakdown || {}).length > 0
            ? Object.entries(kpis.stage_breakdown).map(([stage, cnt]) => (
                <BarRow key={stage} label={stage} value={cnt} max={stageMax} color="#6366f1" />
              ))
            : <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No stage data yet.</p>}
        </div>
      </div>
      <div className="dashboard-card">
        <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>⚡ Projects Needing Attention</h3>
        <QueueTable rows={kpis.queue} emptyMsg="No active projects need attention right now." />
      </div>
    </div>
  );
};

// ─── Bank Officer KPI Panel ──────────────────────────────────────────────────
const BankKpiPanel = ({ kpis }) => {
  if (!kpis) return null;
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
        <KpiCard icon={Banknote}      label="Pending Sanction"     value={kpis.pending_sanction}           color="#f59e0b" sub="At bank_processing" />
        <KpiCard icon={AlertTriangle} label="Awaiting Decision"    value={kpis.awaiting_sanction}          color="#ef4444" sub="No sanction date yet" />
        <KpiCard icon={CheckCircle}   label="Loans Approved"       value={kpis.bank_approved}              color="#22c55e" />
        <KpiCard icon={TrendingUp}    label="Total Sanctioned"     value={fmt(kpis.total_loan_sanctioned)} color="#0ea5e9" />
        <KpiCard icon={Landmark}      label="Avg Loan Amount"      value={fmt(kpis.avg_loan_amount)}       color="#8b5cf6" />
        <KpiCard icon={Tractor}       label="Approval Rate"        value={`${kpis.approval_rate_pct}%`}   color="#6366f1" sub={`${kpis.bank_approved}/${kpis.total_processed} processed`} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div className="dashboard-card">
          <h3 className="card-title">🏦 Loan Portfolio Summary</h3>
          {[
            { label: 'Total Loan Sanctioned',  value: fmt(kpis.total_loan_sanctioned), color: '#22c55e' },
            { label: 'Total Eligible Cost',    value: fmt(kpis.total_eligible_cost),   color: '#0ea5e9' },
            { label: 'Avg Loan per Project',   value: fmt(kpis.avg_loan_amount),       color: '#8b5cf6' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.label}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div className="dashboard-card">
          <h3 className="card-title">📋 Processing Pipeline</h3>
          {[
            { label: 'Pending Sanction',  value: kpis.pending_sanction,  color: '#f59e0b' },
            { label: 'Awaiting Decision', value: kpis.awaiting_sanction,  color: '#ef4444' },
            { label: 'Approved',          value: kpis.bank_approved,      color: '#22c55e' },
            { label: 'Total Processed',   value: kpis.total_processed,    color: '#6366f1' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.label}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="dashboard-card">
        <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>⏳ Awaiting Sanction</h3>
        <QueueTable rows={kpis.queue} emptyMsg="No projects are currently awaiting bank sanction." />
      </div>
    </div>
  );
};

// ─── Agency Officer KPI Panel ────────────────────────────────────────────────
const AgencyKpiPanel = ({ kpis }) => {
  if (!kpis) return null;
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
        <KpiCard icon={AlertTriangle}  label="Pending Inspections"    value={kpis.pending_inspection}    color="#f59e0b" />
        <KpiCard icon={ClipboardCheck} label="Inspections Done"       value={kpis.inspections_done}      color="#0ea5e9" />
        <KpiCard icon={ShieldCheck}    label="Inspections Passed"     value={kpis.inspections_passed}    color="#22c55e" />
        <KpiCard icon={TrendingUp}     label="Pass Rate"              value={`${kpis.pass_rate_pct}%`}   color="#6366f1" />
        <KpiCard icon={CheckSquare}    label="Committee Approved"     value={kpis.committee_approved}    color="#22c55e" />
        <KpiCard icon={Banknote}       label="Total Subsidy Released" value={fmt(kpis.total_released)}   color="#8b5cf6" sub={`${kpis.subsidy_released_count} projects`} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div className="dashboard-card">
          <h3 className="card-title">🔍 Inspection Summary</h3>
          {[
            { label: 'Pending Inspections', value: kpis.pending_inspection,  color: '#f59e0b' },
            { label: 'Inspections Done',    value: kpis.inspections_done,    color: '#0ea5e9' },
            { label: 'Passed',              value: kpis.inspections_passed,  color: '#22c55e' },
            { label: 'Pass Rate',           value: `${kpis.pass_rate_pct}%`, color: '#6366f1' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.label}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div className="dashboard-card">
          <h3 className="card-title">🏛️ Committee & Subsidy</h3>
          {[
            { label: 'Meetings Done',     value: kpis.committee_meetings_done,    color: '#0ea5e9' },
            { label: 'Committee Pending', value: kpis.committee_pending,          color: '#f59e0b' },
            { label: 'Approved',          value: kpis.committee_approved,         color: '#22c55e' },
            { label: 'Rejected',          value: kpis.committee_rejected,         color: '#ef4444' },
            { label: 'Subsidy Approved',  value: fmt(kpis.total_subsidy_approved), color: '#8b5cf6' },
            { label: 'Total Released',    value: fmt(kpis.total_released),        color: '#22c55e' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.label}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="dashboard-card">
        <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>🔎 Projects Awaiting Inspection / Committee</h3>
        <QueueTable rows={kpis.queue} emptyMsg="No projects are currently awaiting inspection." />
      </div>
    </div>
  );
};

// ─── Office Staff KPI Panel ──────────────────────────────────────────────────
const OfficeStaffKpiPanel = ({ kpis, onOpenDpr }) => {
  if (!kpis) return null;
  const stageMax = Math.max(...Object.values(kpis.stage_breakdown || {}), 1);
  const trendMax = Math.max(...(kpis.monthly_trend?.map(m => m.count) || [1]), 1);
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
        <KpiCard icon={Tractor}        label="Total Projects"       value={kpis.total_projects}        color="#6366f1" />
        <KpiCard icon={Phone}          label="Total Farmers"        value={kpis.total_farmers}         color="#22c55e" sub={`${kpis.active_farmers} active`} />
        <KpiCard icon={CheckCircle}    label="Farmers with Project" value={kpis.farmers_with_project}  color="#0ea5e9" />
        <KpiCard
          icon={ClipboardCheck}
          label="Early Pipeline"
          value={kpis.early_pipeline}
          color="#f59e0b"
          sub="Onboarding → DPR"
          onClick={onOpenDpr}
        />
        <KpiCard icon={MapPin}         label="Districts Covered"    value={kpis.districts_covered}     color="#8b5cf6" />
        <KpiCard
          icon={FileText}
          label="DPR Ready"
          value={kpis.dpr_ready}
          color="#ef4444"
          sub="Ready for bank"
          onClick={onOpenDpr}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
        <div className="dashboard-card">
          <h3 className="card-title">📋 Early Pipeline Stages</h3>
          {Object.entries(kpis.stage_breakdown || {}).length > 0
            ? Object.entries(kpis.stage_breakdown).map(([stage, cnt]) => (
                <BarRow key={stage} label={stage} value={cnt} max={stageMax} color="#6366f1" />
              ))
            : <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No early-stage data yet.</p>}
        </div>

        <div className="dashboard-card">
          <h3 className="card-title">📄 Farmer KYC Coverage</h3>
          {[
            { label: 'Aadhaar Linked', value: kpis.with_aadhaar,         total: kpis.total_farmers, color: '#8b5cf6' },
            { label: 'PAN Linked',     value: kpis.with_pan,             total: kpis.total_farmers, color: '#ec4899' },
            { label: 'With Project',   value: kpis.farmers_with_project, total: kpis.total_farmers, color: '#22c55e' },
          ].map(r => (
            <div key={r.label} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: '0.78rem', color: '#475569' }}>{r.label}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: r.color }}>
                  {r.value}/{r.total} ({r.total ? Math.round(r.value/r.total*100) : 0}%)
                </span>
              </div>
              <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((r.value/(r.total||1))*100, 100)}%`,
                              background: r.color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-card">
          <h3 className="card-title">📈 Monthly Farmer Onboarding</h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', color: '#94a3b8' }}>New farmers registered (last 6 months)</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', height: 100 }}>
            {(kpis.monthly_trend || []).map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{d.count}</span>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: `${Math.max((d.count / trendMax) * 85, d.count > 0 ? 6 : 2)}px`,
                  background: i === (kpis.monthly_trend.length - 1) ? '#6366f1' : '#6366f188',
                  minHeight: 2, transition: 'height 0.4s ease',
                }} />
                <span style={{ fontSize: '0.62rem', color: '#64748b' }}>{d.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── DPR Workflow Tab ─────────────────────────────────────────────────────────
const thS = { padding: '0.4rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600,
              fontSize: '0.75rem', whiteSpace: 'nowrap', borderBottom: '1px solid #e2e8f0' };
const tdS = { padding: '0.5rem 0.75rem', color: '#475569', fontSize: '0.82rem', verticalAlign: 'middle' };

const STAGE_FLOW = [
  {
    stage:    'site_visit',
    label:    '📍 Awaiting Design Start',
    desc:     'Site visit is complete. Office staff needs to initiate the Design & BOQ phase.',
    next:     'design_boq',
    btnLabel: 'Start Design',
    btnColor: '#f59e0b',
    bg:       '#fffbeb',
    border:   '#fde68a',
    textColor:'#92400e',
  },
  {
    stage:    'design_boq',
    label:    '📐 Design & BOQ In Progress',
    desc:     'Design and BOQ preparation is ongoing. Mark as DPR Ready once the report is finalised.',
    next:     'dpr_ready',
    btnLabel: 'Mark DPR Ready',
    btnColor: '#6366f1',
    bg:       '#eef2ff',
    border:   '#c7d2fe',
    textColor:'#3730a3',
  },
  {
    stage:    'dpr_ready',
    label:    '✅ DPR Ready — Awaiting Bank Submission',
    desc:     'DPR is prepared and ready. Submit to bank to initiate the loan processing stage.',
    next:     'bank_processing',
    btnLabel: 'Submit to Bank',
    btnColor: '#22c55e',
    bg:       '#f0fdf4',
    border:   '#bbf7d0',
    textColor:'#166534',
  },
];

const DprWorkflowTab = () => {
  const { toast } = useToast();
  const [data, setData]       = useState({ site_visit: [], design_boq: [], dpr_ready: [] });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // projectId currently being advanced
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [sv, db, dr] = await Promise.all([
        getProjects({ stage: 'site_visit',  limit: 200 }),
        getProjects({ stage: 'design_boq',  limit: 200 }),
        getProjects({ stage: 'dpr_ready',   limit: 200 }),
      ]);
      setData({ site_visit: sv, design_boq: db, dpr_ready: dr });
    } catch (e) {
      setError('Failed to load DPR pipeline. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const advance = async (projectId, nextStage, projectCode) => {
    if (!window.confirm(`Advance ${projectCode} → ${STAGE_LABELS[nextStage] || nextStage}?`)) return;
    setUpdating(projectId);
    try {
      await updateProjectStage(projectId, nextStage);
      await load(); // refresh all sections
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to update stage. Please try again.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const total = data.site_visit.length + data.design_boq.length + data.dpr_ready.length;

  return (
    <div>
      {/* Pipeline summary chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {STAGE_FLOW.map(sf => (
          <div key={sf.stage} style={{
            background: sf.bg, border: `1px solid ${sf.border}`,
            borderRadius: 10, padding: '0.5rem 1rem',
            fontSize: '0.82rem', fontWeight: 600, color: sf.textColor,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{data[sf.stage].length}</span>
            {sf.label.replace(/^[^ ]+ /, '')}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {total === 0 && !loading && (
            <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 600 }}>
              ✓ Pipeline clear
            </span>
          )}
          <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} style={{ ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div className="dashboard-card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          Loading DPR pipeline…
        </div>
      ) : (
        STAGE_FLOW.map((sf, si) => (
          <div key={sf.stage} className="dashboard-card" style={{
            marginBottom: '1rem',
            borderLeft: `4px solid ${sf.btnColor}`,
          }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 className="card-title" style={{ margin: 0, color: '#1e293b' }}>{sf.label}</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>{sf.desc}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  background: sf.bg, color: sf.textColor, border: `1px solid ${sf.border}`,
                  borderRadius: 20, padding: '2px 12px', fontSize: '0.8rem', fontWeight: 700,
                }}>
                  {data[sf.stage].length} project{data[sf.stage].length !== 1 ? 's' : ''}
                </span>
                {si < STAGE_FLOW.length - 1 && (
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ArrowRight size={12} /> Next: {STAGE_LABELS[sf.next]}
                  </span>
                )}
              </div>
            </div>

            {data[sf.stage].length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, padding: '0.75rem 0' }}>
                No projects at this stage.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={thS}>Project</th>
                      <th style={thS}>Farmer</th>
                      <th style={thS}>Dealer</th>
                      <th style={thS}>Location</th>
                      <th style={thS}>Area</th>
                      <th style={thS}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data[sf.stage].map((proj, i) => {
                      const farmer  = proj.farmer  || {};
                      const dealer  = proj.dealer  || {};
                      const village = proj.village || {};
                      const taluka  = village.taluka || {};
                      const district= taluka.district || {};
                      const loc = [taluka.name, district.name].filter(Boolean).join(', ') || '—';
                      const area = proj.land_area
                        ? `${proj.land_area} ${proj.land_unit || 'SQM'}`
                        : '—';
                      const code = proj.project_code || `PRJ-${proj.id}`;
                      const isUpdating = updating === proj.id;

                      return (
                        <tr key={proj.id} style={{
                          background: i % 2 === 0 ? 'transparent' : '#f8fafc',
                          borderBottom: '1px solid #f1f5f9',
                        }}>
                          <td style={tdS}>
                            <Link to={`/projects/${proj.id}`}
                              style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {code}
                              <ExternalLink size={11} />
                            </Link>
                          </td>
                          <td style={tdS}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                              {farmer.first_name} {farmer.last_name || ''}
                            </div>
                            {farmer.phone_primary && (
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{farmer.phone_primary}</div>
                            )}
                          </td>
                          <td style={tdS}>
                            {dealer.first_name
                              ? `${dealer.first_name} ${dealer.last_name || ''}`
                              : <span style={{ color: '#94a3b8' }}>—</span>}
                          </td>
                          <td style={tdS}>{loc}</td>
                          <td style={tdS}>{area}</td>
                          <td style={{ ...tdS, whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => advance(proj.id, sf.next, code)}
                              disabled={isUpdating || !!updating}
                              style={{
                                background: isUpdating ? '#e2e8f0' : sf.btnColor,
                                color: isUpdating ? '#94a3b8' : '#fff',
                                border: 'none', borderRadius: 7, padding: '5px 14px',
                                fontSize: '0.78rem', fontWeight: 600, cursor: isUpdating ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 5,
                                transition: 'background 0.15s',
                              }}
                            >
                              {isUpdating
                                ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</>
                                : <>{sf.btnLabel} <ChevronRight size={13} /></>
                              }
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

// ─── Page constants ──────────────────────────────────────────────────────────
const STAFF_ROLES = [
  { value: 'office_staff',    label: 'Office Staff' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'bank_officer',    label: 'Bank Officer' },
  { value: 'agency_officer',  label: 'Agency Officer' },
];

const ROLE_COLORS = {
  office_staff:    'badge-warning',
  project_manager: 'badge-info',
  bank_officer:    'badge-warning',
  agency_officer:  'badge-info',
};

const ROLE_META = {
  project_manager: { title: '🧭 Project Managers', sub: 'Manage project managers overseeing greenhouse construction.' },
  bank_officer:    { title: '🏦 Bank Officers',    sub: 'Manage bank officers handling loan processing and sanctions.' },
  agency_officer:  { title: '🏛️ Agency Officers',  sub: 'Manage agency officers handling subsidy inspections and approvals.' },
};

const EMPTY_FORM = {
  first_name: '', last_name: '', role: 'office_staff',
  phone_primary: '', email: '', designation: '', district: '', state: '', new_password: '',
};

// ─── Main page ────────────────────────────────────────────────────────────────
const OfficeStaff = () => {
  const { user: _user } = useAuth();
  // Guard: admin, owner, office_staff only
  if (!['admin', 'owner', 'office_staff'].includes(_user.role))
    return <Navigate to="/" replace />;

  const { toast } = useToast();
  const location = useLocation();
  const queryRole = new URLSearchParams(location.search).get('role') || '';

  const [staff,      setStaff]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [roleFilter, setRoleFilter] = useState(queryRole);
  const [kpis,       setKpis]       = useState(null);

  // 'list' | 'add' | 'edit' | 'dpr'
  const [activeTab, setActiveTab] = useState('list');
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  // DPR tab only available on the base office_staff page
  const showDprTab = !queryRole || queryRole === 'office_staff';

  const loadStaff = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const roles = roleFilter ? [roleFilter] : STAFF_ROLES.map(r => r.value);
      const all = await Promise.all(roles.map(role => getUsers({ role })));
      setStaff(all.flat());
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load staff.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => { setRoleFilter(queryRole); setActiveTab('list'); }, [queryRole]);

  useEffect(() => {
    const kpiRole = queryRole || 'office_staff';
    const supported = ['project_manager','bank_officer','agency_officer','office_staff'];
    if (!supported.includes(kpiRole)) { setKpis(null); return; }
    setKpis(null);
    getRoleKpis(kpiRole).then(setKpis).catch(() => setKpis(null));
  }, [queryRole]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, role: queryRole || 'office_staff' });
    setFormError('');
    setActiveTab('add');
  };
  const openEdit = (s) => {
    setEditId(s.id);
    setForm({
      first_name: s.first_name||'', last_name: s.last_name||'', role: s.role,
      phone_primary: s.phone_primary||'', email: s.email||'', designation: s.designation||'',
      district: s.district||'', state: s.state||'', new_password: '',
    });
    setFormError(''); setActiveTab('edit');
  };

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.first_name.trim()) { setFormError('First name is required.'); return; }
    if (!editId && !form.phone_primary.trim()) { setFormError('Phone is required.'); return; }
    setSaving(true); setFormError('');
    try {
      if (editId) {
        const payload = {};
        Object.entries(form).forEach(([k, v]) => { if (k !== 'phone_primary' && v !== '') payload[k] = v; });
        await updateUser(editId, payload);
      } else {
        await createUser({ ...form });
      }
      setActiveTab('list'); loadStaff();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s) => {
    if (!window.confirm(`${s.is_active ? 'Suspend' : 'Reactivate'} ${s.first_name}?`)) return;
    try { await updateUser(s.id, { is_active: s.is_active ? 0 : 1 }); loadStaff(); }
    catch (err) { toast(err.response?.data?.detail || 'Failed.', 'error'); }
  };

  const closeForm = () => { setActiveTab('list'); setEditId(null); setFormError(''); };

  const renderForm = () => (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '1.3rem' }}>{editId ? 'Edit Staff Member' : 'Add New Staff'}</h2>
          <p className="page-subtitle">{editId ? 'Update staff details' : 'Register office staff, project managers, or officers'}</p>
        </div>
        <button className="btn btn-outline" onClick={closeForm}><X size={16} /> Back to List</button>
      </div>
      {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}
      <div className="form-grid">
        <div className="form-group"><label className="form-label">First Name *</label>
          <input className="input-field" name="first_name" value={form.first_name} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">Last Name</label>
          <input className="input-field" name="last_name" value={form.last_name} onChange={handleChange} /></div>
        <div className="form-group">
          <label className="form-label">Role *</label>
          <select className="input-field" name="role" value={form.role} onChange={handleChange} disabled={!!editId}>
            {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Phone {!editId && '*'}</label>
          <input className="input-field" name="phone_primary" value={form.phone_primary} onChange={handleChange} disabled={!!editId} /></div>
        <div className="form-group"><label className="form-label">Email</label>
          <input className="input-field" name="email" value={form.email} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">Designation</label>
          <input className="input-field" name="designation" value={form.designation} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">District</label>
          <input className="input-field" name="district" value={form.district} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">State</label>
          <input className="input-field" name="state" value={form.state} onChange={handleChange} /></div>
        {!editId && (
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Password</label>
            <input className="input-field" name="new_password" value={form.new_password} onChange={handleChange}
              placeholder="Leave blank to use default (icon123)" />
          </div>
        )}
      </div>
      <div className="form-actions" style={{ marginTop: '1.5rem' }}>
        <button className="btn btn-outline" onClick={closeForm} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );

  const pageMeta = ROLE_META[queryRole] ?? {
    title: 'Office Staff',
    sub: 'Manage office staff, project managers, bank officers, and agency officers.',
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageMeta.title}</h1>
          <p className="page-subtitle">{pageMeta.sub}</p>
        </div>
      </div>

      {/* Role-specific KPI Report Panel */}
      {(queryRole === '' || queryRole === 'office_staff') && (
        <OfficeStaffKpiPanel kpis={kpis} onOpenDpr={() => setActiveTab('dpr')} />
      )}
      {queryRole === 'project_manager' && <PmKpiPanel kpis={kpis} />}
      {queryRole === 'bank_officer'    && <BankKpiPanel kpis={kpis} />}
      {queryRole === 'agency_officer'  && <AgencyKpiPanel kpis={kpis} />}

      {/* Tab bar */}
      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
          List View
        </button>
        {showDprTab && (
          <button
            className={`tab-btn ${activeTab === 'dpr' ? 'active' : ''}`}
            onClick={() => setActiveTab('dpr')}
            style={activeTab !== 'dpr' ? { color: '#6366f1' } : {}}
          >
            <FileText size={14} /> DPR Workflow
          </button>
        )}
        <button className={`tab-btn ${(activeTab === 'add' || activeTab === 'edit') ? 'active' : ''}`} onClick={openCreate}>
          <Plus size={14} /> Add {queryRole ? STAFF_ROLES.find(r => r.value === queryRole)?.label ?? 'Staff' : 'Staff'}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'dpr' && showDprTab && <DprWorkflowTab />}

      {activeTab === 'list' && (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderBottom: '1px solid var(--glass-border)' }}>
              <select
                className="input-field filter-select"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              >
                <option value="">All Roles</option>
                {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button className="btn btn-outline btn-sm" onClick={loadStaff}><RefreshCw size={14} /></button>
            </div>
            <AgTable
              rowData={staff}
              loading={loading}
              columnDefs={[
                { headerName: 'Name', valueGetter: p => `${p.data.first_name} ${p.data.last_name || ''}` },
                { headerName: 'Role', field: 'role', cellRenderer: p =>
                    <span className={`badge ${ROLE_COLORS[p.value] || 'badge-secondary'}`}>{p.value.replace(/_/g,' ')}</span> },
                { headerName: 'Phone',       field: 'phone_primary' },
                { headerName: 'Email',       field: 'email',       valueFormatter: p => p.value || '—' },
                { headerName: 'Designation', field: 'designation', valueFormatter: p => p.value || '—' },
                { headerName: 'Status', field: 'is_active', maxWidth: 120, cellRenderer: p => p.value
                    ? <span className="badge badge-success">Active</span>
                    : <span className="badge badge-danger">Suspended</span> },
                { headerName: 'Actions', filter: false, sortable: false, pinned: 'right', maxWidth: 110,
                  cellRenderer: p => (
                    <div className="flex-center-gap">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p.data)}><Edit2 size={14} /></button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleToggle(p.data)}
                        style={{ color: p.data.is_active ? 'var(--color-warning)' : 'var(--color-success)' }}
                      >
                        {p.data.is_active ? <Ban size={14} /> : <CheckCircle size={14} />}
                      </button>
                    </div>
                  )
                }
              ]}
            />
          </div>
        </>
      )}

      {(activeTab === 'add' || activeTab === 'edit') && renderForm()}
    </div>
  );
};

export default OfficeStaff;
