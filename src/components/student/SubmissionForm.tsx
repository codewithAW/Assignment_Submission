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

    if (!studentName.trim()) {
      setErrorMessage('Please enter your full student name.');
      return;
    }

    const normalized = normalizeRollNumber(rollNumber);
    const rollCheck = isValidRollNumber(normalized);
    if (!rollCheck.valid) {
      setErrorMessage(rollCheck.error || 'Please enter a valid roll number.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Please select your assignment PDF file.');
      return;
    }

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

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#818cf8', '#34d399', '#f472b6'],
        });
      } catch {}

      setSuccessData({
        ...result,
        student_name: studentName.trim(),
        roll_number: normalized,
        live_website_url: liveUrl.trim() || undefined,
      });

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
      <div className="glossy-card rounded-3xl p-6 sm:p-9 shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 dark:border-white/10 gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" /> CS421 • Assignment Submission
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Submit Your Assignment
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Fill out your details and upload your genuine PDF report below.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 w-fit">
            <span>Max 15MB</span>
            <span>•</span>
            <span>PDF Only</span>
          </div>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`p-4 rounded-2xl border mb-6 flex items-start gap-3 shadow-sm ${
                isDuplicateWarning
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200'
              }`}
            >
              {isDuplicateWarning ? (
                <ShieldAlert className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs sm:text-sm">
                <span className="font-bold block mb-0.5">
                  {isDuplicateWarning ? 'Submission Already Active' : 'Validation Error'}
                </span>
                <p className="leading-relaxed">{errorMessage}</p>
                {isDuplicateWarning && (
                  <button
                    type="button"
                    onClick={onScrollToChecker}
                    className="mt-2 text-xs font-bold underline flex items-center gap-1 hover:opacity-80"
                  >
                    Check existing submission status <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Student Name <span className="text-sky-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sophia Chen"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="glossy-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Roll Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Roll Number <span className="text-sky-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. FA21-BCS-042"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  className="glossy-input w-full pl-10 pr-4 py-3 rounded-2xl font-mono text-sm"
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                Automatically formatted (e.g. FA21-BCS-042)
              </p>
            </div>
          </div>

          {/* Row 2: Live Website URL (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Live Website URL <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Live compiler demo / online playground</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="url"
                placeholder="https://my-compiler-demo.vercel.app"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                className="glossy-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Row 3: Assignment PDF Dropzone (Glossy tactile card) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Assignment PDF Document <span className="text-sky-500">*</span>
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
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 group ${
                  isDragging
                    ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700/80 hover:border-sky-500/70 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/70'
                }`}
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform shadow-sm">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base mb-1">
                  Click to select or drag and drop your PDF here
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3.5">
                  Validates authentic binary headers (<code className="font-mono text-sky-600 dark:text-sky-400">%PDF-</code>) and file size up to 15MB.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                  <FileText className="w-3.5 h-3.5 text-sky-500" />
                  Select PDF Document
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-sky-300 dark:border-sky-500/40 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                      {selectedFile.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span>{formatFileSize(selectedFile.size)}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified Signature ({fileDetails?.header || '%PDF-'})
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
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
                  title="Remove selected file"
                  aria-label="Remove selected file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isSubmitting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                  Encrypting and uploading to private storage...
                </span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-300">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.2 }}
                />
              </div>
            </div>
          )}

          {/* Submit Action Button (Fitts's Law: Prominent, easy to hit) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-white text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-slate-400 dark:bg-slate-800 text-slate-200 cursor-not-allowed'
                : 'glossy-btn-primary'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
