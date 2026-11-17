import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global window reference for universal access
declare global {
  interface Window {
    toast?: {
      success: (message: string, title?: string, duration?: number) => void;
      error: (message: string, title?: string, duration?: number) => void;
      info: (message: string, title?: string, duration?: number) => void;
      warning: (message: string, title?: string, duration?: number) => void;
    };
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep at most 5 active toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: useCallback((msg: string, title = 'Success', dur = 4500) => showToast(msg, 'success', title, dur), [showToast]),
    error: useCallback((msg: string, title = 'Error', dur = 5500) => showToast(msg, 'error', title, dur), [showToast]),
    info: useCallback((msg: string, title = 'Notice', dur = 4500) => showToast(msg, 'info', title, dur), [showToast]),
    warning: useCallback((msg: string, title = 'Warning', dur = 5000) => showToast(msg, 'warning', title, dur), [showToast]),
  };

  useEffect(() => {
    window.toast = toast;
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, toast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            let bgClass = 'bg-white border-slate-200 text-slate-800 shadow-xl';
            let iconColor = 'text-blue-500';
            let IconComponent = Info;
            let barColor = 'bg-blue-500';

            if (t.type === 'success') {
              bgClass = 'bg-[#f0fdf9] border-teal-200 text-slate-900 shadow-lg shadow-teal-500/10';
              iconColor = 'text-[#119DA4]';
              IconComponent = CheckCircle2;
              barColor = 'bg-[#119DA4]';
            } else if (t.type === 'error') {
              bgClass = 'bg-[#fff5f5] border-rose-200 text-slate-900 shadow-lg shadow-rose-500/10';
              iconColor = 'text-rose-600';
              IconComponent = AlertCircle;
              barColor = 'bg-rose-500';
            } else if (t.type === 'warning') {
              bgClass = 'bg-[#fffbeb] border-amber-200 text-slate-900 shadow-lg shadow-amber-500/10';
              iconColor = 'text-amber-600';
              IconComponent = AlertTriangle;
              barColor = 'bg-amber-500';
            } else if (t.type === 'info') {
              bgClass = 'bg-[#f0f7ff] border-blue-200 text-slate-900 shadow-lg shadow-blue-500/10';
              iconColor = 'text-[#3066BE]';
              IconComponent = Info;
              barColor = 'bg-[#3066BE]';
            }

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                className={`pointer-events-auto rounded-2xl border p-4 backdrop-blur-md relative overflow-hidden flex items-start gap-3.5 transition-all ${bgClass}`}
              >
                {/* Visual Icon */}
                <div className={`p-1.5 rounded-xl bg-white shadow-2xs shrink-0 mt-0.5 ${iconColor}`}>
                  <IconComponent className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 pr-2 min-w-0">
                  {t.title && (
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-0.5">
                      {t.title}
                    </h4>
                  )}
                  <p className="text-xs text-slate-700 font-medium leading-relaxed break-words">
                    {t.message}
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 transition-colors shrink-0"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Duration Progress bar */}
                {t.duration && t.duration > 0 && (
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: t.duration / 1000, ease: 'linear' }}
                    className={`absolute bottom-0 left-0 h-1 opacity-70 ${barColor}`}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if invoked outside provider
    return {
      toasts: [],
      showToast: (msg: string) => console.log('Toast:', msg),
      removeToast: () => {},
      toast: {
        success: (msg: string) => window.toast?.success(msg) || console.log('Success:', msg),
        error: (msg: string) => window.toast?.error(msg) || console.error('Error:', msg),
        info: (msg: string) => window.toast?.info(msg) || console.info('Info:', msg),
        warning: (msg: string) => window.toast?.warning(msg) || console.warn('Warning:', msg),
      },
    };
  }
  return context;
};
