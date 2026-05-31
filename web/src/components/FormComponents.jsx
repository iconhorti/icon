import React from 'react';
import { AlertCircle } from 'lucide-react';
import './Forms.css';

export const FormSection = ({ title, icon: Icon, children }) => (
  <div className="form-section animate-fade-in">
    <div className="form-section-header">
      {Icon && <Icon className="form-section-icon" size={20} />}
      <h3 className="form-section-title">{title}</h3>
    </div>
    <div className="form-section-body">
      {children}
    </div>
  </div>
);

export const FormActions = ({ children }) => (
  <div className="form-actions animate-fade-in">
    {children}
  </div>
);

export const TextInput = ({ label, icon: Icon, error, ...props }) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="form-input-container">
        {Icon && <Icon className="form-input-icon" size={18} />}
        <input
          className={`form-control ${Icon ? 'has-icon' : ''} ${error ? 'is-invalid' : ''}`}
          {...props}
        />
      </div>
      {error && (
        <span className="form-error">
          <AlertCircle size={14} />
          {error}
        </span>
      )}
    </div>
  );
};

export const SelectInput = ({ label, icon: Icon, error, options, ...props }) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="form-input-container">
        {Icon && <Icon className="form-input-icon" size={18} />}
        <select
          className={`form-control ${Icon ? 'has-icon' : ''} ${error ? 'is-invalid' : ''}`}
          {...props}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value || opt.id} value={opt.value || opt.id}>
              {opt.label || opt.name}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <span className="form-error">
          <AlertCircle size={14} />
          {error}
        </span>
      )}
    </div>
  );
};
