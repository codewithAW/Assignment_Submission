import React, { useState } from 'react';
import {
  Pencil,
  Calendar,
  Database,
  HardDrive,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Copy,
  Check,
  Terminal,
  Save,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { submissionService } from '../../services/submissionService';
import type { SubjectAssignment } from '../../types';
import { toDateTimeLocalInput } from '../../utils/date';
import { subjectNameToTableName } from '../../utils/security';
import editDeleteSql from '../../../supabase/edit_delete_assignment_setup.sql?raw';

interface EditAssignmentModalProps {
  subject: SubjectAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignmentUpdated: (updated: SubjectAssignment) => Promise<void> | void;
  onAssignmentDeleted: (deletedTableName: string, deletedSubjectName: string) => Promise<void> | void;
}

interface EditAssignmentFormBodyProps {
  subject: SubjectAssignment;
  onClose: () => void;
  onAssignmentUpdated: (updated: SubjectAssignment) => Promise<void> | void;
  onAssignmentDeleted: (deletedTableName: string, deletedSubjectName: string) => Promise<void> | void;
}

const EditAssignmentFormBody: React.FC<EditAssignmentFormBodyProps> = ({
  subject,
  onClose,
  onAssignmentUpdated,
  onAssignmentDeleted,
}) => {
  const [subjectName, setSubjectName] = useState(subject.subject_name);
  const [deadline, setDeadline] = useState(() => toDateTimeLocalInput(subject.deadline));
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSqlSetup, setNeedsSqlSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const isBusy = isSaving || isDeleting;
  const targetTableName = subjectNameToTableName(subjectName) || subject.table_name;
  const willRenameTable = targetTableName !== subject.table_name;

  const handleCopySql = () => {
    navigator.clipboard.writeText(editDeleteSql);
    setCopiedSql(true);
    window.setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setError(null);
    setNeedsSqlSetup(false);
    setIsSaving(true);

    try {
      const updated = await submissionService.updateSubjectAssignment(
        subject.table_name,
        subjectName,
        deadline
      );
      await onAssignmentUpdated(updated);
      onClose();
    } catch (err: any) {
      if (err?.code === 'MIGRATION_REQUIRED') {
        setNeedsSqlSetup(true);
      }
      setError(err?.message || 'Failed to update assignment details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (isBusy) return;
    setError(null);
    setNeedsSqlSetup(false);
    setIsDeleting(true);

    try {
      const result = await submissionService.deleteSubjectAssignment(subject.table_name);
      await onAssignmentDeleted(result.table_name, result.subject_name);
      onClose();
    } catch (err: any) {
      if (err?.code === 'MIGRATION_REQUIRED') {
        setNeedsSqlSetup(true);
      }
      setError(err?.message || 'Failed to delete assignment.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
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
                Paste &amp; run <code className="font-mono font-semibold">supabase/edit_delete_assignment_setup.sql</code> inside Supabase Dashboard &rarr; SQL Editor, then try again.
              </p>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition touch-manipulation min-h-[36px]"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'SQL Script Copied!' : 'Copy Edit & Delete SQL Script'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Assignment / Subject Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Assignment Name <span className="text-sky-500">*</span>
          </label>
          <input
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            disabled={isBusy}
            placeholder="e.g. Compiler Construction"
            className="glossy-input w-full px-4 py-3 rounded-2xl text-base sm:text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Table:</span>
              <code className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-300 font-semibold">
                public.{targetTableName}
              </code>
              {willRenameTable && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  (renames from public.{subject.table_name})
                </span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Bucket:</span>
              <code className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 font-semibold">
                {subject.storage_bucket || 'assignments'}
              </code>
            </span>
          </div>
        </div>

        {/* Submission Deadline */}
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
              disabled={isBusy}
              className="glossy-input w-full pl-10 pr-4 py-3 rounded-2xl text-base sm:text-sm font-mono"
            />
          </div>
        </div>

        {/* Save Changes Row */}
        <div className="flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition touch-manipulation min-h-[42px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isBusy || subjectName.trim().length < 2 || !deadline}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white transition flex items-center justify-center gap-1.5 touch-manipulation min-h-[42px] ${
              isBusy || subjectName.trim().length < 2 || !deadline
                ? 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed'
                : 'glossy-btn-primary'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Delete Assignment Button + Explicit Confirmation Warning */}
      <div className="pt-4 border-t border-slate-200 dark:border-white/10">
        {!confirmingDelete ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-500/30">
            <div className="text-xs text-rose-900 dark:text-rose-200">
              <p className="font-bold">Danger Zone</p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Permanently remove this assignment and all of its stored submissions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirmingDelete(true);
              }}
              disabled={isBusy}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition touch-manipulation min-h-[42px] shrink-0 disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Delete Assignment</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-400 dark:border-rose-500/70 space-y-3 shadow-sm">
            <div className="flex items-start gap-2.5 text-rose-900 dark:text-rose-100">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-extrabold text-sm text-rose-700 dark:text-rose-300">
                  Warning: Delete &ldquo;{subject.subject_name}&rdquo;?
                </p>
                <p className="leading-relaxed text-rose-800 dark:text-rose-200">
                  Are you sure? This will permanently delete this assignment, remove it from both the Admin and Student portals, and drop its Supabase records (<code className="font-mono font-bold">public.{subject.table_name}</code>). This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs transition touch-manipulation min-h-[40px]"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-md transition touch-manipulation min-h-[40px] disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>{isDeleting ? 'Deleting Assignment...' : 'Yes, Delete Assignment'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  subject,
  isOpen,
  onClose,
  onAssignmentUpdated,
  onAssignmentDeleted,
}) => {
  return (
    <Modal
      isOpen={isOpen && Boolean(subject)}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
          <Pencil className="w-5 h-5 shrink-0" />
          <span>Edit Assignment</span>
        </div>
      }
    >
      {subject && (
        <EditAssignmentFormBody
          key={`${subject.table_name}-${subject.subject_name}-${subject.deadline}`}
          subject={subject}
          onClose={onClose}
          onAssignmentUpdated={onAssignmentUpdated}
          onAssignmentDeleted={onAssignmentDeleted}
        />
      )}
    </Modal>
  );
};
