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

interface KpiCardProps {
  icon: string;          // emoji, matches the Turia reference's icon-per-card pattern
  value: number | string;
  label: string;
  tone: BadgeTone;
}

/**
 * Pastel KPI card — one shared implementation replacing the several
 * near-duplicate KpiCard components previously defined per-dashboard/per-page.
 */
export default function KpiCard({ icon, value, label, tone }: KpiCardProps) {
  return (
    <div
      style={{
        background: TONE_BG[tone],
        borderRadius: 'var(--radius-md)',
        padding: '12px 10px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '1.1rem' }}>{icon}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: TONE_TEXT[tone], marginTop: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.66rem', color: TONE_TEXT[tone], opacity: 0.85 }}>{label}</div>
    </div>
  );
}
