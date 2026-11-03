import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      {/* Navigation Helpers (HCI Rule: Easy recovery & navigation) */}
      <div className="flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <button
          onClick={onNavigateToCheck}
          className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 underline transition"
        >
          Already submitted? Check your status →
        </button>
      </div>

      {/* Primary Submission Form Component */}
      <SubmissionForm
        prefillRollNumber={prefillRollNumber}
        prefillStudentName={prefillStudentName}
        onScrollToChecker={onNavigateToCheck}
      />

      {/* Security & Policy Note (HCI Rule: Reassurance without clutter) */}
      <div className="p-5 rounded-3xl glossy-card text-xs space-y-2">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-sky-500" /> Security & Versioning Guarantee
        </h4>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 leading-relaxed">
          <li>
            Binary signature <code className="font-mono text-sky-600 dark:text-sky-300">%PDF-</code> is verified to protect the vault against disguised files.
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
