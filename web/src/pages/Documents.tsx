import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UploadCloud, FileText, CheckCircle, XCircle, Trash2,
  RefreshCw, AlertTriangle, X,
  File, FileImage, Search, Lock, Eye,
} from 'lucide-react';
import type { ColDef } from 'ag-grid-community';
import {
  getAllDocuments, verifyDocument,
  deleteDocument, uploadDocument, getDocumentTypes,
} from '../api/client';
import { useProjects } from '../hooks/useProjects';
import AgTable from '../components/AgTable';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import FilterPills from '../components/FilterPills';
import KpiCard from '../components/KpiCard';
import './Documents.css';
import { useToast } from '../context/ToastContext';

// ── Role-based access rules ──────────────────────────────────────────────────

const ROLE_UPLOAD_TYPES: Record<string, 'all' | string[]> = {
  admin:                  'all',
  owner:                  'all',
  office_staff:           'all',
  project_manager: [
    'Site Photograph', 'M1 Foundation Photo', 'M2 Structure Erection Photo',
    'M3 Covering Material Photo', 'M4 Trellising Photo', 'M5 Drip Fitting Photo',
    'M6 Bed Preparation Photo', 'M7 Plantation Photo', 'DPR Document', 'BOQ Sheet', 'Other',
  ],
  dealer: [
    'Aadhaar Card (Front)', 'Aadhaar Card (Back)', 'PAN Card',
    '7/12 Extract (Land Record)', '8A Certificate', 'Bank Passbook',
    'Caste Certificate', 'Farmer Photograph', 'Contractor Quotation',
  ],
  bank_officer: [
    'Bank Sanction Letter',
    'Bank Appraisal Report',
    'Bank Legal Search Report',
    'KCC Letter',
    'Bank Correspondence',
  ],
  agency_officer: [
    'GOC Letter', 'Inspection Report', 'Committee Approval Letter', 'Subsidy Release Order',
  ],
  agronomist: ['Site Photograph', 'Other'],
  structure_contractor: [
    'M1 Foundation Photo', 'M2 Structure Erection Photo',
    'M3 Covering Material Photo', 'M4 Trellising Photo', 'Site Photograph',
  ],
  drip_contractor: ['M5 Drip Fitting Photo', 'Site Photograph'],
  bed_contractor: ['M6 Bed Preparation Photo', 'Site Photograph'],
  plantation_contractor: ['M7 Plantation Photo', 'Site Photograph'],
  farmer: [],
};

const CAN_VERIFY = ['admin', 'owner', 'office_staff'];
const CAN_DELETE = ['admin', 'owner'];

type CategoryPill = 'all' | 'kyc' | 'land' | 'project' | 'subsidy';

const CATEGORY_PILLS: { value: CategoryPill; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'kyc', label: 'KYC' },
  { value: 'land', label: 'Land' },
  { value: 'project', label: 'Project' },
  { value: 'subsidy', label: 'Subsidy' },
];

const ALL_TYPES = [
  'Aadhaar Card (Front)', 'Aadhaar Card (Back)', 'PAN Card',
  '7/12 Extract (Land Record)', '8A Certificate', 'Bank Passbook',
  'Caste Certificate', 'Farmer Photograph', 'Contractor Quotation',
  'Bank Sanction Letter', 'Bank Appraisal Report', 'Bank Legal Search Report',
  'KCC Letter', 'Bank Correspondence',
  'GOC Letter', 'DPR Document', 'BOQ Sheet', 'Site Photograph',
  'M1 Foundation Photo', 'M2 Structure Erection Photo', 'M3 Covering Material Photo',
  'M4 Trellising Photo', 'M5 Drip Fitting Photo', 'M6 Bed Preparation Photo',
  'M7 Plantation Photo',
  'Subsidy Claim Form', 'Inspection Report', 'Committee Approval Letter',
  'Subsidy Release Order', 'Completion Certificate', 'Other',
];

const STAGE_LABELS: Record<string, string> = {
  farmer_onboarding: 'Lead Generation', document_collection: 'Document Collection',
  site_visit: 'Site Visit', design_boq: 'Design & BOQ', dpr_ready: 'DPR Ready',
  bank_processing: 'Bank Processing', goc_registration: 'GOC Registration',
  m1_foundation: 'M1 Foundation', m2_structure_erection: 'M2 Structure',
  m3_covering_material: 'M3 Covering', m4_trellising: 'M4 Trellising',
  m5_drip_fitting: 'M5 Drip', m6_bed_preparation: 'M6 Beds',
  m7_plantation: 'M7 Plantation', subsidy_claim: 'Subsidy Claim',
  agency_inspection: 'Inspection', committee_meeting: 'Committee',
  subsidy_released: 'Released', completed: 'Completed',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', owner: 'Owner', office_staff: 'Office Staff',
  project_manager: 'Project Manager', dealer: 'Dealer',
  bank_officer: 'Bank Officer', agency_officer: 'Agency Officer',
  agronomist: 'Agronomist', farmer: 'Farmer',
  structure_contractor: 'Structure Contractor', drip_contractor: 'Drip Contractor',
  bed_contractor: 'Bed Contractor', plantation_contractor: 'Plantation Contractor',
};

