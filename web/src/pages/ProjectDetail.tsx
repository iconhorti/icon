import { useState, Fragment } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useParams, Link } from 'react-router-dom';
import { updateProjectStage } from '../api/client';
import { useProjectDetail } from '../hooks/useProjects';
import { useRequiredDocs } from '../hooks/useDocuments';
import {
  ArrowLeft, MapPin, CheckCircle, Clock, Building2, BadgeIndianRupee,
  User, FileText, Loader2, ChevronRight,
  Landmark,
} from 'lucide-react';
import './ProjectDetail.css';
import { useToast } from '../context/ToastContext';


import { WORKFLOW_STAGES, CAN_ADVANCE, CAN_REVERT, STAGE_REQUIRED_FIELDS } from '../components/ProjectDetail/constants';
import ProjectItemsCard from '../components/ProjectDetail/ProjectItemsCard';
import TeamAssignmentCard from '../components/ProjectDetail/TeamAssignmentCard';
import StageActionPanel from '../components/ProjectDetail/StageActionPanel';
import ActivityTimeline from '../components/ProjectDetail/ActivityTimeline';
import RequiredDocsChecklist from '../components/ProjectDetail/RequiredDocsChecklist';
import Badge from '../components/Badge';
import { needsNoc, projectKhasraNumbers, type LandOwnerRow, type LandParcelRow } from '../components/ProjectForm/LandRegistrySection';

// ============================================================
// ProjectDetail Component
// ============================================================

