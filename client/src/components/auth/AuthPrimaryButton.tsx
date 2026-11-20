import React from 'react';
import { Loader2 } from 'lucide-react';

interface AuthPrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const AuthPrimaryButton: React.FC<AuthPrimaryButtonProps> = ({
  loading = false,
  loadingText = 'Processing...',
  children,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={`w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white shadow-[0_6px_20px_rgba(8,121,232,0.28)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
        disabled || loading
          ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
          : 'bg-gradient-to-r from-[#0879E8] to-[#123FAD] hover:from-[#076cd0] hover:to-[#0e3592] hover:shadow-[0_8px_24px_rgba(8,121,232,0.36)] active:scale-[0.99]'
      } ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
