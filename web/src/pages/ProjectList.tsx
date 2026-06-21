import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { ROLE_SETS, hasRole } from '../lib/roles';
import { useTranslation } from '../i18n/useTranslation';
import AgTable from '../components/AgTable';
import type { ColDef } from 'ag-grid-community';
import './ProjectList.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (v: number | string | null | undefined): string =>
  v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

const stageBadgeColor = (stage: string = '') => {
  if (stage.includes('completed') || stage.includes('released')) return '#22c55e';
  if (stage.includes('bank') || stage.includes('goc'))             return '#f59e0b';
  if (stage.includes('m') || stage.includes('erect'))              return '#6366f1';
  if (stage.includes('subsidy') || stage.includes('committee'))    return '#8b5cf6';
  return '#0ea5e9';
};

// ─── Column definitions (all named so the picker can read them) ──────────────
// Built as a function so headers can be translated via t().
const buildColDefs = (t: (k: string) => string): ColDef[] => [
  {
    headerName: t('col.projectId'),
    field: 'id',
    maxWidth: 120,
    valueFormatter: (p: any) => `PRJ-${String(p.value).padStart(4, '0')}`,
  },
  {
    headerName: t('col.farmer'),
    colId: 'farmer',
    valueGetter: (p: any) =>
      p.data.farmer
        ? `${p.data.farmer.first_name} ${p.data.farmer.last_name || ''}`
        : `Farmer #${p.data.farmer_id}`,
  },
  {
    headerName: t('col.dealer'),
    colId: 'dealer',
    valueGetter: (p: any) =>
      p.data.dealer
        ? `${p.data.dealer.first_name} ${p.data.dealer.last_name || ''}`
        : '—',
  },
  {
    headerName: t('col.bank'),
    colId: 'bank',
    valueGetter: (p: any) =>
      p.data.bank_branch?.bank
        ? p.data.bank_branch.bank.short_name || p.data.bank_branch.bank.name
        : '—',
  },
  {
    headerName: t('col.branch'),
    colId: 'branch',
    valueGetter: (p: any) => p.data.bank_branch?.branch_name || '—',
  },
  {
    headerName: t('col.district'),
    colId: 'district',
    valueGetter: (p: any) =>
      p.data.village?.taluka?.district?.name ||
      p.data.farmer?.village?.taluka?.district?.name ||
      '—',
  },
  {
    headerName: t('col.area'),
    colId: 'area',
    maxWidth: 130,
    valueGetter: (p: any) =>
      p.data.land_area ? `${p.data.land_area} ${p.data.land_unit || 'SQM'}` : '—',
  },
  {
    headerName: t('col.structure'),
    colId: 'structure',
    valueGetter: (p: any) => p.data.area_type?.name || '—',
  },
  {
    headerName: t('col.crop'),
    field: 'crop_category',
    maxWidth: 140,
    valueFormatter: (p: any) => p.value || '—',
  },
  {
    headerName: t('col.projectCost'),
    field: 'estimated_project_cost',
    maxWidth: 150,
    valueFormatter: (p: any) => fmtCurrency(p.value),
  },
  {
    headerName: t('col.loanAmount'),
    field: 'loan_amount',
    maxWidth: 150,
    valueFormatter: (p: any) => fmtCurrency(p.value),
  },
  {
    headerName: t('col.totalSubsidy'),
    field: 'total_subsidy_amount_proposed',
    maxWidth: 150,
    valueFormatter: (p: any) => fmtCurrency(p.value),
  },
  {
    headerName: t('col.stage'),
    field: 'project_stage',
    cellRenderer: (p: any) => (
      <span style={{
        background: `${stageBadgeColor(p.value)}18`,
        color: stageBadgeColor(p.value),
        border: `1px solid ${stageBadgeColor(p.value)}44`,
        padding: '2px 8px', borderRadius: 6,
        fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
      }}>
        {p.value ? p.value.replace(/_/g, ' ') : '—'}
      </span>
    ),
  },
  {
    headerName: t('col.priority'),
    field: 'priority',
    maxWidth: 110,
    cellRenderer: (p: any) => {
      const colors: Record<string, string> = { high: '#ef4444', normal: '#0ea5e9', low: '#94a3b8' };
      const c = colors[p.value] || '#94a3b8';
      return (
        <span style={{ color: c, fontWeight: 600, fontSize: '0.8rem' }}>
          {p.value ? p.value.charAt(0).toUpperCase() + p.value.slice(1) : '—'}
        </span>
      );
    },
  },
  {
    headerName: 'GOC Date',
    field: 'goc_date',
    maxWidth: 130,
    valueFormatter: (p: any) => p.value || '—',
  },
  {
    headerName: 'Erect Start',
    field: 'erection_start_date',
    maxWidth: 130,
    valueFormatter: (p: any) => p.value || '—',
  },
  {
    headerName: 'Erect End',
    field: 'erection_completion_date',
    maxWidth: 130,
    valueFormatter: (p: any) => p.value || '—',
  },
  {
    headerName: 'Sub Claim Date',
    field: 'subsidy_claim_date',
    maxWidth: 145,
    valueFormatter: (p: any) => p.value || '—',
  },
  {
    headerName: t('col.actions'),
    colId: 'actions',
    filter: false,
    sortable: false,
    pinned: 'right' as const,
    maxWidth: 100,
    cellRenderer: (p: any) => (
      <Link
        to={`/projects/${p.data.id}`}
        className="btn btn-outline btn-sm"
        style={{ padding: '0.25rem 0.7rem', fontSize: '0.75rem' }}
      >
        View
      </Link>
    ),
  },
];

// ════════════════════════════════════════════════════════════════════════════════
const ProjectList = () => {
  const location = useLocation();
  const { t } = useTranslation();

  // Read ?stage= from URL for pre-filtering (dashboard drill-downs pass this)
  const stageFilter = new URLSearchParams(location.search).get('stage') || '';

  const { user } = useAuth();
  const canCreate = hasRole(user?.role, ROLE_SETS.PROJECT_CREATE);

  // TODO: migrate to server-side pagination when project count exceeds ~500
  const params: Record<string, any> = { limit: 500, ...(stageFilter ? { stage: stageFilter } : {}) };
  const { data: projects = [], isLoading: loading, refetch } = useProjects(params);
  const fetchProjects = () => { refetch(); };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 {t('projects.title')}</h1>
          <p className="page-subtitle">
            {stageFilter
              ? t('projects.atStage', { stage: stageFilter.replace(/_/g, ' ') })
              : t('projects.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={fetchProjects} title="Refresh">
            <RefreshCw size={15} />
          </button>
          {canCreate && (
            <Link to="/projects/new" className="btn btn-primary">
              <Plus size={16} /> {t('projects.new')}
            </Link>
          )}
        </div>
      </div>

      {/* Grid card — AgTable handles the column picker internally */}
      <div
        className="glass-card"
        style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)' }}
      >
        <AgTable
          exportFileName="projects"
          rowData={projects}
          columnDefs={buildColDefs(t)}
          loading={loading}
          height="65vh"
          pageSize={25}
          showColPicker={true}
          showFooter={true}      /* ← pinned summary footer row */
        />
      </div>
    </div>
  );
};

export default ProjectList;
