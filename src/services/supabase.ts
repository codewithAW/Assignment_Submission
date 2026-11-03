import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables or localStorage override
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('cc_supabase_url') : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('cc_supabase_anon_key') : null;

export const SUPABASE_URL = storedUrl || envUrl;
export const SUPABASE_ANON_KEY = storedKey || envKey;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('your-supabase-url')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export function updateSupabaseConfig(url: string, key: string) {
  if (url && key) {
    localStorage.setItem('cc_supabase_url', url.trim());
    localStorage.setItem('cc_supabase_anon_key', key.trim());
    window.location.reload();
  }
}

export function clearSupabaseConfig() {
  localStorage.removeItem('cc_supabase_url');
  localStorage.removeItem('cc_supabase_anon_key');
  window.location.reload();
}
