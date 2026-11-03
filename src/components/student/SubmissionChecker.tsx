import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowUpRight, 
  Hash, 
  Key, 
  FileCheck,
  RotateCcw
} from 'lucide-react';
import { submissionService } from '../../services/submissionService';
import { normalizeRollNumber, isValidRollNumber } from '../../utils/rollNumber';
import type { CheckSubmissionResult } from '../../types';
import { formatDate } from '../../utils/date';
import { StatusBadge, VersionBadge } from '../ui/Badge';

interface SubmissionCheckerProps {
  onResubmitClick: (rollNumber: string, studentName?: string) => void;
}

export const SubmissionChecker: React.FC<SubmissionCheckerProps> = ({ onResubmitClick }) => {
  const [rollNumber, setRollNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckSubmissionResult | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const normalized = normalizeRollNumber(rollNumber);
    const rollCheck = isValidRollNumber(normalized);
    if (!rollCheck.valid) {
      setError(rollCheck.error || 'Please enter a valid roll number.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await submissionService.checkSubmission(normalized, verificationCode.trim());
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to verify submission status.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="check-section" className="relative">
      <div className="glossy-card rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-9 shadow-xl relative overflow-hidden">
        {/* Header (HCI Rule: Descriptive & Focused) */}
        <div className="pb-5 mb-5 sm:pb-6 sm:mb-6 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <FileCheck className="w-3.5 h-3.5 shrink-0" /> Verification Portal
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Check Your Assignment Submission
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verify the real-time archival and review status of your compiler assignment.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleCheck} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Roll Number Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                Roll Number <span className="text-violet-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. FA21-BCS-042"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  className="glossy-input w-full pl-10 pr-4 py-3 rounded-2xl font-mono text-base sm:text-sm uppercase"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Private Verification Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Verification Code (4-Digit) <span className="text-violet-500">*</span>
                </label>
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">From receipt</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 4829"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.trim())}
                  className="glossy-input w-full pl-10 pr-4 py-3 rounded-2xl font-mono text-base sm:text-sm tracking-wider"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-white text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 min-h-[46px] touch-manipulation ${
              isLoading
                ? 'bg-slate-400 dark:bg-slate-800 text-slate-200 cursor-not-allowed'
                : 'glossy-btn-violet'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Verifying Database Record...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Check Submission Status</span>
              </>
            )}
          </button>
        </form>

        {/* Results Display (HCI Rule: Clear visual states) */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-5 pt-5 sm:mt-6 sm:pt-6 border-t border-slate-200 dark:border-white/10"
            >
              {/* Case 1: NOT SUBMITTED */}
              {(!result.found || result.status === undefined) && (
                <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-sm">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      Your assignment has not been submitted yet.
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                      No active submission record was found for roll number <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{normalizeRollNumber(rollNumber)}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onResubmitClick(normalizeRollNumber(rollNumber))}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md transition touch-manipulation min-h-[40px]"
                  >
                    Go to Submission Page <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Case 2: SUBMITTED (ACCEPTED / PENDING REVIEW) */}
              {result.found && result.status === 'submitted' && (
                <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 relative overflow-hidden space-y-3 sm:space-y-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
                      <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status="submitted" />
                        {result.version && <VersionBadge version={result.version} />}
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                        Your assignment has been submitted successfully.
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-800 dark:text-emerald-200/90 leading-relaxed">
                    Your PDF report is stored in the private archival vault. The course instructor and evaluation staff can review your submission.
                  </p>

                  {/* Submission Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1 text-xs">
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-500/20">
                      <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[11px]">Student Name</span>
                      <span className="font-bold text-slate-900 dark:text-slate-200 text-xs sm:text-sm">{result.student_name}</span>
                    </div>
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-500/20">
                      <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[11px]">Reference ID</span>
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-300 text-xs sm:text-sm">{result.submission_ref}</span>
                    </div>
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-500/20">
                      <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[11px]">Submitted At</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">{formatDate(result.submitted_at)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 3: REJECTED */}
              {result.found && result.status === 'rejected' && (
                <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/50 relative overflow-hidden space-y-3 sm:space-y-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-sm">
                      <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status="rejected" />
                        {result.version && <VersionBadge version={result.version} />}
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                        Your assignment has been rejected by the instructor. Please upload an assignment that fulfills the requirements.
                      </h4>
                    </div>
                  </div>

                  {/* Rejection Details & Reason */}
                  {result.rejection_reason && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-500/30 text-xs sm:text-sm text-rose-900 dark:text-rose-200 space-y-1">
                      <span className="font-bold text-rose-600 dark:text-rose-300 uppercase tracking-wider text-[11px] block">
                        Instructor Feedback:
                      </span>
                      <p className="leading-relaxed italic">
                        "{result.rejection_reason}"
                      </p>
                      {result.rejected_at && (
                        <p className="text-[10px] sm:text-[11px] text-rose-500 dark:text-rose-300/70 pt-1 font-mono">
                          Rejected on: {formatDate(result.rejected_at)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Prominent Submit Again Button (Fitts's Law) */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onResubmitClick(normalizeRollNumber(rollNumber), result.student_name)}
                      className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] min-h-[46px] touch-manipulation"
                    >
                      <RotateCcw className="w-4 h-4 shrink-0" />
                      <span>Submit Again (Upload Corrected Assignment)</span>
                    </button>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      Clicking will pre-fill your roll number on the submission form. Previous versions are retained.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
