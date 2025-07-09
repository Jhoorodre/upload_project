import React from 'react';
import { ProgressBarProps } from '../types';

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  variant = 'primary',
  className = ''
}: ProgressBarProps) {
  const percentage = Math.round((value / max) * 100);
  
  const variantClasses = {
    primary: 'bg-primary-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };

  const progressClasses = [
    'h-2 rounded-full transition-all duration-300',
    variantClasses[variant]
  ].join(' ');

  return (
    <div className={`space-y-1 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-500">{percentage}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={progressClasses}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}