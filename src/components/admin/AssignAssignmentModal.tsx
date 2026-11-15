import React, { useState, useMemo } from 'react';
import {
  BookPlus,
  Calendar,
  Database,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { submissionService } from '../../services/submissionService';
import { subjectNameToTableName } from '../../utils/security';
import { toDateTimeLocalInput } from '../../utils/date';
import type { SubjectAssignment } from '../../types';
import multiSubjectSql from '../../../supabase/multi_subject_setup.sql?raw';

interface AssignAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentCreated: (created: SubjectAssignment) => void;
}

function getDefaultDeadlineInput(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  d.setHours(23, 59, 0, 0);
  return toDateTimeLocalInput(d.toISOString());
}

export const AssignAssignmentModal: React.FC<AssignAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssignmentCreated,
}) => {
  const [subjectName, setSubjectName] = useState('');
  const [deadline, setDeadline] = useState(getDefaultDeadlineInput);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSqlSetup, setNeedsSqlSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const previewTableName = useMemo(() => subjectNameToTableName(subjectName), [subjectName]);

  const handleClose = () => {
    if (isSubmitting) return;
    setError(null);
    setNeedsSqlSetup(false);
    onClose();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(multiSubjectSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsSqlSetup(false);
    setIsSubmitting(true);

    try {
      const created = await submissionService.createSubjectAssignment(subjectName, deadline);
      setSubjectName('');
      setDeadline(getDefaultDeadlineInput());
      onAssignmentCreated(created);
      onClose();
    } catch (err: any) {
      if (err?.code === 'MIGRATION_REQUIRED') {
        setNeedsSqlSetup(true);
      }
      setError(err?.message || 'Failed to assign new subject assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
          <BookPlus className="w-5 h-5 shrink-0" />
          <span>Assign New Assignment</span>
        </div>
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-500/30 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <span>
            Creating a new assignment automatically generates a dedicated PostgreSQL table in Supabase named after the subject, registers its deadline, and publishes it to the Student Portal.
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200 text-xs space-y-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>

            {needsSqlSetup && (
              <div className="pt-2 border-t border-rose-200 dark:border-rose-500/30 space-y-2">
                <p className="font-bold text-[11px] uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" /> One-Time Supabase SQL Setup Required
                </p>
                <p className="text-[11px] leading-relaxed">
                  Paste &amp; run <code className="font-mono font-semibold">supabase/multi_subject_setup.sql</code> inside your Supabase Dashboard → SQL Editor, then click Create again.
                </p>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'SQL Migration Copied!' : 'Copy Multi-Subject SQL Script'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Subject Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Subject Name <span className="text-sky-500">*</span>
          </label>
          <input
            type="text"
            required
            minLength={2}
            maxLength={100}
            placeholder="e.g. Operating Systems, Computer Networks, Database Systems"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            disabled={isSubmitting}
            className="glossy-input w-full px-4 py-3 rounded-2xl text-base sm:text-sm"
          />
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Supabase Table:</span>
            <code className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-300 font-semibold">
              public.{previewTableName || 'subject_name'}
            </code>
          </div>
        </div>

        {/* Assignment Deadline */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Submission Deadline <span className="text-sky-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isSubmitting}
              className="glossy-input w-full pl-10 pr-4 py-3 rounded-2xl text-base sm:text-sm font-mono"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !subjectName.trim() || !deadline}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white transition flex items-center justify-center gap-1.5 min-h-[40px] ${
              isSubmitting || !subjectName.trim() || !deadline
                ? 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed'
                : 'glossy-btn-primary'
            }`}
          >
            <BookPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating Supabase Table...' : 'Create Assignment & Table'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
