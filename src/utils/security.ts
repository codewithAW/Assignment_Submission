/**
 * Cryptographically uniform integer in [0, max) using Web Crypto API.
 */
function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    while (true) {
      cryptoObj.getRandomValues(buf);
      if (buf[0] < limit) {
        return buf[0] % max;
      }
    }
  }
  return Math.floor(Math.random() * max);
}

/**
 * Generates an academic submission reference code using CSPRNG
 * Example: SUB-2026-F49B2
 */
export function generateSubmissionRef(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(secureRandomInt(chars.length));
  }
  const year = new Date().getFullYear();
  return `SUB-${year}-${randomPart}`;
}

/**
 * Generates a preview of the safe PostgreSQL table identifier from a subject name.
 * Mirrors public.create_subject_assignment() sanitization in SQL.
 */
export function subjectNameToTableName(subjectName: string): string {
  let slug = sanitizeText(subjectName, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!slug) return '';
  if (/^[0-9]/.test(slug)) {
    slug = `subj_${slug}`;
  }

  let tableName = slug.slice(0, 48).replace(/_+$/g, '');
  const reserved = new Set([
    'submissions',
    'submission_files',
    'admin_users',
    'student_roster',
    'subject_assignments',
    'verification_attempts',
    'subjects',
    'assignments',
    'users',
    'profiles',
  ]);
  if (reserved.has(tableName)) {
    tableName = `subj_${tableName}`.slice(0, 48).replace(/_+$/g, '');
  }
  return tableName;
}

/**
 * Derives a valid Supabase Storage bucket name from a subject table identifier.
 * Supabase Storage buckets allow lowercase letters, digits, and hyphens (3..63 chars; no underscores).
 */
export function tableNameToStorageBucket(tableName: string): string {
  let slug = sanitizeText(tableName, 63)
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) return 'assignments';
  if (slug.length < 3) {
    slug = `subj-${slug}`;
  }
  slug = slug.slice(0, 63).replace(/-+$/g, '');
  if (slug === 'assignments') {
    slug = 'subj-assignments';
  }
  return slug;
}

/**
 * Validates and normalizes a Supabase Storage bucket name.
 */
export function sanitizeStorageBucket(bucketName?: string | null): string | null {
  const clean = sanitizeText(bucketName, 63).toLowerCase();
  if (!clean || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(clean)) {
    return null;
  }
  return clean;
}

/**
 * Generates an easy-to-remember 4-digit verification code (1000–9999) via CSPRNG
 */
export function generateVerificationCode(): string {
  const pin = 1000 + secureRandomInt(9000);
  return pin.toString();
}

/**
 * Computes SHA-256 hash in browser using crypto.subtle
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function stripControlAndBidiChars(input: string, allowNewlines: boolean): string {
  const noBidi = input
    .normalize('NFC')
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');

  let result = '';
  for (let i = 0; i < noBidi.length; i++) {
    const code = noBidi.charCodeAt(i);
    if (code === 0x7f || code < 0x20) {
      if (allowNewlines && (code === 0x09 || code === 0x0a || code === 0x0d)) {
        result += code === 0x09 ? ' ' : noBidi[i];
      } else if (!allowNewlines) {
        result += ' ';
      }
      continue;
    }
    result += noBidi[i];
  }
  return result;
}

/**
 * Strips control characters, null bytes, and Unicode bidirectional override characters
 * (prevents Trojan Source spoofing, null-byte truncation, and invisible control injection).
 */
export function sanitizeText(input: string | null | undefined, maxLength = 200, allowNewlines = false): string {
  if (!input) return '';
  let clean = stripControlAndBidiChars(String(input), allowNewlines);
  clean = allowNewlines ? clean.replace(/[ \t]+/g, ' ') : clean.replace(/\s+/g, ' ');
  clean = clean.trim();
  if (maxLength > 0 && clean.length > maxLength) {
    clean = clean.slice(0, maxLength).trim();
  }
  return clean;
}

/**
 * Sanitizes uploaded PDF filenames against directory traversal and control-character spoofing.
 */
export function sanitizeFileName(fileName: string | null | undefined): string {
  const baseName = String(fileName || 'Assignment.pdf').split(/[/\\]/).pop() || 'Assignment.pdf';
  const cleaned = sanitizeText(baseName, 160)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '');

  if (!cleaned) return 'Assignment.pdf';
  if (!cleaned.toLowerCase().endsWith('.pdf')) {
    return `${cleaned.slice(0, 120)}.pdf`;
  }
  return cleaned;
}

/**
 * Strictly validates and canonicalizes HTTP(S) URLs.
 * Rejects javascript:, data:, vbscript:, file:, embedded credentials, control chars, or >2048 chars.
 */
export function sanitizeHttpUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = sanitizeText(url, 2048);
  if (!trimmed || /\s/.test(trimmed)) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.username || parsed.password || !parsed.hostname) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validates optional live website URL (empty is allowed).
 */
export function isValidUrl(url: string): boolean {
  if (!url || !url.trim()) return true;
  return sanitizeHttpUrl(url) !== null;
}

/**
 * Validates Supabase project endpoint URL (strict HTTPS or localhost HTTP only).
 */
export function isValidSupabaseProjectUrl(url: string): boolean {
  const parsedStr = sanitizeHttpUrl(url);
  if (!parsedStr) return false;
  try {
    const parsed = new URL(parsedStr);
    if (parsed.protocol === 'https:') {
      return true;
    }
    return (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

/**
 * Validates URLs rendered inside PdfViewerModal (<iframe src> and <a href>).
 * Allows ONLY local same-origin blob: preview URLs or HTTPS signed URLs from the configured Supabase Storage origin.
 */
export function sanitizePdfUrl(
  pdfUrl: string | null | undefined,
  allowedSupabaseUrl?: string | null
): string | null {
  if (!pdfUrl) return null;
  const raw = pdfUrl.trim();
  if (!raw || raw.length > 4096 || raw !== stripControlAndBidiChars(raw, false).replace(/\s+/g, '')) {
    return null;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'blob:') {
      const origin = (globalThis as { location?: { origin?: string } }).location?.origin;
      if (origin && parsed.origin !== 'null' && parsed.origin !== origin) {
        return null;
      }
      return raw;
    }

    const safeHttp = sanitizeHttpUrl(raw);
    if (!safeHttp) return null;

    if (allowedSupabaseUrl && isValidSupabaseProjectUrl(allowedSupabaseUrl)) {
      const supabaseOrigin = new URL(allowedSupabaseUrl).origin;
      if (parsed.origin !== supabaseOrigin) {
        return null;
      }
      if (!parsed.pathname.startsWith('/storage/v1/object/')) {
        return null;
      }
      return safeHttp;
    }

    return parsed.protocol === 'https:' && parsed.pathname.startsWith('/storage/v1/object/')
      ? safeHttp
      : null;
  } catch {
    return null;
  }
}
