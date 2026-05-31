import ProjectFormDetails from '../components/ProjectForm/ProjectFormDetails';
import ProjectFormComponents from '../components/ProjectForm/ProjectFormComponents';
import ProjectFormDocuments from '../components/ProjectForm/ProjectFormDocuments';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Save, ArrowLeft, ArrowRight, Calculator,
  MapPin, Building2, Landmark, CheckCircle, Check,
  Upload, FileText, Loader2, X, Users, UserCheck,
} from 'lucide-react';
import '../components/Forms.css';
import LocationPicker from '../components/LocationPicker';
import {
  getDealers, getAreaTypes, getAgencies, getBanks, getBankBranches,
  getComponents,
  createProject, updateProject, addProjectItem, deleteProjectItem,
  getProjectById, getDealerFarmers,
  uploadDocument, getProjectDocuments, deleteDocument, getDocumentTypes,
  getProjectCoApplicants, addProjectCoApplicant, removeProjectCoApplicant,
} from '../api/client';

// Project creation allows only Land documents (other types are uploaded at later stages)
const FALLBACK_DOC_TYPES = [
  '7/12 Extract (Land Record)',
  '8A Certificate',
  'Land Map',
];

const fmtSize = (bytes) => {
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
  const userRole = currentUser.role;
  const canEditRates = !['dealer'].includes(userRole);

  const [activeTab, setActiveTab] = useState('header');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ── Warn browser before unload if unsaved changes exist ─────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Saved project ID (set after create/save) ─────────────────────────────
  const [savedProjectId, setSavedProjectId] = useState(isEditMode ? parseInt(id) : null);

  // ── Tab 1 form ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [coApplicants, setCoApplicants] = useState([]); // farmer IDs added as co-applicants

  // ── Tab 2 items ───────────────────────────────────────────────────────────
  const [selectedItems, setSelectedItems] = useState([]);
  const [originalItemIds, setOriginalItemIds] = useState([]);

  // ── Tab 3 documents ───────────────────────────────────────────────────────
  const [existingDocs, setExistingDocs] = useState([]);
  const [docTypesList, setDocTypesList] = useState(FALLBACK_DOC_TYPES);
  const [docTypesByCategory, setDocTypesByCategory] = useState({});
  const [docType, setDocType] = useState(FALLBACK_DOC_TYPES[0]);
  const [docFile, setDocFile] = useState(null);
  const [docRemarks, setDocRemarks] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState('');
  const fileInputRef = useRef(null);

  // ── Co-applicant search ───────────────────────────────────────────────────
  const [coAppSearch, setCoAppSearch] = useState('');
  const [coAppDropdownOpen, setCoAppDropdownOpen] = useState(false);

  // ── Lookup data ───────────────────────────────────────────────────────────
  const [lookups, setLookups] = useState(null);
  const [branches, setBranches] = useState([]);

  const fetchBranches = useCallback(async (bankId) => {
    if (!bankId) { setBranches([]); return; }
    try {
      const data = await getBankBranches(bankId);
      setBranches(Array.isArray(data) ? data : []);
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
        structures: (allComps || []).filter(c => c.component_type === 'Structure'),
        crops: (allComps || []).filter(c => c.component_type === 'Crop'),
        components: (allComps || []).filter(c => c.component_type === 'Component'),
        farmers: [],
      });
      // Load document types from API (with fallback to hardcoded)
      if (docTypesRes?.document_types?.length > 0) {
        setDocTypesList(docTypesRes.document_types);
        setDocTypesByCategory(docTypesRes.by_category || {});
        setDocType(docTypesRes.document_types[0]);
      }
    } catch {
      setLookups(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFarmers = useCallback(async (dealerId) => {
    if (!dealerId) { setLookups(l => ({ ...l, farmers: [] })); return; }
    try {
      const res = await getDealerFarmers(dealerId);
      const list = Array.isArray(res) ? res : (res.items || []);
      setLookups(l => ({ ...l, farmers: list }));
    } catch { setLookups(l => ({ ...l, farmers: [] })); }
  }, []);

  const loadExistingDocs = useCallback(async (projId) => {
    if (!projId) return;
    try {
      const res = await getProjectDocuments(projId);
      setExistingDocs(res.documents || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchLookups();
      if (isEditMode && id) {
        try {
          const proj = await getProjectById(id);
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
          const loadedItems = (proj.items || []).map((item, i) => ({
            ...item,
            tempId: item.id || Date.now() + i,
            subsidy_eligible_amount: item.subsidy_eligible_amount || (item.qty * (item.subsidy_rate_per_unit || 0)),
            subsidy_amount: item.subsidy_amount || ((item.qty * (item.subsidy_rate_per_unit || 0)) * 0.5),
            _isExisting: true,
          }));
          setSelectedItems(loadedItems);
          setOriginalItemIds(loadedItems.filter(i => i.id).map(i => i.id));
          if (proj.dealer_id) await fetchFarmers(proj.dealer_id);
          // Load co-applicants
          try {
            const coApps = await getProjectCoApplicants(id);
            setCoApplicants((coApps || []).map(ca => String(ca.farmer_id)));
          } catch { /* ignore */ }
          await loadExistingDocs(id);
        } catch { /* ignore */ }
      } else if (userRole === 'dealer') {
        const did = String(currentUser.id);
        setForm(prev => ({ ...prev, dealer_id: did }));
        await fetchFarmers(did);
      }
    };
    init();
  }, [id, isEditMode, userRole, currentUser.id, fetchLookups, fetchFarmers, fetchBranches, loadExistingDocs]);

  // Load docs when switching to documents tab
  useEffect(() => {
    if (activeTab === 'documents' && savedProjectId) {
      loadExistingDocs(savedProjectId);
    }
  }, [activeTab, savedProjectId, loadExistingDocs]);

  const handleChange = (e) => {
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
  const toggleCoApplicant = (farmerId) => {
    const fid = String(farmerId);
    setCoApplicants(prev =>
      prev.includes(fid) ? prev.filter(id => id !== fid) : [...prev, fid]
    );
  };

  // ── Components / Line Items ───────────────────────────────────────────────
  const allLineItems = lookups ? [
    ...lookups.structures.map(s => ({ ...s, _type: 'Structure', _rate: s.subsidy_rate_per_unit || 0, _unit: 'SQM' })),
    ...lookups.crops.map(c => ({ ...c, _type: 'Crop', _rate: c.subsidy_rate_per_unit || 0, _unit: 'SQM' })),
    ...lookups.components.map(c => ({ ...c, _type: 'Component', _rate: c.subsidy_rate_per_unit || c.eligible_cost_per_unit || 0, _unit: c.unit || 'NOS' })),
  ] : [];

  const isItemSelected = (item) => selectedItems.some(li => li.item_id === item.id && li.line_type === item._type);
  const getSelectedItem = (item) => selectedItems.find(li => li.item_id === item.id && li.line_type === item._type);

  const toggleItem = (item) => {
    if (isItemSelected(item)) {
      setSelectedItems(prev => prev.filter(li => !(li.item_id === item.id && li.line_type === item._type)));
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

  const updateQty = (tempId, qty) => {
    const q = parseFloat(qty) || 0;
    setSelectedItems(prev => prev.map(li => {
      if (li.tempId !== tempId) return li;
      const eligible = q * (li.subsidy_rate_per_unit || 0);
      return { ...li, qty: q, subsidy_eligible_amount: eligible, subsidy_amount: eligible * 0.5 };
    }));
  };

  const totals = {
    eligible: selectedItems.reduce((s, li) => s + (li.subsidy_eligible_amount || 0), 0),
    subsidy: selectedItems.reduce((s, li) => s + (li.subsidy_amount || 0), 0),
  };

  // ── Save Project (Tab 2 → creates/updates, then moves to Tab 3) ───────────
  const handleSubmit = async () => {
    if (!form.farmer_id) { setError('Please select a Main Applicant.'); return; }
    if (!form.area_type_id) { setError('Please select an Area Type.'); return; }
    if (!form.land_area || parseFloat(form.land_area) <= 0) { setError('Please enter a valid Land Area greater than 0.'); return; }
    if (selectedItems.length === 0) { setError('Please select at least one component.'); return; }
    setError(''); setSubmitting(true);
    try {
      const payload = {
        project_name: form.project_name || `Project-${Date.now()}`,
        farmer_id: parseInt(form.farmer_id),
        dealer_id: form.dealer_id ? parseInt(form.dealer_id) : null,
        area_type_id: parseInt(form.area_type_id),
        village_id: form.village_id ? parseInt(form.village_id) : null,
        khasra_no: form.khasra_survey_no, survey_no: form.khasra_survey_no,
        land_area: parseFloat(form.land_area), land_unit: form.land_unit,
        subsidy_agency_id: form.subsidy_agency_id ? parseInt(form.subsidy_agency_id) : null,
        bank_branch_id: form.bank_branch_id ? parseInt(form.bank_branch_id) : null,
        estimated_project_cost: form.estimated_total_cost ? parseFloat(form.estimated_total_cost) : null,
        project_stage: userRole === 'dealer' ? 'draft' : 'farmer_onboarding',
        company_id: 1,
        created_by: currentUser.id,
      };

      let resultId = savedProjectId;
      if (!isEditMode && !savedProjectId) {
        const result = await createProject(payload);
        resultId = result.id;
        setSavedProjectId(resultId);
        setSuccess(true);
      } else {
        await updateProject(savedProjectId || id, payload);
        resultId = savedProjectId || parseInt(id);

        // Handle item deletions/additions in edit mode
        for (const origId of originalItemIds) {
          const orig = selectedItems.find(li => li.id === origId);
          if (!orig) {
            await deleteProjectItem(resultId, origId);
          }
        }
        for (const li of selectedItems) {
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

      // Save project items (new project)
      if (!isEditMode && !savedProjectId) {
        for (const li of selectedItems) {
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

      // Save co-applicants
      try {
        // In edit mode, get existing co-applicants and reconcile
        if (isEditMode) {
          const existing = await getProjectCoApplicants(resultId);
          const existingIds = (existing || []).map(ca => String(ca.farmer_id));
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
      } catch { /* co-applicant errors are non-fatal */ }

      // Move to Documents tab — form is now clean
      setIsDirty(false);
      setActiveTab('documents');
      await loadExistingDocs(resultId);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msgs = Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : null;
      setError(msgs || detail ? String(msgs || detail) : (err.message || 'Failed to save project.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Document upload ───────────────────────────────────────────────────────
  const handleDocUpload = async () => {
    if (!docFile || !savedProjectId) return;
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
    } catch (err) {
      setDocError(err.response?.data?.detail || err.message || 'Upload failed.');
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await deleteDocument(docId);
      setExistingDocs(prev => prev.filter(d => d.id !== docId));
    } catch { /* ignore */ }
  };

  const fmt = (v) => `Rs.${Math.round(v || 0).toLocaleString('en-IN')}`;

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

  // Farmers available as co-applicants (exclude main applicant)
  const coApplicantOptions = (lookups.farmers || []).filter(
    f => String(f.id || f.farmer_id) !== String(form.farmer_id)
  );

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
        {TABS.map(tab => {
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

      {activeTab === 'header' && <ProjectFormDetails form={form} setForm={setForm} isEditMode={isEditMode} userRole={userRole} lookups={lookups} handleChange={handleChange} coApplicants={coApplicants} toggleCoApplicant={toggleCoApplicant} coAppSearch={coAppSearch} setCoAppSearch={setCoAppSearch} coAppDropdownOpen={coAppDropdownOpen} setCoAppDropdownOpen={setCoAppDropdownOpen} branches={branches} canEditRates={canEditRates} navigate={navigate} setActiveTab={setActiveTab} />}

      {activeTab === 'components' && <ProjectFormComponents allLineItems={allLineItems} getSelectedItem={getSelectedItem} toggleItem={toggleItem} updateQty={updateQty} totals={totals} submitting={submitting} handleSubmit={handleSubmit} setActiveTab={setActiveTab} error={error} />}

      {activeTab === 'documents' && <ProjectFormDocuments existingDocs={existingDocs} docTypesByCategory={docTypesByCategory} docType={docType} setDocType={setDocType} docFile={docFile} setDocFile={setDocFile} docRemarks={docRemarks} setDocRemarks={setDocRemarks} docUploading={docUploading} handleDocUpload={handleDocUpload} handleDeleteDoc={handleDeleteDoc} docError={docError} fileInputRef={fileInputRef} navigate={navigate} fmtSize={fmtSize} savedProjectId={savedProjectId} />}
    </div>
  );
};

export default ProjectForm;
