/**
 * ManagerDashboard
 * Dedicated, role-aware dashboard for:
 *   Project Manager, Bank Officer, Agency Officer, Agronomist,
 *   Structure / Drip / Bed / Plantation Contractors
 *
 * Each role sees:
 *  1. Header with their role title and focus area
 *  2. Action-required alert (what needs attention NOW)
 *  3. KPI cards relevant to their work
 *  4. Detail cards / charts relevant to their work
 *  5. Quick-action links that deep-link into relevant filtered views
 */
import { useState, useEffect, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Tractor, CheckCircle, Clock, MapPin, Banknote, AlertTriangle,
  ClipboardCheck, TrendingUp, ShieldCheck, CheckSquare, Leaf,
  ArrowRight, Bell, Target, Users, Wrench, Building2, Calendar,
  FileWarning, ChevronRight, Hammer, Droplets, Sprout, TreePine,
  type LucideProps,
} from 'lucide-react';
import { getRoleKpis } from '../../api/client';
import { stageLabel } from './AdminDashboard';
import DashboardKpiCard from '../DashboardKpiCard';
import '../../pages/Dashboard.css';
import type { AuthUser } from '../../context/AuthContext';

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined): string => {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

// ─── Shared sub-components ────────────────────────────────────────────────────
interface BarRowProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

const BarRow = ({ label, value, max, color = '#6366f1' }: BarRowProps) => (
  <div className="bar-item">
    <div className="bar-header">
      <span className="bar-label">{label}</span>
      <span className="bar-value">{value}</span>
    </div>
    <div className="bar-track">
      <div style={{
        height: '100%',
        width: `${Math.min((value / (max || 1)) * 100, 100)}%`,
        background: color,
        borderRadius: 4,
        transition: 'width 0.4s ease',
      }} />
    </div>
  </div>
);

interface DataRowProps {
  label: string;
  value: number | string;
  color?: string;
  to?: string;
}

const DataRow = ({ label, value, color, to }: DataRowProps) => (
  <div className="data-row">
    <span className="data-row-sub">{label}</span>
    {to ? (
      <Link to={to} style={{ color: color || 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 3 }}>
        {value} <ArrowRight size={12} />
      </Link>
    ) : (
      <span className="data-row-value" style={{ color }}>{value}</span>
    )}
  </div>
);

interface ActionAlertProps {
  icon?: ComponentType<LucideProps>;
  color?: string;
  bg?: string;
  children: ReactNode;
}

const ActionAlert = ({ icon: Icon = AlertTriangle, color, bg, children }: ActionAlertProps) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)',
    background: bg || '#fffbeb', borderLeft: `4px solid ${color || '#f59e0b'}`,
    marginBottom: '0.75rem', fontSize: '0.88rem',
  }}>
    <Icon size={18} style={{ color: color || '#f59e0b', flexShrink: 0 }} />
    <div style={{ flex: 1, color: 'var(--color-bg-base)' }}>{children}</div>
  </div>
);

interface QueueListProps {
  title: string;
  items: any[];
  icon: ComponentType<LucideProps>;
}

const QueueList = ({ title, items, icon: Icon }: QueueListProps) => (
  <div className="dashboard-card animate-fade-in animate-delay-4" style={{ gridColumn: 'span 2' }}>
    <div className="card-header">
      <h3 className="card-title"><Icon size={18} /> {title} Inbox</h3>
    </div>
    <div className="card-body" style={{ padding: 0 }}>
      {items.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No items in queue</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--glass-border)' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Project / Farmer</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>District</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Urgency</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{item.farmer}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.id}</div>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-main)' }}>{item.district}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ 
                    padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                    background: item.urgency === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: item.urgency === 'High' ? '#ef4444' : '#f59e0b'
                  }}>{item.urgency}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <Link to={`/projects/${item.projectId}`} className="btn btn-sm btn-outline">Review</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

