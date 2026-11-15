import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { toDateTimeLocalInput } from '../src/utils/date.ts';

console.log('Running edit & delete assignment verification suite...\n');

// 1. datetime-local pre-fill formatter verification
const formatted = toDateTimeLocalInput('2026-12-31T18:30:00.000Z');
assert.match(formatted, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Must format ISO date to YYYY-MM-DDTHH:mm');
assert.equal(toDateTimeLocalInput('invalid-date'), '', 'Invalid date should return empty string');
console.log('[PASS] toDateTimeLocalInput formatting verified');

// 2. Edit & Delete SQL RPC + security checks across SQL scripts
const rootDir = path.resolve(import.meta.dirname, '..');
const sqlFiles = [
  'supabase/edit_delete_assignment_setup.sql',
  'supabase/migrations/20261115000004_edit_delete_assignment.sql',
  'supabase/multi_subject_setup.sql',
  'supabase/security_hardening.sql',
];

for (const relPath of sqlFiles) {
  const fullPath = path.join(rootDir, relPath);
  const sql = fs.readFileSync(fullPath, 'utf8');

  assert.ok(
    sql.includes('CREATE OR REPLACE FUNCTION public.update_subject_assignment'),
    `${relPath} must define update_subject_assignment()`
  );
  assert.ok(
    sql.includes('CREATE OR REPLACE FUNCTION public.delete_subject_assignment'),
    `${relPath} must define delete_subject_assignment()`
  );
  assert.ok(
    sql.includes('REVOKE ALL ON FUNCTION public.update_subject_assignment(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon'),
    `${relPath} must revoke anon/public access on update_subject_assignment`
  );
  assert.ok(
    sql.includes('REVOKE ALL ON FUNCTION public.delete_subject_assignment(TEXT) FROM PUBLIC, anon'),
    `${relPath} must revoke anon/public access on delete_subject_assignment`
  );
  assert.ok(
    sql.includes('DROP TABLE IF EXISTS public.%I CASCADE'),
    `${relPath} must drop dynamic subject tables upon delete`
  );
  assert.ok(
    sql.includes('IF NOT public.is_admin() THEN'),
    `${relPath} must enforce admin-only RBAC`
  );
  assert.ok(
    sql.includes('CREATE OR REPLACE FUNCTION public._sanitize_portal_text'),
    `${relPath} must define _sanitize_portal_text helper so it runs standalone`
  );
  assert.ok(
    sql.includes("to_regclass('public.verification_attempts')") ||
      sql.includes('CREATE TABLE IF NOT EXISTS public.verification_attempts'),
    `${relPath} must guard or create verification_attempts`
  );
}
console.log('[PASS] All SQL setup & migration scripts enforce hardened edit & delete RPCs');

console.log('\nAll edit & delete assignment tests passed!');
