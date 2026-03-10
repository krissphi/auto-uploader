import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = ({ label, className = '', ...props }: InputProps) => {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <input 
        className={className} 
        {...props} 
      />
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string; disabled?: boolean }[];
}

export const Select = ({ label, options, className = '', ...props }: SelectProps) => {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <select className={className} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
