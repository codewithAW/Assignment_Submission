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
          onClick={onNavigateToCheck}
          className="text-xs font-medium text-violet-400 hover:text-violet-300 underline transition"
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

      {/* Helpful Submission Guidelines */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 text-xs text-slate-400 space-y-2">
        <h4 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-cyan-400" /> Security & Resubmission Policy
        </h4>
        <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
          <li>
            Only authentic PDF documents containing binary signature <code className="text-cyan-300 font-mono">%PDF-</code> are accepted.
          </li>
          <li>
            Accidental duplicate submissions while your assignment is active are strictly blocked to protect student grades.
          </li>
          <li>
            If your instructor rejects your submission, you may return to this page to upload a corrected version (<code className="text-violet-300 font-mono">v2</code>, <code className="text-violet-300 font-mono">v3</code>). All versions remain archived in the database.
          </li>
        </ul>
      </div>
    </div>
  );
};
