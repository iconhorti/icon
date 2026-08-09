import ProjectFormDetails from '../components/ProjectForm/ProjectFormDetails';
import { emptyParcel, emptyRegistryMeta, landRegistryToApi, normalizeLandRegistryOnLoad, needsNoc, registryTotalSqm, type LandParcelRow, type LandOwnerRow, type LandRegistryMeta } from '../components/ProjectForm/LandRegistrySection';
import ProjectFormComponents from '../components/ProjectForm/ProjectFormComponents';
import ProjectFormDocuments from '../components/ProjectForm/ProjectFormDocuments';
import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle,
} from 'lucide-react';
import '../components/Forms.css';
import {
  getDealers, getAreaTypes, getAgencies, getBanks, getBankBranches,
  getComponents,
  createProject, updateProject, addProjectItem, deleteProjectItem,
  getProjectById, getDealerFarmers,
  uploadDocument, getProjectDocuments, deleteDocument, getDocumentTypes,
  getProjectCoApplicants, addProjectCoApplicant, removeProjectCoApplicant,
  saveProjectLandRegistry,
} from '../api/client';
import { validateUpload } from '../lib/fileValidation';
import { logger } from '../lib/logger';
import { CONFLICT_MESSAGE, isConflict, versionOf } from '../lib/concurrency';

// Project creation allows only Land documents (other types are uploaded at later stages)
const FALLBACK_DOC_TYPES = [
  '7/12 Extract (Land Record)',
  '8A Certificate',
  'NOC / Land Owner Consent',
  'Land Map',
];

const fmtSize = (bytes: number | null | undefined): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const TABS = [
  { id: 'header',     label: '1. Project Details' },
  { id: 'components', label: '2. Components' },
  { id: 'documents',  label: '3. Land Documents' },
];

const EMPTY_FORM = {
  dealer_id: '', farmer_id: '', project_name: '',
  village_id: '',
  bank_id: '', bank_branch_id: '',
  khasra_survey_no: '', land_area: '', land_unit: 'SQM',
  area_type_id: '', subsidy_agency_id: '',
  estimated_total_cost: '', eligible_project_cost: '',
};

const ProjectForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { user: currentUser } = useAuth();
  const userRole = currentUser?.role ?? '';
  const canEditRates = !['dealer'].includes(userRole);

  const [activeTab, setActiveTab] = useState<string>('header');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // ── Warn browser before unload if unsaved changes exist ─────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Saved project ID (set after create/save) ─────────────────────────────
  const [savedProjectId, setSavedProjectId] = useState<number | null>(isEditMode ? parseInt(id as string) : null);

  // ── Tab 1 form ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<Record<string, any>>(EMPTY_FORM);
  const [coApplicants, setCoApplicants] = useState<string[]>([]); // farmer IDs added as co-applicants
  const [landParcels, setLandParcels] = useState<LandParcelRow[]>([emptyParcel()]);
  const [landOwners, setLandOwners] = useState<LandOwnerRow[]>([]);
  const [landMeta, setLandMeta] = useState<LandRegistryMeta>(emptyRegistryMeta());

  // ── Tab 2 items ───────────────────────────────────────────────────────────
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [originalItemIds, setOriginalItemIds] = useState<any[]>([]);

  // ── Tab 3 documents ───────────────────────────────────────────────────────
  const [existingDocs, setExistingDocs] = useState<any[]>([]);
    const [docTypesByCategory, setDocTypesByCategory] = useState<Record<string, any>>({});
  const [docType, setDocType] = useState<string>(FALLBACK_DOC_TYPES[0]);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docRemarks, setDocRemarks] = useState<string>('');
  const [docUploading, setDocUploading] = useState<boolean>(false);
  const [docError, setDocError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Co-applicant search ───────────────────────────────────────────────────
  const [coAppSearch, setCoAppSearch] = useState<string>('');
  const [coAppDropdownOpen, setCoAppDropdownOpen] = useState<boolean>(false);

  // ── Lookup data ───────────────────────────────────────────────────────────
  const [lookups, setLookups] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);

  // Concurrency token (version / updated_at) captured when the project was loaded.
  const [loadedVersion, setLoadedVersion] = useState<{ version?: number; updated_at?: string }>({});

  const fetchBranches = useCallback(async (bankId: any) => {
    if (!bankId) { setBranches([]); return; }
    try {
      const data = await getBankBranches(bankId);
      setBranches(Array.isArray(data) ? (data as any) : []);
    } catch { setBranches([]); }
  }, []);

  const fetchLookups = useCallback(async () => {
    setLoading(true);
    try {
      const [dealers, areaRes, agRes, bankRes, allComps, docTypesRes] = await Promise.all([
        getDealers(), getAreaTypes(), getAgencies(), getBanks(), getComponents(),
        getDocumentTypes({ category: 'Land' }).catch(() => null),
      ]);
      setLookups({
        dealers: dealers || [],
        areaTypes: areaRes || [],
        agencies: agRes || [],
        banks: bankRes || [],
        structures: (allComps || []).filter((c: any) => c.component_type === 'Structure'),
        crops: (allComps || []).filter((c: any) => c.component_type === 'Crop'),
        components: (allComps || []).filter((c: any) => c.component_type === 'Component'),
        farmers: [],
      });
      // Load document types from API (with fallback to hardcoded)
      if (docTypesRes?.document_types?.length > 0) {
        setDocTypesByCategory(docTypesRes.by_category || {});
        setDocType(docTypesRes.document_types[0]);
      }
    } catch {
      setLookups(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFarmers = useCallback(async (dealerId: any) => {
    if (!dealerId) { setLookups((l: any) => ({ ...l, farmers: [] })); return; }
    try {
      const res = await getDealerFarmers(dealerId);
      const list = Array.isArray(res) ? res : ((res as any).items || []);
      setLookups((l: any) => ({ ...l, farmers: list }));
    } catch { setLookups((l: any) => ({ ...l, farmers: [] })); }
  }, []);

  const loadExistingDocs = useCallback(async (projId: any) => {
    if (!projId) return;
    try {
      const res = await getProjectDocuments(projId);
      setExistingDocs((res as any).documents || []);
    } catch (e) { logger.warn('ProjectForm.loadExistingDocs', e); }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchLookups();
      if (isEditMode && id) {
        try {
          const proj = await getProjectById(id as string);
          setLoadedVersion(versionOf(proj)); // concurrency token captured at load time
          const branchBankId = proj.bank_branch?.bank_id || '';
          setForm({
            dealer_id: proj.dealer_id ? String(proj.dealer_id) : '',
            farmer_id: proj.farmer_id ? String(proj.farmer_id) : '',
            project_name: proj.project_name || '',
            village_id: proj.village_id || '',
            bank_id: branchBankId ? String(branchBankId) : '',
            bank_branch_id: proj.bank_branch_id ? String(proj.bank_branch_id) : '',
            khasra_survey_no: proj.khasra_no || proj.survey_no || '',
            land_area: proj.land_area ? String(proj.land_area) : '',
            land_unit: proj.land_unit || 'SQM',
            area_type_id: proj.area_type_id ? String(proj.area_type_id) : '',
            subsidy_agency_id: proj.subsidy_agency_id ? String(proj.subsidy_agency_id) : '',
            estimated_total_cost: proj.total_project_cost || '',
            eligible_project_cost: proj.total_eligible_project_cost || '',
          });
          if (branchBankId) await fetchBranches(branchBankId);
          const loadedItems = (proj.items || []).map((item: any, i: number) => ({
            ...item,
            tempId: item.id || Date.now() + i,
            subsidy_eligible_amount: item.subsidy_eligible_amount || (item.qty * (item.subsidy_rate_per_unit || 0)),
            subsidy_amount: item.subsidy_amount || ((item.qty * (item.subsidy_rate_per_unit || 0)) * 0.5),
            _isExisting: true,
          }));
          setSelectedItems(loadedItems);
          setOriginalItemIds(loadedItems.filter((i: any) => i.id).map((i: any) => i.id));
          if (proj.dealer_id) await fetchFarmers(proj.dealer_id);
          const projAny = proj as any;
          setLandMeta({
            khatauni_number: projAny.khatauni_number || '',
            ownership_type: projAny.ownership_type === 'joint' ? 'joint' : 'single',
          });
          let loadedParcels: LandParcelRow[] = [emptyParcel()];
          if (projAny.land_parcels?.length) {
            loadedParcels = projAny.land_parcels.map((p: any) => ({
              khatauni_number: p.khatauni_number || '',
              khasra_no: p.khasra_no || '',
              survey_no: p.survey_no || '',
              area_sqm: p.area_sqm != null ? String(p.area_sqm) : '',
              land_type: p.land_type || 'agricultural',
              encumbrance: !!p.encumbrance,
              is_project_khasra: !!p.is_project_khasra,
              notes: p.notes || '',
            }));
          } else if (proj.khasra_no) {
            loadedParcels = [{
              khatauni_number: projAny.khatauni_number || '',
              khasra_no: proj.khasra_no,
              survey_no: proj.survey_no || '',
              area_sqm: proj.land_area != null ? String(proj.land_area) : '',
              land_type: 'agricultural',
              encumbrance: false,
              is_project_khasra: true,
              notes: '',
            }];
          }
          let loadedOwners: LandOwnerRow[] = [];
          if (projAny.land_owners?.length) {
            loadedOwners = projAny.land_owners.map((o: any) => ({
              owner_name: o.owner_name || '',
              father_name: o.father_name || '',
              relation: o.relation || '',
              khasra_no: o.khasra_no || '',
              area_sqm: o.area_sqm != null ? String(o.area_sqm) : '',
              area_hectare: o.area_hectare != null ? String(o.area_hectare) : '',
              share_fraction: o.share_fraction || '',
              share_percentage: o.share_percentage != null ? String(o.share_percentage) : '',
              is_primary_owner: !!o.is_primary_owner,
              owner_type: o.owner_type === 'other' ? 'other' : 'project',
            }));
          }
          const normalized = normalizeLandRegistryOnLoad(loadedParcels, loadedOwners);
          setLandParcels(normalized.parcels);
          setLandOwners(normalized.owners);
          // Load co-applicants
          try {
            const coApps = await getProjectCoApplicants(id as string);
            setCoApplicants((coApps || []).map((ca: any) => String(ca.farmer_id)));
          } catch (e) { logger.warn('ProjectForm.loadCoApplicants', e); }
          await loadExistingDocs(id as string);
        } catch (e) { logger.warn('ProjectForm.initEdit', e); }
      } else if (userRole === 'dealer') {
        const did = String(currentUser?.id);
        setForm(prev => ({ ...prev, dealer_id: did }));
        await fetchFarmers(did);
      }
    };
    init();
  }, [id, isEditMode, userRole, currentUser?.id, fetchLookups, fetchFarmers, fetchBranches, loadExistingDocs]);

  // Load docs when switching to documents tab
  useEffect(() => {
    if (activeTab === 'documents' && savedProjectId) {
      loadExistingDocs(savedProjectId);
    }
  }, [activeTab, savedProjectId, loadExistingDocs]);

  // Auto-fill total land area from khasra / owner rows (user can still override)
  useEffect(() => {
    const total = registryTotalSqm(landParcels, landOwners);
    if (total > 0) {
      setForm(prev => {
        const current = parseFloat(prev.land_area);
        if (!prev.land_area || Number.isNaN(current) || current === 0) {
          return { ...prev, land_area: String(Math.round(total)) };
        }
        return prev;
      });
    }
  }, [landParcels, landOwners]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
    if (name === 'dealer_id') {
      setForm(prev => ({ ...prev, farmer_id: '' }));
      setCoApplicants([]);
      fetchFarmers(value);
    }
    if (name === 'bank_id') {
      setForm(prev => ({ ...prev, bank_branch_id: '' }));
      fetchBranches(value);
    }
  };

  // ── Co-applicant toggle ───────────────────────────────────────────────────
  const toggleCoApplicant = (farmerId: any) => {
    const fid = String(farmerId);
    setCoApplicants(prev =>
      prev.includes(fid) ? prev.filter((id: any) => id !== fid) : [...prev, fid]
    );
  };

  // ── Components / Line Items ───────────────────────────────────────────────
  const allLineItems = lookups ? [
    ...lookups.structures.map((s: any) => ({ ...s, _type: 'Structure', _rate: s.subsidy_rate_per_unit || 0, _unit: 'SQM' })),
    ...lookups.crops.map((c: any) => ({ ...c, _type: 'Crop', _rate: c.subsidy_rate_per_unit || 0, _unit: 'SQM' })),
    ...lookups.components.map((c: any) => ({ ...c, _type: 'Component', _rate: c.subsidy_rate_per_unit || c.eligible_cost_per_unit || 0, _unit: c.unit || 'NOS' })),
  ] : [];

  const isItemSelected = (item: any) => selectedItems.some((li: any) => li.item_id === item.id && li.line_type === item._type);
  const getSelectedItem = (item: any) => selectedItems.find((li: any) => li.item_id === item.id && li.line_type === item._type);

  const toggleItem = (item: any) => {
    if (isItemSelected(item)) {
      setSelectedItems(prev => prev.filter((li: any) => !(li.item_id === item.id && li.line_type === item._type)));
    } else {
      setSelectedItems(prev => [...prev, {
        tempId: Date.now() + Math.random(),
        line_type: item._type,
        item_id: item.id,
        item_name: item.name,
        qty: item.default_qty || item.min_qty || 0,
        subsidy_rate_per_unit: item._rate,
        subsidy_eligible_amount: 0,
        subsidy_amount: 0,
        actual_unit_cost: 0,
        actual_rate_per_unit: 0,
        unit: item._unit,
      }]);
    }
  };

  const updateQty = (tempId: any, qty: any) => {
    const q = parseFloat(qty) || 0;
    setSelectedItems(prev => prev.map((li: any) => {
      if (li.tempId !== tempId) return li;
      const eligible = q * (li.subsidy_rate_per_unit || 0);
      return { ...li, qty: q, subsidy_eligible_amount: eligible, subsidy_amount: eligible * 0.5 };
    }));
  };

  const totals = {
    eligible: selectedItems.reduce((s: number, li: any) => s + (li.subsidy_eligible_amount || 0), 0),
    subsidy: selectedItems.reduce((s: number, li: any) => s + (li.subsidy_amount || 0), 0),
  };

  // ── Save Project (Tab 2 → creates/updates, then moves to Tab 3) ───────────
  const handleSubmit = async (): Promise<void> => {
    if (!form.farmer_id) { setError('Please select a Main Applicant.'); return; }
    if (!form.area_type_id) { setError('Please select an Area Type.'); return; }
    if (!form.land_area || parseFloat(form.land_area) <= 0) { setError('Please enter a valid Land Area greater than 0.'); return; }
    if (selectedItems.length === 0) { setError('Please select at least one component.'); return; }
    setError(''); setSubmitting(true);
    try {
      const landReg = landRegistryToApi(landMeta, landParcels, landOwners);
      const khasraSummary = landReg.parcels.map(p => p.khasra_no).join(', ') || form.khasra_survey_no;
      const payload = {
        project_name: form.project_name || `Project-${Date.now()}`,
        farmer_id: parseInt(form.farmer_id),
        dealer_id: form.dealer_id ? parseInt(form.dealer_id) : null,
        area_type_id: parseInt(form.area_type_id),
        village_id: form.village_id ? parseInt(form.village_id) : null,
        khasra_no: khasraSummary,
        survey_no: landReg.parcels[0]?.khasra_no || form.khasra_survey_no,
        land_area: parseFloat(form.land_area), land_unit: form.land_unit,
        subsidy_agency_id: form.subsidy_agency_id ? parseInt(form.subsidy_agency_id) : null,
        bank_branch_id: form.bank_branch_id ? parseInt(form.bank_branch_id) : null,
        // NOTE: backend field names are total_project_cost / total_eligible_project_cost —
        // "estimated_project_cost" doesn't exist on ProjectCreate and was being silently
        // dropped. See AUDIT_FIXES.md.
        total_project_cost: form.estimated_total_cost ? parseFloat(form.estimated_total_cost) : null,
        total_eligible_project_cost: form.eligible_project_cost ? parseFloat(form.eligible_project_cost) : null,
        project_stage: userRole === 'dealer' ? 'draft' : 'farmer_onboarding',
        company_id: 1,
        created_by: currentUser?.id,
      };

      let resultId: any = savedProjectId;
      // isNewProject uses the local variable, not state — avoids stale-closure
      // double-fire bug where setSavedProjectId() is async and the second guard
      // at the bottom of this function would see the old (null) value and re-run
      // the addProjectItem loop, duplicating every line item in the database.
      const isNewProject = !isEditMode && !savedProjectId;
      if (isNewProject) {
        const result: any = await createProject(payload as any);
        resultId = result.id;
        setSavedProjectId(resultId);
        setSuccess(true);
      } else {
        // Include the concurrency token loaded with the project so the backend
        // can reject a stale write (409) instead of silently clobbering.
        await updateProject((savedProjectId || id) as any, { ...payload, ...loadedVersion } as any);
        resultId = savedProjectId || parseInt(id as string);

        // Handle item deletions/additions in edit mode
        for (const origId of originalItemIds) {
          const orig = selectedItems.find((li: any) => li.id === origId);
          if (!orig) {
            await deleteProjectItem(resultId, origId);
          }
        }
        for (const li of selectedItems as any[]) {
          if (!li._isExisting) {
            await addProjectItem(resultId, {
              project_id: resultId,
              line_type: li.line_type, item_id: li.item_id,
              unit: li.unit, qty: li.qty,
              subsidy_rate_per_unit: li.subsidy_rate_per_unit || 0,
              subsidy_eligible_amount: li.subsidy_eligible_amount || 0,
              subsidy_amount: li.subsidy_amount || 0,
              actual_rate_per_unit: li.actual_rate_per_unit || 0,
              actual_unit_cost: li.actual_unit_cost || 0,
              subsidy_state_multiplier: 1.0, subsidy_rate: 50.0,
              subsidy_unit_cost: li.subsidy_rate_per_unit || 0,
            });
          }
        }
      }

      // Save project items (new project) — use the local flag, NOT state
      if (isNewProject) {
        for (const li of selectedItems as any[]) {
          await addProjectItem(resultId, {
            project_id: resultId,
            line_type: li.line_type, item_id: li.item_id,
            unit: li.unit, qty: li.qty,
            subsidy_rate_per_unit: li.subsidy_rate_per_unit || 0,
            subsidy_eligible_amount: li.subsidy_eligible_amount || 0,
            subsidy_amount: li.subsidy_amount || 0,
            actual_rate_per_unit: li.actual_rate_per_unit || 0,
            actual_unit_cost: li.actual_unit_cost || 0,
            subsidy_state_multiplier: 1.0, subsidy_rate: 50.0,
            subsidy_unit_cost: li.subsidy_rate_per_unit || 0,
          });
        }
      }

      // Save land registry (khasaras + joint owners)
      try {
        if (landReg.parcels.length || landReg.owners.length) {
          await saveProjectLandRegistry(resultId, landReg);
        }
      } catch (e) { logger.warn('ProjectForm.saveLandRegistry', e); }

      // Save co-applicants
      try {
        // In edit mode, get existing co-applicants and reconcile
        if (isEditMode) {
          const existing = await getProjectCoApplicants(resultId);
          const existingIds = (existing || []).map((ca: any) => String(ca.farmer_id));
          // Remove ones no longer selected
          for (const eid of existingIds) {
            if (!coApplicants.includes(eid)) {
              await removeProjectCoApplicant(resultId, parseInt(eid));
            }
          }
          // Add newly selected ones
          for (const cid of coApplicants) {
            if (!existingIds.includes(cid)) {
              await addProjectCoApplicant(resultId, parseInt(cid));
            }
          }
        } else {
          for (const cid of coApplicants) {
            await addProjectCoApplicant(resultId, parseInt(cid));
          }
        }
      } catch (e) { logger.warn('ProjectForm.saveCoApplicants', e); /* non-fatal */ }

      // Move to Documents tab — form is now clean
      setIsDirty(false);
      setActiveTab('documents');
      await loadExistingDocs(resultId);
    } catch (err: any) {
      if (isConflict(err)) {
        // Lost-update guard: another user saved first. Don't overwrite — tell the
        // user to reload. (No-op until the backend returns 409.)
        setError(CONFLICT_MESSAGE);
        return;
      }
      const detail = err.response?.data?.detail;
      const msgs = Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : null;
      setError(msgs || detail ? String(msgs || detail) : (err.message || 'Failed to save project.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Document upload ───────────────────────────────────────────────────────
  const handleDocUpload = async (): Promise<void> => {
    if (!docFile || !savedProjectId) return;
    // Client-side guard (backend still validates) — blocks oversized / wrong-type files early.
    const check = validateUpload(docFile);
    if (!check.ok) { setDocError(check.error || 'Invalid file.'); return; }
    setDocUploading(true); setDocError('');
    try {
      const fd = new FormData();
      fd.append('document_type', docType);
      fd.append('stage', 'farmer_onboarding');
      fd.append('remarks', docRemarks);
      fd.append('file', docFile);
      await uploadDocument(savedProjectId, fd);
      setDocFile(null);
      setDocRemarks('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadExistingDocs(savedProjectId);
    } catch (err: any) {
      setDocError(err.response?.data?.detail || err.message || 'Upload failed.');
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: any): Promise<void> => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await deleteDocument(docId);
      setExistingDocs(prev => prev.filter((d: any) => d.id !== docId));
    } catch (e) { logger.warn('ProjectForm.deleteDoc', e); }
  };

  if (loading || lookups === null) {
    return (
      <div className="dashboard-container">
        <div className="page-header"><h1 className="page-title">Start New Project</h1></div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          {error ? <div className="error-banner">{error}</div> : <p>Loading form data...</p>}
          {lookups === null && (
            <button className="btn btn-outline" onClick={() => { setError(''); fetchLookups(); }} style={{ marginTop: '1rem' }}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="page-header animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="page-title">{isEditMode ? 'Edit Project' : 'Start New Project'}</h1>
            <p className="page-subtitle">
              {isEditMode ? 'Update project details' : 'Set up project with applicants, components & documents'}
            </p>
          </div>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && (
        <div style={{
          background: '#d4edda', color: '#155724', padding: '0.75rem 1rem',
          borderRadius: '6px', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <CheckCircle size={18} /> Project saved! Add documents below or finish later.
        </div>
      )}

      {/* Tab Bar */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {TABS.map((tab: any) => {
          const isLocked = tab.id === 'documents' && !savedProjectId;
          return (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => !isLocked && setActiveTab(tab.id)}
              disabled={isLocked}
              title={isLocked ? 'Save project first to access Documents' : ''}
              style={{ opacity: isLocked ? 0.5 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'header' && <ProjectFormDetails form={form} setForm={setForm} isEditMode={isEditMode} userRole={userRole} lookups={lookups} handleChange={handleChange} coApplicants={coApplicants} toggleCoApplicant={toggleCoApplicant} coAppSearch={coAppSearch} setCoAppSearch={setCoAppSearch} coAppDropdownOpen={coAppDropdownOpen} setCoAppDropdownOpen={setCoAppDropdownOpen} branches={branches} canEditRates={canEditRates} navigate={navigate} setActiveTab={setActiveTab} landMeta={landMeta} setLandMeta={setLandMeta} landParcels={landParcels} setLandParcels={setLandParcels} landOwners={landOwners} setLandOwners={setLandOwners} />}

      {activeTab === 'components' && <ProjectFormComponents allLineItems={allLineItems} getSelectedItem={getSelectedItem} toggleItem={toggleItem} updateQty={updateQty} totals={totals} submitting={submitting} handleSubmit={handleSubmit} setActiveTab={setActiveTab} selectedItems={selectedItems} savedProjectId={savedProjectId} userRole={userRole} error={error} />}

      {activeTab === 'documents' && <ProjectFormDocuments existingDocs={existingDocs} docTypesByCategory={docTypesByCategory} docType={docType} setDocType={setDocType} docFile={docFile} setDocFile={setDocFile} docRemarks={docRemarks} setDocRemarks={setDocRemarks} docUploading={docUploading} handleDocUpload={handleDocUpload} handleDeleteDoc={handleDeleteDoc} docError={docError} fileInputRef={fileInputRef} navigate={navigate} fmtSize={fmtSize} savedProjectId={savedProjectId} setActiveTab={setActiveTab} docTypesList={FALLBACK_DOC_TYPES} isJointLand={needsNoc(landParcels, landOwners, landMeta)} />}
    </div>
  );
};

export default ProjectForm;
