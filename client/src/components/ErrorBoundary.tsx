import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Application Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-red-200 p-8 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Application View Error</h2>
              <p className="text-xs text-slate-500 mt-1">
                An unexpected exception occurred while rendering this module.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-red-50/70 rounded-xl border border-red-100 text-left text-xs font-mono text-red-700 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-4 py-2.5 bg-[#3066BE] text-white rounded-xl text-xs font-bold hover:bg-[#25549e] flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> Reload Portal
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('bga_auth_token');
                  window.location.href = '/login';
                }}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Home className="w-4 h-4" /> Return to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

