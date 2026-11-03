/**
 * Normalizes roll number:
 * - Trims whitespace
 * - Converts to uppercase
 * - Collapses consecutive spaces/dashes into single standard format
 */
export function normalizeRollNumber(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Validates roll number format:
 * Allows typical university roll formats:
 * e.g., "FA21-BCS-042", "21-CS-101", "CS2021-089", "2021-SE-12"
 * Length between 4 and 25 characters, alphanumeric with dashes/slashes.
 */
export function isValidRollNumber(rollNumber: string): { valid: boolean; error?: string } {
  const normalized = normalizeRollNumber(rollNumber);
  
  if (!normalized) {
    return { valid: false, error: 'Roll number is required' };
  }
  
  if (normalized.length < 4 || normalized.length > 25) {
    return { valid: false, error: 'Roll number must be between 4 and 25 characters' };
  }

  // Regex allows letters, digits, hyphens, slashes
  const validPattern = /^[A-Z0-9]+([-_/][A-Z0-9]+)*$/;
  if (!validPattern.test(normalized)) {
    return { 
      valid: false, 
      error: 'Roll number format is invalid. Use letters, numbers, and hyphens (e.g., CS21-042)' 
    };
  }

  return { valid: true };
}

