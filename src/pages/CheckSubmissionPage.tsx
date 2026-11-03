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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb / Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <button
          onClick={() => onNavigateToSubmit()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 underline transition"
        >
          <UploadCloud className="w-4 h-4" /> Go to Submit Assignment
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
