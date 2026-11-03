import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Key, Shield, ArrowLeft, AlertCircle, Lock } from 'lucide-react';
import { submissionService } from '../../services/submissionService';
import type { AdminUser } from '../../types';

interface AdminLoginProps {
  onLoginSuccess: (user: AdminUser) => void;
  onBackToStudentPortal: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToStudentPortal,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await submissionService.loginAdmin(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] sm:min-h-[80vh] flex items-center justify-center px-3.5 sm:px-4 py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md glossy-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-9 shadow-2xl relative overflow-hidden"
      >
        <button
          onClick={onBackToStudentPortal}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-5 sm:mb-6 transition touch-manipulation min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Student Portal
        </button>

        <div className="text-center mb-5 sm:mb-6 space-y-2">
          <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-gradient-to-br from-sky-400/20 to-sky-600/20 dark:from-sky-500/20 dark:to-sky-700/20 border border-sky-400/30 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-md">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Administrator Portal
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Secure authentication for CS421 instructors and grading staff.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs mb-4 sm:mb-5 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              Administrator Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="shahmproject@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glossy-input w-full pl-10 pr-4 py-3 rounded-2xl text-base sm:text-sm"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glossy-input w-full pl-10 pr-4 py-3 rounded-2xl text-base sm:text-sm"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-white text-xs sm:text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 min-h-[46px] touch-manipulation ${
              isLoading
                ? 'bg-slate-400 dark:bg-slate-800 text-slate-200 cursor-not-allowed'
                : 'glossy-btn-primary'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Log In to Dashboard</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
