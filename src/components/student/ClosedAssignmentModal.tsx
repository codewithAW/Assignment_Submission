import React from 'react';
import { Clock, AlertTriangle, ArrowRightLeft, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { SubjectAssignment } from '../../types';
import { formatDate } from '../../utils/date';
import { formatCountdownHms, getRemainingCloseMs } from '../../utils/subjectStatus';

interface ClosedAssignmentModalProps {
  isOpen: boolean;
  subject: SubjectAssignment | null;
  hasOtherOpenSubjects?: boolean;
  onClose: () => void;
  onChooseAnotherSubject?: () => void;
  onCheckStatus?: () => void;
}

/**
 * Reusable popup shown whenever a student clicks to submit an assignment whose close toggle is active.
 */
export const ClosedAssignmentModal: React.FC<ClosedAssignmentModalProps> = ({
  isOpen,
  subject,
  hasOtherOpenSubjects = false,
  onClose,
  onChooseAnotherSubject,
  onCheckStatus,
}) => {
  const remainingMs = getRemainingCloseMs(subject);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <span>Assignment Deadline Passed</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 space-y-2">
          <p className="text-sm sm:text-base font-bold text-rose-900 dark:text-rose-200">
            Assignment deadline passed
          </p>
          <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300 leading-relaxed">
            {subject ? (
              <>
                Submissions for <strong className="font-bold">{subject.subject_name}</strong> have been
                closed by the instructor and are no longer being accepted.
              </>
            ) : (
              'Submissions for this assignment have been closed by the instructor.'
            )}
          </p>
        </div>

        {subject && (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 p-3.5 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Subject</span>
              <span className="font-semibold text-slate-900 dark:text-white text-right">
                {subject.subject_name}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Scheduled Deadline</span>
              <span className="font-mono text-right">{formatDate(subject.deadline)}</span>
            </div>
            {remainingMs > 0 && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-white/10 text-amber-700 dark:text-amber-300">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Option removes in
                </span>
                <span className="font-mono font-bold tabular-nums">{formatCountdownHms(remainingMs)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
          {onCheckStatus && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCheckStatus();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition touch-manipulation min-h-[42px]"
            >
              <Search className="w-4 h-4" />
              <span>Check Existing Submission</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              onChooseAnotherSubject?.();
            }}
            className="glossy-btn-primary w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-md touch-manipulation min-h-[42px]"
          >
            {hasOtherOpenSubjects ? (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                <span>Choose Another Subject</span>
              </>
            ) : (
              <span>OK, Got It</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
