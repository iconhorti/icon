import type { ReactNode } from 'react';

export type BadgeTone =
  | 'pending'    // amber  — waiting on an action
  | 'progress'   // cyan   — actively in motion
  | 'urgent'     // rose   — overdue / high priority / failed
  | 'financial'  // violet — money/subsidy-related stages
  | 'success'    // green  — completed/approved/passed
  | 'danger'     // red    — destructive/error/suspended
  | 'neutral';   // slate  — fallback/no strong signal

const TONE_VARS: Record<BadgeTone, { bg: string; text: string }> = {
  pending:   { bg: 'var(--status-pending-bg)',   text: 'var(--status-pending-text)' },
  progress:  { bg: 'var(--status-progress-bg)',  text: 'var(--status-progress-text)' },
  urgent:    { bg: 'var(--status-urgent-bg)',     text: 'var(--status-urgent-text)' },
  financial: { bg: 'var(--status-financial-bg)', text: 'var(--status-financial-text)' },
  success:   { bg: 'var(--status-success-bg)',   text: 'var(--status-success-text)' },
  danger:    { bg: 'var(--status-danger-bg)',     text: 'var(--status-danger-text)' },
  neutral:   { bg: 'var(--status-neutral-bg)',   text: 'var(--status-neutral-text)' },
};

interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}

/**
 * Pill-shaped status badge. Replaces the page-level `badge-success`/
 * `badge-warning`/ad-hoc inline-styled `<span>` patterns scattered across
 * pages with one component using the shared status-pair tokens from index.css.
 */
export default function Badge({ tone, children }: BadgeProps) {
  const { bg, text } = TONE_VARS[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: bg,
        color: text,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
