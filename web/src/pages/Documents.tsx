import { useState, useEffect, useRef, useCallback, type ReactNode, type DragEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UploadCloud, FileText, CheckCircle, XCircle, Trash2,
  Download, RefreshCw, AlertTriangle, X,
  File, FileImage, Search, Lock
} from 'lucide-react';
import {
  getAllDocuments, verifyDocument,
  deleteDocument, uploadDocument
} from '../api/client';
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
    'Bank Sanction Letter',     // compulsory
    'Bank Appraisal Report',    // compulsory
    'Bank Legal Search Report', // compulsory
    'KCC Letter',               // optional
    'Bank Correspondence',      // letters / queries
  ],
  agency_officer: [
    'GOC Letter', 'Inspection Report', 'Committee Approval Letter', 'Subsidy Release Order',
  ],
  agronomist: [
    'Site Photograph', 'Other',
  ],
  structure_contractor: [
    'M1 Foundation Photo', 'M2 Structure Erection Photo',
    'M3 Covering Material Photo', 'M4 Trellising Photo', 'Site Photograph',
  ],
  drip_contractor: [
    'M5 Drip Fitting Photo', 'Site Photograph',
  ],
  bed_contractor: [
    'M6 Bed Preparation Photo', 'Site Photograph',
  ],
  plantation_contractor: [
    'M7 Plantation Photo', 'Site Photograph',
  ],
  farmer: [],    // View only — no upload
};

const CAN_VERIFY = ['admin', 'owner', 'office_staff'];
const CAN_DELETE = ['admin', 'owner'];

const getAllowedTypes = (role: string): 'all' | string[] => ROLE_UPLOAD_TYPES[role] ?? [];
const canUpload       = (role: string): boolean => {
  const types = ROLE_UPLOAD_TYPES[role];
  return types === 'all' || (Array.isArray(types) && types.length > 0);
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes) return '—';
  if (bytes < 1024)    return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
};

const getFileIcon = (mimeType: string | null | undefined): ReactNode => {
  if (!mimeType) return <File size={20} />;
  if (mimeType.startsWith('image/'))  return <FileImage size={20} />;
  if (mimeType === 'application/pdf') return <FileText size={20} />;
  return <File size={20} />;
};

const STAGE_LABELS: Record<string, string> = {
  farmer_onboarding:     '1. Lead Generation',
  document_collection:   '2. Document Collection',
  site_visit:            '3. Site Visit',
  design_boq:            '4. Design & BOQ',
  dpr_ready:             '5. DPR Ready',
  bank_processing:       '6. Bank Processing',
  goc_registration:      '7. GOC Registration',
  m1_foundation:         '8. M1 Foundation',
  m2_structure_erection: '9. M2 Structure',
  m3_covering_material:  '10. M3 Covering',
  m4_trellising:         '11. M4 Trellising',
  m5_drip_fitting:       '12. M5 Drip',
  m6_bed_preparation:    '13. M6 Beds',
  m7_plantation:         '14. M7 Plantation',
  subsidy_claim:         '15. Subsidy Claim',
  agency_inspection:     '16. Inspection',
  committee_meeting:     '17. Committee',
  subsidy_released:      '18. Released',
  completed:             '19. Completed',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', owner: 'Owner', office_staff: 'Office Staff',
  project_manager: 'Project Manager', dealer: 'Dealer',
  bank_officer: 'Bank Officer', agency_officer: 'Agency Officer',
  agronomist: 'Agronomist', farmer: 'Farmer',
  structure_contractor: 'Structure Contractor', drip_contractor: 'Drip Contractor',
  bed_contractor: 'Bed Contractor', plantation_contractor: 'Plantation Contractor',
};

