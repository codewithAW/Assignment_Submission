import React from 'react';
import { FileText, ExternalLink, Download, ShieldAlert } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { SUPABASE_URL } from '../../services/supabase';
import { sanitizePdfUrl, sanitizeFileName } from '../../utils/security';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  fileName: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  fileName,
}) => {
  if (!pdfUrl) return null;

  const safePdfUrl = sanitizePdfUrl(pdfUrl, SUPABASE_URL);
  const safeFileName = sanitizeFileName(fileName);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="truncate max-w-[200px] xs:max-w-xs sm:max-w-md text-xs sm:text-base">{safeFileName}</span>
        </div>
      }
      maxWidth="4xl"
    >
      {!safePdfUrl ? (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-1">Blocked Untrusted Document URL</span>
            <p>
              The requested preview URL did not match the authorized Supabase Storage origin or a safe local blob preview and was blocked by client security policy.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2.5 border-b border-slate-200 dark:border-white/10 gap-2">
            <span className="font-mono text-[11px] sm:text-xs">Authorized Signed PDF Stream</span>
            <div className="flex items-center gap-2">
              <a
                href={safePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold text-xs border border-sky-200 dark:border-sky-500/30 touch-manipulation min-h-[34px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </a>
              <a
                href={safePdfUrl}
                download={safeFileName}
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-500/30 touch-manipulation min-h-[34px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          </div>

          <div className="w-full h-[50vh] sm:h-[65vh] bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner">
            <iframe
              src={`${safePdfUrl}#toolbar=1&view=FitH`}
              title={`Preview of ${safeFileName}`}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </Modal>
  );
};
