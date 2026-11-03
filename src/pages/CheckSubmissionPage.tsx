import React from 'react';
import { ArrowLeft, UploadCloud } from 'lucide-react';
import { SubmissionChecker } from '../components/student/SubmissionChecker';

interface CheckSubmissionPageProps {
  onNavigateHome: () => void;
  onNavigateToSubmit: (rollNumber?: string, studentName?: string) => void;
}

export const CheckSubmissionPage: React.FC<CheckSubmissionPageProps> = ({
  onNavigateHome,
  onNavigateToSubmit,
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
          onClick={() => onNavigateToSubmit()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition touch-manipulation min-h-[36px]"
        >
          <UploadCloud className="w-4 h-4" /> Go to Submit Assignment →
        </button>
      </div>

      {/* Primary Checker Component */}
      <SubmissionChecker
        onResubmitClick={(rollNumber, studentName) => {
          onNavigateToSubmit(rollNumber, studentName);
        }}
      />
    </div>
  );
};