// ── Upload Modal ──────────────────────────────────────────────────────────────
interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
  allowedTypes: 'all' | string[];
}
const UploadModal = ({ onClose, onSuccess, allowedTypes }: UploadModalProps) => {
  const [docType,  setDocType]  = useState<string>('');
  const [stage,    setStage]    = useState<string>('');
  const [remarks,  setRemarks]  = useState<string>('');
  const [file,     setFile]     = useState<File | null>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [loading,  setLoading]  = useState<boolean>(false);
  const [error,    setError]    = useState<string>('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { user: u } = useAuth();

  const handleFile = (f: File) => {
    const MAX = 10 * 1024 * 1024;
    if (f.size > MAX) { setError('File too large (max 10MB)'); return; }
    setFile(f);
    setError('');
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!docType) { setError('Please select a document type'); return; }
    if (!file)    { setError('Please select a file to upload'); return; }

    const fd = new FormData();
    fd.append('document_type', docType);
    fd.append('stage', stage);
    fd.append('remarks', remarks);
    fd.append('file', file);

    setLoading(true); setError('');
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
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Role badge */}
        <div className="role-access-badge">
          <span className="badge badge-info">
            Your role: <strong>{ROLE_LABELS[u?.role || ''] || u?.role}</strong>
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            You can upload {allowedTypes === 'all' ? 'all document types' : `${allowedTypes.length} document type(s)`}
          </span>
        </div>

        {error && <div className="upload-error"><AlertTriangle size={14} /> {error}</div>}

        {/* Drop zone */}
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef} type="file" hidden
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
              <button className="remove-file" onClick={e => { e.stopPropagation(); setFile(null); }}><X size={16} /></button>
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
            {(allowedTypes === 'all'
              ? ALL_TYPES
              : allowedTypes
            ).map((t: string) => <option key={t} value={t}>{t}</option>)}
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
          <input type="text" className="input-field" value={remarks}
            onChange={e => setRemarks(e.target.value)} placeholder="Notes…" />
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Uploading…' : <><UploadCloud size={16} /> Upload</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// All possible types (for admin view)
const ALL_TYPES = [
  'Aadhaar Card (Front)', 'Aadhaar Card (Back)', 'PAN Card',
  '7/12 Extract (Land Record)', '8A Certificate', 'Bank Passbook',
  'Caste Certificate', 'Farmer Photograph', 'Contractor Quotation',
  // Bank
  'Bank Sanction Letter', 'Bank Appraisal Report', 'Bank Legal Search Report',
  'KCC Letter', 'Bank Correspondence',
  // GOC & Project
  'GOC Letter', 'DPR Document', 'BOQ Sheet', 'Site Photograph',
  'M1 Foundation Photo', 'M2 Structure Erection Photo', 'M3 Covering Material Photo',
  'M4 Trellising Photo', 'M5 Drip Fitting Photo', 'M6 Bed Preparation Photo',
  'M7 Plantation Photo',
  // Agency & Completion
  'Subsidy Claim Form', 'Inspection Report', 'Committee Approval Letter',
  'Subsidy Release Order', 'Completion Certificate', 'Other',
];

