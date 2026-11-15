import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeStorageBucket,
  subjectNameToTableName,
  tableNameToStorageBucket,
} from '../src/utils/security.ts';

console.log('Running multi-subject table naming & storage bucket isolation suite...\n');

// 1. Table names always match subject names, and buckets follow Supabase hyphen rules
const pairs: Array<[string, string, string]> = [
  ['Compiler Construction', 'compiler_construction', 'compiler-construction'],
  ['Cyber Security', 'cyber_security', 'cyber-security'],
  ['Operating Systems', 'operating_systems', 'operating-systems'],
  ['AI', 'ai', 'subj-ai'],
  ['404 Networking Lab', 'subj_404_networking_lab', 'subj-404-networking-lab'],
  ['Assignments', 'subj_assignments', 'subj-assignments'],
];

for (const [subject, expectedTable, expectedBucket] of pairs) {
  const tbl = subjectNameToTableName(subject);
  assert.equal(tbl, expectedTable, `Expected table name ${expectedTable} for "${subject}"`);

  const bucket = tableNameToStorageBucket(tbl);
  assert.equal(bucket, expectedBucket, `Expected storage bucket ${expectedBucket} for table "${tbl}"`);
  assert.match(bucket, /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/);
  assert.equal(sanitizeStorageBucket(bucket), bucket);
}
console.log('[PASS] Subject-to-table and table-to-storage-bucket mapping verified');

// 2. Verify all SQL setup & migration scripts enforce full synchronization
const rootDir = path.resolve(import.meta.dirname, '..');
const sqlFiles = [
  'supabase/migrations/20261115000005_subject_storage_and_table_sync.sql',
  'supabase/multi_subject_setup.sql',
  'supabase/security_hardening.sql',
  'supabase/close_assignment_setup.sql',
  'supabase/edit_delete_assignment_setup.sql',
];

for (const relPath of sqlFiles) {
  const sql = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public._subject_name_to_table'), `${relPath} missing _subject_name_to_table`);
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public._subject_storage_bucket_name'), `${relPath} missing _subject_storage_bucket_name`);
  assert.ok(sql.includes('ALTER TABLE public.submissions RENAME TO %I'), `${relPath} missing legacy submissions rename`);
  assert.ok(sql.includes('ALTER TABLE public.%I RENAME TO %I'), `${relPath} missing table rename on edit`);
  assert.ok(sql.includes('storage_bucket'), `${relPath} missing storage_bucket tracking`);
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.verification_attempts'), `${relPath} missing verification_attempts creation`);
  assert.ok(sql.includes("to_regclass('public.verification_attempts') IS NOT NULL"), `${relPath} missing verification_attempts guard`);
}
console.log('[PASS] All SQL setup & migration scripts enforce matched tables, dedicated buckets & guarded RPCs');

console.log('\nAll multi-subject isolation tests passed!');
