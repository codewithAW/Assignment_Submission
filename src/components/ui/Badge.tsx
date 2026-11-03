import React from 'react';
import type { SubmissionStatus } from '../../types';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface BadgeProps {
  status: SubmissionStatus | 'unsubmitted' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm font-semibold';

  if (status === 'submitted') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 shadow-sm ${sizeClasses}`}
      >
        <CheckCircle2 className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
        Submitted
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-rose-100 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30 shadow-sm ${sizeClasses}`}
      >
        <XCircle className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
        Rejected
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-500/30 shadow-sm ${sizeClasses}`}
    >
      <Clock className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
      Not Submitted
    </span>
  );
};

export const VersionBadge: React.FC<{ version: number }> = ({ version }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30">
      v{version}
    </span>
  );
};
