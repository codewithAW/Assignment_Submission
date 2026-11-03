/**
 * Generates an academic submission reference code
 * Example: CC-2026-F49B
 */
export function generateSubmissionRef(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `CC-${year}-${randomPart}`;
}

/**
 * Generates an easy-to-remember 4-digit verification code
 * Example: "4829"
 */
export function generateVerificationCode(): string {
  // Simple, memorable 4-digit code between 1000 and 9999
  const pin = Math.floor(1000 + Math.random() * 9000);
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

/**
 * Validates optional live website URL
 */
export function isValidUrl(url: string): boolean {
  if (!url || !url.trim()) return true; // Optional field
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

