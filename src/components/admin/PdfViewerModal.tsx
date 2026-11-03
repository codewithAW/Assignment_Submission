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
        <div className="flex items-center gap-2 text-cyan-400">
          <FileText className="w-5 h-5" />
          <span className="truncate max-w-sm sm:max-w-md">{fileName}</span>
        </div>
      }
      maxWidth="4xl"
    >
      <div className="space-y-3">
        {/* Top helper controls */}
        <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
          <span className="font-mono">Authorized 60s Signed Stream URL</span>
          <div className="flex items-center gap-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Open in new window <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={pdfUrl}
              download={fileName}
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Download PDF <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Embedded PDF iframe */}
        <div className="w-full h-[65vh] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
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
