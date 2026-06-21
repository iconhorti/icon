import { FileCheck2, CheckCircle2, Circle } from 'lucide-react';
import { useRequiredDocs } from '../../hooks/useDocuments';

interface Props {
  projectId: string | number;
  stage: string;
}

/**
 * Shows the required documents for the project's current stage and whether each
 * is uploaded — the read side of the "required-doc gate". Renders nothing when
 * the backend hasn't configured required docs for the stage (graceful).
 */
export default function RequiredDocsChecklist({ projectId, stage }: Props) {
  const { data, isLoading } = useRequiredDocs(projectId, stage);

  if (isLoading || !data || data.notConfigured) return null; // nothing to gate on

  const { required, presentSet, missing } = data;

  return (
    <div className="glass-card detail-card animate-delay-2" style={{ marginTop: '1.25rem' }}>
      <h3 className="card-title"><FileCheck2 size={18} /> Required Documents — This Stage</h3>

      <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {required.map((name) => {
          const present = presentSet.has(name);
          return (
            <li key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
              {present
                ? <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                : <Circle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />}
              <span style={{ color: present ? 'var(--color-text-main, #334155)' : 'var(--color-text-muted)' }}>
                {name}
              </span>
            </li>
          );
        })}
      </ul>

      {missing.length > 0 ? (
        <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#92400e', background: '#fffbeb',
                    border: '1px solid #fde68a', borderRadius: 8, padding: '0.5rem 0.7rem' }}>
          {missing.length} document{missing.length > 1 ? 's' : ''} still required before this stage is complete.
        </p>
      ) : (
        <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#166534', background: '#f0fdf4',
                    border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.5rem 0.7rem' }}>
          ✓ All required documents are uploaded.
        </p>
      )}
    </div>
  );
}
