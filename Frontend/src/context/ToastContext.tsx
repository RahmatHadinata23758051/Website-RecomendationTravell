import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', durationMs = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, message };

      setToasts((prev) => [...prev.slice(-3), newToast]); // keep max 4 toasts

      if (durationMs > 0) {
        setTimeout(() => {
          dismiss(id);
        }, durationMs);
      }
    },
    [dismiss],
  );

  const success = useCallback(
    (message: string, durationMs?: number) => showToast(message, 'success', durationMs),
    [showToast],
  );
  const error = useCallback(
    (message: string, durationMs?: number) => showToast(message, 'error', durationMs ?? 5000),
    [showToast],
  );
  const info = useCallback(
    (message: string, durationMs?: number) => showToast(message, 'info', durationMs),
    [showToast],
  );

  const value = useMemo(
    () => ({ toasts, showToast, success, error, info, dismiss }),
    [toasts, showToast, success, error, info, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Host Container */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2 p-2 sm:bottom-6 sm:right-6"
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          return (
            <div
              key={toast.id}
              role={isError ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-xl transition-all animate-in fade-in slide-in-from-bottom-2 ${
                isError
                  ? 'border-red-300 bg-red-900/95 text-red-50 shadow-red-950/20'
                  : isSuccess
                  ? 'border-teal-400/40 bg-[#0F2937] text-white shadow-teal-950/20'
                  : 'border-slate-300 bg-slate-900/95 text-slate-50'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isError && <AlertCircle className="h-4 w-4 text-red-300" />}
                {isSuccess && <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" />}
                {!isError && !isSuccess && <Info className="h-4 w-4 text-sky-300" />}
              </div>

              <p className="flex-1 leading-snug">{toast.message}</p>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Tutup notifikasi"
                className="shrink-0 rounded-md p-0.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
