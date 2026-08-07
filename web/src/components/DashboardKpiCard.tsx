import type { CSSProperties, ComponentType } from 'react';
import { ArrowRight, AlertTriangle, TrendingUp, TrendingDown, Minus, type LucideProps } from 'lucide-react';
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

/** Decision severity — drives left-border urgency (ok / warn / breach). */
export type KpiSeverity = 'ok' | 'warn' | 'breach';

const SEVERITY_BORDER: Record<KpiSeverity, string> = {
  ok:     'transparent',
  warn:   '#f59e0b',
  breach: '#ef4444',
};

interface DashboardKpiCardProps {
  icon: ComponentType<LucideProps>;
  label: string;
  value: number | string;
  tone: BadgeTone;
  sub?: string;
  /** When true, shows alert icon (urgent attention). */
  alert?: boolean;
  onClick?: () => void;
  /** Optional numeric target — renders a thin progress bar (value / target). */
  target?: number;
  /** Explicit decision severity (ok | warn | breach). Overrides alert border. */
  severity?: KpiSeverity;
  /**
   * Percent change vs prior period. Positive = up.
   * Only render when provided (honest metrics — never invent trend).
   */
  trend?: number;
  trendDirection?: 'up' | 'down' | 'flat';
}

/**
 * Shared rich KPI card for role dashboards.
 * Props only — no internal fetch/state. Supports target, severity, trend, deeplink via onClick.
 */
export default function DashboardKpiCard({
  icon: Icon,
  label,
  value,
  tone,
  sub,
  alert,
  onClick,
  target,
  severity,
  trend,
  trendDirection,
}: DashboardKpiCardProps) {
  const numericValue =
    typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  const progress =
    target != null && target > 0 && Number.isFinite(numericValue)
      ? Math.min(100, Math.max(0, (numericValue / target) * 100))
      : null;

  const resolvedSeverity: KpiSeverity | undefined =
    severity ?? (alert ? 'breach' : undefined);

  const dir =
    trendDirection ??
    (trend == null ? undefined : trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat');

  return (
    <div
      className={`kpi-card${alert || resolvedSeverity === 'breach' ? ' kpi-card-alert' : ''}`}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        '--kpi-accent': TONE_TEXT[tone],
        borderLeft:
          resolvedSeverity && resolvedSeverity !== 'ok'
            ? `3px solid ${SEVERITY_BORDER[resolvedSeverity]}`
            : undefined,
      } as CSSProperties}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
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
        {progress != null && (
          <div className="kpi-target-track" title={`Target: ${target}`}>
            <div
              className="kpi-target-fill"
              style={{ width: `${progress}%`, background: TONE_TEXT[tone] }}
            />
          </div>
        )}
        {trend != null && (
          <p
            className="kpi-trend"
            style={{
              color:
                dir === 'up' ? '#16a34a' : dir === 'down' ? '#dc2626' : 'var(--color-text-muted)',
            }}
          >
            {dir === 'up' && <TrendingUp size={12} />}
            {dir === 'down' && <TrendingDown size={12} />}
            {dir === 'flat' && <Minus size={12} />}
            {trend > 0 ? '+' : ''}
            {Number.isInteger(trend) ? trend : trend.toFixed(1)}%
          </p>
        )}
        {sub && <p className="kpi-sub">{sub}</p>}
        {target != null && progress != null && (
          <p className="kpi-sub">Target {target} · {Math.round(progress)}%</p>
        )}
      </div>
      {onClick && <ArrowRight size={14} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} />}
      {(alert || resolvedSeverity === 'breach') && (
        <AlertTriangle size={14} style={{ color: TONE_TEXT[tone], flexShrink: 0 }} />
      )}
    </div>
  );
}
