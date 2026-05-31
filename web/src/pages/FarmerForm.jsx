/**
 * FarmerForm — 2-Tab Registration Wizard for Dealers
 *
 * Tab 1 — KYC Details:   personal info, address, aadhaar/PAN numbers
 * Tab 2 — Documents:     upload Aadhaar-1 (Front), Aadhaar-2 (Back), PAN Card
 *
 * Flow:
 *   Fill Tab 1 → "Save & Continue" → creates farmer + project (farmer_onboarding)
 *   Tab 2 unlocks → upload each doc one by one (per-row status) → Finish
 */
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  UserPlus, MapPin, FileText, Upload, CheckCircle, Loader2,
  ChevronRight, ChevronLeft,
  AlertTriangle,
} from 'lucide-react';
import {
  createUser, updateFarmer, getFarmerById,
  createProject, getAreaTypes,
  uploadDocument,
} from '../api/client';

// ─── Address helpers ──────────────────────────────────────────────────────────
// Person model stores free-text address in address_line1/address_line2.
// We split the UI into individual fields for usability.
const packAddress = (village, taluka, district) =>
  [village, taluka, district].filter(Boolean).join(', ');

const packAddress2 = (state, pincode) =>
  [state, pincode].filter(Boolean).join(' - ');

const unpackAddress = (addr1 = '', addr2 = '') => {
  const p1 = addr1.split(',').map(s => s.trim());
  const p2 = addr2.split('-').map(s => s.trim());
  return {
    village:  p1[0] || '',
    taluka:   p1[1] || '',
    district: p1[2] || '',
    state:    p2[0] || 'Maharashtra',
    pincode:  p2[1] || '',
  };
};

// ─── KYC documents required during farmer onboarding ─────────────────────────
const ONBOARDING_DOCS = [
  {
    type:     'Aadhaar Card (Front)',
    label:    'Aadhaar Card — Front (Aadhaar-1)',
    required: true,
    icon:     '🪪',
    category: 'KYC',
    hint:     'Front side showing name, DOB, and photo',
  },
  {
    type:     'Aadhaar Card (Back)',
    label:    'Aadhaar Card — Back (Aadhaar-2)',
    required: true,
    icon:     '🪪',
    category: 'KYC',
    hint:     'Back side showing address',
  },
  {
    type:     'PAN Card',
    label:    'PAN Card',
    required: true,
    icon:     '💳',
    category: 'KYC',
    hint:     'Permanent Account Number card',
  },
];

