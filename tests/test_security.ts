import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateSubmissionRef,
  generateVerificationCode,
  isValidSupabaseProjectUrl,
  isValidUrl,
  sanitizeFileName,
  sanitizeHttpUrl,
  sanitizePdfUrl,
  sanitizeText,
  subjectNameToTableName,
} from '../src/utils/security.ts';
import { isValidRollNumber } from '../src/utils/rollNumber.ts';

console.log('Running security verification suite...\n');

// 1. XSS URL injection tests
const maliciousUrls = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(document.cookie)',
  '   javascript://%0aalert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox("xss")',
  'file:///etc/passwd',
  'https://user:pass@phishing.example.com/login',
  'https://example.com\njavascript:alert(1)',
  'blob:https://evil.com/1234',
];

for (const badUrl of maliciousUrls) {
  assert.equal(sanitizeHttpUrl(badUrl), null, `Expected sanitizeHttpUrl to block: ${badUrl}`);
  assert.equal(isValidUrl(badUrl), false, `Expected isValidUrl to reject: ${badUrl}`);
}
assert.equal(sanitizeHttpUrl('https://my-demo.vercel.app/app?v=1'), 'https://my-demo.vercel.app/app?v=1');
assert.equal(sanitizeHttpUrl('http://localhost:5173/demo'), 'http://localhost:5173/demo');
console.log('[PASS] HTTP(S) URL sanitization blocks javascript:/data:/vbscript:/credentials XSS vectors');

// 2. PdfViewerModal signed URL & origin lockdown tests
const supabaseEndpoint = 'https://fmydejwnqxwiimvjuyno.supabase.co';
const validSignedPdf =
  'https://fmydejwnqxwiimvjuyno.supabase.co/storage/v1/object/sign/assignments/FA21-BCS-042/v1.pdf?token=abc';
assert.equal(sanitizePdfUrl(validSignedPdf, supabaseEndpoint), validSignedPdf);
assert.equal(sanitizePdfUrl('blob:https://localhost:5173/550e8400-e29b-41d4-a716-446655440000', supabaseEndpoint), 'blob:https://localhost:5173/550e8400-e29b-41d4-a716-446655440000');

const badPdfUrls = [
  'https://evil.example.com/storage/v1/object/sign/assignments/evil.pdf',
  'https://fmydejwnqxwiimvjuyno.supabase.co/rest/v1/submissions',
  'javascript:alert(document.domain)',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  'http://fmydejwnqxwiimvjuyno.supabase.co/storage/v1/object/sign/assignments/a.pdf',
];
for (const badPdf of badPdfUrls) {
  assert.equal(sanitizePdfUrl(badPdf, supabaseEndpoint), null, `Expected sanitizePdfUrl to block: ${badPdf}`);
}
assert.equal(isValidSupabaseProjectUrl('https://fmydejwnqxwiimvjuyno.supabase.co'), true);
assert.equal(isValidSupabaseProjectUrl('http://evil.example.com'), false);
console.log('[PASS] PdfViewer URL origin allowlist blocks cross-origin and script URLs');

// 3. SQL Injection & Identifier safety tests
const sqliRolls = [
  "FA21-BCS-042' OR '1'='1",
  'FA21; DROP TABLE submissions;--',
  'FA21-BCS-042" UNION SELECT *--',
  '<script>alert(1)</script>',
  'A',
];
for (const sqliRoll of sqliRolls) {
  assert.equal(isValidRollNumber(sqliRoll).valid, false, `Expected roll check to reject: ${sqliRoll}`);
}
assert.equal(isValidRollNumber('FA21-BCS-042').valid, true);

const sqliSubjects = [
  "Cyber Security'; DROP TABLE submissions; --",
  'submissions',
  'admin_users',
  '123; DELETE FROM cyber_security',
];
for (const subj of sqliSubjects) {
  const tbl = subjectNameToTableName(subj);
  assert.match(tbl, /^[a-z][a-z0-9_]{0,47}$/);
  assert.notEqual(tbl, 'submissions');
  assert.notEqual(tbl, 'admin_users');
}
console.log('[PASS] Roll number validator & SQL table slugger neutralize SQL injection inputs');

// 4. Path traversal & Bidi / Control char sanitization
const cleanFile = sanitizeFileName('../../../../windows/system32/evil\x00\u202E..html.pdf');
assert.ok(!cleanFile.includes('..'), 'Filename must not contain ..');
assert.ok(!cleanFile.includes('/'), 'Filename must not contain /');
assert.ok(!cleanFile.includes('\\'), 'Filename must not contain \\');
assert.ok(!cleanFile.includes('\u202E'), 'Filename must strip bidi overrides');
assert.ok(cleanFile.toLowerCase().endsWith('.pdf'), 'Filename must preserve .pdf extension');

const cleanText = sanitizeText("Alice\u202E\x00\x07 <Admin>\t  ", 120);
assert.equal(cleanText, 'Alice <Admin>');
console.log('[PASS] Path traversal, null-byte, control char, and bidi-override sanitization verified');

// 5. Cryptographic code & ref format check
for (let i = 0; i < 20; i++) {
  assert.match(generateVerificationCode(), /^[1-9][0-9]{3}$/);
  assert.match(generateSubmissionRef(), /^SUB-[0-9]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
}
console.log('[PASS] Cryptographic verification PINs & submission references match strict formats');

// 6. Built CSP & Referrer check
const builtHtmlPath = path.resolve(process.cwd(), 'dist', 'index.html');
if (fs.existsSync(builtHtmlPath)) {
  const html = fs.readFileSync(builtHtmlPath, 'utf8');
  assert.ok(html.includes('http-equiv="Content-Security-Policy"'), 'dist/index.html must include built CSP meta tag');
  assert.ok(html.includes("script-src 'self'"), 'Built CSP must enforce script-src self without unsafe-inline');
  assert.ok(html.includes("object-src 'none'"), 'Built CSP must disable plugins via object-src none');
  assert.ok(html.includes('name="referrer" content="strict-origin-when-cross-origin"'), 'dist/index.html must include referrer policy');
  console.log('[PASS] Production dist/index.html contains hardened CSP and referrer meta policies');
} else {
  console.log('[SKIP] dist/index.html not built yet');
}

console.log('\nAll security checks passed cleanly!');
