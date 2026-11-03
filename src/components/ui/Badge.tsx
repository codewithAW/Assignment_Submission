import React from 'react';
import type { SubmissionStatus } from '../../types';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface BadgeProps {
  status: SubmissionStatus | 'unsubmitted' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm font-medium';

  if (status === 'submitted') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 ${sizeClasses}`}
      >
        <CheckCircle2 className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
        Submitted
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-500/10 text-rose-400 border border-rose-500/25 ${sizeClasses}`}
      >
        <XCircle className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
        Rejected
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-500/10 text-slate-400 border border-slate-500/25 ${sizeClasses}`}
    >
      <Clock className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
      Not Submitted
    </span>
  );
};

export const VersionBadge: React.FC<{ version: number }> = ({ version }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
      v{version}
    </span>
  );
};
