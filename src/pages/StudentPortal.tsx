import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  Shield, 
  Cpu, 
  Lock, 
  CheckCircle2, 
  Layers, 
  FileCheck2 
} from 'lucide-react';
import { SubmissionForm } from '../components/student/SubmissionForm';
import { SubmissionChecker } from '../components/student/SubmissionChecker';

interface StudentPortalProps {
  onNavigateToAdmin: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ onNavigateToAdmin }) => {
  const [prefillRoll, setPrefillRoll] = useState('');
  const [prefillName, setPrefillName] = useState('');

  const handleResubmitClick = (rollNumber: string, studentName?: string) => {
    setPrefillRoll(rollNumber);
    if (studentName) {
      setPrefillName(studentName);
    }
    const formElement = document.getElementById('submit-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollToChecker = () => {
    const checkerElement = document.getElementById('check-section');
    if (checkerElement) {
      checkerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative min-h-screen z-10">
      {/* Top Academic Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#080b14]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#080b14] rounded-[10px] flex items-center justify-center text-cyan-400">
                <Terminal className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                CS421 <span className="text-slate-500 font-normal">|</span> Compiler Construction
              </span>
              <span className="text-[11px] text-slate-400 block -mt-0.5">
                Assignment Portal • Fall Semester
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToAdmin}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 text-xs font-medium transition duration-150 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-lg shadow-cyan-950/40"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Project 2: AST Generation & Code Synthesis</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight"
          >
            Assignment Submission{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400">
              Vault
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
          >
            Submit your Compiler Construction assignment PDF report. All documents undergo
            rigorous binary signature validation and are archived into encrypted private cloud storage.
          </motion.p>

          {/* Quick Badges */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-400"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/60 border border-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> %PDF- Magic Header Validated
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/60 border border-slate-800">
              <Shield className="w-3.5 h-3.5 text-violet-400" /> Zero Public Exposure
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/60 border border-slate-800">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Automatic Versioning
            </span>
          </motion.div>
        </div>

        {/* Section 1: Submit Assignment */}
        <section aria-labelledby="submit-heading">
          <SubmissionForm
            prefillRollNumber={prefillRoll}
            prefillStudentName={prefillName}
            onScrollToChecker={handleScrollToChecker}
          />
        </section>

        {/* Section Divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#080b14] px-4 text-xs font-mono uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <FileCheck2 className="w-3.5 h-3.5 text-violet-400" /> Verification Status
            </span>
          </div>
        </div>

        {/* Section 2: Check Assignment Submission */}
        <section aria-labelledby="check-heading">
          <SubmissionChecker onResubmitClick={handleResubmitClick} />
        </section>

        {/* Footer */}
        <footer className="pt-10 pb-8 border-t border-slate-800/80 text-center text-xs text-slate-500 space-y-2">
          <p>
            Department of Computer Science • CS421: Compiler Construction
          </p>
          <p className="font-mono text-slate-600">
            Secure Backend Engine Powered by Supabase PostgreSQL & Encrypted Storage
          </p>
        </footer>
      </main>
    </div>
  );
};
