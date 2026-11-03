import React from 'react';
import type { StudentRosterItem, Submission } from '../../types';
import { StatusBadge } from '../ui/Badge';
import { Hash } from 'lucide-react';

interface RosterTableProps {
  roster: StudentRosterItem[];
  submissions: Submission[];
}

export const RosterTable: React.FC<RosterTableProps> = ({ roster, submissions }) => {
  const enrichedRoster = roster.map(student => {
    const sub = submissions.find(s => s.roll_number === student.roll_number);
    return {
      ...student,
      has_submitted: !!sub,
      status: sub ? sub.status : 'unsubmitted',
      submission_ref: sub?.submission_ref,
    };
  });

  const unsubmittedCount = enrichedRoster.filter(r => !r.has_submitted).length;

  return (
    <div className="glossy-card rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
            <span>CS421 Course Roster</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {roster.length} Enrolled
            </span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official class roster for Compiler Construction.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
          <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-mono font-semibold">
            {unsubmittedCount} Pending
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono font-semibold">
            {roster.length - unsubmittedCount} Submitted
          </span>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold font-mono">
            <tr>
              <th className="py-3.5 px-5">Student Name</th>
              <th className="py-3.5 px-5">Roll Number</th>
              <th className="py-3.5 px-5">Email</th>
              <th className="py-3.5 px-5">Submission Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {enrichedRoster.map((item) => (
              <tr key={item.roll_number} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-100">
                  {item.student_name}
                </td>
                <td className="py-3.5 px-5 font-mono text-sky-600 dark:text-sky-400 font-semibold">
                  {item.roll_number}
                </td>
                <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 font-mono">
                  {item.email || '—'}
                </td>
                <td className="py-3.5 px-5">
                  <StatusBadge status={item.status} size="sm" />
                  {item.submission_ref && (
                    <span className="ml-2 font-mono text-[11px] text-slate-400">
                      ({item.submission_ref})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (HCI Best Practice for Small Screens) */}
      <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {enrichedRoster.map((item) => (
          <div key={item.roll_number} className="p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.student_name}</h4>
                <div className="flex items-center gap-1 font-mono text-sky-600 dark:text-sky-400 text-xs mt-0.5">
                  <Hash className="w-3 h-3 text-sky-500 shrink-0" />
                  <span>{item.roll_number}</span>
                </div>
              </div>
              <StatusBadge status={item.status} size="sm" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
              <span className="truncate max-w-[200px]">{item.email || 'No email recorded'}</span>
              {item.submission_ref && (
                <span className="text-sky-600 dark:text-sky-400 font-semibold shrink-0">
                  Ref: {item.submission_ref}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
