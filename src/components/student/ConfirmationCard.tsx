import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Copy, Check, Calendar, Hash, User, ExternalLink, AlertTriangle, KeyRound } from 'lucide-react';
import type { SubmitAssignmentResponse } from '../../types';
import { formatDate } from '../../utils/date';

interface ConfirmationCardProps {
  data: SubmitAssignmentResponse & {
    student_name: string;
    roll_number: string;
    live_website_url?: string;
  };
  onClose: () => void;
  onScrollToChecker?: () => void;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  data,
  onClose,
  onScrollToChecker,
}) => {
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyToClipboard = (text: string, type: 'ref' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'ref') {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with animated icon */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/20"
        >
          <CheckCircle2 className="w-8 h-8" />
        </motion.div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {data.is_resubmission ? 'Resubmission Received' : 'Assignment Submitted!'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          {data.is_resubmission
            ? `Your corrected assignment (Version ${data.version}) has been recorded.`
            : 'Your assignment PDF has been safely stored in the private archival vault.'}
        </p>
      </div>

      {/* Primary Reference & Easy Verification Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Submission Ref */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            Submission Reference
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-base sm:text-lg font-bold text-sky-600 dark:text-sky-400 tracking-wide">
              {data.submission_ref}
            </span>
            <button
              onClick={() => copyToClipboard(data.submission_ref || '', 'ref')}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              title="Copy Reference"
            >
              {copiedRef ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Easy 4-Digit Verification Code */}
        <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-500/60 relative shadow-md">
          <span className="text-[11px] font-extrabold text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <KeyRound className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            Your Verification Code
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-2xl font-black text-rose-600 dark:text-rose-400 tracking-widest">
              {data.verification_code}
            </span>
            <button
              onClick={() => copyToClipboard(data.verification_code || '', 'code')}
              className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition flex items-center gap-1"
              title="Copy 4-Digit Verification Code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Red Warning Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-500/80 shadow-lg shadow-rose-500/10 text-rose-950 dark:text-rose-100 space-y-2">
        <div className="flex items-center gap-2 font-black text-rose-600 dark:text-rose-400 text-sm tracking-wide uppercase">
          <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
          <span>Important Warning — Save This Code Now!</span>
        </div>
        <p className="text-xs sm:text-sm font-semibold leading-relaxed text-rose-900 dark:text-rose-200">
          You <strong className="underline decoration-rose-500 decoration-2">MUST save your 4-digit verification code ({data.verification_code})</strong> with you. 
          You will need this code along with your roll number to view your assignment submission status, check instructor grading comments, or submit a corrected version if required.
        </p>
        <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium pt-0.5">
          Take a screenshot or write it down. Without this code, you will not be able to access your submission status.
        </p>
      </div>

      {/* Metadata list */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs sm:text-sm">
        <div className="py-2.5 flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <User className="w-4 h-4" /> Student Name
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-200">{data.student_name}</span>
        </div>
        <div className="py-2.5 flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Hash className="w-4 h-4" /> Roll Number
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{data.roll_number}</span>
        </div>
        <div className="py-2.5 flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Submission Time
          </span>
          <span className="font-mono text-slate-600 dark:text-slate-300">{formatDate(data.submitted_at)}</span>
        </div>
        {data.live_website_url && (
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Live Demo URL
            </span>
            <a
              href={data.live_website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 hover:underline max-w-[200px] truncate"
            >
              {data.live_website_url}
            </a>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            onScrollToChecker?.();
          }}
          className="glossy-btn-primary flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition shadow-md"
        >
          Check Submission Status →
        </button>
        <button
          type="button"
          onClick={onClose}
          className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
