import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { getProjects } from '../api/client';
import AgTable from '../components/AgTable';
import './ProjectList.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (v) =>
  v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

const stageBadgeColor = (stage = '') => {
  if (stage.includes('completed') || stage.includes('released')) return '#22c55e';
  if (stage.includes('bank') || stage.includes('goc'))             return '#f59e0b';
  if (stage.includes('m') || stage.includes('erect'))              return '#6366f1';
  if (stage.includes('subsidy') || stage.includes('committee'))    return '#8b5cf6';
  return '#0ea5e9';
};

// ─── Column definitions (all named so the picker can read them) ──────────────
const BASE_COL_DEFS = [
  {
    headerName: 'Project ID',
    field: 'id',
    maxWidth: 120,
    valueFormatter: (p) => `PRJ-${String(p.value).padStart(4, '0')}`,
  },
  {
    headerName: 'Farmer',
    colId: 'farmer',
    valueGetter: (p) =>
      p.data.farmer
        ? `${p.data.farmer.first_name} ${p.data.farmer.last_name || ''}`
        : `Farmer #${p.data.farmer_id}`,
  },
  {
    headerName: 'Dealer',
    colId: 'dealer',
    valueGetter: (p) =>
      p.data.dealer
        ? `${p.data.dealer.first_name} ${p.data.dealer.last_name || ''}`
        : '—',
  },
  {
    headerName: 'Bank',
    colId: 'bank',
    valueGetter: (p) =>
      p.data.bank_branch?.bank
        ? p.data.bank_branch.bank.short_name || p.data.bank_branch.bank.name
        : '—',
  },
  {
    headerName: 'Branch',
    colId: 'branch',
    valueGetter: (p) => p.data.bank_branch?.branch_name || '—',
  },
  {
    headerName: 'District',
    colId: 'district',
    valueGetter: (p) =>
      p.data.village?.taluka?.district?.name ||
      p.data.farmer?.village?.taluka?.district?.name ||
      '—',
  },
  {
    headerName: 'Area',
    colId: 'area',
    maxWidth: 130,
    valueGetter: (p) =>
      p.data.land_area ? `${p.data.land_area} ${p.data.land_unit || 'SQM'}` : '—',
  },
  {
    headerName: 'Structure',
    colId: 'structure',
    valueGetter: (p) => p.data.area_type?.name || '—',
  },
  {
    headerName: 'Crop',
    field: 'crop_category',
    maxWidth: 140,
    valueFormatter: (p) => p.value || '—',
  },
  {
    headerName: 'Project Cost',
    field: 'estimated_project_cost',
    maxWidth: 150,
    valueFormatter: (p) => fmtCurrency(p.value),
  },
  {
    headerName: 'Loan Amount',
    field: 'loan_amount',
    maxWidth: 150,
    valueFormatter: (p) => fmtCurrency(p.value),
  },
  {
    headerName: 'Total Subsidy',
    field: 'total_subsidy_amount_proposed',
    maxWidth: 150,
    valueFormatter: (p) => fmtCurrency(p.value),
  },
  {
    headerName: 'Stage',
    field: 'project_stage',
    cellRenderer: (p) => (
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
    headerName: 'Priority',
    field: 'priority',
    maxWidth: 110,
    cellRenderer: (p) => {
      const colors = { high: '#ef4444', normal: '#0ea5e9', low: '#94a3b8' };
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
    valueFormatter: (p) => p.value || '—',
  },
  {
    headerName: 'Erect Start',
    field: 'erection_start_date',
    maxWidth: 130,
    valueFormatter: (p) => p.value || '—',
  },
  {
    headerName: 'Erect End',
    field: 'erection_completion_date',
    maxWidth: 130,
    valueFormatter: (p) => p.value || '—',
  },
  {
    headerName: 'Sub Claim Date',
    field: 'subsidy_claim_date',
    maxWidth: 145,
    valueFormatter: (p) => p.value || '—',
  },
  {
    headerName: 'Actions',
    colId: 'actions',
    filter: false,
    sortable: false,
    pinned: 'right',
    maxWidth: 100,
    cellRenderer: (p) => (
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
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const location = useLocation();

  // Read ?stage= from URL for pre-filtering (dashboard drill-downs pass this)
  const stageFilter = new URLSearchParams(location.search).get('stage') || '';

  const { user } = useAuth();
  const userRole = user?.role || 'farmer';
  const canCreate = ['admin', 'owner', 'office_staff', 'dealer'].includes(userRole);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      // TODO: migrate to server-side pagination when project count exceeds ~500
      const params = { limit: 500 };
      if (stageFilter) params.stage = stageFilter;
      const data = await getProjects(params);
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, [stageFilter]); // eslint-disable-line

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Projects</h1>
          <p className="page-subtitle">
            {stageFilter
              ? `Showing projects at stage: ${stageFilter.replace(/_/g, ' ')}`
              : 'Manage and track all agricultural greenhouse projects.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={fetchProjects} title="Refresh">
            <RefreshCw size={15} />
          </button>
          {canCreate && (
            <Link to="/projects/new" className="btn btn-primary">
              <Plus size={16} /> New Project
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
          rowData={projects}
          columnDefs={BASE_COL_DEFS}
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
