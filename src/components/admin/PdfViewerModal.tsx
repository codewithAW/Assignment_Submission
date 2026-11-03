import React from 'react';
import { FileText, ExternalLink, Download } from 'lucide-react';
import { Modal } from '../ui/Modal';

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
          <FileText className="w-5 h-5" />
          <span className="truncate max-w-sm sm:max-w-md">{fileName}</span>
        </div>
      }
      maxWidth="4xl"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-white/10">
          <span className="font-mono">Authorized 60s Signed Stream URL</span>
          <div className="flex items-center gap-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-semibold"
            >
              Open in new tab <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={pdfUrl}
              download={fileName}
              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Download PDF <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="w-full h-[65vh] bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner">
          <iframe
            src={`${pdfUrl}#toolbar=1&view=FitH`}
            title={`Preview of ${fileName}`}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </Modal>
  );
};
