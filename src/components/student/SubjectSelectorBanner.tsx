import React, { useState, useEffect } from 'react';
import { AlertTriangle, BookOpen, Calendar, Clock } from 'lucide-react';
import type { SubjectAssignment } from '../../types';
import { formatDate } from '../../utils/date';

interface SubjectSelectorBannerProps {
  subjects: SubjectAssignment[];
  selectedTable: string;
  onSelectSubject: (tableName: string) => void;
  showYellowWarning?: boolean;
  label?: string;
  disabled?: boolean;
}

export const SubjectSelectorBanner: React.FC<SubjectSelectorBannerProps> = ({
  subjects,
  selectedTable,
  onSelectSubject,
  showYellowWarning = true,
  label = 'Select Subject',
  disabled = false,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const activeSubject =
    subjects.find((s) => s.table_name === selectedTable) || subjects[0];

  const isDeadlineValid = Boolean(activeSubject?.deadline);
  const isPastDeadline = isDeadlineValid
    ? new Date(activeSubject.deadline).getTime() < nowMs
    : false;

  return (
    <div
      className="space-y-2.5 sm:space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      {showYellowWarning && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/95 dark:bg-amber-950/45 border border-amber-300 dark:border-amber-500/50 text-amber-950 dark:text-amber-100 flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] sm:text-xs leading-relaxed">
            <span className="font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-300 block mb-0.5">
              Subject Warning • Select Before Submission
            </span>
            <span>
              Please choose the correct <strong>Subject</strong> below before submitting your assignment. Submissions are saved inside that subject&apos;s dedicated database table.
            </span>
          </div>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
          <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>{label}</span>
          </label>
          {activeSubject && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border ${
                isPastDeadline
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/40'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
              }`}
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>{isPastDeadline ? 'Deadline Passed' : 'Open for Submission'}</span>
            </span>
          )}
        </div>

        <select
          value={activeSubject?.table_name || ''}
          onChange={(e) => onSelectSubject(e.target.value)}
          disabled={disabled}
          aria-label={label}
          className="glossy-input w-full px-3.5 py-2.5 sm:py-3 rounded-2xl text-base sm:text-sm font-semibold cursor-pointer min-h-[44px]"
        >
          {subjects.map((sub) => (
            <option key={sub.table_name} value={sub.table_name}>
              {sub.subject_name}
            </option>
          ))}
        </select>

        {activeSubject && isDeadlineValid && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Deadline: {formatDate(activeSubject.deadline)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
