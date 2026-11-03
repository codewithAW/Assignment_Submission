import React from 'react';
import { motion } from 'framer-motion';
import { 
  UploadCloud, 
  Search, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Code2, 
  ArrowRight, 
  CheckCircle2, 
  FileText
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-lg shadow-cyan-950/40"
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>CS421 • Compiler Construction Assignment Portal</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight"
        >
          Welcome to the{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400">
            Assignment Submission
          </span>{' '}
          Vault
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
        >
          Submit your compiler implementation report, verify binary header integrity, and monitor grading review status in real time.
        </motion.p>
      </div>

      {/* Main Two Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Submit Assignment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          onClick={onNavigateToSubmit}
          className="glass-card rounded-2xl border border-cyan-500/30 hover:border-cyan-400/60 p-7 cursor-pointer transition-all duration-300 group hover:shadow-2xl hover:shadow-cyan-500/10 relative overflow-hidden flex flex-col justify-between"
        >
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 blur-3xl pointer-events-none -z-10 group-hover:bg-cyan-500/20 transition-colors" />

          <div>
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-105 transition-transform shadow-lg shadow-cyan-950/60">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <span>Step 1 • Student Submission</span>
            </div>

            <h2 className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
              Submit Assignment
            </h2>

            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Upload your Project 2 PDF documentation, grammar specifications, and optional live web demo URL. Includes binary <code className="text-cyan-300 font-mono">%PDF-</code> signature verification.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">Accepts genuine PDF files only (Max 15MB)</span>
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-xs transition shadow-md shadow-cyan-500/30 group-hover:translate-x-1">
              <span>Go to Submission</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </motion.div>

        {/* Card 2: Check Assignment Submission */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          onClick={onNavigateToCheck}
          className="glass-card rounded-2xl border border-violet-500/30 hover:border-violet-400/60 p-7 cursor-pointer transition-all duration-300 group hover:shadow-2xl hover:shadow-violet-500/10 relative overflow-hidden flex flex-col justify-between"
        >
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 blur-3xl pointer-events-none -z-10 group-hover:bg-violet-500/20 transition-colors" />

          <div>
            <div className="w-14 h-14 rounded-2xl bg-violet-950/70 border border-violet-500/40 flex items-center justify-center text-violet-400 mb-5 group-hover:scale-105 transition-transform shadow-lg shadow-violet-950/60">
              <Search className="w-7 h-7" />
            </div>

            <div className="flex items-center gap-2 text-violet-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <span>Step 2 • Real-Time Checker</span>
            </div>

            <h2 className="text-2xl font-bold text-white group-hover:text-violet-300 transition-colors mb-2">
              Check Assignment Submission
            </h2>

            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Track your submission status in the database. Instantly verify whether your assignment is <strong>Submitted</strong>, <strong>Rejected</strong>, or <strong>Pending</strong>, with instructor feedback.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">Requires Roll Number & Verification Code</span>
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition shadow-md shadow-violet-600/30 group-hover:translate-x-1">
              <span>Check Status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Course & Project Specifications */}
      <div className="glass-card rounded-2xl border border-slate-700/60 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-lg">Project 2 Details & Specifications</h3>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300">
            Due: Fall Term
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>AST & Semantic Analysis</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Generate Abstract Syntax Trees from source input, perform symbol table lookup, type checking, and scope resolution.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Grammar & Parser Tables</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Include LL(1) / LR(1) parsing tables, shift-reduce conflict resolution, and grammar ambiguity proofs in your PDF.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-violet-400" />
              <span>Version Controlled Resubmission</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              If an instructor rejects your submission, you may upload a corrected version. Historical revisions are retained for grading.
            </p>
          </div>
        </div>

        {/* Security Alert */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-slate-400 flex items-start gap-3">
          <FileText className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-200">Submission Requirements:</strong> Upload must be a genuine PDF document.
            Files undergo binary signature validation (<code className="text-cyan-300 font-mono">%PDF-</code> header check).
            PDFs are stored in private cloud storage and are accessible only to authorized instructors.
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-6 pb-6 text-center text-xs text-slate-500 border-t border-slate-800/80 space-y-2">
        <p>Department of Computer Science • CS421: Compiler Construction</p>
        <p className="font-mono text-slate-600">
          Powered by Supabase PostgreSQL Database & Encrypted Private Storage Vault
        </p>
      </footer>
    </div>
  );
};
