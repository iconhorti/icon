import { type ReactNode, type ComponentType, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { AlertCircle, type LucideProps } from 'lucide-react';
import './Forms.css';

export const FormSection = ({ title, icon: Icon, children }: { title: ReactNode; icon?: ComponentType<LucideProps>; children: ReactNode }) => (
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

export const FormActions = ({ children }: { children: ReactNode }) => (
  <div className="form-actions animate-fade-in">
    {children}
  </div>
);

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  icon?: ComponentType<LucideProps>;
  error?: ReactNode;
}

export const TextInput = ({ label, icon: Icon, error, ...props }: TextInputProps) => {
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

export interface SelectOption {
  value?: string | number;
  id?: string | number;
  label?: ReactNode;
  name?: ReactNode;
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  icon?: ComponentType<LucideProps>;
  error?: ReactNode;
  options: SelectOption[];
}

export const SelectInput = ({ label, icon: Icon, error, options, ...props }: SelectInputProps) => {
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
            <option key={opt.value ?? opt.id} value={opt.value ?? opt.id}>
              {opt.label ?? opt.name}
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
