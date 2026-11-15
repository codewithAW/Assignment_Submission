import React, { useEffect, useState } from 'react';
import {
  Ban,
  Timer,
  RotateCcw,
  Terminal,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { SubjectAssignment } from '../../types';
import { submissionService } from '../../services/submissionService';
import { Modal } from '../ui/Modal';
import {
  isSubjectClosed,
  getRemainingCloseMs,
  isSubjectHiddenFromSubmit,
  formatCountdownHms,
} from '../../utils/subjectStatus';
import closeAssignmentSql from '../../../supabase/close_assignment_setup.sql?raw';

interface SubjectCloseControlsProps {
  subject: SubjectAssignment;
  onSubjectUpdated: (updated: SubjectAssignment) => Promise<void> | void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

/**
 * Admin controls for closing an active assignment (with a live 24h countdown inside the button)
 * and reverting it back to open for students.
 */
export const SubjectCloseControls: React.FC<SubjectCloseControlsProps> = ({
  subject,
  onSubjectUpdated,
  onNotify,
}) => {
  const closed = isSubjectClosed(subject);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [busyAction, setBusyAction] = useState<'close' | 'revert' | null>(null);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Tick every second while close toggle is active
  useEffect(() => {
    if (!closed) return;

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [closed, subject.closed_at]);

  const remainingMs = getRemainingCloseMs(subject, nowMs);
  const hiddenAfter24h = isSubjectHiddenFromSubmit(subject, nowMs);
  const countdownText = formatCountdownHms(remainingMs);

  const handleCloseAssignment = async () => {
    if (busyAction) return;
    setBusyAction('close');
    try {
      const updated = await submissionService.closeSubjectAssignment(subject.table_name);
      setNowMs(Date.now());
      await onSubjectUpdated(updated);
      onNotify(
        'success',
        `Closed "${subject.subject_name}"`,
        'Students now see "Assignment deadline passed" and it will hide from Submit after 24h.'
      );
    } catch (err: any) {
      if (err?.code === 'MIGRATION_REQUIRED') {
        setSqlModalOpen(true);
      } else {
        onNotify('error', 'Failed to close assignment', err?.message);
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleRevertAssignment = async () => {
    if (busyAction) return;
    setBusyAction('revert');
    try {
      const updated = await submissionService.revertSubjectAssignment(subject.table_name);
      await onSubjectUpdated(updated);
      onNotify(
        'success',
        `Reverted "${subject.subject_name}"`,
        'Assignment submissions are available for students again.'
      );
    } catch (err: any) {
      if (err?.code === 'MIGRATION_REQUIRED') {
        setSqlModalOpen(true);
      } else {
        onNotify('error', 'Failed to revert assignment', err?.message);
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(closeAssignmentSql);
    setCopiedSql(true);
    window.setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <>
      {!closed ? (
        <button
          type="button"
          onClick={handleCloseAssignment}
          disabled={busyAction !== null}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-sm min-h-[42px] touch-manipulation shrink-0 transition disabled:opacity-60"
          title="Close submissions for this assignment (students see deadline passed, auto-hides after 24 hours)"
        >
          <Ban className="w-4 h-4 shrink-0" />
          <span>{busyAction === 'close' ? 'Closing...' : 'Close Assignment'}</span>
        </button>
      ) : (
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 w-full sm:w-auto shrink-0">
          {/* Active Close Assignment Status Button with Live Ticking 24h Timer Inside */}
          <button
            type="button"
            onClick={() =>
              onNotify(
                'info',
                hiddenAfter24h
                  ? `"${subject.subject_name}" hidden from Submit`
                  : `"${subject.subject_name}" is closed`,
                hiddenAfter24h
                  ? '24 hours elapsed. Click Revert to make this assignment available again.'
                  : `Option will disappear from Student Submit Select Subject in ${countdownText}.`
              )
            }
            className="w-full xs:w-auto px-3.5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-md min-h-[42px] touch-manipulation transition"
            title="Live 24-hour countdown until this assignment is removed from student submission dropdown"
          >
            <Timer className="w-4 h-4 shrink-0 animate-pulse" />
            <span className="whitespace-nowrap">
              {hiddenAfter24h ? 'Closed • Hidden' : 'Closed'}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-black/25 font-mono text-[11px] sm:text-xs font-extrabold tabular-nums tracking-wide">
              {countdownText}
            </span>
          </button>

          {/* Revert Button to Immediately Restore Assignment Availability */}
          <button
            type="button"
            onClick={handleRevertAssignment}
            disabled={busyAction !== null}
            className="w-full xs:w-auto px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 shadow-md min-h-[42px] touch-manipulation transition disabled:opacity-60"
            title="Reopen assignment so students can select and submit immediately"
          >
            <RotateCcw className={`w-4 h-4 shrink-0 ${busyAction === 'revert' ? 'animate-spin' : ''}`} />
            <span>{busyAction === 'revert' ? 'Reverting...' : 'Revert'}</span>
          </button>
        </div>
      )}

      {/* One-Click SQL Setup Modal if close_assignment_setup.sql hasn't been executed yet */}
      <Modal
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Terminal className="w-5 h-5 shrink-0" />
            <span>One-Time Supabase SQL Setup Required</span>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              To enable Close Assignment, live 24-hour timers, Revert, Edit, and Delete assignment actions in Supabase, paste &amp; run <code className="font-mono font-bold">supabase/close_assignment_setup.sql</code> once in Supabase Dashboard &rarr; SQL Editor.
            </span>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCopySql}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition touch-manipulation min-h-[38px]"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied SQL Script!' : 'Copy SQL Script'}</span>
            </button>
          </div>

          <pre className="p-3 rounded-xl bg-slate-950 text-amber-200 font-mono text-[11px] leading-relaxed max-h-56 overflow-auto border border-slate-800">
            {closeAssignmentSql}
          </pre>
        </div>
      </Modal>
    </>
  );
};
