import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'outline' | 'ghost-danger';
  loading?: boolean;
}

export const Button = ({ 
  children, 
  variant = 'primary', 
  loading, 
  className = '', 
  disabled, 
  ...props 
}: ButtonProps) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'danger': return 'btn-danger';
      case 'ghost-danger': return 'btn-ghost-danger';
      case 'outline': return 'toggle-btn';
      default: return 'btn-primary';
    }
  };

  return (
    <button 
      className={`${getVariantClass()} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? '⏳ Loading...' : children}
    </button>
  );
};
