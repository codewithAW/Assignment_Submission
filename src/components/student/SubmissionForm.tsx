import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Globe, 
  User, 
  Hash, 
  ShieldAlert, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { submissionService } from '../../services/submissionService';
import { validatePDFFile } from '../../services/pdfValidator';
import { normalizeRollNumber, isValidRollNumber } from '../../utils/rollNumber';
import { isValidUrl } from '../../utils/security';
import type { SubmitAssignmentResponse } from '../../types';
import { formatFileSize } from '../../utils/date';
import { Modal } from '../ui/Modal';
import { ConfirmationCard } from './ConfirmationCard';

interface SubmissionFormProps {
  prefillRollNumber?: string;
  prefillStudentName?: string;
  onScrollToChecker?: () => void;
  onSubmissionComplete?: () => void;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  prefillRollNumber,
  prefillStudentName,
  onScrollToChecker,
  onSubmissionComplete,
}) => {
  const [studentName, setStudentName] = useState(prefillStudentName || '');
  const [rollNumber, setRollNumber] = useState(prefillRollNumber || '');
  const [liveUrl, setLiveUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDetails, setFileDetails] = useState<{ header?: string; sizeBytes?: number } | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDuplicateWarning, setIsDuplicateWarning] = useState(false);

  // Success Confirmation Modal
  const [successData, setSuccessData] = useState<(SubmitAssignmentResponse & {
    student_name: string;
    roll_number: string;
    live_website_url?: string;
  }) | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update when prefill values change
  useEffect(() => {
    if (prefillRollNumber) {
      setRollNumber(prefillRollNumber);
    }
    if (prefillStudentName) {
      setStudentName(prefillStudentName);
    }
  }, [prefillRollNumber, prefillStudentName]);

  const handleFileSelection = async (file: File) => {
    setErrorMessage(null);
    setIsDuplicateWarning(false);

    // Validate client-side
    const validation = await validatePDFFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid PDF file.');
      setSelectedFile(null);
      setFileDetails(null);
      return;
    }

    setSelectedFile(file);
    setFileDetails({
      header: validation.details?.header,
      sizeBytes: file.size,
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileSelection(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsDuplicateWarning(false);

    // 1. Validate Student Name
    if (!studentName.trim()) {
      setErrorMessage('Please enter your full student name.');
      return;
    }

    // 2. Validate Roll Number
    const normalized = normalizeRollNumber(rollNumber);
    const rollCheck = isValidRollNumber(normalized);
    if (!rollCheck.valid) {
      setErrorMessage(rollCheck.error || 'Please enter a valid roll number.');
      return;
    }

    // 3. Validate File
    if (!selectedFile) {
      setErrorMessage('Please select your assignment PDF file.');
      return;
    }

    // 4. Validate Live Website URL
    if (liveUrl.trim() && !isValidUrl(liveUrl.trim())) {
      setErrorMessage('The live website URL is invalid. Please format as https://example.com');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
      const result = await submissionService.submitAssignment(
        {
          student_name: studentName.trim(),
          roll_number: normalized,
          file: selectedFile,
          live_website_url: liveUrl.trim() || undefined,
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // Trigger Confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#818cf8', '#34d399', '#f472b6'],
        });
      } catch {}

      // Open Success Modal
      setSuccessData({
        ...result,
        student_name: studentName.trim(),
        roll_number: normalized,
        live_website_url: liveUrl.trim() || undefined,
      });

      // Clear Form
      setSelectedFile(null);
      setFileDetails(null);
      setUploadProgress(0);
      onSubmissionComplete?.();
    } catch (err: any) {
      console.error('Submission error:', err);
      const msg = err.message || 'An unexpected error occurred during submission.';
      setErrorMessage(msg);
      if (msg.toLowerCase().includes('already has an active submission') || msg.toLowerCase().includes('duplicate')) {
        setIsDuplicateWarning(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="submit-section" className="relative">
      <div className="glass-card rounded-2xl border border-slate-700/60 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow corner accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/10 via-violet-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" /> CS421 • Assignment Portal
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Submit Assignment
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Upload your Compiler Construction PDF report, grammar analysis, and implementation details.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-xs font-mono text-cyan-300">
            <span>Max 15MB</span>
            <span>•</span>
            <span>PDF Only</span>
          </div>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl border mb-6 flex items-start gap-3 ${
                isDuplicateWarning
                  ? 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
              }`}
            >
              {isDuplicateWarning ? (
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-sm">
                <span className="font-semibold block mb-0.5">
                  {isDuplicateWarning ? 'Submission Already Active' : 'Validation Error'}
                </span>
                <p className="leading-relaxed">{errorMessage}</p>
                {isDuplicateWarning && (
                  <button
                    type="button"
                    onClick={onScrollToChecker}
                    className="mt-2 text-xs font-semibold text-amber-300 underline hover:text-white flex items-center gap-1"
                  >
                    Check existing submission status <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Student Name & Roll Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Student Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Student Name <span className="text-cyan-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sophia Chen"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-slate-100 placeholder:text-slate-500 text-sm transition"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Roll Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Roll Number <span className="text-cyan-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. FA21-BCS-042"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-slate-100 placeholder:text-slate-500 font-mono text-sm transition"
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Normalized automatically (e.g. FA21-BCS-042)</p>
            </div>
          </div>

          {/* Row 2: Live Website URL (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Live Website URL <span className="text-slate-500 lowercase">(optional)</span>
              </label>
              <span className="text-[11px] text-slate-500">Live compiler demo / online playground</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="url"
                placeholder="https://my-compiler-demo.vercel.app"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-slate-100 placeholder:text-slate-500 text-sm transition"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Row 3: Assignment PDF Dropzone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Assignment PDF Document <span className="text-cyan-400">*</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelection(e.target.files[0]);
                }
              }}
              disabled={isSubmitting}
            />

            {!selectedFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/30'
                    : 'border-slate-700/80 hover:border-cyan-500/60 bg-slate-900/40 hover:bg-slate-900/60'
                }`}
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="font-semibold text-slate-200 text-base mb-1">
                  Click to browse or drop your PDF here
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-3">
                  Strictly PDF documents. Files are validated for genuine binary header signature (%PDF-) and max 15MB.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-xs font-medium text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Select .PDF File
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                      {selectedFile.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                      <span>{formatFileSize(selectedFile.size)}</span>
                      <span>•</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Binary Verified ({fileDetails?.header || '%PDF-'})
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileDetails(null);
                  }}
                  disabled={isSubmitting}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition"
                  title="Remove selected file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isSubmitting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Encrypting and uploading to private storage...
                </span>
                <span className="font-mono text-cyan-300">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.2 }}
                />
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-white text-base shadow-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:via-blue-500 hover:to-violet-500 shadow-cyan-500/20 active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing & Storing Submission...</span>
              </>
            ) : (
              <>
                <span>Submit Assignment PDF</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
      {successData && (
        <Modal
          isOpen={true}
          onClose={() => setSuccessData(null)}
          title="Submission Confirmation Receipt"
          maxWidth="lg"
        >
          <ConfirmationCard
            data={successData}
            onClose={() => setSuccessData(null)}
            onScrollToChecker={onScrollToChecker}
          />
        </Modal>
      )}
    </div>
  );
};
