import { useRef, type RefObject, type DragEvent } from 'react';
import { ArrowLeft, X, Upload, FileText, Loader2, CheckCircle, UploadCloud } from 'lucide-react';
import Badge from '../Badge';
import '../../pages/Documents.css';

interface ProjectFormDocumentsProps {
  existingDocs: any[];
  docTypesByCategory: Record<string, any[]>;
  docType: string;
  setDocType: (val: string) => void;
  docFile: File | null;
  setDocFile: (file: File | null) => void;
  docRemarks: string;
  setDocRemarks: (val: string) => void;
  docUploading: boolean;
  handleDocUpload: () => void;
  handleDeleteDoc: (id: number) => void;
  docError?: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  navigate: (to: string) => void;
  fmtSize: (size: number) => string;
  savedProjectId: number | string | null;
  setActiveTab: (tab: string) => void;
  docTypesList?: string[];
  isJointLand?: boolean;
}

const NOC_DOC_TYPE = 'NOC / Land Owner Consent';

const REQUIRED_LAND_DOCS = [
  '7/12 Extract (Land Record)',
  '8A Certificate',
  NOC_DOC_TYPE,
];

const fileHref = (url: string | null | undefined): string => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api')) return url;
  return `/api/v1${url}`;
};

export default function ProjectFormDocuments({
  existingDocs, docTypesByCategory, docType, setDocType,
  docFile, setDocFile, docRemarks, setDocRemarks,
  docUploading, handleDocUpload, handleDeleteDoc, docError,
  fileInputRef, navigate, fmtSize, savedProjectId,
  setActiveTab, docTypesList = [], isJointLand = false,
}: ProjectFormDocumentsProps) {
  const localFileRef = useRef<HTMLInputElement | null>(null);
  const inputRef = fileInputRef ?? localFileRef;

  const uploadedTypes = new Set(existingDocs.map(d => d.document_type));
  const hasNocUploaded = uploadedTypes.has(NOC_DOC_TYPE);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setDocFile(f);
  };

  return (
    <div className="pf-docs-section animate-fade-in">
      {!savedProjectId ? (
        <div className="empty-state glass-card">
          <FileText size={40} className="empty-icon" />
          <h3>Save project first</h3>
          <p>Complete the Components tab to unlock document uploads for this project.</p>
          <button type="button" className="btn btn-primary" onClick={() => setActiveTab('components')}>
            Go to Components
          </button>
        </div>
      ) : (
        <>
          {isJointLand && !hasNocUploaded && (
            <div className="upload-error" style={{ marginBottom: 0 }}>
              <strong>Joint land — NOC required:</strong> Upload signed <strong>{NOC_DOC_TYPE}</strong> from every owner.
            </div>
          )}

          {/* Required land documents checklist */}
          <div className="glass-card detail-card">
            <div className="card-header">
              <h3 className="card-title">Required Land Documents</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {REQUIRED_LAND_DOCS.filter(t => uploadedTypes.has(t) || (t === NOC_DOC_TYPE && !isJointLand)).length}
                /{isJointLand ? REQUIRED_LAND_DOCS.length : 2} complete
              </span>
            </div>
            <div className="card-body">
              <div className="pf-land-checklist">
                {REQUIRED_LAND_DOCS.filter(t => t !== NOC_DOC_TYPE || isJointLand).map(label => {
                  const done = uploadedTypes.has(label);
                  return (
                    <div key={label} className={`pf-land-check-item ${done ? 'done' : 'missing'}`}>
                      {done ? <CheckCircle size={16} /> : <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid currentColor', opacity: 0.35 }} />}
                      <span>{label.replace(' (Land Record)', '')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upload Panel */}
          <div className="glass-card detail-card">
            <div className="card-header">
              <h3 className="card-title"><Upload size={17} /> Upload Document</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Project #{savedProjectId}
              </span>
            </div>
            <div className="card-body">
              {docError && (
                <div className="upload-error" style={{ marginBottom: '0.75rem' }}>
                  {docError}
                </div>
              )}

              <div
                className={`drop-zone ${docFile ? 'has-file' : ''}`}
                style={{ marginBottom: '1rem' }}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                  onChange={e => setDocFile(e.target.files?.[0] || null)}
                />
                {docFile ? (
                  <div className="file-preview">
                    <FileText size={20} />
                    <div>
                      <p className="file-name">{docFile.name}</p>
                      <p className="file-size">{fmtSize(docFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      className="remove-file"
                      onClick={e => { e.stopPropagation(); setDocFile(null); }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={32} className="drop-icon" />
                    <p className="drop-text">Drag & drop or <span>browse</span> to choose a file</p>
                    <p className="drop-hint">PDF, JPG, PNG, Word, Excel — max 10MB</p>
                  </>
                )}
              </div>

              <div className="pf-upload-grid">
                <div>
                  <label className="form-label">Document Type *</label>
                  <select
                    className="form-control"
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                  >
                    {Object.keys(docTypesByCategory).length > 0
                      ? Object.entries(docTypesByCategory).map(([cat, items]) => (
                          <optgroup key={cat} label={`── ${cat} ──`}>
                            {items.map(dt => (
                              <option key={dt.name} value={dt.name}>
                                {dt.name}{dt.is_required ? ' *' : ''}
                              </option>
                            ))}
                          </optgroup>
                        ))
                      : docTypesList.map(t => <option key={t} value={t}>{t}</option>)
                    }
                  </select>
                </div>
                <div>
                  <label className="form-label">Remarks</label>
                  <input
                    className="form-control"
                    placeholder="Optional notes…"
                    value={docRemarks}
                    onChange={e => setDocRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDocUpload}
                  disabled={!docFile || docUploading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {docUploading
                    ? <><Loader2 size={15} className="spin" /> Uploading…</>
                    : <><Upload size={15} /> Upload</>
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Existing Documents */}
          <div className="glass-card detail-card">
            <div className="card-header">
              <h3 className="card-title"><FileText size={17} /> Uploaded Documents</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {existingDocs.length} file{existingDocs.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="card-body">
              {existingDocs.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>
                  No documents uploaded yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {existingDocs.map(doc => (
                    <div key={doc.id} className="pf-doc-row">
                      <FileText size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                      <div className="pf-doc-row-body">
                        <p className="pf-doc-row-title">{doc.document_type}</p>
                        <p className="pf-doc-row-meta">
                          {doc.file_name} · {fmtSize(doc.file_size)}
                        </p>
                      </div>
                      <Badge tone={doc.is_verified ? 'success' : 'pending'}>
                        {doc.is_verified ? 'Verified' : 'Pending'}
                      </Badge>
                      <a
                        href={fileHref(doc.file_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem', flexShrink: 0 }}
                      >
                        View
                      </a>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem', color: 'var(--status-danger-text)', flexShrink: 0 }}
                        onClick={() => handleDeleteDoc(doc.id)}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setActiveTab('components')}>
              <ArrowLeft size={16} /> Back to Components
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/projects/${savedProjectId}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle size={16} /> View Project
            </button>
          </div>
        </>
      )}
    </div>
  );
}