const getAllowedTypes = (role: string): 'all' | string[] => ROLE_UPLOAD_TYPES[role] ?? [];
const canUpload = (role: string): boolean => {
  const types = ROLE_UPLOAD_TYPES[role];
  return types === 'all' || (Array.isArray(types) && types.length > 0);
};

const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
};

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
};

const projectCode = (id: number | string | null | undefined): string =>
  id ? `PRJ-${String(id).padStart(4, '0')}` : '—';

const fileHref = (url: string | null | undefined): string => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? url : `/api/v1${url}`;
};

const getFileIcon = (mimeType: string | null | undefined): ReactNode => {
  if (!mimeType) return <File size={18} />;
  if (mimeType.startsWith('image/')) return <FileImage size={18} />;
  if (mimeType === 'application/pdf') return <FileText size={18} />;
  return <File size={18} />;
};

function inferCategory(docType: string): string {
  const t = docType.toLowerCase();
  if (t.includes('aadhaar') || t.includes('pan') || t.includes('passbook') || t.includes('caste') || t.includes('photograph')) return 'KYC';
  if (t.includes('7/12') || t.includes('8a') || t.includes('land') || t.includes('noc')) return 'Land';
  if (t.includes('subsidy') || t.includes('goc') || t.includes('inspection') || t.includes('committee')) return 'Agency';
  if (t.includes('bank') || t.includes('kcc') || t.includes('sanction')) return 'Bank';
  if (t.includes('photo') || t.includes('dpr') || t.includes('boq') || t.includes('site')) return 'Project';
  return 'Other';
}

