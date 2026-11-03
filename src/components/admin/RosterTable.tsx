import React from 'react';
import type { StudentRosterItem, Submission } from '../../types';
import { StatusBadge } from '../ui/Badge';

interface RosterTableProps {
  roster: StudentRosterItem[];
  submissions: Submission[];
}

export const RosterTable: React.FC<RosterTableProps> = ({ roster, submissions }) => {
  // Map roster items with current submission status
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
    <div className="glass-card rounded-2xl border border-slate-700/60 overflow-hidden shadow-2xl">
      <div className="p-4 sm:p-5 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <span>CS421 Official Course Roster</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              {roster.length} Enrolled
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Instructor list of registered students for Compiler Construction.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-300 font-mono">
            {unsubmittedCount} Not Yet Submitted
          </span>
          <span className="px-3 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-mono">
            {roster.length - unsubmittedCount} Submitted
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 border-b border-slate-800 uppercase tracking-wider text-slate-400 font-semibold font-mono">
            <tr>
              <th className="py-3.5 px-5">Student Name</th>
              <th className="py-3.5 px-5">Roll Number</th>
              <th className="py-3.5 px-5">Email</th>
              <th className="py-3.5 px-5">Submission Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {enrichedRoster.map((item) => (
              <tr key={item.roll_number} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-5 font-semibold text-slate-100">
                  {item.student_name}
                </td>
                <td className="py-3.5 px-5 font-mono text-cyan-400">
                  {item.roll_number}
                </td>
                <td className="py-3.5 px-5 text-slate-400 font-mono">
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
    </div>
  );
};
