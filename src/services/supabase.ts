import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isValidSupabaseProjectUrl, sanitizeText } from '../utils/security';

const envUrl = sanitizeText(import.meta.env.VITE_SUPABASE_URL || '', 512);
const envKey = sanitizeText(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  1024
);

/**
 * When build-time environment credentials are configured, ignore any localStorage
 * endpoint overrides to prevent client-side token/submission redirection hijacking.
 */
export const isEnvLocked = Boolean(envUrl && envKey && isValidSupabaseProjectUrl(envUrl));

const storedUrl =
  !isEnvLocked && typeof window !== 'undefined'
    ? localStorage.getItem('cc_supabase_url')
    : null;
const storedKey =
  !isEnvLocked && typeof window !== 'undefined'
    ? localStorage.getItem('cc_supabase_anon_key')
    : null;

const safeStoredUrl = storedUrl && isValidSupabaseProjectUrl(storedUrl) ? storedUrl.trim() : '';
const safeStoredKey = storedKey ? sanitizeText(storedKey, 1024) : '';

export const SUPABASE_URL = isEnvLocked ? envUrl : safeStoredUrl;
export const SUPABASE_ANON_KEY = isEnvLocked ? envKey : safeStoredKey;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function updateSupabaseConfig(url: string, key: string): void {
  if (isEnvLocked) {
    throw new Error('Supabase configuration is locked to verified environment variables.');
  }
  const cleanUrl = url.trim();
  const cleanKey = sanitizeText(key, 1024);
  if (!isValidSupabaseProjectUrl(cleanUrl) || !cleanKey) {
    throw new Error('Please enter a valid HTTPS Supabase project URL and publishable/anon key.');
  }
  localStorage.setItem('cc_supabase_url', cleanUrl);
  localStorage.setItem('cc_supabase_anon_key', cleanKey);
  window.location.reload();
}

export function clearSupabaseConfig(): void {
  if (isEnvLocked) return;
  localStorage.removeItem('cc_supabase_url');
  localStorage.removeItem('cc_supabase_anon_key');
  window.location.reload();
}