function matchesCategoryPill(docType: string, pill: CategoryPill, typeCategoryMap: Record<string, string>): boolean {
  if (pill === 'all') return true;
  const cat = (typeCategoryMap[docType] || inferCategory(docType)).toLowerCase();
  if (pill === 'subsidy') {
    return cat === 'agency' || docType.toLowerCase().includes('subsidy');
  }
  if (pill === 'kyc') return cat === 'kyc';
  if (pill === 'land') return cat === 'land';
  if (pill === 'project') return cat === 'project';
  return true;
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
  allowedTypes: 'all' | string[];
}
const UploadModal = ({ onClose, onSuccess, allowedTypes }: UploadModalProps) => {
  const [docType, setDocType] = useState('');
  const [stage, setStage] = useState('');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { user: u } = useAuth();

  const handleFile = (f: File) => {
    const MAX = 10 * 1024 * 1024;
    if (f.size > MAX) { setError('File too large (max 10MB)'); return; }
    setFile(f);
    setError('');
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!docType) { setError('Please select a document type'); return; }
    if (!file) { setError('Please select a file to upload'); return; }

    const fd = new FormData();
    fd.append('document_type', docType);
    fd.append('stage', stage);
    fd.append('remarks', remarks);
    fd.append('file', file);

    setLoading(true);
    setError('');
    try {
      await uploadDocument(1, fd);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed. Check file type.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box glass-card animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><UploadCloud size={20} /> Upload Document</h2>
          <button type="button" className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="role-access-badge">
          <Badge tone="progress">
            {ROLE_LABELS[u?.role || ''] || u?.role}
          </Badge>
          <span className="access-desc">
            You can upload {allowedTypes === 'all' ? 'all document types' : `${allowedTypes.length} type(s)`}
          </span>
        </div>

        {error && <div className="upload-error"><AlertTriangle size={14} /> {error}</div>}

        <div
          className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {file ? (
            <div className="file-preview">
              {getFileIcon(file.type)}
              <div>
                <p className="file-name">{file.name}</p>
                <p className="file-size">{formatBytes(file.size)}</p>
              </div>
              <button type="button" className="remove-file" onClick={e => { e.stopPropagation(); setFile(null); }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <UploadCloud size={36} className="drop-icon" />
              <p className="drop-text">Drag & drop or <span>browse</span></p>
              <p className="drop-hint">PDF, JPG, PNG, Word, Excel — max 10MB</p>
            </>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">Document Type *</label>
          <select className="input-field" value={docType} onChange={e => setDocType(e.target.value)}>
            <option value="">— Select document type —</option>
            {(allowedTypes === 'all' ? ALL_TYPES : allowedTypes).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Stage</label>
          <select className="input-field" value={stage} onChange={e => setStage(e.target.value)}>
            <option value="">— Auto (current project stage) —</option>
            {Object.entries(STAGE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Remarks (optional)</label>
          <input
            type="text"
            className="input-field"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Notes…"
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Uploading…' : <><UploadCloud size={16} /> Upload</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Documents Page ───────────────────────────────────────────────────────
const Documents = () => {
  const { user: u } = useAuth();
  const role = u?.role || 'admin';
  const { toast } = useToast();
  const userCanUpload = canUpload(role);
  const allowedTypes = getAllowedTypes(role);
  const userCanVerify = CAN_VERIFY.includes(role);
  const userCanDelete = CAN_DELETE.includes(role);

  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryPill, setCategoryPill] = useState<CategoryPill>('all');
  const [typeCategoryMap, setTypeCategoryMap] = useState<Record<string, string>>({});

  const { data: projectsData } = useProjects({ limit: 500 });

  const projectLookup = useMemo(() => {
    const map = new Map<number, { farmerName: string; code: string }>();
    const items = projectsData?.items ?? [];
    for (const p of items) {
      const farmerName = p.farmer
        ? `${p.farmer.first_name} ${p.farmer.last_name || ''}`.trim()
        : '';
      map.set(p.id, { farmerName, code: projectCode(p.id) });
    }
    return map;
  }, [projectsData]);

  useEffect(() => {
    getDocumentTypes()
      .then((data: any) => {
        const map: Record<string, string> = {};
        const byCat = data?.by_category ?? {};
        for (const [cat, items] of Object.entries(byCat)) {
          for (const item of (items as any[]) ?? []) {
            if (item?.name) map[item.name] = cat;
          }
        }
        setTypeCategoryMap(map);
      })
      .catch(() => { /* category map is optional — inferCategory fallback */ });
  }, []);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await getAllDocuments({ limit: 500 });
      setDocs(data.documents || []);
    } catch (err) {
      console.error('Failed to load documents', err);
      toast('Could not load documents.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleVerify = async (docId: number | string, revoke = false): Promise<void> => {
    try {
      if (revoke) {
        const { default: apiClient } = await import('../api/client');
        await apiClient.patch(`/uploads/${docId}/unverify`);
      } else {
        await verifyDocument(docId);
      }
      fetchDocs();
      toast(revoke ? 'Verification revoked.' : 'Document verified.', 'success');
    } catch {
      toast('Verification action failed.', 'error');
    }
  };

  const handleDelete = async (docId: number | string): Promise<void> => {
    if (!window.confirm('Delete this document permanently?')) return;
    try {
      await deleteDocument(docId);
      fetchDocs();
      toast('Document deleted.', 'success');
    } catch {
      toast('Delete failed.', 'error');
    }
  };

  const enrichedDocs = useMemo(() => docs.map(d => {
    const proj = projectLookup.get(d.project_id);
    return {
      ...d,
      farmer_name: proj?.farmerName || '',
      project_code: proj?.code || projectCode(d.project_id),
      category: typeCategoryMap[d.document_type] || inferCategory(d.document_type),
      upload_date: d.created_at,
    };
  }), [docs, projectLookup, typeCategoryMap]);

  const filtered = useMemo(() => enrichedDocs.filter(d => {
    if (!matchesCategoryPill(d.document_type, categoryPill, typeCategoryMap)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.file_name?.toLowerCase().includes(q)
      || d.document_type?.toLowerCase().includes(q)
      || d.farmer_name?.toLowerCase().includes(q)
      || d.project_code?.toLowerCase().includes(q)
      || String(d.project_id).includes(q)
    );
  }), [enrichedDocs, categoryPill, typeCategoryMap, search]);

  const pending = filtered.filter(d => !d.is_verified).length;
  const kycCount = filtered.filter(d => matchesCategoryPill(d.document_type, 'kyc', typeCategoryMap)).length;
  const landCount = filtered.filter(d => matchesCategoryPill(d.document_type, 'land', typeCategoryMap)).length;
  const projectCount = filtered.filter(d => matchesCategoryPill(d.document_type, 'project', typeCategoryMap)).length;

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      headerName: 'Farmer / Project',
      colId: 'farmerProject',
      minWidth: 200,
      flex: 1.4,
      valueGetter: (p: any) => p.data.farmer_name || p.data.project_code,
      cellRenderer: (p: any) => {
        const name = p.data.farmer_name || 'Unknown farmer';
        return (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.3 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={name} size={22} />
              <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{name}</span>
            </span>
            <Link
              to={`/projects/${p.data.project_id}`}
              style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginLeft: 30, textDecoration: 'none' }}
            >
              {p.data.project_code}
            </Link>
          </span>
        );
      },
    },
    {
      headerName: 'Document',
      colId: 'document',
      minWidth: 220,
      flex: 1.6,
      valueGetter: (p: any) => p.data.document_type,
      cellRenderer: (p: any) => (
        <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span className="doc-table-icon">{getFileIcon(p.data.mime_type)}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem' }}>{p.data.document_type}</span>
            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.data.file_name} · {formatBytes(p.data.file_size)}
            </span>
          </span>
        </span>
      ),
    },
    {
      headerName: 'Uploaded',
      field: 'upload_date',
      maxWidth: 120,
      valueFormatter: (p: any) => formatDate(p.value),
    },
    {
      headerName: 'Status',
      field: 'is_verified',
      maxWidth: 120,
      cellRenderer: (p: any) => (
        <Badge tone={p.value ? 'success' : 'pending'}>
          {p.value ? 'Verified' : 'Pending'}
        </Badge>
      ),
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      filter: false,
      sortable: false,
      pinned: 'right',
      maxWidth: 150,
      cellRenderer: (p: any) => (
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <a
            href={fileHref(p.data.file_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
            title="View / Download"
          >
            <Eye size={13} />
          </a>
          {userCanVerify && !p.data.is_verified && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: '0.2rem 0.5rem', color: 'var(--status-success-text)' }}
              title="Verify"
              onClick={() => handleVerify(p.data.id)}
            >
              <CheckCircle size={13} />
            </button>
          )}
          {userCanVerify && p.data.is_verified && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: '0.2rem 0.5rem' }}
              title="Revoke verification"
              onClick={() => handleVerify(p.data.id, true)}
            >
              <XCircle size={13} />
            </button>
          )}
          {userCanDelete && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: '0.2rem 0.5rem', color: 'var(--status-danger-text)' }}
              title="Delete"
              onClick={() => handleDelete(p.data.id)}
            >
              <Trash2 size={13} />
            </button>
          )}
        </span>
      ),
    },
  ], [userCanVerify, userCanDelete]);

  const hasActiveFilters = categoryPill !== 'all' || search.trim().length > 0;

  return (
    <div className="documents-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">
            Central library of farmer KYC, land records, project photos, and subsidy paperwork — review and download in one place.
          </p>
        </div>
        <div className="docs-header-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={fetchDocs} title="Refresh">
            <RefreshCw size={15} />
          </button>
          {userCanUpload ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <UploadCloud size={16} /> Upload
            </button>
          ) : (
            <span className="upload-blocked-badge">
              <Lock size={14} /> View only
            </span>
          )}
        </div>
      </div>

      <div className="docs-kpi-grid">
        <KpiCard icon="📄" value={filtered.length} label="Total Documents" tone="financial" />
        <KpiCard icon="⏳" value={pending} label="Pending Review" tone="pending" />
        <KpiCard icon="🪪" value={kycCount} label="KYC" tone="progress" />
        <KpiCard icon="🌾" value={landCount} label="Land Records" tone="success" />
        <KpiCard icon="🏗️" value={projectCount} label="Project Docs" tone="neutral" />
      </div>

      <div className="docs-toolbar glass-card">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="search"
            className="input-field search-input"
            placeholder="Search farmer, project code, or document type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => { setCategoryPill('all'); setSearch(''); }}
          >
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      <div className="docs-filter-row">
        <FilterPills options={CATEGORY_PILLS} value={categoryPill} onChange={setCategoryPill} />
      </div>

      {!userCanUpload && (
        <p className="docs-access-hint">
          Signed in as <strong>{ROLE_LABELS[role] || role}</strong> — you can view and download documents.
          {userCanVerify && ' You can also verify uploads.'}
        </p>
      )}

      {!loading && filtered.length === 0 ? (
        <div className="empty-state glass-card">
          <FileText size={48} className="empty-icon" />
          <h3>No documents found</h3>
          <p>
            {hasActiveFilters
              ? 'Try clearing your search or category filter.'
              : userCanUpload
                ? 'Upload the first document using the button above.'
                : 'No documents have been uploaded yet.'}
          </p>
          {userCanUpload && !hasActiveFilters && (
            <button type="button" className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <UploadCloud size={16} /> Upload Now
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card docs-table-card">
          <AgTable
            exportFileName="documents"
            rowData={filtered}
            columnDefs={columnDefs}
            loading={loading}
            height="62vh"
            pageSize={25}
            showColPicker={false}
            showFooter={true}
          />
        </div>
      )}

      {showUpload && (
        <UploadModal
          allowedTypes={allowedTypes}
          onClose={() => setShowUpload(false)}
          onSuccess={fetchDocs}
        />
      )}
    </div>
  );
};

export default Documents;
