import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Copy, Check, ShieldCheck, Calendar, Hash, User, ExternalLink } from 'lucide-react';
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
          className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20"
        >
          <CheckCircle2 className="w-8 h-8" />
        </motion.div>
        <h3 className="text-2xl font-bold text-white tracking-tight">
          {data.is_resubmission ? 'Resubmission Received' : 'Assignment Submitted!'}
        </h3>
        <p className="text-sm text-slate-300">
          {data.is_resubmission
            ? `Your corrected assignment (Version ${data.version}) has been recorded.`
            : 'Your assignment PDF has been safely stored in the private archival vault.'}
        </p>
      </div>

      {/* Primary Reference & Verification Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Submission Ref */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 relative group">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Submission Reference
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-base sm:text-lg font-bold text-cyan-400 tracking-wide">
              {data.submission_ref}
            </span>
            <button
              onClick={() => copyToClipboard(data.submission_ref || '', 'ref')}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Copy Reference"
            >
              {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Private Verification Code */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-violet-500/40 relative group">
          <span className="text-xs font-medium text-violet-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
            Private Verification Code
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-base sm:text-lg font-bold text-violet-300 tracking-wider">
              {data.verification_code}
            </span>
            <button
              onClick={() => copyToClipboard(data.verification_code || '', 'code')}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Copy Verification Code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Notice on Verification Code */}
      <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/20 text-xs text-violet-200/90 leading-relaxed">
        <strong className="text-violet-300 font-semibold block mb-0.5">Important Security Notice:</strong>
        Please copy your <strong>Private Verification Code</strong>. You will need your Roll Number and this code to check your grading status or resubmit if requested.
      </div>

      {/* Metadata list */}
      <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-900/40 border border-slate-800 px-4 py-2 text-xs sm:text-sm">
        <div className="py-2.5 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" /> Student Name
          </span>
          <span className="font-medium text-slate-200">{data.student_name}</span>
        </div>
        <div className="py-2.5 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-2">
            <Hash className="w-4 h-4 text-slate-500" /> Roll Number
          </span>
          <span className="font-mono font-medium text-slate-200">{data.roll_number}</span>
        </div>
        <div className="py-2.5 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" /> Submission Time
          </span>
          <span className="font-mono text-slate-300">{formatDate(data.submitted_at)}</span>
        </div>
        {data.live_website_url && (
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-slate-500" /> Live Demo URL
            </span>
            <a
              href={data.live_website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline max-w-[200px] truncate"
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
          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
        >
          Check Submission Status
        </button>
        <button
          type="button"
          onClick={onClose}
          className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
        >
          Done
        </button>
      </div>
    </div>
  );
};
