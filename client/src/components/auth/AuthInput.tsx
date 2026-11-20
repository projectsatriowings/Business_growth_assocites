import React from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  error?: string;
  helpText?: string;
  isPassword?: boolean;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  icon: Icon,
  error,
  helpText,
  isPassword = false,
  showPasswordToggle = false,
  onTogglePassword,
  showPassword = false,
  className = '',
  required,
  id,
  ...props
}) => {
  const inputId = id || `auth-input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#10244D]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative rounded-xl transition-all">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#60769B]">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          type={isPassword ? (showPassword ? 'text' : 'password') : props.type || 'text'}
          className={`w-full text-xs font-medium text-[#10244D] bg-white border rounded-xl py-3 transition-all placeholder:text-[#60769B]/60 focus:outline-none focus:ring-3 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${showPasswordToggle ? 'pr-11' : 'pr-3.5'} ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
              : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
          } ${className}`}
          required={required}
          {...props}
        />

        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#60769B] hover:text-[#0879E8] transition-colors focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-fadeIn">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helpText ? (
        <p className="text-[11px] text-[#60769B]">{helpText}</p>
      ) : null}
    </div>
  );
};
