import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useParams, Link } from 'react-router-dom';
import {
  getProjectById, updateProjectStage, updateProjectFields,
  getProjectContractors, assignContractor,
  getSkills, getContractorsBySkill,
  addProjectItem, deleteProjectItem, getComponents
} from '../../api/client';
import {
  CheckCircle, Clock, ArrowLeft, Building2, MapPin, BadgeIndianRupee,
  User, FileText, Loader2, Save, ChevronRight, AlertTriangle,
  UploadCloud, Landmark, CalendarCheck, Hammer, Droplets, Sprout, Leaf
} from 'lucide-react';
import '../../pages/ProjectDetail.css';
import { useToast } from '../../context/ToastContext';


import { WORKFLOW_STAGES, CAN_ADVANCE, CAN_REVERT, STAGE_ROLES } from './constants';
import { Field, SaveButton } from './shared';

// ============================================================
// ProjectItemsCard
// ============================================================

const ProjectItemsCard = ({ project, userRole, refresh }) => {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lookups, setLookups] = useState({ structures: [], crops: [], components: [] });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [form, setForm] = useState({
    line_type: 'Structure',
    item_id: '',
    unit: 'sqm',
    qty: 0,
    subsidy_rate_per_unit: 0,
    actual_unit_cost: 0,
    subsidy_state_multiplier: 1.0,
  });

  useEffect(() => {
    if (adding) {
      getComponents()
        .then(data => setLookups({
          structures: (data || []).filter(c => c.component_type === 'Structure'),
          crops: (data || []).filter(c => c.component_type === 'Crop'),
          components: (data || []).filter(c => c.component_type === 'Component'),
        }))
        .catch(console.error);
    }
  }, [adding]);

  const handleLineTypeChange = (e) => {
    const newVal = e.target.value;
    setForm({ ...form, line_type: newVal, item_id: '', subsidy_rate_per_unit: 0 });
  };

  const handleItemSelect = (e) => {
    const id = parseInt(e.target.value);
    const item = form.line_type === 'Structure' ? lookups.structures.find(x => x.id === id) :
                 form.line_type === 'Crop' ? lookups.crops.find(x => x.id === id) :
                 lookups.components.find(x => x.id === id);
    
    setForm({ 
      ...form, 
      item_id: id, 
      subsidy_rate_per_unit: item?.subsidy_rate_per_unit || 0 
    });
  };

  const handleSave = async () => {
    if (!form.item_id) return toast('Select an item.', 'warning');
    setSubmitting(true);
    try {
      const eligible_amt = form.qty * form.subsidy_rate_per_unit * form.subsidy_state_multiplier;
      const payload = {
        project_id: project.id,
        line_type: form.line_type,
        item_id: form.item_id,
        unit: form.unit,
        qty: parseFloat(form.qty),
        subsidy_rate_per_unit: parseFloat(form.subsidy_rate_per_unit),
        subsidy_state_multiplier: parseFloat(form.subsidy_state_multiplier),
        actual_unit_cost: parseFloat(form.actual_unit_cost),
        actual_rate_per_unit: parseFloat(form.actual_unit_cost) / (parseFloat(form.qty) || 1),
        subsidy_eligible_amount: eligible_amt,
        subsidy_rate: 50.0,
        subsidy_amount: eligible_amt * 0.5
      };
      await addProjectItem(project.id, payload);
      setAdding(false);
      refresh();
    } catch (e) {
      toast('Failed to add item: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Remove this item?')) return;
    try {
      await deleteProjectItem(project.id, itemId);
      refresh();
    } catch (e) {
      toast('Failed to delete item.', 'error');
    }
  };

  // Extract name for display manually since API doesn't populate nested name on GET currently.  
  // A clean approach is to map it if we fetched lookups, but we'll just show the IDs for now or a generic label
  // if not fetched yet, which is typical for decoupled relations, but let's just make it look clean.
  
  const canEdit = ['admin', 'owner', 'office_staff'].includes(userRole);

  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  const allItems = project.items || [];
  const paginatedItems = allItems.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="glass-card detail-card animate-delay-2" style={{ marginTop: '1.25rem', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="card-title text-accent m-0"><Building2 size={18} /> Component & Subsidy Items</h3>
        {canEdit && !adding && (
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add Item</button>
        )}
      </div>

      <table className="data-table" style={{ width: '100%', fontSize: '0.875rem' }}>
        <thead>
          <tr>
            <th>Type</th>
            <th>Qty (Unit)</th>
            <th>Eligible Amt</th>
            <th>Subsidy (50%)</th>
            <th>Actual Cost</th>
            {canEdit && <th>Act</th>}
          </tr>
        </thead>
        <tbody>
          {allItems.length === 0 ? (
            <tr><td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No items added yet.</td></tr>
          ) : (
            paginatedItems.map(i => (
              <tr key={i.id}>
                <td className="font-medium">{i.line_type} #{i.item_id}</td>
                <td>{i.qty} {i.unit}</td>
                <td style={{ color: 'var(--color-success)' }}>{formatCurrency(i.subsidy_eligible_amount)}</td>
                <td style={{ fontWeight: 'bold' }}>{formatCurrency(i.subsidy_amount)}</td>
                <td>{formatCurrency(i.actual_unit_cost)}</td>
                {canEdit && <td>
                  <button onClick={() => handleDelete(i.id)} className="btn btn-outline btn-sm" style={{ color: 'var(--color-danger)' }}>✖</button>
                </td>}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {allItems.length > pageSize }

      {adding && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>New Item Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <select className="input-field" value={form.line_type} onChange={handleLineTypeChange}>
              <option value="Structure">Structure</option>
              <option value="Crop">Crop</option>
              <option value="Component">Other Component</option>
            </select>
            <select className="input-field" value={form.item_id} onChange={handleItemSelect}>
              <option value="">-- Select --</option>
              {form.line_type === 'Structure' && lookups.structures.map(s => <option key={s.id} value={s.id}>{s.name} (₹{s.subsidy_per_sqm || s.eligible_project_cost_per_sqm}/sqm)</option>)}
              {form.line_type === 'Crop' && lookups.crops.map(c => <option key={c.id} value={c.id}>{c.name} (₹{c.subsidy_per_sqm || c.eligible_project_cost_per_sqm}/sqm)</option>)}
              {form.line_type === 'Component' && lookups.components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="number" className="input-field" placeholder="Qty" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} style={{ flex: 1 }} />
              <input type="text" className="input-field" placeholder="Unit" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} style={{ width: '60px' }} />
            </div>

            <input type="number" className="input-field" placeholder="Govt Rate per unit" value={form.subsidy_rate_per_unit} onChange={e => setForm({...form, subsidy_rate_per_unit: e.target.value})} title="Govt Eligible Rate per unit" />
            <input type="number" className="input-field" placeholder="Multiplier (e.g. 1.15)" value={form.subsidy_state_multiplier} onChange={e => setForm({...form, subsidy_state_multiplier: e.target.value})} title="State Multiplier" />
            <input type="number" className="input-field" placeholder="Actual Cost (Farmer)" value={form.actual_unit_cost} onChange={e => setForm({...form, actual_unit_cost: e.target.value})} title="Actual cost" />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


export default ProjectItemsCard;
