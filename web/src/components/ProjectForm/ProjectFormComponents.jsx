import React from 'react';
import { ArrowLeft, ArrowRight, Building2, MapPin, Landmark, Users, UserCheck, X, Calculator, Upload, FileText, Loader2, Save, CheckCircle } from 'lucide-react';


export default function ProjectFormComponents({
  allLineItems, getSelectedItem, toggleItem, updateQty,
  totals, submitting, handleSubmit, setActiveTab, error
}) {
  return (
    <div className="animate-fade-in">
          <div className="form-section">
            <div className="form-section-header">
              <Calculator size={18} className="form-section-icon" />
              <h3 className="form-section-title">Select Structures, Crops & Components</h3>
            </div>
            <div style={{ padding: '1rem', overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.85rem', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Type</th>
                    <th>Item Name</th>
                    <th>Unit</th>
                    <th>Subsidy Rate (Rs.)</th>
                    <th>Qty</th>
                    <th>Eligible Amt (Rs.)</th>
                    <th>Subsidy Amt (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  {allLineItems.map((item, idx) => {
                    const sel = getSelectedItem(item);
                    const checked = !!sel;
                    return (
                      <tr key={`${item._type}-${item.id}-${idx}`} style={{ background: checked ? '#e8f5e9' : '' }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(item)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                          />
                        </td>
                        <td><span className="badge">{item._type}</span></td>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        <td>{item._unit}</td>
                        <td>{fmt(item._rate)}</td>
                        <td style={{ minWidth: '100px' }}>
                          <input
                            type="number"
                            className="form-control"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                            value={sel ? sel.qty : ''}
                            min="0"
                            disabled={!checked}
                            onChange={e => sel && updateQty(sel.tempId, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          {sel && sel.qty > 0 ? fmt(sel.subsidy_eligible_amount) : '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: '#28a745' }}>
                          {sel && sel.qty > 0 ? fmt(sel.subsidy_amount) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {selectedItems.length > 0 && (
                    <tr style={{ background: '#f0f4ff', fontWeight: 700 }}>
                      <td colSpan={5} style={{ textAlign: 'right', paddingRight: '1rem' }}>TOTAL</td>
                      <td></td>
                      <td style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>{fmt(totals.eligible)}</td>
                      <td style={{ color: '#28a745', fontSize: '1rem' }}>{fmt(totals.subsidy)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setActiveTab('header')}>
              <ArrowLeft size={16} /> Back
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              <Save size={16} />
              {submitting ? 'Saving...' : savedProjectId ? 'Update & Continue' : (userRole === 'dealer' ? 'Save Draft & Continue' : 'Save Project & Continue')}
            </button>
          </div>
        </div>
  );
}