import { useState, useEffect, type FC, type ReactElement, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  updateProjectFields,
} from '../../api/client';
import { CONFLICT_MESSAGE, isConflict, versionOf } from '../../lib/concurrency';
import { logger } from '../../lib/logger';
import {
  CheckCircle, Building2, MapPin, BadgeIndianRupee,
  User, FileText, AlertTriangle,
  UploadCloud, Landmark, CalendarCheck, Hammer, Droplets, Sprout, Leaf
} from 'lucide-react';
import '../../pages/ProjectDetail.css';
import { useToast } from '../../context/ToastContext';

import type { ProjectDetail } from '../../types/models';
import { STAGE_ROLES } from './constants';
import { Field, SaveButton } from './shared';

// ============================================================
// StageActionPanel
// ============================================================

interface StageActionPanelProps {
  stageId: string;
  project: ProjectDetail;
  role: string;
  onSaved?: () => void;
}

type FormState = Record<string, any>;

const StageActionPanel = ({ stageId, project, role, onSaved }: StageActionPanelProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pre-fill from project data
  useEffect(() => {
    const p = project as any;
    const PRE: Record<string, FormState> = {
      bank_processing:    { loan_amount: p.loan_amount || '', loan_sanction_date: p.loan_sanction_date || '', loan_account_number: p.loan_account_number || '' },
      goc_registration:   { goc_number: p.goc_number || '', goc_date: p.goc_date || '' },
      m7_plantation:      { plantation_date: p.plantation_date || '', seedlings_count: p.seedlings_count || '', agronomist_recommendations: p.agronomist_recommendations || '' },
      subsidy_claim:      { subsidy_claim_reference: p.subsidy_claim_reference || '', subsidy_claim_date: p.subsidy_claim_date || '' },
      agency_inspection:  { subsidy_inspection_date: p.subsidy_inspection_date || '', subsidy_inspector_name: p.subsidy_inspector_name || '', subsidy_inspection_remarks: p.subsidy_inspection_remarks || '', subsidy_inspection_passed: p.subsidy_inspection_passed ?? '' },
      committee_meeting:  { subsidy_meeting_date: p.subsidy_meeting_date || '', subsidy_meeting_decision: p.subsidy_meeting_decision || '', subsidy_approved_amount: p.subsidy_approved_amount || '', subsidy_meeting_remarks: p.subsidy_meeting_remarks || '' },
      // FIX: subsidy_bank_credit_date was missing — saved value was erased on re-open
      subsidy_released:   { subsidy_release_date: p.subsidy_release_date || '', subsidy_release_order_number: p.subsidy_release_order_number || '', subsidy_release_amount: p.subsidy_release_amount || '', subsidy_bank_credit_date: p.subsidy_bank_credit_date || '' },
      completed:          { completion_certificate_date: p.completion_certificate_date || '', farmer_feedback: p.farmer_feedback || '', farmer_rating: p.farmer_rating || '' },
    };
    setForm(PRE[stageId] || {});
  }, [stageId, project]);

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Send the concurrency token loaded with this project so a stale write is
      // rejected (409) rather than clobbering another user's edit.
      const result = await updateProjectFields(project.id, { ...form, ...versionOf(project) } as any);
      // Safety net: the backend whitelists which fields each role may PATCH and
      // silently drops anything outside it (HTTP 200, applied_fields: []) rather
      // than erroring. If nothing was actually written, don't lie and say "Saved!".
      const appliedCount = Array.isArray(result?.applied_fields) ? result.applied_fields.length : null;
      if (appliedCount === 0) {
        toast('Nothing was saved — none of these fields are editable for your role. Contact an admin if this looks wrong.', 'error');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();
    } catch (err) {
      if (isConflict(err)) { toast(CONFLICT_MESSAGE, 'warning'); return; }
      logger.warn('StageActionPanel.save', err);
      toast('Failed to save. Check backend connection.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Panels ──────────────────────────────────────────────────────────────────
  const panels = {

    // ── Stage 0: Draft (dealer-created, pending office review) ──────────────
    draft: () => (
      <div className="stage-panel">
        <div className="panel-intro">
          <FileText size={16} />
          <span>
            <strong>Draft project submitted by dealer.</strong> Office staff should review the
            applicant details, verify the project scope, and advance to Lead Generation once ready.
          </span>
        </div>
        <div className="panel-checklist">
          {[
            'Dealer and farmer details verified',
            'Project scope is realistic',
            'No duplicate project for same farmer',
            'Dealer is authorised for this area',
          ].map(item => (
            <label key={item} className="check-item"><input type="checkbox" /> <span>{item}</span></label>
          ))}
        </div>
        <p className="checklist-note">ℹ Checklists are visual reminders only — items are not saved.</p>
      </div>
    ),

    // ── Stage 1: Lead Generation ────────────────────────────
    farmer_onboarding: () => (
      <div className="stage-panel">
        <div className="panel-intro"><User size={16} /> <span>Dealer has submitted the farmer lead. Verify farmer KYC details and land documents before proceeding to the next stage.</span></div>
      </div>
    ),

    // ── Stage 2: Document Collection ────────────────────────
    document_collection: () => (
      <div className="stage-panel">
        <div className="panel-intro"><FileText size={16} /> <span>Collect and verify all KYC and land-related documents from the farmer.</span></div>
        <div className="panel-checklist">
          {[
            'Aadhaar Card (Front & Back)', 'PAN Card', '7/12 Extract (Land Record)',
            '8A Certificate', 'Bank Passbook / Account Statement', 'Caste Certificate (if applicable)',
            'Photograph (Passport size)', 'Quotation from Structure Contractor',
          ].map(doc => (
            <label key={doc} className="check-item"><input type="checkbox" /> <span>{doc}</span></label>
          ))}
        </div>
        <p className="checklist-note">ℹ Checklists are visual reminders only — items are not saved.</p>
        <div className="panel-upload-hint"><UploadCloud size={14} /> Upload documents in the Documents tab.</div>
      </div>
    ),

    // ── Stage 3: Site Visit ─────────────────────────────────
    site_visit: () => (
      <div className="stage-panel">
        <div className="panel-intro"><MapPin size={16} /> <span>Dealer or project manager visits the farm to verify location and assess suitability.</span></div>
        <div className="panel-checklist">
          {['GPS coordinates captured', 'Water source confirmed', 'Soil type suitable', 'Electricity accessible', 'Road access confirmed', 'Photos taken'].map(item => (
            <label key={item} className="check-item"><input type="checkbox" /> <span>{item}</span></label>
          ))}
        </div>
        <p className="checklist-note">ℹ Checklists are visual reminders only — items are not saved.</p>
      </div>
    ),

    // ── Stage 4: Design & BOQ ───────────────────────────────
    design_boq: () => (
      <div className="stage-panel">
        <div className="panel-intro"><Building2 size={16} /> <span>Office prepares the complete structure design and Bill of Quantities (BOQ).</span></div>
        <div className="panel-checklist">
          {['Structure type finalised', 'Area dimensions confirmed', 'BOQ prepared', 'Quotation received from contractor', 'Design drawings ready'].map(item => (
            <label key={item} className="check-item"><input type="checkbox" /> <span>{item}</span></label>
          ))}
        </div>
        <p className="checklist-note">ℹ Checklists are visual reminders only — items are not saved.</p>
      </div>
    ),

    // ── Stage 5: DPR Ready ──────────────────────────────────
    dpr_ready: () => (
      <div className="stage-panel">
        <div className="panel-intro"><FileText size={16} /> <span>Detailed Project Report (DPR) has been prepared and is ready for submission.</span></div>
        <div className="panel-checklist">
          {['DPR document created', 'Subsidy calculation attached', 'Farmer signature obtained', 'Company stamp applied', 'DPR submitted to agency'].map(item => (
            <label key={item} className="check-item"><input type="checkbox" /> <span>{item}</span></label>
          ))}
        </div>
        <p className="checklist-note">ℹ Checklists are visual reminders only — items are not saved.</p>
      </div>
    ),

    // ── Stage 6: Bank Processing ────────────────────────────
    bank_processing: () => (
      <div className="stage-panel">
        <div className="panel-intro"><Landmark size={16} /> <span>Bank Officer processes the loan application, uploads required bank documents, and records sanction details.</span></div>

        {/* Bank Document Checklist */}
        <div className="bank-doc-checklist">
          <p className="checklist-heading">📋 Required Bank Documents</p>

          {[
            { name: 'Bank Sanction Letter',      required: true  },
            { name: 'Bank Appraisal Report',      required: true  },
            { name: 'Bank Legal Search Report',   required: true  },
            { name: 'KCC Letter',                 required: false },
            { name: 'Bank Correspondence',        required: false },
          ].map(doc => (
            <div key={doc.name} className="bank-doc-row">
              <div className="bank-doc-name">
                <FileText size={14} />
                <span>{doc.name}</span>
              </div>
              <div className="bank-doc-tags">
                {doc.required
                  ? <span className="bdoc-tag required">⚠️ Required</span>
                  : <span className="bdoc-tag optional">Optional</span>
                }
                <span className="bdoc-tag upload-hint">Upload in Documents tab</span>
              </div>
            </div>
          ))}
          <p className="bank-doc-note">
            Go to <Link to="/documents" className="inline-link">Documents</Link> → Upload Document → select the bank document type to attach files.
          </p>
        </div>

        {/* Loan details */}
        <Field label="Loan Amount (₹)">
          <input type="number" className="input-field" value={form.loan_amount || ''} onChange={set('loan_amount')} placeholder="e.g. 2500000" />
        </Field>
        <Field label="Loan Sanction Date">
          <input type="date" className="input-field" value={form.loan_sanction_date || ''} onChange={set('loan_sanction_date')} />
        </Field>
        <Field label="Loan Account Number">
          <input type="text" className="input-field" value={form.loan_account_number || ''} onChange={set('loan_account_number')} placeholder="Bank account number" />
        </Field>
        <SaveButton loading={saving} saved={saved} onClick={handleSave} />
      </div>
    ),

    // ── Stage 7: GOC Registration ───────────────────────────
    goc_registration: () => (
      <div className="stage-panel">
        <div className="panel-intro"><Landmark size={16} /> <span>Record the Grant of Clearance (GOC) number from the subsidy agency.</span></div>
        <Field label="GOC Reference Number">
          <input type="text" className="input-field" value={form.goc_number || ''} onChange={set('goc_number')} placeholder="e.g. GOC/NHB/2024/001234" />
        </Field>
        <Field label="GOC Issue Date">
          <input type="date" className="input-field" value={form.goc_date || ''} onChange={set('goc_date')} />
        </Field>
        <div className="panel-upload-hint"><UploadCloud size={14} /> Attach GOC file after document storage is configured.</div>
        <SaveButton loading={saving} saved={saved} onClick={handleSave} />
      </div>
    ),

    // ── Stages M1–M4: Structure Milestones ─────────────────
    m1_foundation:         () => <ConstructionPanel icon={<Hammer size={16}/>} label="M1 — Foundation work in progress" extra="Ensure RCC/PCC foundation depth meets design specs." saving={saving} saved={saved} onSave={handleSave} />,
    m2_structure_erection: () => <ConstructionPanel icon={<Hammer size={16}/>} label="M2 — Structure erection in progress" extra="Verify column spacing, bracing, and purlin alignment." saving={saving} saved={saved} onSave={handleSave} />,
    m3_covering_material:  () => <ConstructionPanel icon={<Hammer size={16}/>} label="M3 — Covering material installation" extra="Check UV film / shade net tightness and overlap sealing." saving={saving} saved={saved} onSave={handleSave} />,
    m4_trellising:         () => <ConstructionPanel icon={<Hammer size={16}/>} label="M4 — Trellising installation" extra="Verify wire tension and crop support structure alignment." saving={saving} saved={saved} onSave={handleSave} />,

    // ── Stage M5: Drip Fitting ──────────────────────────────
    m5_drip_fitting: () => (
      <div className="stage-panel">
        <div className="panel-intro"><Droplets size={16} /> <span>Drip Contractor installs the irrigation system across all beds.</span></div>
        <div className="panel-checklist">
          {['Mainline laid', 'Sub-mainlines connected', 'Drip laterals installed on all beds', 'Filter unit fitted', 'Fertigation unit installed', 'Pressure test done', 'System trial run completed'].map(item => (
            <label key={item} className="check-item"><input type="checkbox" /> <span>{item}</span></label>
          ))}
        </div>
        <p className="checklist-note">ℹ Checklists are visual reminders only — items are not saved.</p>
      </div>
    ),

    // ── Stage M6: Bed Preparation ───────────────────────────
    m6_bed_preparation: () => (
      <div className="stage-panel">
        <div className="panel-intro"><Leaf size={16} /> <span>Bed Contractor prepares growing beds with substrate / soil mix.</span></div>
        <div className="panel-checklist">
          {['Beds marked and levelled', 'Substrate / cocopeat filled', 'Mulch applied', 'Drip emitters aligned with beds', 'Surface drainage cleared'].map(item => (
            <label key={item} className="check-item"><input type="checkbox" /> <span>{item}</span></label>
          ))}
        </div>
        <p className="checklist-note">ℹ Checklists are visual reminders only — items are not saved.</p>
      </div>
    ),

    // ── Stage M7: Plantation ────────────────────────────────
    m7_plantation: () => (
      <div className="stage-panel">
        <div className="panel-intro"><Sprout size={16} /> <span>Plantation contractor plants the seedlings. Agronomist confirms crop advisory.</span></div>
        <Field label="Plantation Date">
          <input type="date" className="input-field" value={form.plantation_date || ''} onChange={set('plantation_date')} />
        </Field>
        <Field label="Number of Seedlings Planted">
          <input type="number" className="input-field" value={form.seedlings_count || ''} onChange={set('seedlings_count')} placeholder="e.g. 8000" />
        </Field>
        <Field label="Agronomist Crop Advisory Notes">
          <textarea className="input-field" rows={3} value={form.agronomist_recommendations || ''} onChange={set('agronomist_recommendations')} placeholder="Fertilizer schedule, pest prevention, irrigation advice..." />
        </Field>
        <SaveButton loading={saving} saved={saved} onClick={handleSave} />
      </div>
    ),

    // ── Stage 15: Subsidy Claim ─────────────────────────────
    subsidy_claim: () => (
      <div className="stage-panel">
        <div className="panel-intro"><FileText size={16} /> <span>Office files the subsidy claim with the government agency.</span></div>
        <Field label="Claim Reference Number">
          <input type="text" className="input-field" value={form.subsidy_claim_reference || ''} onChange={set('subsidy_claim_reference')} placeholder="e.g. NHB/CLAIM/2024/5678" />
        </Field>
        <Field label="Claim Filed Date">
          <input type="date" className="input-field" value={form.subsidy_claim_date || ''} onChange={set('subsidy_claim_date')} />
        </Field>
        <div className="panel-checklist" style={{ marginTop: '0.5rem' }}>
          {['Completion photos attached', 'M3 inspection report included', 'DPR copy attached', 'Bank certificate submitted', 'Farmer consent letter enclosed'].map(item => (
            <label key={item} className="check-item"><input type="checkbox" /> <span>{item}</span></label>
          ))}
        </div>
        <p className="checklist-note">ℹ Checklists are visual reminders only — items are not saved.</p>
        <SaveButton loading={saving} saved={saved} onClick={handleSave} />
      </div>
    ),

    // ── Stage 16: Agency Inspection ─────────────────────────
    agency_inspection: () => (
      <div className="stage-panel">
        <div className="panel-intro"><CalendarCheck size={16} /> <span>Agency Officer visits the site for official inspection and files the report.</span></div>
        <Field label="Inspection Date">
          <input type="date" className="input-field" value={form.subsidy_inspection_date || ''} onChange={set('subsidy_inspection_date')} />
        </Field>
        <Field label="Inspector Name & Designation">
          <input type="text" className="input-field" value={form.subsidy_inspector_name || ''} onChange={set('subsidy_inspector_name')} placeholder="e.g. Shri Arun Dubey, DHO Pune" />
        </Field>
        <Field label="Inspection Outcome">
          <select className="input-field" value={form.subsidy_inspection_passed ?? ''} onChange={set('subsidy_inspection_passed')}>
            <option value="">— Select —</option>
            <option value="1">✅ Passed — Eligible for Subsidy</option>
            <option value="0">❌ Failed — Does Not Meet Criteria</option>
          </select>
        </Field>
        <Field label="Inspector Remarks">
          <textarea className="input-field" rows={3} value={form.subsidy_inspection_remarks || ''} onChange={set('subsidy_inspection_remarks')} placeholder="Observation notes from the site inspection..." />
        </Field>
        <SaveButton loading={saving} saved={saved} onClick={handleSave} />
      </div>
    ),

    // ── Stage 17: Committee Meeting ─────────────────────────
    committee_meeting: () => (
      <div className="stage-panel">
        <div className="panel-intro"><Landmark size={16} /> <span>Agency committee reviews the inspection report and decides on subsidy approval.</span></div>
        <Field label="Committee Meeting Date">
          <input type="date" className="input-field" value={form.subsidy_meeting_date || ''} onChange={set('subsidy_meeting_date')} />
        </Field>
        <Field label="Decision">
          <select className="input-field" value={form.subsidy_meeting_decision || ''} onChange={set('subsidy_meeting_decision')}>
            <option value="">— Select Decision —</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
            <option value="pending">⏳ Pending / Deferred</option>
          </select>
        </Field>
        <Field label="Approved Subsidy Amount (₹)">
          <input type="number" className="input-field" value={form.subsidy_approved_amount || ''} onChange={set('subsidy_approved_amount')} placeholder="e.g. 2000000" />
        </Field>
        <Field label="Committee Remarks / Resolution">
          <textarea className="input-field" rows={3} value={form.subsidy_meeting_remarks || ''} onChange={set('subsidy_meeting_remarks')} placeholder="Meeting resolution and conditions (if any)..." />
        </Field>
        <SaveButton loading={saving} saved={saved} onClick={handleSave} />
      </div>
    ),

    // ── Stage 18: Subsidy Released ──────────────────────────
    subsidy_released: () => (
      <div className="stage-panel">
        <div className="panel-intro"><BadgeIndianRupee size={16} /> <span>Record the subsidy release order and the date funds were credited to the farmer's account.</span></div>
        <Field label="Release Order Number">
          <input type="text" className="input-field" value={form.subsidy_release_order_number || ''} onChange={set('subsidy_release_order_number')} placeholder="e.g. NHB/REL/2024/001" />
        </Field>
        <Field label="Amount Released (₹)">
          <input type="number" className="input-field" value={form.subsidy_release_amount || ''} onChange={set('subsidy_release_amount')} placeholder="e.g. 2000000" />
        </Field>
        <Field label="Subsidy Release Date">
          <input type="date" className="input-field" value={form.subsidy_release_date || ''} onChange={set('subsidy_release_date')} />
        </Field>
        <Field label="Bank Credit Date (Farmer's Account)">
          <input type="date" className="input-field" value={form.subsidy_bank_credit_date || ''} onChange={set('subsidy_bank_credit_date')} />
        </Field>
        <SaveButton loading={saving} saved={saved} onClick={handleSave} />
      </div>
    ),

    // ── Stage 19: Completed ─────────────────────────────────
    completed: () => (
      <div className="stage-panel">
        <div className="panel-intro" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'var(--color-success)' }}>
          <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
          <span><strong>Project is complete!</strong> The 10-year compliance tracking period has begun.</span>
        </div>
        <Field label="Completion Certificate Date">
          <input type="date" className="input-field" value={form.completion_certificate_date || ''} onChange={set('completion_certificate_date')} />
        </Field>
        <Field label="Farmer Feedback">
          <textarea className="input-field" rows={2} value={form.farmer_feedback || ''} onChange={set('farmer_feedback')} placeholder="Farmer's comments on the project..." />
        </Field>
        <Field label="Farmer Rating (1–5)">
          <select className="input-field" value={form.farmer_rating || ''} onChange={set('farmer_rating')}>
            <option value="">— Rating —</option>
            {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} ⭐</option>)}
          </select>
        </Field>
        <div className="compliance-notice">
          <AlertTriangle size={16} />
          <span>10-year compliance reporting is required annually. First report due in 12 months.</span>
        </div>
        <SaveButton loading={saving} saved={saved} onClick={handleSave} />
      </div>
    ),
  };

  const PanelContent = (panels as Record<string, FC>)[stageId];
  if (!PanelContent) return null;

  // Check if current role can see this panel
  const allowedRoles = STAGE_ROLES[stageId] || [];
  if (!allowedRoles.includes(role)) {
    return (
      <div className="stage-panel panel-locked">
        <AlertTriangle size={14} /> This stage requires action by: {allowedRoles.map(r => r.replace(/_/g,' ')).join(', ')}.
      </div>
    );
  }

  return <PanelContent />;
};

// ── Construction Panel (shared for M1-M4) ──────────────────
interface ConstructionPanelProps {
  icon: ReactElement;
  label: string;
  extra: string;
  saving?: boolean;
  saved?: boolean;
  onSave?: () => void;
}

const ConstructionPanel = ({ icon, label, extra }: ConstructionPanelProps) => (
  <div className="stage-panel">
    <div className="panel-intro">{icon} <span>{label}<br /><em className="panel-hint">{extra}</em></span></div>
    <div className="panel-checklist">
      {['Work started on site', 'Daily progress photos taken', 'Material delivery confirmed', 'Labor count recorded', 'Quality check passed', 'Stage ready for next milestone'].map(item => (
        <label key={item} className="check-item"><input type="checkbox" /> <span>{item}</span></label>
      ))}
    </div>
    <p className="checklist-note">ℹ Checklists are visual reminders only — items are not saved.</p>
  </div>
);


export default StageActionPanel;
