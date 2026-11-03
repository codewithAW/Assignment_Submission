import React from 'react';
import { ArrowLeft, Shield, Search } from 'lucide-react';
import { SubmissionForm } from '../components/student/SubmissionForm';

interface SubmitAssignmentPageProps {
  prefillRollNumber?: string;
  prefillStudentName?: string;
  onNavigateHome: () => void;
  onNavigateToCheck: () => void;
}

export const SubmitAssignmentPage: React.FC<SubmitAssignmentPageProps> = ({
  prefillRollNumber,
  prefillStudentName,
  onNavigateHome,
  onNavigateToCheck,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Navigation Helpers (HCI Rule: Easy recovery & navigation) */}
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition touch-manipulation min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <button
          onClick={onNavigateToCheck}
          className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition touch-manipulation min-h-[36px]"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Already submitted? Check status →</span>
        </button>
      </div>

      {/* Primary Submission Form Component */}
      <SubmissionForm
        prefillRollNumber={prefillRollNumber}
        prefillStudentName={prefillStudentName}
        onScrollToChecker={onNavigateToCheck}
      />

      {/* Security & Policy Note (HCI Rule: Reassurance without clutter) */}
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl glossy-card text-xs space-y-2">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs sm:text-sm">
          <Shield className="w-4 h-4 text-sky-500 shrink-0" /> Security & Versioning Guarantee
        </h4>
        <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px] sm:text-xs">
          <li>
            Binary signature <code className="font-mono text-sky-600 dark:text-sky-300">%PDF-</code> is verified to protect against disguised files.
          </li>
          <li>
            Duplicate submissions while an assignment is active are prevented.
          </li>
          <li>
            If rejected by an instructor, you can upload corrected revisions (<code className="font-mono text-violet-600 dark:text-violet-300">v2, v3</code>) while retaining your history.
          </li>
        </ul>
      </div>
    </div>
  );
};
