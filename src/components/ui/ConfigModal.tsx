import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  Save,
  RotateCcw,
  Lock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Modal } from './Modal';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
  isEnvLocked,
  updateSupabaseConfig,
  clearSupabaseConfig,
} from '../../services/supabase';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(SUPABASE_URL || '');
  const [anonKey, setAnonKey] = useState(isEnvLocked ? '•••••••••••••••••••• (locked via .env)' : SUPABASE_ANON_KEY || '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isEnvLocked) return;

    try {
      updateSupabaseConfig(url, anonKey);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Invalid Supabase configuration.');
    }
  };

  const handleReset = () => {
    if (isEnvLocked) return;
    clearSupabaseConfig();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
          <Database className="w-5 h-5" />
          <span>Supabase Backend Configuration</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs sm:text-sm">
        {/* Status banner */}
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isSupabaseConfigured
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              : 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-500/30 text-sky-900 dark:text-sky-200'
          }`}
        >
          {isSupabaseConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <Database className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-bold block text-slate-900 dark:text-white text-sm mb-0.5">
              {isSupabaseConfigured
                ? 'Connected to Live Supabase Backend'
                : 'Local Secure Storage Engine Active'}
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isSupabaseConfigured
                ? `Active HTTPS endpoint: ${SUPABASE_URL}`
                : 'Connect your Supabase project via build environment variables (.env) to enable live database synchronization.'}
            </p>
          </div>
        </div>

        {isEnvLocked ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-100 block">
                Endpoint Locked by Build Environment Security Policy
              </span>
              <p>
                Runtime overrides in <code className="font-mono">localStorage</code> are disabled because verified{' '}
                <code className="font-mono">VITE_SUPABASE_*</code> environment variables are configured.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Supabase Project URL (HTTPS)
              </label>
              <input
                type="url"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="glossy-input w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Supabase Publishable / Anon API Key
              </label>
              <input
                type="text"
                placeholder="sb_publishable_... or eyJhbGci..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="glossy-input w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Never enter service-role secret keys in the browser.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Local Override
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="glossy-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Save className="w-3.5 h-3.5" /> Save & Reconnect
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Quick Reference Notes */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-500 shrink-0" /> SQL Security & Setup Scripts
          </span>
          <p>
            Initialize schema with <code className="text-sky-600 dark:text-sky-400 font-mono">supabase/setup_all.sql</code>,{' '}
            <code className="text-sky-600 dark:text-sky-400 font-mono">supabase/multi_subject_setup.sql</code>, and{' '}
            <code className="text-sky-600 dark:text-sky-400 font-mono">supabase/security_hardening.sql</code> inside your Supabase SQL Editor.
          </p>
        </div>
      </div>
    </Modal>
  );
};