// ── Document Card ─────────────────────────────────────────────────────────────
interface DocCardProps {
  doc: any;
  onVerify: (id: number | string, revoke?: boolean) => void;
  onDelete: (id: number | string) => void;
  canVerify: boolean;
  canDelete: boolean;
}
const DocCard = ({ doc, onVerify, onDelete, canVerify, canDelete }: DocCardProps) => {
  const [confirming, setConfirming] = useState<boolean>(false);
  return (
    <div className={`doc-card glass-card animate-fade-in ${doc.is_verified ? 'verified' : 'pending'}`}>
      <div className="doc-card-icon">{getFileIcon(doc.mime_type)}</div>

      <div className="doc-card-body">
        <div className="doc-type-badge">{doc.document_type}</div>
        <p className="doc-file-name" title={doc.file_name}>{doc.file_name}</p>
        <div className="doc-meta">
          {doc.stage && <span className="doc-meta-tag">{STAGE_LABELS[doc.stage] || doc.stage}</span>}
          <span className="doc-meta-tag">{formatBytes(doc.file_size)}</span>
          {doc.uploader_name && <span className="doc-meta-tag">by {doc.uploader_name}</span>}
        </div>
        {doc.remarks && <p className="doc-remarks">"{doc.remarks}"</p>}
      </div>

      <div className="doc-card-actions">
        <span className={`badge ${doc.is_verified ? 'badge-success' : 'badge-warning'}`}>
          {doc.is_verified ? <><CheckCircle size={12} /> Verified</> : <><AlertTriangle size={12} /> Pending</>}
        </span>
        <div className="doc-action-btns">
          <a href={`http://localhost:8000${doc.file_url}`} target="_blank" rel="noopener noreferrer"
            className="btn btn-outline btn-xs" title="Download">
            <Download size={14} />
          </a>
          {canVerify && !doc.is_verified && (
            <button className="btn btn-success btn-xs" onClick={() => onVerify(doc.id)} title="Verify">
              <CheckCircle size={14} />
            </button>
          )}
          {canVerify && doc.is_verified && (
            <button className="btn btn-outline btn-xs" onClick={() => onVerify(doc.id, true)} title="Revoke">
              <XCircle size={14} />
            </button>
          )}
          {canDelete && (
            confirming ? (
              <>
                <button className="btn btn-danger btn-xs" onClick={() => { onDelete(doc.id); setConfirming(false); }}>Confirm</button>
                <button className="btn btn-outline btn-xs" onClick={() => setConfirming(false)}>Cancel</button>
              </>
            ) : (
              <button className="btn btn-outline btn-xs danger-hover" onClick={() => setConfirming(true)} title="Delete">
                <Trash2 size={14} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Documents Page ───────────────────────────────────────────────────────
const Documents = () => {
  const { user: u } = useAuth();
  const role       = u?.role || 'admin';
  const { toast } = useToast();
  const userCanUpload  = canUpload(role);
  const allowedTypes   = getAllowedTypes(role);
  const userCanVerify  = CAN_VERIFY.includes(role);
  const userCanDelete  = CAN_DELETE.includes(role);

  const [docs,           setDocs]           = useState<any[]>([]);
  const [loading,        setLoading]        = useState<boolean>(true);
  const [showUpload,     setShowUpload]      = useState<boolean>(false);
  const [search,         setSearch]         = useState<string>('');
  const [filterVerified, setFilterVerified] = useState<string>('all');
  const [filterStage,    setFilterStage]    = useState<string>('');
  const [page,           _setPage]           = useState<number>(1);
  const [pageSize]                          = useState<number>(25);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (filterVerified !== 'all') params.verified = filterVerified === 'verified' ? 1 : 0;
      if (filterStage) params.stage = filterStage;
      const data: any = await getAllDocuments(params);
      setDocs(data.documents || []);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  }, [filterVerified, filterStage]);

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
    } catch (err) { console.error('Verify failed', err); }
  };

  const handleDelete = async (docId: number | string): Promise<void> => {
    try { await deleteDocument(docId); fetchDocs(); }
    catch { toast('Delete failed.', 'error'); }
  };

  const filtered = docs.filter(d => {
    if (!search) return true;
    return d.file_name?.toLowerCase().includes(search.toLowerCase())
        || d.document_type?.toLowerCase().includes(search.toLowerCase());
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pending  = filtered.filter(d => !d.is_verified).length;
  const verified = filtered.filter(d =>  d.is_verified).length;

  return (
    <div className="documents-page animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">
            {filtered.length} total — <span className="text-success">{verified} verified</span>
            {pending > 0 && <>, <span className="text-warning">{pending} pending review</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-outline" onClick={fetchDocs}><RefreshCw size={16} /> Refresh</button>

          {userCanUpload ? (
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <UploadCloud size={16} /> Upload Document
            </button>
          ) : (
            <div className="upload-blocked-badge">
              <Lock size={14} /> View Only — {ROLE_LABELS[role] || role} cannot upload
            </div>
          )}
        </div>
      </div>

      {/* Role access info bar */}
      <div className="glass-card role-access-bar animate-delay-1">
        <div className="role-access-info">
          <span className={`role-badge role-badge-${role.replace('_', '-')}`}>
            {ROLE_LABELS[role] || role}
          </span>
          {userCanUpload ? (
            <span className="access-desc">
              ✅ Upload access granted —{' '}
              <strong>
                {allowedTypes === 'all'
                  ? 'all document types'
                  : `${allowedTypes.length} type(s): ${allowedTypes.slice(0, 3).join(', ')}${allowedTypes.length > 3 ? '…' : ''}`}
              </strong>
            </span>
          ) : (
            <span className="access-desc" style={{ color: '#ef4444' }}>
              🔒 No upload access — contact Admin or Office Staff to upload documents
            </span>
          )}
          {userCanVerify && <span className="access-desc" style={{ color: 'var(--color-success)' }}>✅ Can verify documents</span>}
          {userCanDelete && <span className="access-desc" style={{ color: '#e11d48' }}>🗑 Can delete documents</span>}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card doc-filters animate-delay-1">
        <div className="filter-row">
          <div className="search-wrapper">
            <Search size={16} className="search-icon" />
            <input type="text" className="input-field search-input"
              placeholder="Search by filename or document type…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input-field filter-select" value={filterVerified} onChange={e => setFilterVerified(e.target.value)}>
            <option value="all">All Status</option>
            <option value="verified">✅ Verified</option>
            <option value="pending">⏳ Pending</option>
          </select>
          <select className="input-field filter-select" value={filterStage} onChange={e => setFilterStage(e.target.value)}>
            <option value="">All Stages</option>
            {Object.entries(STAGE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          {(filterVerified !== 'all' || filterStage || search) && (
            <button className="btn btn-outline btn-sm"
              onClick={() => { setFilterVerified('all'); setFilterStage(''); setSearch(''); }}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Documents */}
      {loading ? (
        <div className="loading-state"><div className="loading-spinner" /><p>Loading documents…</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state glass-card">
          <FileText size={48} className="empty-icon" />
          <h3>No Documents Found</h3>
          <p>{userCanUpload ? 'Upload the first document using the button above' : 'No documents have been uploaded yet'}</p>
          {userCanUpload && (
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <UploadCloud size={16} /> Upload Now
            </button>
          )}
        </div>
      ) : (
        <div className="doc-list animate-delay-2">
          {paginated.map(doc => (
            <DocCard key={doc.id} doc={doc}
              onVerify={handleVerify} onDelete={handleDelete}
              canVerify={userCanVerify} canDelete={userCanDelete} />
          ))}
        </div>
      )}

      {!loading && filtered.length > pageSize }

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
