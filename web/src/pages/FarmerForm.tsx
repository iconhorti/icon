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
import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  UserPlus, MapPin, FileText, Upload, CheckCircle, Loader2,
  ChevronRight, ChevronLeft, AlertTriangle,
  Building2, Layers, Leaf,
} from 'lucide-react';
import {
  createUser, updateFarmer, getFarmerById,
  createProject, getAreaTypes, getComponents,
  addProjectItem, updateProjectFields,
  uploadDocument,
} from '../api/client';

// ─── Address helpers ──────────────────────────────────────────────────────────
// Person model stores free-text address in address_line1/address_line2.
// We split the UI into individual fields for usability.
const packAddress = (village: string, taluka: string, district: string): string =>
  [village, taluka, district].filter(Boolean).join(', ');

const packAddress2 = (state: string, pincode: string): string =>
  [state, pincode].filter(Boolean).join(' - ');

const unpackAddress = (addr1: string | null | undefined = '', addr2: string | null | undefined = '') => {
  const p1 = (addr1 || '').split(',').map(s => s.trim());
  const p2 = (addr2 || '').split('-').map(s => s.trim());
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
const fmtSize = (bytes: number | null | undefined): string => {
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
  const { user } = useAuth();
  const { toast } = useToast();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [tab, setTab]             = useState<string>('kyc');
  const [farmerId, setFarmerId]   = useState<number | null>(isEdit ? parseInt(id as string) : null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [isDirty, setIsDirty]     = useState<boolean>(false);

  // ── Tab 1: KYC form ────────────────────────────────────────────────────────
  const [loading, setLoading]     = useState<boolean>(isEdit);
  const [kycSaving, setKycSaving] = useState<boolean>(false);
  const [kycError, setKycError]   = useState<string>('');
  const [kyc, setKyc]             = useState({
    role: 'farmer',
    first_name: '', last_name: '',
    phone_primary: '', whatsapp_number: '',
    village: '', taluka: '', district: '', state: 'Maharashtra', pincode: '',
    aadhaar_number: '', pan_number: '',
  });

  // ── Tab 2: Project Details ─────────────────────────────────────────────────
  const [proj, setProj]             = useState({
    project_name: '', area_type_id: '', land_area: '', land_unit: 'SQM',
    khasra_no: '', crop_category: '',
  });
  const [structureId, setStructureId]           = useState<string>('');    // selected Structure component
  const [selectedComponents, setSelectedComponents] = useState<number[]>([]); // other component IDs
  const [lookups, setLookups]       = useState<{ areaTypes: any[]; structures: any[]; others: any[] }>({ areaTypes: [], structures: [], others: [] });
  const [projSaving, setProjSaving] = useState<boolean>(false);
  const [projError, setProjError]   = useState<string>('');
  const [projSaved, setProjSaved]   = useState<boolean>(false);

  // ── Tab 3: Document uploads ────────────────────────────────────────────────
  // docStatus[docType] = 'idle' | 'uploading' | 'done' | 'error'
  const [docStatus, setDocStatus]   = useState<Record<string, string>>({});
  const [docFiles,  setDocFiles]    = useState<Record<string, File>>({});   // docType → File
  const [docRemarks, setDocRemarks] = useState<Record<string, string>>({});   // docType → string
  const fileInputRefs               = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Load data for edit mode ────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const farmer: any = await getFarmerById(id as string);
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

  // ── Load lookups for Project tab ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [areaTypes, comps]: [any, any] = await Promise.all([getAreaTypes(), getComponents()]);
        setLookups({
          areaTypes,
          structures: (comps || []).filter((c: any) => c.component_type === 'Structure'),
          others:     (comps || []).filter((c: any) => c.component_type !== 'Structure'),
        });
      } catch { /* non-critical — project tab still works, just no dropdowns */ }
    };
    load();
  }, []);

  // ── Auto-fill project name when farmer name changes ────────────────────────
  useEffect(() => {
    const name = `${kyc.first_name} ${kyc.last_name || ''}`.trim();
    if (name) setProj(prev => ({ ...prev, project_name: `${name} — Greenhouse` }));
  }, [kyc.first_name, kyc.last_name]);

  // ── Warn before unload if form is dirty ───────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── KYC field change ───────────────────────────────────────────────────────
  const handleKycChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setKyc(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  // ── Tab 1 Submit: create/update farmer + auto-create project ──────────────
  const handleKycSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setKycError('');
    if (!kyc.first_name.trim()) { setKycError('First Name is required.'); return; }
    if (!kyc.phone_primary.trim()) { setKycError('Primary Phone is required.'); return; }
    if (!kyc.district.trim()) { setKycError('District is required.'); return; }
    setKycSaving(true);
    try {
      // ── Edit mode: update existing farmer ─────────────────────────────
      if (isEdit) {
        await updateFarmer(id as string, {
          first_name:      kyc.first_name,
          last_name:       kyc.last_name,
          whatsapp_number: kyc.whatsapp_number || null,
          address_line1:   packAddress(kyc.village, kyc.taluka, kyc.district),
          address_line2:   packAddress2(kyc.state, kyc.pincode),
          aadhaar_number:  kyc.aadhaar_number || null,
          pan_number:      kyc.pan_number     || null,
        } as any);
        setIsDirty(false);
        navigate('/farmers');
        return;
      }

      // ── Create new farmer ──────────────────────────────────────────────
      const createPayload: any = {
        role:            'farmer',
        first_name:      kyc.first_name,
        last_name:       kyc.last_name       || null,
        phone_primary:   kyc.phone_primary,
        whatsapp_number: kyc.whatsapp_number || null,
        address_line1:   packAddress(kyc.village, kyc.taluka, kyc.district) || null,
        address_line2:   packAddress2(kyc.state, kyc.pincode) || null,
      };
      const newFarmer: any = await createUser(createPayload);

      // Save KYC numbers (go into FarmerProfile via updateFarmer)
      if (kyc.aadhaar_number || kyc.pan_number) {
        try {
          await updateFarmer(newFarmer.id, {
            aadhaar_number: kyc.aadhaar_number || null,
            pan_number:     kyc.pan_number     || null,
          } as any);
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
        const areaTypes: any = await getAreaTypes();
        if (areaTypes?.length) areaTypeId = areaTypes[0].id;
      } catch { /* fall back to id=1 */ }

      const proj: any = await createProject({
        project_name:  `${kyc.first_name} ${kyc.last_name || ''} — Onboarding`.trim(),
        farmer_id:     fid,
        dealer_id:     user?.role === 'dealer' ? user.id : null,
        created_by:    user?.id as number,
        company_id:    1,
        area_type_id:  areaTypeId,
        project_stage: 'farmer_onboarding',
      } as any);
      setProjectId(proj.id);
      setIsDirty(false);
      setTab('project');   // go to Project Details before Documents
    } catch (err: any) {
      setKycError(err.response?.data?.detail || err.message || 'Registration failed.');
    } finally {
      setKycSaving(false);
    }
  };

  // ── Tab 2: Project Details submit ─────────────────────────────────────────
  const handleProjectSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProjError('');
    if (!proj.area_type_id) { setProjError('Please select an Area Type.'); return; }
    if (!proj.land_area || parseFloat(proj.land_area) <= 0) { setProjError('Please enter a valid Land Area.'); return; }
    setProjSaving(true);
    try {
      // Update the project (created in Tab 1) with real structural details
      await updateProjectFields(projectId as number, {
        project_name:  proj.project_name || `${kyc.first_name} — Greenhouse`,
        area_type_id:  parseInt(proj.area_type_id),
        land_area:     parseFloat(proj.land_area),
        land_unit:     proj.land_unit,
        khasra_no:     proj.khasra_no    || null,
        crop_category: proj.crop_category || null,
      } as any);

      // Add Structure component as the primary project item
      if (structureId) {
        try {
          await addProjectItem(projectId as number, {
            component_id: parseInt(structureId),
            quantity: parseFloat(proj.land_area),
            unit:     proj.land_unit,
          } as any);
        } catch { /* non-critical — can be added from Project Detail later */ }
      }

      // Add other selected components (Drip, Bed, Plantation, etc.)
      for (const compId of selectedComponents) {
        try {
          await addProjectItem(projectId as number, {
            component_id: compId,
            quantity: parseFloat(proj.land_area),
            unit:     proj.land_unit,
          } as any);
        } catch { /* non-critical */ }
      }

      setProjSaved(true);
      setTab('documents');
    } catch (err: any) {
      setProjError(err.response?.data?.detail || 'Failed to save project details. Please try again.');
    } finally {
      setProjSaving(false);
    }
  };

  // ── Component checkbox toggle ──────────────────────────────────────────────
  const toggleComponent = (id: number) => {
    setSelectedComponents(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // ── Tab 3: document upload helpers ────────────────────────────────────────
  const triggerFileInput = (docType: string) => {
    fileInputRefs.current[docType]?.click();
  };

  const handleFileSelect = (docType: string, file: File | null | undefined) => {
    if (!file) return;
    setDocFiles(prev => ({ ...prev, [docType]: file }));
    // Reset status so the user can re-upload
    setDocStatus(prev => ({ ...prev, [docType]: 'idle' }));
  };

  const handleUpload = async (docType: string) => {
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
    } catch {
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
        { id: 'kyc',       label: '1. KYC Details',     icon: UserPlus  },
        { id: 'project',   label: '2. Project Details',  icon: Building2 },
        { id: 'documents', label: '3. KYC Documents',    icon: FileText  },
      ];

  const tabUnlocked: Record<string, boolean> = {
    kyc:       true,
    project:   Boolean(farmerId && projectId),
    documents: Boolean(farmerId && projectId),
  };

  const tabDone: Record<string, boolean> = {
    kyc:       Boolean(farmerId),
    project:   projSaved,
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
              : 'Onboard a farmer — KYC Details · Project Details · KYC Documents'}
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
          TAB 2 — PROJECT DETAILS
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'project' && (
        <form onSubmit={handleProjectSubmit} className="animate-fade-in">
          {projError && (
            <div className="error-banner" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={16} /> {projError}
            </div>
          )}

          {/* ── Project Info ── */}
          <div className="glass-card detail-card" style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title"><Building2 size={18} /> 1. Project Information</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Project Name</label>
                  <input
                    className="input-field"
                    value={proj.project_name}
                    onChange={e => setProj(p => ({ ...p, project_name: e.target.value }))}
                    placeholder="e.g. Ramesh Patil — Greenhouse"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Crop Category</label>
                  <input
                    className="input-field"
                    value={proj.crop_category}
                    onChange={e => setProj(p => ({ ...p, crop_category: e.target.value }))}
                    placeholder="e.g. Tomato, Capsicum, Cucumber"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Khasra / Survey No.</label>
                  <input
                    className="input-field"
                    value={proj.khasra_no}
                    onChange={e => setProj(p => ({ ...p, khasra_no: e.target.value }))}
                    placeholder="e.g. 123/4A"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Land & Structure ── */}
          <div className="glass-card detail-card" style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title"><Layers size={18} /> 2. Land & Structure</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

                <div className="input-group">
                  <label className="input-label">Area Type *</label>
                  <select
                    className="input-field"
                    value={proj.area_type_id}
                    onChange={e => setProj(p => ({ ...p, area_type_id: e.target.value }))}
                    required
                  >
                    <option value="">— Select area type —</option>
                    {lookups.areaTypes.map((at: any) => (
                      <option key={at.id} value={at.id}>
                        {at.name} {at.multiplier ? `(×${at.multiplier})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Land Area *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="input-field"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 4000"
                      value={proj.land_area}
                      onChange={e => setProj(p => ({ ...p, land_area: e.target.value }))}
                      required
                      style={{ flex: 2 }}
                    />
                    <select
                      className="input-field"
                      value={proj.land_unit}
                      onChange={e => setProj(p => ({ ...p, land_unit: e.target.value }))}
                      style={{ flex: 1 }}
                    >
                      <option value="SQM">SQM</option>
                      <option value="Acre">Acre</option>
                      <option value="Hectare">Hectare</option>
                      <option value="Guntha">Guntha</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Structure Type</label>
                  <select
                    className="input-field"
                    value={structureId}
                    onChange={e => setStructureId(e.target.value)}
                  >
                    <option value="">— Select structure —</option>
                    {lookups.structures.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.subsidy_rate_per_unit ? ` — ₹${s.subsidy_rate_per_unit.toLocaleString('en-IN')}/unit` : ''}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                    The main structure type for subsidy calculation
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Components ── */}
          {lookups.others.length > 0 && (
            <div className="glass-card detail-card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3 className="card-title"><Leaf size={18} /> 3. Project Components</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Select all components included in this project
                </span>
              </div>
              <div className="card-body">
                {/* Group components by type */}
                {['Drip', 'Bed', 'Plantation', 'Other'].map(group => {
                  const items = lookups.others.filter((c: any) =>
                    group === 'Other'
                      ? !['Drip','Bed','Plantation'].includes(c.component_type)
                      : c.component_type === group
                  );
                  if (!items.length) return null;
                  return (
                    <div key={group} style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        {group} Components
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.5rem' }}>
                        {items.map((comp: any) => {
                          const checked = selectedComponents.includes(comp.id);
                          return (
                            <label
                              key={comp.id}
                              style={{
                                display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                                padding: '0.75rem 1rem', borderRadius: 10, cursor: 'pointer',
                                border: `1.5px solid ${checked ? 'var(--color-primary)' : 'var(--glass-border)'}`,
                                background: checked ? 'rgba(26,71,42,0.05)' : 'var(--color-bg-card)',
                                transition: 'all 0.15s',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleComponent(comp.id)}
                                style={{ marginTop: 2, accentColor: 'var(--color-primary)', flexShrink: 0 }}
                              />
                              <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>
                                  {comp.name}
                                </p>
                                {comp.subsidy_rate_per_unit > 0 && (
                                  <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                    ₹{comp.subsidy_rate_per_unit.toLocaleString('en-IN')} / unit
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-outline" onClick={() => setTab('kyc')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronLeft size={16} /> Back
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setTab('documents')}
                style={{ color: 'var(--color-text-muted)' }}
              >
                Skip — fill in later
              </button>
              <button type="submit" className="btn btn-primary" disabled={projSaving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {projSaving
                  ? <><Loader2 size={16} className="spin" /> Saving…</>
                  : <>Save & Continue <ChevronRight size={16} /></>
                }
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3 — KYC DOCUMENTS
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
                const status: string  = docStatus[doc.type] || 'idle';
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
                      onChange={e => handleFileSelect(doc.type, e.target.files?.[0])}
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