// ─── PROJECT MANAGER PANEL ────────────────────────────────────────────────────
const PmPanel = ({ k, stats: _stats }: { k: any; stats?: any }) => {
  if (!k) return null;
  const pmMax    = Math.max(...(k.pm_breakdown?.map((p: any) => p.projects) || [1]), 1);
  const stageMax = Math.max(...(Object.values(k.stage_breakdown || {}) as number[]), 1);

  return (
    <>
      {/* Action alerts */}
      {k.follow_up_pending > 0 && (
        <ActionAlert color="#ef4444" bg="#fef2f2" icon={Bell}>
          <strong>{k.follow_up_pending} site visit{k.follow_up_pending > 1 ? 's' : ''}</strong> marked for follow-up.{' '}
          <Link to="/reports" style={{ color: '#ef4444', fontWeight: 600 }}>Review now →</Link>
        </ActionAlert>
      )}

      {/* KPIs */}
      <div className="kpi-grid animate-fade-in animate-delay-1">
        <DashboardKpiCard icon={Tractor}     label="Assigned Projects"  value={k.total_assigned_projects} tone="neutral"  sub="Total assigned to PMs" />
        <DashboardKpiCard icon={Building2}   label="Active Sites"       value={k.active_construction}     tone="progress" sub="M1 – M7 stages" />
        <DashboardKpiCard icon={CheckCircle} label="Completed"         value={k.completed_projects}      tone="success"  sub="Subsidy released" />
        <DashboardKpiCard icon={MapPin}      label="Site Visits"        value={k.total_site_visits}       tone="progress" sub="Total logged" />
        <DashboardKpiCard
          icon={Bell}
          label="Follow-ups Pending"
          value={k.follow_up_pending}
          tone={k.follow_up_pending > 0 ? 'urgent' : 'success'}
          sub="Requiring action"
          alert={k.follow_up_pending > 0}
        />
        <DashboardKpiCard icon={Target}      label="Districts Covered"  value={k.districts_covered}       tone="neutral" sub="Geography" />
      </div>

      {/* Detail cards */}
      <div className="dashboard-grid grid-2">
        <div className="dashboard-card animate-fade-in animate-delay-2">
          <div className="card-header">
            <h3 className="card-title"><Users size={18} /> PM Project Load</h3>
          </div>
          <div className="card-body">
            {k.pm_breakdown?.length > 0 ? (
              <div className="bar-chart">
                {k.pm_breakdown.map((pm: any) => (
                  <BarRow key={pm.name} label={pm.name} value={pm.projects} max={pmMax} color="#6366f1" />
                ))}
              </div>
            ) : (
              <p className="text-muted text-center p-4">No team data yet.</p>
            )}
          </div>
        </div>

        <div className="dashboard-card animate-fade-in animate-delay-3">
          <div className="card-header">
            <h3 className="card-title"><TrendingUp size={18} /> Stage Distribution</h3>
          </div>
          <div className="card-body">
            {Object.keys(k.stage_breakdown || {}).length > 0 ? (
              <div className="bar-chart">
                {(Object.entries(k.stage_breakdown) as [string, number][])
                  .sort(([, a], [, b]) => b - a)
                  .map(([s, c]) => (
                    <BarRow key={s} label={stageLabel(s)} value={c} max={stageMax} color="#f59e0b" />
                  ))}
              </div>
            ) : (
              <p className="text-muted text-center p-4">No stage data yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid grid-2">
        <div className="dashboard-card animate-fade-in animate-delay-4">
          <div className="card-header">
            <h3 className="card-title">⚡ Quick Actions</h3>
          </div>
          <div className="card-body" style={{ padding: '0.75rem' }}>
            <div className="quick-actions">
              {[
                { label: 'All Projects',                    to: '/projects',                        icon: '📋', bg: 'rgba(26,71,42,0.1)' },
                { label: 'Active Construction Sites',       to: '/projects?stage=m1_foundation',    icon: '🏗️', bg: '#fff7ed' },
                { label: 'Projects Needing Site Visit',     to: '/projects?stage=site_visit',       icon: '📍', bg: '#e0f2fe' },
                { label: 'Log Site Visit / Daily Report',   to: '/reports',                         icon: '📝', bg: '#f5f3ff' },
              ].map(a => (
                <Link key={a.label} to={a.to} className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: a.bg }}>{a.icon}</span>
                  <span className="quick-action-label">{a.label}</span>
                  <ChevronRight size={14} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
                </Link>
              ))}
            </div>
          </div>
        </div>
        
        <QueueList
          title="Active Projects"
          icon={MapPin}
          items={k.queue || []}
        />
      </div>
    </>
  );
};

