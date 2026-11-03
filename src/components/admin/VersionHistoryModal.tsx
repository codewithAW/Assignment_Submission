import React from 'react';
import { History, Eye, Download, FileText, Calendar } from 'lucide-react';
import type { Submission } from '../../types';
import { Modal } from '../ui/Modal';
import { formatDate, formatFileSize } from '../../utils/date';
import { VersionBadge } from '../ui/Badge';

interface VersionHistoryModalProps {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
  onViewPdf: (filePath: string, fileName: string) => void;
  onDownloadPdf: (filePath: string, fileName: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  submission,
  isOpen,
  onClose,
  onViewPdf,
  onDownloadPdf,
}) => {
  if (!submission) return null;

  const files = submission.files || [];
  const sortedFiles = [...files].sort((a, b) => b.version - a.version);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
          <History className="w-5 h-5 shrink-0" />
          <span className="truncate max-w-[200px] xs:max-w-xs sm:max-w-md text-sm sm:text-base">
            Version History • {submission.student_name}
          </span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Responsive metadata grid */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 grid grid-cols-1 xs:grid-cols-3 gap-2">
          <div>
            <span className="text-slate-400 block text-[10px]">Roll Number:</span>
            <span className="font-mono text-slate-900 dark:text-white font-bold">{submission.roll_number}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Reference:</span>
            <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{submission.submission_ref}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Total Versions:</span>
            <span className="font-mono text-violet-600 dark:text-violet-400 font-bold">{sortedFiles.length || 1}</span>
          </div>
        </div>

        <div className="space-y-3 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto pr-1">
          {sortedFiles.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              No archived files found for this submission record.
            </div>
          ) : (
            sortedFiles.map((file, index) => {
              const isLatest = index === 0;
              return (
                <div
                  key={file.id || index}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    isLatest
                      ? 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-300 dark:border-sky-500/40 shadow-sm'
                      : 'bg-slate-50/50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-sm">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <VersionBadge version={file.version} />
                          {isLatest && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30">
                              Current
                            </span>
                          )}
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {formatFileSize(file.file_size)}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-200 mt-1 truncate max-w-[200px] xs:max-w-xs sm:max-w-sm">
                          {file.file_name}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formatDate(file.uploaded_at)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => onViewPdf(file.file_path, file.file_name)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm touch-manipulation min-h-[34px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDownloadPdf(file.file_path, file.file_name)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm touch-manipulation min-h-[34px]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
