import React from 'react';
import { ArrowLeft, ArrowRight, Building2, MapPin, Landmark, Users, UserCheck, X, Calculator, Upload, FileText, Loader2, Save, CheckCircle } from 'lucide-react';


export default function ProjectFormDocuments({
  existingDocs, docTypesByCategory, docType, setDocType,
  docFile, setDocFile, docRemarks, setDocRemarks,
  docUploading, handleDocUpload, handleDeleteDoc, docError,
  fileInputRef, navigate, fmtSize, savedProjectId
}) {
  return (
    <div className="animate-fade-in">
          {!savedProjectId ? (
            <div style={{
              textAlign: 'center', padding: '3rem',
              color: 'var(--color-text-muted)', border: '2px dashed var(--glass-border)',
              borderRadius: 12,
            }}>
              <FileText size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>Save the project first (complete Components tab) to upload documents.</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('components')}>
                Go to Components
              </button>
            </div>
          ) : (
            <>
              {/* Upload Panel */}
              <div className="glass-card detail-card" style={{ marginBottom: '1.25rem' }}>
                <div className="card-header">
                  <h3 className="card-title"><Upload size={17} /> Upload Land Document</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Project #{savedProjectId}
                  </span>
                </div>
                <div className="card-body">
                  {docError && (
                    <div className="error-banner" style={{ marginBottom: '0.75rem' }}>
                      {docError}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Document Type *</label>
                      <select
                        className="form-control"
                        value={docType}
                        onChange={e => setDocType(e.target.value)}
                      >
                        {/* Grouped by category if available, flat list as fallback */}
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
                      <label className="form-label">File *</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                        className="form-control"
                        style={{ padding: '0.4rem' }}
                        onChange={e => setDocFile(e.target.files[0] || null)}
                      />
                      {docFile && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          📎 {docFile.name} ({fmtSize(docFile.size)})
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Remarks</label>
                      <input
                        className="form-control"
                        placeholder="Optional notes..."
                        value={docRemarks}
                        onChange={e => setDocRemarks(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
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
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0' }}>
                      No documents uploaded yet.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {existingDocs.map(doc => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.625rem 0.875rem',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 8,
                            background: 'var(--color-bg-base)',
                          }}
                        >
                          <FileText size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-main)' }}>
                              {doc.document_type}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.file_name} · {fmtSize(doc.file_size)}
                              {doc.is_verified ? ' · ✅ Verified' : ''}
                            </p>
                          </div>
                          <a
                            href={`http://localhost:8000/api/v1${doc.file_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', flexShrink: 0 }}
                          >
                            View
                          </a>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', color: '#ef4444', flexShrink: 0 }}
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

              {/* Finish */}
              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-outline" onClick={() => setActiveTab('components')}>
                  <ArrowLeft size={16} /> Back to Components
                </button>
                <button
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
