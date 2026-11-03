import React from 'react';
import { motion } from 'framer-motion';
import { 
  UploadCloud, 
  Search, 
  ShieldCheck, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';

interface HomePageProps {
  onNavigateToSubmit: () => void;
  onNavigateToCheck: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateToSubmit,
  onNavigateToCheck,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-6 sm:py-12 space-y-8 sm:space-y-10">
      {/* Hero Welcome (HCI Rule: Instant Clarity & Focus) */}
      <div className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto px-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-500/30 text-[11px] sm:text-xs font-semibold text-sky-700 dark:text-sky-300 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
          <span>CS421: Compiler Construction • Portal</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight"
        >
          Assignment Submission{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500">
            Portal
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto"
        >
          Submit your compiler implementation report and check real-time evaluation status.
          All documents undergo server-grade <code className="font-mono text-sky-600 dark:text-sky-400 font-semibold">%PDF-</code> binary verification.
        </motion.p>
      </div>

      {/* Two Clear Primary Action Cards (HCI Rule: Hick's Law - Minimal Cognitive Choices) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Submit Assignment */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={onNavigateToSubmit}
          className="glossy-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 cursor-pointer group hover:scale-[1.01] transition-all flex flex-col justify-between touch-manipulation"
        >
          <div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-sky-400/20 to-sky-600/20 dark:from-sky-500/20 dark:to-sky-700/20 border border-sky-400/40 dark:border-sky-500/40 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4 sm:mb-5 group-hover:scale-105 transition-transform shadow-md">
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
              Step 1 • Student Submission
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors mb-2">
              Submit Assignment
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 sm:mb-6">
              Upload your Project 2 PDF documentation and optional demo URL. Validates binary signatures and protects against accidental duplicate submissions.
            </p>
          </div>

          <div className="pt-3 sm:pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono">PDF Only • Max 15MB</span>
            <button
              type="button"
              className="glossy-btn-primary px-3.5 sm:px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow min-h-[38px]"
            >
              <span>Submit Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>

        {/* Card 2: Check Assignment Submission */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={onNavigateToCheck}
          className="glossy-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 cursor-pointer group hover:scale-[1.01] transition-all flex flex-col justify-between touch-manipulation"
        >
          <div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-violet-400/20 to-violet-600/20 dark:from-violet-500/20 dark:to-violet-700/20 border border-violet-400/40 dark:border-violet-500/40 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 sm:mb-5 group-hover:scale-105 transition-transform shadow-md">
              <Search className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">
              Step 2 • Status Verification
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors mb-2">
              Check Submission
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 sm:mb-6">
              Enter your Roll Number to see if your assignment has been <strong>Submitted</strong>, <strong>Rejected</strong>, or is pending evaluation. If rejected, submit a corrected version instantly.
            </p>
          </div>

          <div className="pt-3 sm:pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono">Real-Time Database Query</span>
            <button
              type="button"
              className="glossy-btn-violet px-3.5 sm:px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow min-h-[38px]"
            >
              <span>Check Status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Project Specs & Guidelines Card */}
      <div className="glossy-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-500 dark:text-sky-400 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base md:text-lg text-slate-900 dark:text-white">
                Project 2: AST Generation & Code Synthesis
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Department of Computer Science • CS421
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 w-fit">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Submission Active</span>
          </div>
        </div>

        {/* 3 Core Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>AST & Semantic Check</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px] sm:text-xs">
              Include grammar rules, symbol tables, type checking validation, and syntax tree drawings in your report.
            </p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <ShieldCheck className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Binary Signature Check</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px] sm:text-xs">
              Both client and server inspect binary headers to confirm genuine <code className="font-mono text-sky-600 dark:text-sky-300">%PDF-</code> magic bytes.
            </p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <FileText className="w-4 h-4 text-violet-500 shrink-0" />
              <span>Version History Retained</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px] sm:text-xs">
              If an instructor asks for revisions, earlier versions (<code className="font-mono text-violet-600 dark:text-violet-300">v1, v2</code>) are preserved in the private vault.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-2 text-center text-[11px] sm:text-xs text-slate-500 dark:text-slate-500 border-t border-slate-200 dark:border-white/10 space-y-1">
        <p>CS421: Compiler Construction • Secure Academic Portal</p>
        <p className="font-mono text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-600">
          Powered by Supabase PostgreSQL Database & Private Storage Vault
        </p>
      </footer>
    </div>
  );
};
