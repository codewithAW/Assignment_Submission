import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
            error: <XCircle className="w-5 h-5 text-rose-500 shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
            info: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
          };

          const styles = {
            success: 'border-emerald-300 dark:border-emerald-500/30 bg-white/95 dark:bg-emerald-950/85 text-slate-900 dark:text-emerald-100',
            error: 'border-rose-300 dark:border-rose-500/30 bg-white/95 dark:bg-rose-950/85 text-slate-900 dark:text-rose-100',
            warning: 'border-amber-300 dark:border-amber-500/30 bg-white/95 dark:bg-amber-950/85 text-slate-900 dark:text-amber-100',
            info: 'border-sky-300 dark:border-sky-500/30 bg-white/95 dark:bg-sky-950/85 text-slate-900 dark:text-sky-100',
          };

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-xl shadow-xl flex items-start gap-3 ${styles[toast.type]}`}
            >
              {icons[toast.type]}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight text-slate-900 dark:text-white">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed break-words">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
