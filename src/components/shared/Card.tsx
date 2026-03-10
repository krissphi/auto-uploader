import React from 'react';

interface CardProps {
  title?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export const Card = ({ title, subtitle, children, className = '', headerAction }: CardProps) => {
  return (
    <div className={`card ${className}`}>
      {(title || subtitle || headerAction) && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: children ? '20px' : '0'
        }}>
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
