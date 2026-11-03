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
  // Sort versions descending (latest first)
  const sortedFiles = [...files].sort((a, b) => b.version - a.version);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-cyan-400">
          <History className="w-5 h-5" />
          <span>Version History • {submission.student_name}</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
          <div>
            <span className="text-slate-400">Roll Number:</span>{' '}
            <span className="font-mono text-white font-semibold">{submission.roll_number}</span>
          </div>
          <div>
            <span className="text-slate-400">Reference:</span>{' '}
            <span className="font-mono text-cyan-400 font-semibold">{submission.submission_ref}</span>
          </div>
          <div>
            <span className="text-slate-400">Total Versions:</span>{' '}
            <span className="font-mono text-violet-300 font-semibold">{sortedFiles.length || 1}</span>
          </div>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {sortedFiles.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
              No archived files found for this submission record.
            </div>
          ) : (
            sortedFiles.map((file, index) => {
              const isLatest = index === 0;
              return (
                <div
                  key={file.id || index}
                  className={`p-4 rounded-xl border transition-all ${
                    isLatest
                      ? 'bg-cyan-950/20 border-cyan-500/40'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <VersionBadge version={file.version} />
                          {isLatest && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Current / Latest
                            </span>
                          )}
                          <span className="text-xs text-slate-400 font-mono">
                            {formatFileSize(file.file_size)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-200 mt-1 truncate max-w-sm">
                          {file.file_name}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          Uploaded on: {formatDate(file.uploaded_at)}
                        </p>
                      </div>
                    </div>

                    {/* Actions for this version */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => onViewPdf(file.file_path, file.file_name)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDownloadPdf(file.file_path, file.file_name)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
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
