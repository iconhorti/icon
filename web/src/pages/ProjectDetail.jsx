import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, Link } from 'react-router-dom';
import {
  getProjectById, updateProjectStage, updateProjectFields,
  getProjectContractors, assignContractor,
  getSkills, getContractorsBySkill,
  addProjectItem, deleteProjectItem, getComponents
} from '../api/client';
import {
  CheckCircle, Clock, ArrowLeft, Building2, MapPin, BadgeIndianRupee,
  User, FileText, Loader2, Save, ChevronRight, AlertTriangle,
  UploadCloud, Landmark, CalendarCheck, Hammer, Droplets, Sprout, Leaf
} from 'lucide-react';
import './ProjectDetail.css';
import { useToast } from '../context/ToastContext';


import { WORKFLOW_STAGES, CAN_ADVANCE, CAN_REVERT, STAGE_ROLES, STAGE_REQUIRED_FIELDS } from '../components/ProjectDetail/constants';
import { Field, SaveButton } from '../components/ProjectDetail/shared';
import ProjectItemsCard from '../components/ProjectDetail/ProjectItemsCard';
import TeamAssignmentCard from '../components/ProjectDetail/TeamAssignmentCard';
import StageActionPanel from '../components/ProjectDetail/StageActionPanel';

// ============================================================
// ProjectDetail Component
// ============================================================

const ProjectDetail = () => {
  const { id }    = useParams();
  const { user: user } = useAuth();
  // Never fall back to 'admin' — an unknown role gets no advance/revert power
  const role      = user?.role ?? '';
  const { toast } = useToast();

  const [project,  setProject]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProjectById(id);
      setProject(data);
      setError(null);
    } catch (err) {
      setError('Project not found or connection error.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const handleAdvanceStage = async () => {
    if (!project) return;
    const currentIndex = WORKFLOW_STAGES.findIndex(s => s.id === project.project_stage);
    if (currentIndex < 0 || currentIndex >= WORKFLOW_STAGES.length - 1) {
      toast('Project is already at the final stage.', 'info');
      return;
    }

    // ── Validate required fields before allowing advance ─────────────────────
    const requiredFields = STAGE_REQUIRED_FIELDS[project.project_stage] || [];
    const missing = requiredFields.filter(({ field }) => {
      const v = project[field];
      return v === null || v === undefined || v === '' || v === 0;
    });
    if (missing.length > 0) {
      toast(
        `Complete these fields before advancing:\n• ${missing.map(f => f.label).join('\n• ')}`,
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
      await updateProjectStage(id, nextStage.id);
      await fetchProject();
    } catch {
      toast('Failed to advance stage. Check backend connection.', 'error');
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
      await updateProjectStage(id, prevStage.id);
      await fetchProject();
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
            <span className="badge badge-success">Active</span>
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
              {project.khasra_no && (
                <div className="info-item">
                  <span className="info-label">Khasra / Survey No.</span>
                  <span className="info-value">{project.khasra_no}</span>
                </div>
              )}
            </div>
          </div>

          <ProjectItemsCard project={project} userRole={role} refresh={fetchProject} />

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
                  <React.Fragment key={stage.id}>
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
                  </React.Fragment>
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
