import React from 'react';
import { CardProps } from '../types';

export function Card({
  title,
  children,
  className = '',
  variant = 'default'
}: CardProps) {
  const variantClasses = {
    default: 'bg-white border-gray-200',
    primary: 'bg-primary-50 border-primary-200',
    secondary: 'bg-secondary-50 border-secondary-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200'
  };

  const cardClasses = [
    'border rounded-lg shadow-sm',
    variantClasses[variant],
    className
  ].join(' ');

  return (
    <div className={cardClasses}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}