// ─── Helper: format file size ─────────────────────────────────────────────────
const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ═════════════════════════════════════════════════════════════════════════════
const FarmerForm = () => {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const isEdit    = Boolean(id);
  const { user: user } = useAuth();
  const { toast } = useToast();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [tab, setTab]             = useState('kyc');
  const [farmerId, setFarmerId]   = useState(isEdit ? parseInt(id) : null);
  const [projectId, setProjectId] = useState(null);
  const [isDirty, setIsDirty]     = useState(false);

  // ── Tab 1: KYC form ────────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(isEdit);
  const [kycSaving, setKycSaving] = useState(false);
  const [kycError, setKycError]   = useState('');
  const [kyc, setKyc]             = useState({
    role: 'farmer',
    first_name: '', last_name: '',
    phone_primary: '', whatsapp_number: '',
    village: '', taluka: '', district: '', state: 'Maharashtra', pincode: '',
    aadhaar_number: '', pan_number: '',
  });

  // ── Tab 2: Document uploads ────────────────────────────────────────────────
  // docStatus[docType] = 'idle' | 'uploading' | 'done' | 'error'
  const [docStatus, setDocStatus]   = useState({});
  const [docFiles,  setDocFiles]    = useState({});   // docType → File
  const [docRemarks, setDocRemarks] = useState({});   // docType → string
  const fileInputRefs               = useRef({});

  // ── Load data for edit mode ────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const farmer = await getFarmerById(id);
        const addr   = unpackAddress(farmer.address_line1, farmer.address_line2);
        setKyc({
          role:            'farmer',
          first_name:      farmer.first_name     || '',
          last_name:       farmer.last_name      || '',
          phone_primary:   farmer.phone_primary  || '',
          whatsapp_number: farmer.whatsapp_number|| '',
          village:         addr.village,
          taluka:          addr.taluka,
          district:        addr.district,
          state:           addr.state,
          pincode:         addr.pincode,
          aadhaar_number:  farmer.farmer_profile?.aadhaar_number || '',
          pan_number:      farmer.farmer_profile?.pan_number     || '',
        });
      } catch { setKycError('Failed to load farmer details.'); }
      finally  { setLoading(false); }
    };
    load();
  }, [id, isEdit]);

  // ── Warn before unload if form is dirty ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── KYC field change ───────────────────────────────────────────────────────
  const handleKycChange = (e) => {
    const { name, value } = e.target;
    setKyc(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  // ── Tab 1 Submit: create/update farmer + auto-create project ──────────────
  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setKycError('');
    if (!kyc.first_name.trim()) { setKycError('First Name is required.'); return; }
    if (!kyc.phone_primary.trim()) { setKycError('Primary Phone is required.'); return; }
    if (!kyc.district.trim()) { setKycError('District is required.'); return; }
    setKycSaving(true);
    try {
      // ── Edit mode: update existing farmer ─────────────────────────────
      if (isEdit) {
        await updateFarmer(id, {
          first_name:      kyc.first_name,
          last_name:       kyc.last_name,
          whatsapp_number: kyc.whatsapp_number || null,
          address_line1:   packAddress(kyc.village, kyc.taluka, kyc.district),
          address_line2:   packAddress2(kyc.state, kyc.pincode),
          aadhaar_number:  kyc.aadhaar_number || null,
          pan_number:      kyc.pan_number     || null,
        });
        setIsDirty(false);
        navigate('/farmers');
        return;
      }

      // ── Create new farmer ──────────────────────────────────────────────
      const createPayload = {
        role:            'farmer',
        first_name:      kyc.first_name,
        last_name:       kyc.last_name       || null,
        phone_primary:   kyc.phone_primary,
        whatsapp_number: kyc.whatsapp_number || null,
        address_line1:   packAddress(kyc.village, kyc.taluka, kyc.district) || null,
        address_line2:   packAddress2(kyc.state, kyc.pincode) || null,
      };
      const newFarmer = await createUser(createPayload);

      // Save KYC numbers (go into FarmerProfile via updateFarmer)
      if (kyc.aadhaar_number || kyc.pan_number) {
        try {
          await updateFarmer(newFarmer.id, {
            aadhaar_number: kyc.aadhaar_number || null,
            pan_number:     kyc.pan_number     || null,
          });
        } catch {
          // Non-blocking but notify — KYC numbers can be added via Edit Farmer later
          toast('Farmer registered but KYC numbers could not be saved. Please update them from Edit Farmer.', 'warning', 6000);
        }
      }
      const fid = newFarmer.id;
      setFarmerId(fid);

      // ── Auto-create a project at farmer_onboarding stage ──────────────
      // Fetch the first available area type to satisfy the required FK
      let areaTypeId = 1;
      try {
        const areaTypes = await getAreaTypes();
        if (areaTypes?.length) areaTypeId = areaTypes[0].id;
      } catch { /* fall back to id=1 */ }

      const proj = await createProject({
        project_name:  `${kyc.first_name} ${kyc.last_name || ''} — Onboarding`.trim(),
        farmer_id:     fid,
        dealer_id:     user.role === 'dealer' ? user.id : null,
        created_by:    user.id,
        company_id:    1,
        area_type_id:  areaTypeId,
        project_stage: 'farmer_onboarding',
      });
      setProjectId(proj.id);
      setIsDirty(false);
      setTab('documents');
    } catch (err) {
      setKycError(err.response?.data?.detail || err.message || 'Registration failed.');
    } finally {
      setKycSaving(false);
    }
  };

  // ── Tab 2: document upload helpers ────────────────────────────────────────
  const triggerFileInput = (docType) => {
    fileInputRefs.current[docType]?.click();
  };

  const handleFileSelect = (docType, file) => {
    if (!file) return;
    setDocFiles(prev => ({ ...prev, [docType]: file }));
    // Reset status so the user can re-upload
    setDocStatus(prev => ({ ...prev, [docType]: 'idle' }));
  };

  const handleUpload = async (docType) => {
    const file = docFiles[docType];
    if (!file || !projectId) return;
    setDocStatus(prev => ({ ...prev, [docType]: 'uploading' }));
    try {
      const fd = new FormData();
      fd.append('document_type', docType);
      fd.append('stage', 'farmer_onboarding');
      fd.append('remarks', docRemarks[docType] || '');
      fd.append('file', file);
      await uploadDocument(projectId, fd);
      setDocStatus(prev => ({ ...prev, [docType]: 'done' }));
    } catch (err) {
      setDocStatus(prev => ({ ...prev, [docType]: 'error' }));
    }
  };

  const uploadedCount = ONBOARDING_DOCS.filter(d => docStatus[d.type] === 'done').length;
  const requiredCount = ONBOARDING_DOCS.filter(d => d.required).length;

  if (loading) return <div className="loading-state">Loading farmer details…</div>;

  // ─────────────────────────────────────────────────────────────────────────
  // TAB CONFIG
  // ─────────────────────────────────────────────────────────────────────────
  const tabs = isEdit
    ? [{ id: 'kyc', label: '1. KYC Details', icon: UserPlus }]
    : [
        { id: 'kyc',       label: '1. KYC Details',   icon: UserPlus },
        { id: 'documents', label: '2. KYC Documents',  icon: FileText },
      ];

  const tabUnlocked = {
    kyc:       true,
    documents: Boolean(farmerId && projectId),
  };

  const tabDone = {
    kyc:       Boolean(farmerId),
    documents: uploadedCount > 0,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container">
      {/* ── Page header ── */}
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">
            {isEdit ? '👨‍🌾 Edit Farmer Profile' : '👨‍🌾 Register New Farmer'}
          </h1>
          <p className="page-subtitle">
            {isEdit
              ? 'Update KYC details'
              : 'Onboard a farmer — KYC Details · KYC Documents'}
          </p>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        display: 'flex', gap: '0.25rem', marginBottom: '1.5rem',
        background: 'var(--color-bg-card)', borderRadius: 12,
        padding: '0.375rem', border: '1px solid var(--glass-border)',
        width: 'fit-content',
      }}>
        {tabs.map(t => {
          const unlocked = tabUnlocked[t.id];
          const done     = tabDone[t.id];
          const active   = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => unlocked && setTab(t.id)}
              disabled={!unlocked}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: 8,
                border: 'none',
                cursor: unlocked ? 'pointer' : 'not-allowed',
                fontWeight: active ? 700 : 500,
                fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', gap: 6,
                background: active ? 'var(--color-primary)' : 'transparent',
                color: active ? '#fff' : unlocked ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                opacity: unlocked ? 1 : 0.5,
                transition: 'all 0.15s',
              }}
            >
              {done && !active && <CheckCircle size={14} color="#16a34a" />}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1 — KYC DETAILS
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'kyc' && (
        <form onSubmit={handleKycSubmit}>
          {kycError && (
            <div className="error-banner" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={16} /> {kycError}
            </div>
          )}

          {/* Personal Details */}
          <div className="glass-card detail-card animate-fade-in" style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title"><UserPlus size={18} /> 1. Personal Details</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">First Name *</label>
                  <input className="input-field" name="first_name" value={kyc.first_name} onChange={handleKycChange} required placeholder="e.g. Ramesh" />
                </div>
                <div className="input-group">
                  <label className="input-label">Last Name / Surname</label>
                  <input className="input-field" name="last_name" value={kyc.last_name} onChange={handleKycChange} placeholder="e.g. Patil" />
                </div>
                <div className="input-group">
                  <label className="input-label">Primary Phone *</label>
                  <input className="input-field" name="phone_primary" type="tel" maxLength={10} pattern="[0-9]{10}" placeholder="10-digit mobile" value={kyc.phone_primary} onChange={handleKycChange} required disabled={isEdit} />
                </div>
                <div className="input-group">
                  <label className="input-label">WhatsApp Number</label>
                  <input className="input-field" name="whatsapp_number" type="tel" maxLength={10} placeholder="If different from primary" value={kyc.whatsapp_number} onChange={handleKycChange} />
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="glass-card detail-card animate-fade-in" style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title"><MapPin size={18} /> 2. Address & Location</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Village / City</label>
                  <input className="input-field" name="village" value={kyc.village} onChange={handleKycChange} placeholder="Village or city name" />
                </div>
                <div className="input-group">
                  <label className="input-label">Taluka</label>
                  <input className="input-field" name="taluka" value={kyc.taluka} onChange={handleKycChange} />
                </div>
                <div className="input-group">
                  <label className="input-label">District *</label>
                  <input className="input-field" name="district" value={kyc.district} onChange={handleKycChange} required />
                </div>
                <div className="input-group">
                  <label className="input-label">State</label>
                  <input className="input-field" name="state" value={kyc.state} onChange={handleKycChange} />
                </div>
                <div className="input-group">
                  <label className="input-label">Pincode</label>
                  <input
                    className="input-field"
                    name="pincode"
                    type="text"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    placeholder="6-digit PIN code"
                    value={kyc.pincode}
                    onChange={handleKycChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* KYC Numbers */}
          <div className="glass-card detail-card animate-fade-in" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title"><FileText size={18} /> 3. KYC Numbers</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Aadhaar Card Number</label>
                  <input
                    className="input-field"
                    name="aadhaar_number"
                    maxLength={12}
                    placeholder="12-digit Aadhaar number"
                    value={kyc.aadhaar_number}
                    onChange={handleKycChange}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">PAN Card Number</label>
                  <input
                    className="input-field"
                    name="pan_number"
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    style={{ textTransform: 'uppercase' }}
                    value={kyc.pan_number}
                    onChange={handleKycChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/farmers')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={kycSaving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {kycSaving
                ? <><Loader2 size={16} className="spin" /> Saving…</>
                : isEdit
                  ? <><CheckCircle size={16} /> Save Changes</>
                  : <>Save & Continue <ChevronRight size={16} /></>
              }
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2 — KYC DOCUMENTS
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'documents' && (
        <div className="animate-fade-in">
          <div className="glass-card detail-card" style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title"><FileText size={18} /> KYC Documents</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {uploadedCount} / {requiredCount} required uploaded
              </span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {ONBOARDING_DOCS.map(doc => {
                const status  = docStatus[doc.type] || 'idle';
                const file    = docFiles[doc.type];
                const isDone  = status === 'done';
                const isErr   = status === 'error';
                const isUp    = status === 'uploading';

                return (
                  <div
                    key={doc.type}
                    style={{
                      border: `1.5px solid ${isDone ? '#86efac' : isErr ? '#fca5a5' : 'var(--glass-border)'}`,
                      borderRadius: 12,
                      padding: '1rem 1.25rem',
                      background: isDone ? '#f0fdf4' : isErr ? '#fff5f5' : 'var(--color-bg-card)',
                      display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                    }}
                  >
                    {/* Icon + Label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 200px', minWidth: 0 }}>
                      <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{doc.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-main)' }}>
                          {doc.label}
                          {doc.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{doc.hint}</p>
                        {file && !isDone && (
                          <p style={{ fontSize: '0.72rem', color: '#6366f1', marginTop: 2 }}>
                            📎 {file.name} ({fmtSize(file.size)})
                          </p>
                        )}
                        {isDone && (
                          <p style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={11} /> Uploaded successfully
                          </p>
                        )}
                        {isErr && (
                          <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>
                            ⚠ Upload failed — try again
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Remarks field */}
                    {!isDone && (
                      <input
                        placeholder="Remarks (optional)"
                        value={docRemarks[doc.type] || ''}
                        onChange={e => setDocRemarks(prev => ({ ...prev, [doc.type]: e.target.value }))}
                        style={{
                          flex: '0 1 170px', fontSize: '0.8rem',
                          border: '1px solid var(--glass-border)', borderRadius: 8,
                          padding: '0.4rem 0.6rem', background: 'var(--color-bg-base)',
                          color: 'var(--color-text-main)',
                        }}
                      />
                    )}

                    {/* Hidden file input */}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      style={{ display: 'none' }}
                      ref={el => { fileInputRefs.current[doc.type] = el; }}
                      onChange={e => handleFileSelect(doc.type, e.target.files[0])}
                    />

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {isDone ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDocStatus(prev => ({ ...prev, [doc.type]: 'idle' }));
                            setDocFiles(prev => { const n = { ...prev }; delete n[doc.type]; return n; });
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.78rem', color: '#6366f1' }}
                        >
                          Replace
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => triggerFileInput(doc.type)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.78rem' }}
                          >
                            Choose File
                          </button>
                          {file && (
                            <button
                              type="button"
                              onClick={() => handleUpload(doc.type)}
                              disabled={isUp}
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              {isUp
                                ? <><Loader2 size={13} className="spin" /> Uploading…</>
                                : <><Upload size={13} /> Upload</>
                              }
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-outline" onClick={() => setTab('kyc')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronLeft size={16} /> Back
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/farmers')}>
                Finish Later
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/farmers')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle size={16} /> Complete Registration
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FarmerForm;
