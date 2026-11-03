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
      <div className="py-16 text-center text-slate-400 glass-card rounded-2xl border border-slate-800">
        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <h4 className="text-base font-semibold text-slate-300">No submissions found</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          No records match the current filter criteria or no assignments have been submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl border border-slate-700/60 overflow-hidden shadow-2xl">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 border-b border-slate-800 uppercase tracking-wider text-slate-400 font-semibold font-mono">
            <tr>
              <th className="py-4 px-5">Student / Roll No</th>
              <th className="py-4 px-5">Assignment PDF</th>
              <th className="py-4 px-5">Live Demo</th>
              <th className="py-4 px-5">Submitted At</th>
              <th className="py-4 px-5">Status</th>
              <th className="py-4 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {submissions.map((sub) => {
              const latestFile = sub.files && sub.files.length > 0 
                ? [...sub.files].sort((a, b) => b.version - a.version)[0] 
                : null;
              const hasMultipleVersions = (sub.files?.length || 0) > 1;

              return (
                <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Student & Roll */}
                  <td className="py-4 px-5">
                    <div className="font-semibold text-slate-100 text-sm">{sub.student_name}</div>
                    <div className="font-mono text-cyan-400 mt-0.5 text-xs flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-cyan-500" />
                      {sub.roll_number}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Ref: {sub.submission_ref}
                    </div>
                  </td>

                  {/* PDF Document */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <VersionBadge version={sub.current_version} />
                      <span className="font-medium text-slate-300 truncate max-w-[180px]">
                        {latestFile?.file_name || 'Assignment.pdf'}
                      </span>
                    </div>

                    {hasMultipleVersions && (
                      <button
                        onClick={() => onOpenVersionModal(sub)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 font-mono hover:underline"
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 hover:text-white hover:bg-cyan-900/50 transition font-mono max-w-[140px] truncate"
                        title={sub.live_website_url}
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">Open Site</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-slate-600 italic">—</span>
                    )}
                  </td>

                  {/* Submission Date & Time */}
                  <td className="py-4 px-5 font-mono text-slate-400">
                    <div className="text-slate-200">{formatDate(sub.created_at)}</div>
                    {sub.status === 'rejected' && sub.rejected_at && (
                      <div className="text-[11px] text-rose-400/80 mt-0.5">
                        Rejected: {formatDate(sub.rejected_at)}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-5">
                    <StatusBadge status={sub.status} />
                    {sub.status === 'rejected' && sub.rejection_reason && (
                      <div 
                        className="text-[10px] text-rose-300/80 mt-1 max-w-[160px] truncate" 
                        title={sub.rejection_reason}
                      >
                        {sub.rejection_reason}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {latestFile && (
                        <>
                          {/* View PDF */}
                          <button
                            onClick={() => onViewPdf(latestFile.file_path, latestFile.file_name)}
                            className="p-2 text-cyan-400 hover:text-white hover:bg-cyan-950/50 rounded-lg transition border border-transparent hover:border-cyan-500/30"
                            title="View PDF Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => onDownloadPdf(latestFile.file_path, latestFile.file_name)}
                            className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-950/50 rounded-lg transition border border-transparent hover:border-emerald-500/30"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Live Website Link */}
                      {sub.live_website_url && (
                        <a
                          href={sub.live_website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-950/50 rounded-lg transition border border-transparent hover:border-indigo-500/30"
                          title="Open Live Website"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {/* Reject Assignment Button */}
                      {sub.status !== 'rejected' && (
                        <button
                          onClick={() => onOpenRejectModal(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-medium transition text-xs"
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

      {/* Mobile / Tablet Responsive Card View */}
      <div className="block lg:hidden divide-y divide-slate-800">
        {submissions.map((sub) => {
          const latestFile = sub.files && sub.files.length > 0 
            ? [...sub.files].sort((a, b) => b.version - a.version)[0] 
            : null;
          const hasMultipleVersions = (sub.files?.length || 0) > 1;

          return (
            <div key={sub.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-white text-base">{sub.student_name}</h4>
                  <p className="font-mono text-cyan-400 text-xs mt-0.5">Roll No: {sub.roll_number}</p>
                  <p className="font-mono text-slate-500 text-[10px]">Ref: {sub.submission_ref}</p>
                </div>
                <StatusBadge status={sub.status} />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                <VersionBadge version={sub.current_version} />
                <span className="truncate">{latestFile?.file_name || 'Assignment.pdf'}</span>
              </div>

              {hasMultipleVersions && (
                <button
                  onClick={() => onOpenVersionModal(sub)}
                  className="inline-flex items-center gap-1 text-xs text-violet-400 font-mono"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Inspect {sub.files?.length} versions</span>
                </button>
              )}

              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatDate(sub.created_at)}</span>
              </div>

              {sub.status === 'rejected' && sub.rejection_reason && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
                  <strong>Rejection Note:</strong> {sub.rejection_reason}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                {latestFile && (
                  <>
                    <button
                      onClick={() => onViewPdf(latestFile.file_path, latestFile.file_name)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> View PDF
                    </button>
                    <button
                      onClick={() => onDownloadPdf(latestFile.file_path, latestFile.file_name)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5"
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
                    className="px-3 py-1.5 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" /> Live Demo
                  </a>
                )}

                {sub.status !== 'rejected' && (
                  <button
                    onClick={() => onOpenRejectModal(sub)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-1.5 ml-auto"
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
