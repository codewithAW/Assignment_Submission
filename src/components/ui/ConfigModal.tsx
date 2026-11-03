import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  Save, 
  RotateCcw
} from 'lucide-react';
import { Modal } from './Modal';
import { 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  isSupabaseConfigured, 
  updateSupabaseConfig, 
  clearSupabaseConfig 
} from '../../services/supabase';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(SUPABASE_URL || '');
  const [anonKey, setAnonKey] = useState(SUPABASE_ANON_KEY || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupabaseConfig(url, anonKey);
    onClose();
  };

  const handleReset = () => {
    clearSupabaseConfig();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-cyan-400">
          <Database className="w-5 h-5" />
          <span>Supabase Backend Configuration</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs sm:text-sm">
        {/* Status banner */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            isSupabaseConfigured
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200'
          }`}
        >
          {isSupabaseConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <Database className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-bold block text-white text-sm mb-0.5">
              {isSupabaseConfigured
                ? 'Connected to Live Supabase Backend'
                : 'Local Secure Test Engine Active'}
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isSupabaseConfigured
                ? `Active endpoint: ${SUPABASE_URL}`
                : 'The application is running with realistic client-side storage, binary %PDF- verification, versioning, and instant demo grading. Connect your Supabase project below to test with a live cloud instance.'}
            </p>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Supabase Anon Public API Key
            </label>
            <input
              type="text"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Never enter service-role secret keys here. Use the public `anon` key.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {isSupabaseConfigured && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Switch to Local Mode
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                <Save className="w-3.5 h-3.5" /> Save & Reconnect
              </button>
            </div>
          </div>
        </form>

        {/* Quick Reference Notes */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1.5">
          <span className="font-semibold text-slate-200 block">SQL Migrations & Edge Functions:</span>
          <p>
            The complete migrations are ready in <code className="text-cyan-300 font-mono">supabase/migrations/</code>.
            Execute them in your Supabase SQL Editor to initialize the tables, private storage bucket, and RLS policies.
          </p>
          <p className="pt-1">
            <strong>Default Demo Admin:</strong> <code className="text-cyan-300 font-mono">instructor@compiler.edu</code> / <code className="text-cyan-300 font-mono">admin123</code>
          </p>
        </div>
      </div>
    </Modal>
  );
};