const ProjectDetail = () => {
  const { id }    = useParams();
  const { user: user } = useAuth();
  // Never fall back to 'admin' — an unknown role gets no advance/revert power
  const role      = user?.role ?? '';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [updating, setUpdating] = useState<boolean>(false);

  const { data: project, isLoading: loading, isError, refetch } = useProjectDetail(id);
  const { data: requiredDocs } = useRequiredDocs(id, project?.project_stage);
  const error = isError ? 'Project not found or connection error.' : null;
  // Kept as a stable name/signature — TeamAssignmentCard, ProjectItemsCard, and
  // StageActionPanel all take a `refresh`/`onSaved` callback with this shape.
  const fetchProject = async () => { await refetch(); };

  const handleAdvanceStage = async () => {
    if (!project) return;
    const currentIndex = WORKFLOW_STAGES.findIndex(s => s.id === project.project_stage);
    if (currentIndex < 0 || currentIndex >= WORKFLOW_STAGES.length - 1) {
      toast('Project is already at the final stage.', 'info');
      return;
    }

    // ── Validate required fields before allowing advance ─────────────────────
    const requiredFields = STAGE_REQUIRED_FIELDS[project.project_stage] || [];
    const missing = requiredFields.filter(({ field }: any) => {
      const v = project[field];
      // Do NOT include v === 0 — a legitimately entered zero (e.g. zero subsidy)
      // would be treated as missing and permanently block stage advance.
      return v === null || v === undefined || v === '';
    });
    if (missing.length > 0) {
      toast(
        `Complete these fields before advancing:\n• ${missing.map((f: any) => f.label).join('\n• ')}`,
        'warning',
        6000
      );
      return;
    }

    const isAdmin = role === 'admin' || role === 'owner';
    const docMissing = requiredDocs?.missing ?? [];
    if (!isAdmin && docMissing.length > 0) {
      toast(
        `Upload required documents before advancing:\n• ${docMissing.join('\n• ')}`,
        'warning',
        6000
      );
      return;
    }

    const nextStage  = WORKFLOW_STAGES[currentIndex + 1];
    if (!window.confirm(
      `Advance project to next stage?\n\n` +
      `Current: ${WORKFLOW_STAGES[currentIndex].label}\n` +
      `Next:    ${nextStage.label}\n\n` +
      `This action will be logged.`
    )) return;
    try {
      setUpdating(true);
      await updateProjectStage(id as string, nextStage.id);
      await fetchProject();
      queryClient.invalidateQueries({ queryKey: ['projectActivity', String(id)] });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: unknown } } };
      const detail = ax?.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ')
          : 'Failed to advance stage. Check backend connection.';
      toast(msg, 'error', 6000);
    } finally {
      setUpdating(false);
    }
  };

  const handleRevertStage = async () => {
    if (!project) return;
    const currentIndex = WORKFLOW_STAGES.findIndex(s => s.id === project.project_stage);
    if (currentIndex <= 0) {
      toast('Project is already at the first stage — cannot revert further.', 'info');
      return;
    }
    const prevStage = WORKFLOW_STAGES[currentIndex - 1];
    if (!window.confirm(
      `⚠️ Revert project to previous stage?\n\n` +
      `Current: ${WORKFLOW_STAGES[currentIndex].label}\n` +
      `Revert to: ${prevStage.label}\n\n` +
      `Use this when the current stage has issues and needs rework.\n` +
      `This action will be logged.`
    )) return;
    try {
      setUpdating(true);
      await updateProjectStage(id as string, prevStage.id);
      await fetchProject();
      queryClient.invalidateQueries({ queryKey: ['projectActivity', String(id)] });
    } catch {
      toast('Failed to revert stage. Check backend connection.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>Loading project details…</p>
    </div>
  );

  if (error || !project) return <div className="error-alert">{error || 'Project not found'}</div>;

  const currentStageIndex = WORKFLOW_STAGES.findIndex(s => s.id === project.project_stage);
  const progressPct       = Math.round(((currentStageIndex + 1) / WORKFLOW_STAGES.length) * 100);
  const canAdvance        = CAN_ADVANCE[role] && currentStageIndex < WORKFLOW_STAGES.length - 1;
  const canRevert         = CAN_REVERT[role]  && currentStageIndex > 0;

  const landParcels: LandParcelRow[] = ((project as any).land_parcels || []).map((p: any) => ({
    khatauni_number: p.khatauni_number || '',
    khasra_no: p.khasra_no || '',
    survey_no: p.survey_no || '',
    area_sqm: p.area_sqm != null ? String(p.area_sqm) : '',
    land_type: p.land_type || 'agricultural',
    encumbrance: !!p.encumbrance,
    is_project_khasra: !!p.is_project_khasra,
    notes: p.notes || '',
  }));
  const landOwners: LandOwnerRow[] = ((project as any).land_owners || []).map((o: any) => ({
    owner_name: o.owner_name || '',
    father_name: o.father_name || '',
    relation: o.relation || '',
    khasra_no: o.khasra_no || '',
    area_sqm: o.area_sqm != null ? String(o.area_sqm) : '',
    area_hectare: o.area_hectare != null ? String(o.area_hectare) : '',
    share_fraction: o.share_fraction || '',
    share_percentage: o.share_percentage != null ? String(o.share_percentage) : '',
    is_primary_owner: !!o.is_primary_owner,
    owner_type: (o.owner_type === 'other' ? 'other' : 'project') as LandOwnerRow['owner_type'],
  }));
  const landMeta = {
    khatauni_number: (project as any).khatauni_number || '',
    ownership_type: (project as any).ownership_type === 'joint' ? 'joint' as const : 'single' as const,
  };
  const projectKhasras = projectKhasraNumbers(landParcels);
  const projectOwnerCount = landOwners.filter(o =>
    o.owner_name.trim() && o.owner_type === 'project' && projectKhasras.includes(o.khasra_no.trim()),
  ).length;
  const isJointLand = needsNoc(landParcels, landOwners, landMeta);
  const nocDocType = 'NOC / Land Owner Consent';
  const hasNocUploaded = requiredDocs?.presentSet?.has(nocDocType) ?? false;

  return (
    <div className="project-detail-container animate-fade-in">
      {/* ── Header ── */}
      <div className="detail-header">
        <Link to="/projects" className="back-link">
          <ArrowLeft size={16} /> Back to Projects
        </Link>
        <div className="header-actions-row">
          <div>
            <h1 className="page-title">{project.project_name || 'Project Detail'}</h1>
            <p className="page-subtitle">
              {project.project_code || `PRJ-${project.id.toString().padStart(4,'0')}`}
              {' · '}Created: {new Date(project.created_at).toLocaleDateString('en-IN')}
            </p>
          </div>
          <div className="status-badge-large" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge tone="success">Active</Badge>
            {(role === 'admin' || role === 'owner' || role === 'office_staff') && (
              <Link to={`/projects/${project.id}/edit`} className="btn btn-outline" style={{ display: 'flex', gap: '0.5rem' }}>
                <FileText size={16} /> Edit
              </Link>
            )}
            {/* Revert Stage — rolls back when current stage has issues */}
            {canRevert && (
              <button
                className="btn btn-outline"
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#ef4444', borderColor: '#fca5a5' }}
                onClick={handleRevertStage}
                disabled={updating}
                title="Revert to previous stage if this stage has issues"
              >
                {updating ? <Loader2 size={16} className="spin" /> : '↩'}
                {updating ? 'Moving…' : 'Revert Stage'}
              </button>
            )}
            {/* Advance Stage — moves forward when current stage is complete */}
            {canAdvance && (
              <button
                className="btn btn-primary"
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                onClick={handleAdvanceStage}
                disabled={updating}
                title="Mark current stage complete and advance to next"
              >
                {updating ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
                {updating ? 'Moving…' : 'Advance Stage'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="detail-grid">
        {/* ── Left: Info Cards ── */}
        <div className="info-column">
          <div className="glass-card detail-card animate-delay-1">
            <h3 className="card-title"><User size={18} /> Stakeholders</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Farmer</span>
                <span className="info-value font-medium">
                  {project.farmer ? `${project.farmer.first_name} ${project.farmer.last_name || ''}` : 'N/A'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Dealer</span>
                <span className="info-value">
                  {project.dealer ? `${project.dealer.first_name} ${project.dealer.last_name || ''}` : 'N/A'}
                </span>
              </div>
              {project.project_manager && (
                <div className="info-item">
                  <span className="info-label">Project Manager</span>
                  <span className="info-value">{project.project_manager.first_name}</span>
                </div>
              )}
            </div>
          </div>

          <TeamAssignmentCard project={project} userRole={role} refresh={fetchProject} />

          <div className="glass-card detail-card animate-delay-2" style={{ marginTop: '1.25rem' }}>
            <h3 className="card-title"><MapPin size={18} /> Location & Specs</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">District / Village</span>
                <span className="info-value">{project.district || 'N/A'}, {project.village || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Land Area</span>
                <span className="info-value">{project.land_area || 'N/A'} {project.land_unit}</span>
              </div>
              {project.area_type && (
                <div className="info-item">
                  <span className="info-label">Area Type</span>
                  <span className="info-value text-accent">{project.area_type.name} ({project.area_type.multiplier}×)</span>
                </div>
              )}
              {(project as any).khatauni_number && (
                <div className="info-item">
                  <span className="info-label">Khatauni No.</span>
                  <span className="info-value">{(project as any).khatauni_number}</span>
                </div>
              )}
              {(project as any).ownership_type && (
                <div className="info-item">
                  <span className="info-label">Ownership</span>
                  <span className="info-value" style={{ textTransform: 'capitalize' }}>
                    {(project as any).ownership_type}
                    {isJointLand && projectOwnerCount > 0 && (
                      <span style={{ marginLeft: 8, fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                        · {projectOwnerCount} project owner{projectOwnerCount !== 1 ? 's' : ''} on NOC
                      </span>
                    )}
                  </span>
                </div>
              )}
              {isJointLand && !hasNocUploaded && (
                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                  <div style={{
                    fontSize: '0.82rem', color: '#92400e', background: '#fffbeb',
                    border: '1px solid #fde68a', borderRadius: 8, padding: '0.6rem 0.75rem',
                  }}>
                    <strong>Project khasras — NOC required:</strong> Please upload the signed <strong>{nocDocType}</strong> from all project owners (edit project → Land Documents).
                  </div>
                </div>
              )}
              {isJointLand && hasNocUploaded && (
                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                  <div style={{
                    fontSize: '0.82rem', color: '#166534', background: '#f0fdf4',
                    border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.6rem 0.75rem',
                  }}>
                    ✓ {nocDocType} uploaded.
                  </div>
                </div>
              )}
              {project.khasra_no && (
                <div className="info-item">
                  <span className="info-label">Khasra / Survey No.</span>
                  <span className="info-value">{project.khasra_no}</span>
                </div>
              )}
              {(((project as any).land_parcels?.length ?? 0) > 0 || ((project as any).land_owners?.length ?? 0) > 0) && (
                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="info-label">Land Registry</span>
                  <div style={{ marginTop: '0.5rem', width: '100%' }}>
                    {(() => {
                      const parcels: any[] = (project as any).land_parcels || [];
                      const owners: any[] = (project as any).land_owners || [];
                      const projectParcelList = parcels.filter((p: any) => p.is_project_khasra);
                      const otherParcelList = parcels.filter((p: any) => !p.is_project_khasra);

                      const renderKhasraBlock = (p: any, isProject: boolean) => {
                        const kOwners = owners.filter((o: any) => (o.khasra_no || '').trim() === (p.khasra_no || '').trim());
                        return (
                          <div key={p.id} style={{ marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '0.88rem' }}>Khasra {p.khasra_no}</strong>
                              {isProject && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 999, background: '#e8f5e9', color: '#1a472a' }}>
                                  Project khasra
                                </span>
                              )}
                              {!isProject && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 999, background: '#f1f5f9', color: '#64748b' }}>
                                  Other khasra
                                </span>
                              )}
                              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                {p.land_type || '—'} · {p.area_sqm?.toLocaleString('en-IN') ?? '—'} SQM
                                {p.encumbrance ? ' · Loan/charge' : ''}
                              </span>
                            </div>
                            {kOwners.length > 0 ? (
                              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                    <th style={{ padding: '0.35rem 0.5rem' }}>Owner</th>
                                    <th style={{ padding: '0.35rem 0.5rem' }}>Type</th>
                                    <th style={{ padding: '0.35rem 0.5rem' }}>Father</th>
                                    <th style={{ padding: '0.35rem 0.5rem' }}>Area (Ha)</th>
                                    <th style={{ padding: '0.35rem 0.5rem' }}>Share</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {kOwners.map((o: any) => (
                                    <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', fontWeight: o.is_primary_owner ? 600 : 400 }}>
                                      <td style={{ padding: '0.35rem 0.5rem' }}>
                                        {o.owner_name}{o.relation ? ` (${o.relation})` : ''}
                                        {o.is_primary_owner ? ' · Primary' : ''}
                                      </td>
                                      <td style={{ padding: '0.35rem 0.5rem' }}>
                                        {(o.owner_type || 'project') === 'other' ? 'Other owner' : 'Project owner'}
                                      </td>
                                      <td style={{ padding: '0.35rem 0.5rem' }}>{o.father_name || '—'}</td>
                                      <td style={{ padding: '0.35rem 0.5rem' }}>{o.area_hectare ?? (o.area_sqm ? (o.area_sqm / 10000).toFixed(4) : '—')}</td>
                                      <td style={{ padding: '0.35rem 0.5rem' }}>{o.share_fraction || (o.share_percentage != null ? `${o.share_percentage}%` : '—')}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No owners recorded for this khasra.</p>
                            )}
                          </div>
                        );
                      };

                      return (
                        <>
                          {projectParcelList.length > 0 && (
                            <div style={{ marginBottom: '0.75rem' }}>
                              <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', fontWeight: 600, color: '#1a472a' }}>Project khasras (greenhouse site)</p>
                              {projectParcelList.map((p: any) => renderKhasraBlock(p, true))}
                            </div>
                          )}
                          {otherParcelList.length > 0 && (
                            <div>
                              <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Other khasras on land record</p>
                              {otherParcelList.map((p: any) => renderKhasraBlock(p, false))}
                            </div>
                          )}
                          {projectParcelList.length === 0 && otherParcelList.length === 0 && parcels.map((p: any) => renderKhasraBlock(p, !!p.is_project_khasra))}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          <ProjectItemsCard project={project} userRole={role} refresh={fetchProject} />

          <RequiredDocsChecklist projectId={id as string} stage={project.project_stage} />

          <ActivityTimeline projectId={id as string} />

          <div className="glass-card detail-card animate-delay-3" style={{ marginTop: '1.25rem' }}>
            <h3 className="card-title text-accent"><BadgeIndianRupee size={18} /> Financials</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Est. Total Project Cost</span>
                <span className="info-value">₹{parseInt(project.total_project_cost || project.estimated_project_cost || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Computed Eligible Cost</span>
                <span className="info-value">₹{parseInt(project.total_eligible_project_cost || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Proposed Subsidy Amount</span>
                <span className="info-value font-medium text-success">
                  ₹{parseInt(project.total_subsidy_amount_proposed || 0).toLocaleString('en-IN')}
                </span>
              </div>
              {project.loan_amount && (
                <div className="info-item">
                  <span className="info-label">Bank Loan</span>
                  <span className="info-value">₹{parseInt(project.loan_amount).toLocaleString('en-IN')}</span>
                </div>
              )}
              {project.subsidy_approved_amount && (
                <div className="info-item">
                  <span className="info-label">Approved Subsidy</span>
                  <span className="info-value text-success">₹{parseInt(project.subsidy_approved_amount).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>

          {/* GOC / Bank info if present */}
          {(project.goc_number || project.bank_approved) && (
            <div className="glass-card detail-card animate-delay-3">
              <h3 className="card-title"><Landmark size={18} /> GOC & Bank</h3>
              <div className="info-list">
                {project.goc_number && (
                  <div className="info-item">
                    <span className="info-label">GOC Number</span>
                    <span className="info-value">{project.goc_number}</span>
                  </div>
                )}
                {project.loan_account_number && (
                  <div className="info-item">
                    <span className="info-label">Loan Account</span>
                    <span className="info-value">{project.loan_account_number}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Workflow Tracker ── */}
        <div className="tracker-column">
          <div className="glass-card p-0 tracker-card animate-delay-2">
            <div className="tracker-header">
              <h3 className="card-title mb-0"><Building2 size={18} /> 20-Stage Workflow</h3>
              <div className="progress-summary">
                <span className="progress-text">{progressPct}%</span>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>

            <div className="timeline-container">
              {WORKFLOW_STAGES.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent   = index === currentStageIndex;

                let statusClass = 'upcoming';
                if (isCompleted) statusClass = 'completed';
                if (isCurrent)   statusClass = 'current';

                const Icon = isCompleted ? CheckCircle : Clock;
                const showGroupHeader = index === 0 || WORKFLOW_STAGES[index - 1].group !== stage.group;

                return (
                  <Fragment key={stage.id}>
                    {showGroupHeader && (
                      <div className="timeline-group-header">{stage.group} Phase</div>
                    )}

                    <div className={`timeline-step ${statusClass}`}>
                      <div className="timeline-icon-container">
                        <div className="timeline-line" />
                        <div className={`timeline-icon box-${statusClass}`}>
                          <Icon size={14} />
                        </div>
                      </div>

                      <div className="timeline-content">
                        <h4 className={`step-title text-${statusClass}`}>{stage.label}</h4>

                        {/* ── Current Stage: show action panel ── */}
                        {isCurrent && (
                          <div className="step-actions">
                            <StageActionPanel
                              stageId={stage.id}
                              project={project}
                              role={role}
                              onSaved={fetchProject}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                              {/* Revert — when this stage has issues */}
                              {canRevert && (
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: '#ef4444', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: 4 }}
                                  onClick={handleRevertStage}
                                  disabled={updating}
                                  title="Revert to previous stage if issues found"
                                >
                                  ↩ Revert — Issues Found
                                </button>
                              )}
                              {/* Advance — when this stage is done */}
                              {canAdvance && index < WORKFLOW_STAGES.length - 1 && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                  onClick={handleAdvanceStage}
                                  disabled={updating}
                                  title="Mark this stage complete and move to next"
                                >
                                  {updating ? 'Moving…' : `✓ Done → ${WORKFLOW_STAGES[index + 1]?.label}`}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
