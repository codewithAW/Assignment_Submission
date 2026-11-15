import type { SubjectAssignment } from '../types';

/** Duration (24 hours) a closed assignment remains listed before auto-hiding from student submission select. */
export const CLOSE_HIDE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Parse a subject's closed_at ISO timestamp into epoch ms, or return null when open.
 */
export function getClosedAtMs(subject?: Pick<SubjectAssignment, 'closed_at'> | null): number | null {
  if (!subject?.closed_at) return null;
  const ms = Date.parse(subject.closed_at);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * True when the administrator has closed this assignment (waiting on 24h auto-hide or already hidden).
 */
export function isSubjectClosed(subject?: Pick<SubjectAssignment, 'closed_at'> | null): boolean {
  return getClosedAtMs(subject) !== null;
}

/**
 * Remaining milliseconds until a closed assignment disappears from student submission Select Subject.
 * Clamped to [0, 24h] so minor clock skew never renders > 24:00:00.
 */
export function getRemainingCloseMs(
  subject?: Pick<SubjectAssignment, 'closed_at'> | null,
  nowMs = Date.now()
): number {
  const closedAtMs = getClosedAtMs(subject);
  if (closedAtMs === null) return 0;
  const rawRemaining = closedAtMs + CLOSE_HIDE_DURATION_MS - nowMs;
  return Math.min(CLOSE_HIDE_DURATION_MS, Math.max(0, rawRemaining));
}

/**
 * True once 24 hours have elapsed since closed_at and the option should be removed from student submit dropdowns.
 */
export function isSubjectHiddenFromSubmit(
  subject?: Pick<SubjectAssignment, 'closed_at'> | null,
  nowMs = Date.now()
): boolean {
  const closedAtMs = getClosedAtMs(subject);
  if (closedAtMs === null) return false;
  return nowMs >= closedAtMs + CLOSE_HIDE_DURATION_MS;
}

/**
 * Format millisecond duration as HH:MM:SS (e.g. 23:59:42 or 00:00:00).
 */
export function formatCountdownHms(ms: number): string {
  const safeMs = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
