import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { ROLE_SETS, hasRole } from '../lib/roles';
import { useTranslation } from '../i18n/useTranslation';
import AgTable from '../components/AgTable';
import type { ColDef } from 'ag-grid-community';
import Badge, { type BadgeTone } from '../components/Badge';
import Avatar from '../components/Avatar';
import FilterPills from '../components/FilterPills';
import KpiCard from '../components/KpiCard';
import './ProjectList.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (v: number | string | null | undefined): string =>
  v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

const stageTone = (stage: string = ''): BadgeTone => {
  if (stage.includes('completed') || stage.includes('released')) return 'success';
  if (stage.includes('subsidy') || stage.includes('committee') || stage.includes('agency')) return 'financial';
  if (stage.includes('bank') || stage.includes('goc'))             return 'pending';
  if (/^m\d/.test(stage) || stage.includes('erect'))               return 'progress';
  return 'neutral';
};

const priorityTone = (priority: string = ''): BadgeTone => {
  if (priority === 'high') return 'urgent';
  if (priority === 'normal') return 'progress';
  return 'neutral';
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
    cellRenderer: (p: any) => {
      const name = p.value || '';
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar name={name} size={22} />
          {name}
        </span>
      );
    },
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
      <Badge tone={stageTone(p.value)}>
        {p.value ? p.value.replace(/_/g, ' ') : '—'}
      </Badge>
    ),
  },
  {
    headerName: t('col.priority'),
    field: 'priority',
    maxWidth: 110,
    cellRenderer: (p: any) => (
      <Badge tone={priorityTone(p.value)}>
        {p.value ? p.value.charAt(0).toUpperCase() + p.value.slice(1) : '—'}
      </Badge>
    ),
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
  const [pillFilter, setPillFilter] = useState(stageFilter || 'all');

  const { user } = useAuth();
  const canCreate = hasRole(user?.role, ROLE_SETS.PROJECT_CREATE);

  const effectiveStage = pillFilter === 'all' ? '' : pillFilter;

  // TODO: migrate to server-side pagination when project count exceeds ~500
  const params: Record<string, any> = { limit: 500, ...(effectiveStage ? { stage: effectiveStage } : {}) };
  const { data: projects = [], isLoading: loading, refetch } = useProjects(params);
  const fetchProjects = () => { refetch(); };

  // KPI counts — computed client-side from the currently-loaded (unfiltered-by-pill) page;
  // re-fetched whenever the pill filter changes since `params` above scopes the query itself.
  const total = projects.length;
  const completedCount = projects.filter((p: any) => p.project_stage?.includes('completed')).length;
  const bankCount = projects.filter((p: any) => p.project_stage?.includes('bank')).length;
  const constructionCount = projects.filter((p: any) => /^m\d/.test(p.project_stage || '')).length;

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('projects.title')}</h1>
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

      {/* KPI band */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        <KpiCard icon="📁" value={total} label="Total Projects" tone="financial" />
        <KpiCard icon="🏦" value={bankCount} label="Bank Processing" tone="pending" />
        <KpiCard icon="🏗️" value={constructionCount} label="In Construction" tone="progress" />
        <KpiCard icon="✅" value={completedCount} label="Completed" tone="success" />
      </div>

      {/* Stage filter pills */}
      <div style={{ marginBottom: 14 }}>
        <FilterPills
          options={[
            { value: 'all', label: 'All Stages' },
            { value: 'farmer_onboarding', label: 'Onboarding' },
            { value: 'bank_processing', label: 'Bank' },
            { value: 'm1_foundation', label: 'Construction' },
            { value: 'subsidy_claim', label: 'Subsidy' },
            { value: 'completed', label: 'Completed' },
          ]}
          value={pillFilter}
          onChange={setPillFilter}
        />
      </div>

      {/* Grid card — AgTable handles the column picker internally */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
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
