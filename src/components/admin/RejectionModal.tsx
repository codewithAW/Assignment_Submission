import React, { useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import type { Submission } from '../../types';
import { Modal } from '../ui/Modal';

interface RejectionModalProps {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (submissionId: string, reason: string) => Promise<void>;
}

export const RejectionModal: React.FC<RejectionModalProps> = ({
  submission,
  isOpen,
  onClose,
  onConfirmReject,
}) => {
  const [reason, setReason] = useState(
    'Assignment does not meet the specified requirements. Please review the rubric and upload a corrected version.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!submission) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirmReject(submission.id, reason.trim());
      onClose();
    } catch (err) {
      console.error('Failed to reject submission:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <span>Confirm Assignment Rejection</span>
        </div>
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs sm:text-sm leading-relaxed">
          You are about to reject the assignment for{' '}
          <strong className="text-white">{submission.student_name}</strong> (Roll No:{' '}
          <span className="font-mono text-cyan-300">{submission.roll_number}</span>).
          <br />
          This will update the database status to <strong>rejected</strong>, notify the student via their submission checker, and enable them to upload a corrected version.
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Rejection Feedback / Instructor Notes <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Specify missing sections, syntax bugs, or formatting errors..."
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm leading-relaxed transition"
            disabled={isSubmitting}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            This reason will be visible when the student enters their roll number in the checker.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs transition shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <span>Rejecting...</span>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Confirm & Reject Assignment</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
