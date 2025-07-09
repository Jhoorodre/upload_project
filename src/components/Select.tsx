import React from 'react';
import { SelectProps } from '../types';

export function Select({
  label,
  error,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  className = ''
}: SelectProps) {
  const selectClasses = [
    'block w-full px-3 py-2 border rounded-md text-sm',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
    error 
      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 text-gray-900',
    disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white',
    className
  ].join(' ');

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={selectClasses}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}