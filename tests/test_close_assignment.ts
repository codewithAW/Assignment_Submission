import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { SubjectAssignment } from '../src/types/index.ts';
import {
  CLOSE_HIDE_DURATION_MS,
  formatCountdownHms,
  getClosedAtMs,
  getRemainingCloseMs,
  isSubjectClosed,
  isSubjectHiddenFromSubmit,
} from '../src/utils/subjectStatus.ts';

console.log('Running close-assignment & 24h auto-hide verification suite...\n');

const baseTimeMs = Date.UTC(2026, 10, 15, 10, 0, 0);
const baseIso = new Date(baseTimeMs).toISOString();

const openSubject: SubjectAssignment = {
  id: 'sub-1',
  subject_name: 'Compiler Construction',
  table_name: 'submissions',
  deadline: '2026-12-31T23:59:00.000Z',
  is_active: true,
  closed_at: null,
  created_at: baseIso,
};

const closedSubject: SubjectAssignment = {
  ...openSubject,
  id: 'sub-2',
  subject_name: 'Cyber Security',
  table_name: 'cyber_security',
  closed_at: baseIso,
};

// 1. Open vs Closed state checks
assert.equal(isSubjectClosed(openSubject), false);
assert.equal(getClosedAtMs(openSubject), null);
assert.equal(getRemainingCloseMs(openSubject, baseTimeMs), 0);
assert.equal(isSubjectHiddenFromSubmit(openSubject, baseTimeMs + CLOSE_HIDE_DURATION_MS * 10), false);

assert.equal(isSubjectClosed(closedSubject), true);
assert.equal(getClosedAtMs(closedSubject), baseTimeMs);
assert.equal(isSubjectClosed({ closed_at: 'not-a-valid-date' }), false);
console.log('[PASS] Open vs closed timestamp state detection verified');

// 2. 24-hour countdown formatting and clock-skew clamping
assert.equal(formatCountdownHms(CLOSE_HIDE_DURATION_MS), '24:00:00');
assert.equal(formatCountdownHms(CLOSE_HIDE_DURATION_MS - 1000), '23:59:59');
assert.equal(formatCountdownHms(3661 * 1000), '01:01:01');
assert.equal(formatCountdownHms(0), '00:00:00');
assert.equal(formatCountdownHms(-5000), '00:00:00');

assert.equal(getRemainingCloseMs(closedSubject, baseTimeMs - 5000), CLOSE_HIDE_DURATION_MS);
assert.equal(getRemainingCloseMs(closedSubject, baseTimeMs), CLOSE_HIDE_DURATION_MS);
assert.equal(
  formatCountdownHms(getRemainingCloseMs(closedSubject, baseTimeMs + 15000)),
  '23:59:45'
);
assert.equal(getRemainingCloseMs(closedSubject, baseTimeMs + CLOSE_HIDE_DURATION_MS), 0);
console.log('[PASS] Live 24h HH:MM:SS timer formatting and clock-skew clamp verified');

// 3. 24h Select-Subject boundary (visible & blocked <24h, hidden >=24h, restored on revert)
assert.equal(isSubjectHiddenFromSubmit(closedSubject, baseTimeMs), false);
assert.equal(
  isSubjectHiddenFromSubmit(closedSubject, baseTimeMs + CLOSE_HIDE_DURATION_MS - 1),
  false
);
assert.equal(
  isSubjectHiddenFromSubmit(closedSubject, baseTimeMs + CLOSE_HIDE_DURATION_MS),
  true
);
assert.equal(
  isSubjectHiddenFromSubmit(closedSubject, baseTimeMs + CLOSE_HIDE_DURATION_MS + 3600_000),
  true
);

// Revert restores closed_at -> null and makes subject immediately visible & open again
const revertedSubject: SubjectAssignment = { ...closedSubject, closed_at: null };
assert.equal(isSubjectClosed(revertedSubject), false);
assert.equal(
  isSubjectHiddenFromSubmit(revertedSubject, baseTimeMs + CLOSE_HIDE_DURATION_MS * 2),
  false
);
console.log('[PASS] 24-hour hide boundary & Revert reactivation verified');

// 4. SQL script & migration consistency verification
const rootDir = path.resolve(import.meta.dirname, '..');
const sqlFiles = [
  'supabase/close_assignment_setup.sql',
  'supabase/migrations/20261115000003_close_assignment_timer.sql',
  'supabase/multi_subject_setup.sql',
  'supabase/security_hardening.sql',
];

for (const relPath of sqlFiles) {
  const fullPath = path.join(rootDir, relPath);
  const sql = fs.readFileSync(fullPath, 'utf8');
  assert.ok(sql.includes('closed_at'), `${relPath} must reference closed_at`);
  assert.ok(
    sql.includes('CREATE OR REPLACE FUNCTION public.close_subject_assignment'),
    `${relPath} must define close_subject_assignment()`
  );
  assert.ok(
    sql.includes('CREATE OR REPLACE FUNCTION public.revert_subject_assignment'),
    `${relPath} must define revert_subject_assignment()`
  );
  assert.ok(
    sql.includes('REVOKE ALL ON FUNCTION public.close_subject_assignment(TEXT) FROM PUBLIC, anon'),
    `${relPath} must revoke public/anon execute on close_subject_assignment`
  );
  assert.ok(
    sql.includes('REVOKE ALL ON FUNCTION public.revert_subject_assignment(TEXT) FROM PUBLIC, anon'),
    `${relPath} must revoke public/anon execute on revert_subject_assignment`
  );
  assert.ok(
    sql.includes('Assignment deadline passed'),
    `${relPath} submit_to_subject_table() must block closed subject submissions`
  );
}
console.log('[PASS] All SQL setup & migration scripts contain hardened close/revert RPCs & guards');

console.log('\nAll close-assignment tests passed!');
