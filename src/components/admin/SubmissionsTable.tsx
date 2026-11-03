import React from 'react';
import { 
  Eye, 
  Download, 
  ExternalLink, 
  XCircle, 
  History, 
  FileText, 
  Hash, 
  Globe,
  Clock
} from 'lucide-react';
import type { Submission } from '../../types';
import { formatDate } from '../../utils/date';
import { StatusBadge, VersionBadge } from '../ui/Badge';

interface SubmissionsTableProps {
  submissions: Submission[];
  onViewPdf: (filePath: string, fileName: string) => void;
  onDownloadPdf: (filePath: string, fileName: string) => void;
  onOpenRejectModal: (submission: Submission) => void;
  onOpenVersionModal: (submission: Submission) => void;
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
  submissions,
  onViewPdf,
  onDownloadPdf,
  onOpenRejectModal,
  onOpenVersionModal,
}) => {
  if (submissions.length === 0) {
    return (
      <div className="py-14 sm:py-16 text-center text-slate-500 dark:text-slate-400 glossy-card rounded-2xl sm:rounded-3xl px-4">
        <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
        <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-300">No submissions found</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
          No records match the current filter criteria or no assignments have been submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div className="glossy-card rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold font-mono">
            <tr>
              <th className="py-4 px-5">Student / Roll No</th>
              <th className="py-4 px-5">Assignment PDF</th>
              <th className="py-4 px-5">Live Demo</th>
              <th className="py-4 px-5">Submitted At</th>
              <th className="py-4 px-5">Status</th>
              <th className="py-4 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {submissions.map((sub) => {
              const latestFile = sub.files && sub.files.length > 0 
                ? [...sub.files].sort((a, b) => b.version - a.version)[0] 
                : null;
              const hasMultipleVersions = (sub.files?.length || 0) > 1;

              return (
                <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Student & Roll */}
                  <td className="py-4 px-5">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{sub.student_name}</div>
                    <div className="font-mono text-sky-600 dark:text-sky-400 mt-0.5 text-xs flex items-center gap-1.5 font-semibold">
                      <Hash className="w-3 h-3 text-sky-500" />
                      {sub.roll_number}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                      Ref: {sub.submission_ref}
                    </div>
                  </td>

                  {/* PDF Document */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <VersionBadge version={sub.current_version} />
                      <span className="font-medium text-slate-800 dark:text-slate-300 truncate max-w-[180px]">
                        {latestFile?.file_name || 'Assignment.pdf'}
                      </span>
                    </div>

                    {hasMultipleVersions && (
                      <button
                        onClick={() => onOpenVersionModal(sub)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-mono font-semibold hover:underline"
                      >
                        <History className="w-3 h-3" />
                        <span>View {sub.files?.length} versions</span>
                      </button>
                    )}
                  </td>

                  {/* Live Website */}
                  <td className="py-4 px-5">
                    {sub.live_website_url ? (
                      <a
                        href={sub.live_website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 hover:underline font-mono"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[140px]">{sub.live_website_url.replace(/^https?:\/\//, '')}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">—</span>
                    )}
                  </td>

                  {/* Submission Date */}
                  <td className="py-4 px-5 font-mono text-slate-600 dark:text-slate-300">
                    {formatDate(sub.created_at)}
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-5">
                    <StatusBadge status={sub.status} />
                    {sub.status === 'rejected' && sub.rejection_reason && (
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 truncate max-w-[160px] mt-1" title={sub.rejection_reason}>
                        Note: {sub.rejection_reason}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {latestFile && (
                        <>
                          <button
                            onClick={() => onViewPdf(latestFile.file_path, latestFile.file_name)}
                            className="p-2 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-xl transition border border-transparent hover:border-sky-300 dark:hover:border-sky-500/30"
                            title="View PDF Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onDownloadPdf(latestFile.file_path, latestFile.file_name)}
                            className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl transition border border-transparent hover:border-emerald-300 dark:hover:border-emerald-500/30"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {sub.live_website_url && (
                        <a
                          href={sub.live_website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition border border-transparent hover:border-indigo-300 dark:hover:border-indigo-500/30"
                          title="Open Live Website"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {sub.status !== 'rejected' && (
                        <button
                          onClick={() => onOpenRejectModal(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 font-bold transition text-xs"
                          title="Reject Assignment"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Card View (HCI Best Practice for Small Screens) */}
      <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {submissions.map((sub) => {
          const latestFile = sub.files && sub.files.length > 0 
            ? [...sub.files].sort((a, b) => b.version - a.version)[0] 
            : null;
          const hasMultipleVersions = (sub.files?.length || 0) > 1;

          return (
            <div key={sub.id} className="p-4 sm:p-5 space-y-2.5 sm:space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{sub.student_name}</h4>
                  <p className="font-mono text-sky-600 dark:text-sky-400 text-xs mt-0.5 font-semibold">Roll No: {sub.roll_number}</p>
                  <p className="font-mono text-slate-400 dark:text-slate-500 text-[10px]">Ref: {sub.submission_ref}</p>
                </div>
                <StatusBadge status={sub.status} />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-mono">
                <VersionBadge version={sub.current_version} />
                <span className="truncate max-w-[220px]">{latestFile?.file_name || 'Assignment.pdf'}</span>
              </div>

              {hasMultipleVersions && (
                <button
                  onClick={() => onOpenVersionModal(sub)}
                  className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-mono font-semibold touch-manipulation min-h-[30px]"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Inspect {sub.files?.length} versions</span>
                </button>
              )}

              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{formatDate(sub.created_at)}</span>
              </div>

              {sub.status === 'rejected' && sub.rejection_reason && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs">
                  <strong>Rejection Note:</strong> {sub.rejection_reason}
                </div>
              )}

              {/* Action buttons (Touch-friendly and nicely wrapped) */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {latestFile && (
                  <>
                    <button
                      onClick={() => onViewPdf(latestFile.file_path, latestFile.file_name)}
                      className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5 touch-manipulation min-h-[36px]"
                    >
                      <Eye className="w-3.5 h-3.5" /> View PDF
                    </button>
                    <button
                      onClick={() => onDownloadPdf(latestFile.file_path, latestFile.file_name)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 touch-manipulation min-h-[36px]"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </>
                )}

                {sub.live_website_url && (
                  <a
                    href={sub.live_website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 touch-manipulation min-h-[36px]"
                  >
                    <Globe className="w-3.5 h-3.5" /> Live Demo
                  </a>
                )}

                {sub.status !== 'rejected' && (
                  <button
                    onClick={() => onOpenRejectModal(sub)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 touch-manipulation min-h-[36px]"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
