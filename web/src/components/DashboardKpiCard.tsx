import type { CSSProperties, ComponentType } from 'react';
import { ArrowRight, AlertTriangle, type LucideProps } from 'lucide-react';
import type { BadgeTone } from './Badge';

const TONE_BG: Record<BadgeTone, string> = {
  pending:   'var(--status-pending-bg)',
  progress:  'var(--status-progress-bg)',
  urgent:    'var(--status-urgent-bg)',
  financial: 'var(--status-financial-bg)',
  success:   'var(--status-success-bg)',
  danger:    'var(--status-danger-bg)',
  neutral:   'var(--status-neutral-bg)',
};

const TONE_TEXT: Record<BadgeTone, string> = {
  pending:   'var(--status-pending-text)',
  progress:  'var(--status-progress-text)',
  urgent:    'var(--status-urgent-text)',
  financial: 'var(--status-financial-text)',
  success:   'var(--status-success-text)',
  danger:    'var(--status-danger-text)',
  neutral:   'var(--status-neutral-text)',
};

interface DashboardKpiCardProps {
  icon: ComponentType<LucideProps>;
  label: string;
  value: number | string;
  tone: BadgeTone;
  sub?: string;
  alert?: boolean;
  onClick?: () => void;
}

/**
 * Shared rich KPI card for the role dashboards — icon box, label, big value,
 * optional sub-caption breakdown, optional click-through drill-down, optional
 * alert indicator. Reuses the existing .kpi-card/.kpi-content/.kpi-label/
 * .kpi-value/.kpi-sub/.kpi-card-alert classes from Dashboard.css; the per-card
 * color is supplied via the --kpi-accent CSS variable (read by .kpi-card::after
 * for the top accent stripe) plus inline icon-box background/color, both driven
 * by BadgeTone instead of the old class-based color system.
 */
export default function DashboardKpiCard({ icon: Icon, label, value, tone, sub, alert, onClick }: DashboardKpiCardProps) {
  return (
    <div
      className={`kpi-card${alert ? ' kpi-card-alert' : ''}`}
      style={{ cursor: onClick ? 'pointer' : 'default', '--kpi-accent': TONE_TEXT[tone] } as CSSProperties}
      onClick={onClick}
    >
      <div style={{
        background: TONE_BG[tone], borderRadius: 10, padding: '0.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color={TONE_TEXT[tone]} />
      </div>
      <div className="kpi-content">
        <p className="kpi-label">{label}</p>
        <h3 className="kpi-value" style={{ color: TONE_TEXT[tone] }}>{value}</h3>
        {sub && <p className="kpi-sub">{sub}</p>}
      </div>
      {onClick && <ArrowRight size={14} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} />}
      {alert && <AlertTriangle size={14} style={{ color: TONE_TEXT[tone], flexShrink: 0 }} />}
    </div>
  );
}