// ─── BANK OFFICER PANEL ──────────────────────────────────────────────────────
const BankPanel = ({ k }: { k: any }) => {
  if (!k) return null;

  return (
    <>
      {/* Action alerts */}
      {k.awaiting_sanction > 0 && (
        <ActionAlert color="#ef4444" bg="#fef2f2">
          <strong>{k.awaiting_sanction} loan application{k.awaiting_sanction > 1 ? 's' : ''}</strong> at Bank Processing stage without a sanction date.{' '}
          <Link to="/projects?stage=bank_processing" style={{ color: '#ef4444', fontWeight: 600 }}>Review →</Link>
        </ActionAlert>
      )}
      {k.pending_sanction > 0 && k.awaiting_sanction === 0 && (
        <ActionAlert color="#f59e0b" bg="#fffbeb">
          <strong>{k.pending_sanction} project{k.pending_sanction > 1 ? 's' : ''}</strong> currently in Bank Processing stage.{' '}
          <Link to="/projects?stage=bank_processing" style={{ color: '#f59e0b', fontWeight: 600 }}>View pipeline →</Link>
        </ActionAlert>
      )}

      {/* KPIs */}
      <div className="kpi-grid animate-fade-in animate-delay-1">
        <DashboardKpiCard
          icon={FileWarning}
          label="Awaiting Decision"
          value={k.awaiting_sanction}
          tone={k.awaiting_sanction > 0 ? 'urgent' : 'success'}
          sub="No sanction date yet"
          alert={k.awaiting_sanction > 0}
        />
        <DashboardKpiCard icon={Clock}       label="In Bank Processing"  value={k.pending_sanction}          tone="financial" sub="At bank_processing stage" />
        <DashboardKpiCard icon={CheckCircle} label="Loans Approved"      value={k.bank_approved}              tone="success"   sub="Sanctioned" />
        <DashboardKpiCard icon={Banknote}    label="Total Sanctioned"    value={fmt(k.total_loan_sanctioned)} tone="financial" sub="Portfolio value" />
        <DashboardKpiCard icon={Target}      label="Avg Loan per Project" value={fmt(k.avg_loan_amount)}       tone="financial" sub="Sanctioned projects" />
        <DashboardKpiCard icon={TrendingUp}  label="Approval Rate"       value={`${k.approval_rate_pct}%`}    tone="success"   sub={`${k.bank_approved} of ${k.total_processed}`} />
      </div>

      {/* Detail cards */}
      <div className="dashboard-grid grid-2">
        <div className="dashboard-card glass-card-dark animate-fade-in animate-delay-2">
          <div className="card-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <h3 className="card-title text-white"><Banknote size={18} /> Loan Portfolio</h3>
          </div>
          <div className="card-body">
            <div className="data-list">
              <DataRow label="Total Loan Sanctioned"  value={fmt(k.total_loan_sanctioned)} color="#22c55e" />
              <DataRow label="Total Eligible Cost"    value={fmt(k.total_eligible_cost)}   color="#60a5fa" />
              <DataRow label="Avg Loan per Project"   value={fmt(k.avg_loan_amount)}       color="#fbbf24" />
            </div>
          </div>
        </div>

        <div className="dashboard-card animate-fade-in animate-delay-3">
          <div className="card-header">
            <h3 className="card-title"><ClipboardCheck size={18} /> Processing Status</h3>
          </div>
          <div className="card-body">
            <div className="data-list">
              <DataRow label="Pending Sanction"         value={k.pending_sanction}          color="#f59e0b"
                       to="/projects?stage=bank_processing" />
              <DataRow label="Awaiting Decision"        value={k.awaiting_sanction}         color="#ef4444"
                       to="/projects?stage=bank_processing" />
              <DataRow label="Approved"                  value={k.bank_approved}             color="#22c55e" />
              <DataRow label="Total Processed"          value={k.total_processed}           color="#6366f1" />
              <DataRow label="Approval Rate"            value={`${k.approval_rate_pct}%`}   color="#22c55e" />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid grid-2">
        <div className="dashboard-card animate-fade-in animate-delay-4">
          <div className="card-header">
            <h3 className="card-title">⚡ Quick Actions</h3>
          </div>
          <div className="card-body" style={{ padding: '0.75rem' }}>
            <div className="quick-actions">
              {[
                { label: 'Loans Awaiting Sanction',   to: '/projects?stage=bank_processing', icon: '🏦', bg: '#e0f2fe' },
                { label: 'GOC Registration Stage',    to: '/projects?stage=goc_registration', icon: '📄', bg: '#fffbeb' },
                { label: 'View All Projects',         to: '/projects',                        icon: '📋', bg: '#f5f3ff' },
              ].map(a => (
                <Link key={a.label} to={a.to} className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: a.bg }}>{a.icon}</span>
                  <span className="quick-action-label">{a.label}</span>
                  <ChevronRight size={14} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <QueueList
          title="Awaiting Sanction"
          icon={Banknote}
          items={k.queue || []}
        />
      </div>
    </>
  );
};

// ─── AGENCY OFFICER PANEL ─────────────────────────────────────────────────────
const AgencyPanel = ({ k }: { k: any }) => {
  if (!k) return null;

  return (
    <>
      {/* Action alerts */}
      {k.pending_inspection > 0 && (
        <ActionAlert color="#f59e0b" bg="#fffbeb" icon={ClipboardCheck}>
          <strong>{k.pending_inspection} project{k.pending_inspection > 1 ? 's' : ''}</strong> are waiting for subsidy inspection.{' '}
          <Link to="/projects?stage=agency_inspection" style={{ color: '#f59e0b', fontWeight: 600 }}>Schedule inspections →</Link>
        </ActionAlert>
      )}
      {k.committee_pending > 0 && (
        <ActionAlert color="#7c3aed" bg="#f5f3ff" icon={CheckSquare}>
          <strong>{k.committee_pending} project{k.committee_pending > 1 ? 's' : ''}</strong> waiting for committee meeting decision.{' '}
          <Link to="/projects?stage=committee_meeting" style={{ color: '#7c3aed', fontWeight: 600 }}>Review →</Link>
        </ActionAlert>
      )}

      {/* KPIs */}
      <div className="kpi-grid animate-fade-in animate-delay-1">
        <DashboardKpiCard
          icon={AlertTriangle}
          label="Pending Inspections"
          value={k.pending_inspection}
          tone={k.pending_inspection > 0 ? 'pending' : 'success'}
          sub="Awaiting site inspection"
          alert={k.pending_inspection > 0}
        />
        <DashboardKpiCard icon={ClipboardCheck} label="Inspections Done"     value={k.inspections_done}          tone="progress" sub="Completed" />
        <DashboardKpiCard icon={ShieldCheck}    label="Inspections Passed"   value={k.inspections_passed}        tone="success"  sub="Approved for subsidy" />
        <DashboardKpiCard icon={Target}         label="Pass Rate"            value={`${k.pass_rate_pct}%`}       tone="success"  sub="Passed / Done" />
        <DashboardKpiCard
          icon={CheckSquare}
          label="Committee Pending"
          value={k.committee_pending}
          tone={k.committee_pending > 0 ? 'pending' : 'success'}
          sub="Awaiting meeting"
          alert={k.committee_pending > 0}
        />
        <DashboardKpiCard icon={Banknote}       label="Total Subsidy Released" value={fmt(k.total_released)}     tone="financial" sub={`${k.subsidy_released_count} projects`} />
      </div>

      {/* Detail cards */}
      <div className="dashboard-grid grid-2">
        <div className="dashboard-card animate-fade-in animate-delay-2">
          <div className="card-header">
            <h3 className="card-title"><ClipboardCheck size={18} /> Inspection Pipeline</h3>
          </div>
          <div className="card-body">
            <div className="data-list">
              <DataRow label="Pending Inspections"  value={k.pending_inspection}   color="#f59e0b"
                       to="/projects?stage=agency_inspection" />
              <DataRow label="Inspections Completed" value={k.inspections_done}    color="#0ea5e9" />
              <DataRow label="Passed"                value={k.inspections_passed}  color="#22c55e" />
              <DataRow label="Pass Rate"             value={`${k.pass_rate_pct}%`} color="#6366f1" />
            </div>
          </div>
        </div>

        <div className="dashboard-card animate-fade-in animate-delay-3">
          <div className="card-header">
            <h3 className="card-title"><ShieldCheck size={18} /> Committee & Subsidy</h3>
          </div>
          <div className="card-body">
            <div className="data-list">
              <DataRow label="Meetings Pending"      value={k.committee_pending}             color="#f59e0b"
                       to="/projects?stage=committee_meeting" />
              <DataRow label="Meetings Completed"    value={k.committee_meetings_done}       color="#0ea5e9" />
              <DataRow label="Approved by Committee" value={k.committee_approved}            color="#22c55e" />
              <DataRow label="Rejected"              value={k.committee_rejected}            color="#ef4444" />
              <DataRow label="Subsidy Approved"      value={fmt(k.total_subsidy_approved)}   color="#8b5cf6" />
              <DataRow label="Total Released"        value={fmt(k.total_released)}           color="#22c55e" />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid grid-2">
        <div className="dashboard-card animate-fade-in animate-delay-4">
          <div className="card-header">
            <h3 className="card-title">⚡ Quick Actions</h3>
          </div>
          <div className="card-body" style={{ padding: '0.75rem' }}>
            <div className="quick-actions">
              {[
                { label: 'Projects for Inspection',     to: '/projects?stage=agency_inspection',  icon: '🔍', bg: '#fffbeb' },
                { label: 'Committee Meeting Stage',      to: '/projects?stage=committee_meeting',  icon: '🏛️', bg: '#f5f3ff' },
                { label: 'Subsidy Claim Stage',         to: '/projects?stage=subsidy_claim',      icon: '📋', bg: '#e0f2fe' },
                { label: 'View All Projects',           to: '/projects',                           icon: '📋', bg: '#f5f3ff' },
              ].map(a => (
                <Link key={a.label} to={a.to} className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: a.bg }}>{a.icon}</span>
                  <span className="quick-action-label">{a.label}</span>
                  <ChevronRight size={14} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <QueueList
          title="Inspection Queue"
          icon={ClipboardCheck}
          items={k.queue || []}
        />
      </div>
    </>
  );
};

// ─── AGRONOMIST PANEL ─────────────────────────────────────────────────────────
const AgroPanel = ({ k }: { k: any }) => {
  if (!k) return null;
  const agroMax = Math.max(...(k.agro_breakdown?.map((a: any) => a.consultations) || [1]), 1);

  return (
    <>
      {/* Action alerts */}
      {k.critical_alerts > 0 && (
        <ActionAlert color="#ef4444" bg="#fef2f2">
          <strong>{k.critical_alerts} critical pest alert{k.critical_alerts > 1 ? 's' : ''}</strong> unresolved.{' '}
          <Link to="/projects" style={{ color: '#ef4444', fontWeight: 600 }}>Check farms →</Link>
        </ActionAlert>
      )}
      {k.follow_ups_pending > 0 && (
        <ActionAlert color="#f59e0b" bg="#fffbeb" icon={Calendar}>
          <strong>{k.follow_ups_pending} consultation follow-up{k.follow_ups_pending > 1 ? 's' : ''}</strong> scheduled and pending.{' '}
          <Link to="/projects?stage=m7_plantation" style={{ color: '#f59e0b', fontWeight: 600 }}>View active farms →</Link>
        </ActionAlert>
      )}

      {/* KPIs */}
      <div className="kpi-grid animate-fade-in animate-delay-1">
        <DashboardKpiCard icon={ClipboardCheck} label="Total Consultations"  value={k.total_consultations} tone="neutral"  sub="All time" />
        <DashboardKpiCard icon={Tractor}        label="Farms Served"          value={k.active_farms}         tone="progress" sub="Unique projects" />
        <DashboardKpiCard icon={Leaf}           label="Plantation Projects"   value={k.plantation_projects}  tone="progress" sub="M7 / Completed" />
        <DashboardKpiCard
          icon={Bell}
          label="Follow-ups Pending"
          value={k.follow_ups_pending}
          tone={k.follow_ups_pending > 0 ? 'pending' : 'success'}
          sub="Scheduled visits"
          alert={k.follow_ups_pending > 0}
        />
        <DashboardKpiCard
          icon={AlertTriangle}
          label="Critical Pest Alerts"
          value={k.critical_alerts}
          tone={k.critical_alerts > 0 ? 'urgent' : 'success'}
          sub="Unresolved"
          alert={k.critical_alerts > 0}
        />
        <DashboardKpiCard icon={CheckCircle}    label="Alerts Resolved"       value={k.resolved_alerts}      tone="success" sub="Closed" />
      </div>

      {/* Detail cards */}
      <div className="dashboard-grid grid-2">
        <div className="dashboard-card animate-fade-in animate-delay-2">
          <div className="card-header">
            <h3 className="card-title"><AlertTriangle size={18} /> Pest Alert Status</h3>
          </div>
          <div className="card-body">
            <div className="data-list">
              <DataRow label="Total Alerts"             value={k.total_pest_alerts}   color="#64748b" />
              <DataRow label="Critical (Unresolved)"    value={k.critical_alerts}     color="#ef4444" />
              <DataRow label="High (Unresolved)"        value={k.high_alerts}         color="#f97316" />
              <DataRow label="Resolved"                  value={k.resolved_alerts}     color="#22c55e" />
            </div>
          </div>
        </div>

        <div className="dashboard-card animate-fade-in animate-delay-3">
          <div className="card-header">
            <h3 className="card-title"><Users size={18} /> Consultations by Agronomist</h3>
          </div>
          <div className="card-body">
            {k.agro_breakdown?.length > 0 ? (
              <div className="bar-chart">
                {k.agro_breakdown.map((a: any) => (
                  <BarRow key={a.name} label={a.name} value={a.consultations} max={agroMax} color="#22c55e" />
                ))}
              </div>
            ) : (
              <p className="text-muted text-center p-4">No consultation data yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid grid-2">
        <div className="dashboard-card animate-fade-in animate-delay-4">
          <div className="card-header">
            <h3 className="card-title">⚡ Quick Actions</h3>
          </div>
          <div className="card-body" style={{ padding: '0.75rem' }}>
            <div className="quick-actions">
              {[
                { label: 'Active Plantation Farms',   to: '/projects?stage=m7_plantation',  icon: '🌿', bg: '#f0fdf4' },
                { label: 'Completed Projects',        to: '/projects?stage=completed',       icon: '✅', bg: '#dcfce7' },
                { label: 'All Projects',              to: '/projects',                       icon: '📋', bg: '#f5f3ff' },
              ].map(a => (
                <Link key={a.label} to={a.to} className="quick-action-btn">
                  <span className="quick-action-icon" style={{ background: a.bg }}>{a.icon}</span>
                  <span className="quick-action-label">{a.label}</span>
                  <ChevronRight size={14} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <QueueList
          title="Pest Alerts & Consultations"
          icon={AlertTriangle}
          items={k.queue || []}
        />
      </div>
    </>
  );
};

interface ContractorConfig {
  icon: string;
  label: string;
  focus: string;
  stages: string[];
  color: string;
  bg: string;
  IconComp: ComponentType<LucideProps>;
}

// ─── CONTRACTOR PANEL ─────────────────────────────────────────────────────────
// Config per contractor type
const CONTRACTOR_CONFIG: Record<string, ContractorConfig> = {
  structure_contractor: {
    icon: '🏗️', label: 'Structure Contractor',
    focus: 'Foundation & Erection',
    stages: ['m1_foundation', 'm2_structure_erection', 'm3_covering_material', 'm4_trellising'],
    color: '#f59e0b', bg: '#fffbeb',
    IconComp: Hammer,
  },
  drip_contractor: {
    icon: '💧', label: 'Drip System Contractor',
    focus: 'Drip Irrigation Fitting',
    stages: ['m5_drip_fitting'],
    color: '#0ea5e9', bg: '#e0f2fe',
    IconComp: Droplets,
  },
  bed_contractor: {
    icon: '🌱', label: 'Bed Preparation Contractor',
    focus: 'Bed & Growing Media',
    stages: ['m6_bed_preparation'],
    color: '#22c55e', bg: '#f0fdf4',
    IconComp: Sprout,
  },
  plantation_contractor: {
    icon: '🪴', label: 'Plantation Contractor',
    focus: 'Seedling Plantation',
    stages: ['m7_plantation'],
    color: '#8b5cf6', bg: '#f5f3ff',
    IconComp: TreePine,
  },
};

const ContractorPanel = ({ stats, roleKpis, role }: { stats: any; roleKpis: any; role: string }) => {
  const cfg       = CONTRACTOR_CONFIG[role] ?? CONTRACTOR_CONFIG.structure_contractor;
  // Prefer role-specific KPI data from backend; fall back to generic stats
  const breakdown = roleKpis?.stage_breakdown ?? stats?.stage_breakdown ?? {};

  // Count only stages relevant to this contractor
  const myStageCount = cfg.stages.reduce((sum, s) => sum + (breakdown[s] || 0), 0);
  const completed    = roleKpis?.completed_projects ?? stats?.completed ?? 0;
  const stageMax     = Math.max(...cfg.stages.map((s: string) => breakdown[s] || 0), 1);

  return (
    <>
      {myStageCount > 0 && (
        <ActionAlert color={cfg.color} bg={cfg.bg} icon={cfg.IconComp}>
          <strong>{myStageCount} project{myStageCount > 1 ? 's' : ''}</strong> currently in your work scope ({cfg.focus}).{' '}
          <Link to={`/projects?stage=${cfg.stages[0]}`} style={{ color: cfg.color, fontWeight: 600 }}>
            View projects →
          </Link>
        </ActionAlert>
      )}

      <div className="kpi-grid animate-fade-in animate-delay-1">
        <DashboardKpiCard
          icon={cfg.IconComp}
          label="Projects in My Scope"
          value={myStageCount}
          tone="progress"
          sub={cfg.focus}
          alert={myStageCount > 0}
        />
        <DashboardKpiCard icon={CheckCircle} label="Projects Completed"  value={completed}              tone="success" sub="Across all stages" />
        <DashboardKpiCard icon={Tractor}     label="Total in System"     value={stats?.total_projects ?? 0} tone="neutral" sub="All projects" />
        <DashboardKpiCard icon={Wrench}      label="My Scope"            value={cfg.stages.length}      tone="neutral" sub={`stage${cfg.stages.length > 1 ? 's' : ''} tracked`} />
      </div>

      <div className="dashboard-grid grid-2">
        <div className="dashboard-card animate-fade-in animate-delay-2">
          <div className="card-header">
            <h3 className="card-title">
              <cfg.IconComp size={18} style={{ color: cfg.color }} /> My Stage Pipeline
            </h3>
          </div>
          <div className="card-body">
            {myStageCount > 0 ? (
              <div className="bar-chart">
                {cfg.stages.map(s => (
                  <BarRow
                    key={s}
                    label={stageLabel(s)}
                    value={breakdown[s] || 0}
                    max={stageMax}
                    color={cfg.color}
                  />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                <cfg.IconComp size={32} style={{ marginBottom: '0.75rem', color: cfg.color, opacity: 0.4 }} />
                <p style={{ fontWeight: 600 }}>No active projects in your scope</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  You will be notified when projects reach {cfg.stages.map(s => stageLabel(s)).join(' / ')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card animate-fade-in animate-delay-3">
          <div className="card-header">
            <h3 className="card-title">⚡ Quick Actions</h3>
          </div>
          <div className="card-body" style={{ padding: '0.75rem' }}>
            <div className="quick-actions">
              <Link to={`/projects?stage=${cfg.stages[0]}`} className="quick-action-btn">
                <span className="quick-action-icon" style={{ background: cfg.bg }}>{cfg.icon}</span>
                <span className="quick-action-label">View My Active Sites</span>
                <ChevronRight size={14} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
              </Link>
              <Link to="/projects" className="quick-action-btn">
                <span className="quick-action-icon" style={{ background: '#f8fafc' }}>📋</span>
                <span className="quick-action-label">All Projects</span>
                <ChevronRight size={14} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
              </Link>
            </div>

            {/* Scope reminder */}
            <div style={{ marginTop: '1rem', padding: '0.875rem', background: cfg.bg, borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${cfg.color}` }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: cfg.color }}>
                Your Work Scope
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {cfg.stages.map(s => (
                  <span key={s} style={{ fontSize: '0.8rem', color: '#475569' }}>
                    • {stageLabel(s)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* All-stage project counts so contractor can see full picture */}
        <div className="dashboard-card animate-fade-in animate-delay-4" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title"><Target size={18} /> Portfolio at a Glance</h3>
            <Link to="/projects" className="btn btn-sm btn-outline">All Projects <ArrowRight size={13} /></Link>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.875rem' }}>
              {[
                { label: 'Total in System', value: stats?.total_projects ?? 0, color: '#6366f1' },
                { label: 'In Construction', value: (['m1_foundation','m2_structure_erection','m3_covering_material','m4_trellising','m5_drip_fitting','m6_bed_preparation','m7_plantation'].reduce((s,k) => s + ((roleKpis?.stage_breakdown ?? stats?.stage_breakdown ?? {})[k] || 0), 0)), color: '#f59e0b' },
                { label: 'Subsidy Stage', value: (['subsidy_claim','agency_inspection','committee_meeting'].reduce((s,k) => s + ((roleKpis?.stage_breakdown ?? stats?.stage_breakdown ?? {})[k] || 0), 0)), color: '#0ea5e9' },
                { label: 'Completed', value: completed, color: '#22c55e' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center', padding: '1rem', background: `${color}0a`, borderRadius: 12, border: `1px solid ${color}18` }}>
                  <p style={{ fontSize: '1.6rem', fontWeight: 800, color, margin: '0 0 0.25rem', fontFamily: 'var(--font-display)' }}>{value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, fontWeight: 600 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

interface RoleConfig {
  icon: string;
  label: string;
  focus: string;
  gradient?: string;
  shadow?: string;
}

// ─── Role Configuration — includes gradient header colors ─────────────────────
const ROLE_CONFIG: Record<string, RoleConfig> = {
  project_manager:       { icon: '🧭', label: 'Project Manager Dashboard',        focus: 'Site Visits & Construction Milestones', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #3b82f6 100%)', shadow: 'rgba(29,78,216,0.25)' },
  bank_officer:          { icon: '🏦', label: 'Bank Officer Dashboard',           focus: 'Loan Sanctioning & Processing',         gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #fbbf24 100%)', shadow: 'rgba(217,119,6,0.25)'  },
  agency_officer:        { icon: '🏛️', label: 'Agency Officer Dashboard',         focus: 'Subsidy Inspections & Committee Approvals', gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a78bfa 100%)', shadow: 'rgba(124,58,237,0.25)' },
  agronomist:            { icon: '🌿', label: 'Agronomist Dashboard',             focus: 'Crop Advisory & Pest Management',       gradient: 'linear-gradient(135deg, #14532d 0%, #15803d 50%, #22c55e 100%)', shadow: 'rgba(21,128,61,0.25)'  },
  structure_contractor:  { icon: '🏗️', label: 'Structure Contractor Dashboard',   focus: 'Foundation & Structure Erection (M1–M4)', gradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #f97316 100%)', shadow: 'rgba(194,65,12,0.25)'  },
  drip_contractor:       { icon: '💧', label: 'Drip Contractor Dashboard',        focus: 'Drip Fitting (M5)',                     gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0ea5e9 100%)', shadow: 'rgba(3,105,161,0.25)'  },
  bed_contractor:        { icon: '🌱', label: 'Bed Contractor Dashboard',         focus: 'Bed Preparation (M6)',                  gradient: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #22c55e 100%)', shadow: 'rgba(22,101,52,0.25)'  },
  plantation_contractor: { icon: '🪴', label: 'Plantation Contractor Dashboard',  focus: 'Seedling Plantation (M7)',              gradient: 'linear-gradient(135deg, #4a1d96 0%, #6d28d9 50%, #8b5cf6 100%)', shadow: 'rgba(109,40,217,0.25)' },
};

// Roles that have a dedicated /dashboard/role-kpis endpoint on the backend.
// All ManagerDashboard roles now get role-specific KPIs.
const RICH_ROLES = ['project_manager', 'bank_officer', 'agency_officer', 'agronomist'];
const CONTRACTOR_ROLES = ['structure_contractor', 'drip_contractor', 'bed_contractor', 'plantation_contractor'];
const ALL_KPIS_ROLES = [...RICH_ROLES, ...CONTRACTOR_ROLES];

interface ManagerDashboardProps {
  stats: any;
  error?: string | null;
  user: AuthUser;
}

// ─── Main ManagerDashboard ─────────────────────────────────────────────────────
const ManagerDashboard = ({ stats, error, user }: ManagerDashboardProps) => {
  const [roleKpis, setRoleKpis]       = useState<any>(null);
  const [kpisLoading, setKpisLoading] = useState<boolean>(false);

  const cfg: RoleConfig = ROLE_CONFIG[user.role] ?? { icon: '👤', label: `${user.role} Dashboard`, focus: 'Your Assignments' };
  const needsKpis  = ALL_KPIS_ROLES.includes(user.role);

  useEffect(() => {
    if (!needsKpis) return;
    setKpisLoading(true);
    getRoleKpis(user.role)
      .then(setRoleKpis)
      .catch(() => setRoleKpis(null))
      .finally(() => setKpisLoading(false));
  }, [user.role, needsKpis]);

  return (
    <div className="dashboard-container">
      {/* ── Gradient Hero Header ─────────────────────────────────────────── */}
      <div style={{
        background: cfg.gradient || 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: 'var(--radius-xl)', padding: '1.75rem 2rem', marginBottom: '1.5rem',
        boxShadow: `0 8px 32px ${cfg.shadow || 'rgba(0,0,0,0.2)'}`,
      }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              {cfg.icon} {cfg.label}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
              Welcome, <strong style={{ color: 'white' }}>{user.first_name}</strong> — {cfg.focus}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <Link to="/projects" style={{
              background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)',
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)',
            }}>
              <Tractor size={15} /> Projects
            </Link>
            <Link to="/notifications" style={{
              background: 'white', color: '#1e293b',
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 700,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Bell size={15} /> Alerts
            </Link>
          </div>
        </div>
      </div>

      {/* Connection error */}
      {error && (
        <div className="alert-banner danger animate-fade-in">
          <Bell size={18} />
          <span className="alert-content">{error}</span>
        </div>
      )}

      {/* Loading KPIs */}
      {kpisLoading && (
        <div className="alert-banner info animate-fade-in">
          <Clock size={18} />
          <span className="alert-content">Loading your analytics…</span>
        </div>
      )}

      {/* Role-specific panel */}
      {user.role === 'project_manager' && <PmPanel    k={roleKpis} stats={stats} />}
      {user.role === 'bank_officer'    && <BankPanel   k={roleKpis} />}
      {user.role === 'agency_officer'  && <AgencyPanel k={roleKpis} />}
      {user.role === 'agronomist'      && <AgroPanel   k={roleKpis} />}

      {CONTRACTOR_ROLES.includes(user.role) && (
        <ContractorPanel stats={stats} roleKpis={roleKpis} role={user.role} />
      )}
    </div>
  );
};

export default ManagerDashboard;
