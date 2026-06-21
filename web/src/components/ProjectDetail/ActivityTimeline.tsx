import { History, ArrowRight, UserCircle2, AlertCircle } from 'lucide-react';
import { useProjectActivity } from '../../hooks/useProjects';
import { WORKFLOW_STAGES } from './constants';
import { fmtDate } from '../../lib/format';

const stageLabel = (id?: string | null): string => {
  if (!id) return '';
  return WORKFLOW_STAGES.find((s) => s.id === id)?.label ?? id.replace(/_/g, ' ');
};

// Relative time ("2 hours ago"), falling back to a formatted date for older entries.
const relTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d ago`;
  return fmtDate(iso);
};

interface Props {
  projectId: string | number;
}

/**
 * Audit-trail card for ProjectDetail. Reads from GET /projects/{id}/activity.
 * Degrades gracefully when the endpoint isn't deployed yet (shows a hint rather
 * than an error) so it can ship ahead of the backend.
 */
export default function ActivityTimeline({ projectId }: Props) {
  const { data: events = [], isLoading, notImplemented, error } = useProjectActivity(projectId);

  return (
    <div className="glass-card detail-card animate-delay-3" style={{ marginTop: '1.25rem' }}>
      <h3 className="card-title"><History size={18} /> Activity Log</h3>

      {isLoading ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
          Loading activity…
        </p>
      ) : notImplemented ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--color-text-muted)', fontSize: '0.82rem', padding: '0.5rem 0' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Activity history will appear here once the audit-log API is enabled on the backend (<code>GET /projects/{'{id}'}/activity</code>).</span>
        </div>
      ) : error ? (
        <p style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
          Could not load activity.
        </p>
      ) : events.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
          No activity recorded yet.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {events.map((e) => (
            <li key={e.id} style={{ display: 'flex', gap: '0.65rem' }}>
              <div style={{ flexShrink: 0, color: 'var(--color-primary, #6366f1)', marginTop: 1 }}>
                <UserCircle2 size={18} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main, #1e293b)' }}>
                  <span style={{ fontWeight: 600 }}>{e.actor_name || 'System'}</span>
                  {e.actor_role && (
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> · {e.actor_role.replace(/_/g, ' ')}</span>
                  )}{' '}
                  <span>{e.action}</span>
                </div>

                {(e.from_stage || e.to_stage) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2, flexWrap: 'wrap' }}>
                    {e.from_stage && <span>{stageLabel(e.from_stage)}</span>}
                    {e.from_stage && e.to_stage && <ArrowRight size={12} />}
                    {e.to_stage && <span style={{ fontWeight: 600, color: 'var(--color-text-main, #334155)' }}>{stageLabel(e.to_stage)}</span>}
                  </div>
                )}

                {e.note && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                    “{e.note}”
                  </div>
                )}

                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }} title={e.created_at}>
                  {relTime(e.created_at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
