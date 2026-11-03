import { normalizeRollNumber, isValidRollNumber } from '../src/utils/rollNumber.js';
import { generateSubmissionRef, generateVerificationCode } from '../src/utils/security.js';

async function runTests() {
  console.log('=== TEST SUITE: COMPILER CONSTRUCTION PORTAL ===\n');

  // Test 1: Roll number normalization
  console.log('Test 1: Roll number normalization & validation');
  const rolls = [
    { input: ' fa21-bcs-042 ', expected: 'FA21-BCS-042', valid: true },
    { input: '21cs101', expected: '21CS101', valid: true },
    { input: 'CS-2021-089', expected: 'CS-2021-089', valid: true },
    { input: '   ', valid: false },
    { input: 'a', valid: false },
  ];

  for (const r of rolls) {
    const norm = normalizeRollNumber(r.input);
    const check = isValidRollNumber(norm);
    if (r.valid) {
      if (!check.valid || norm !== r.expected) {
        throw new Error(`Failed on ${r.input}: norm=${norm}, valid=${check.valid}`);
      }
    } else {
      if (check.valid) {
        throw new Error(`Expected invalid for ${r.input}`);
      }
    }
  }
  console.log('✔ Roll number normalization & validation passed.\n');

  // Test 2: Reference & Verification Code Generation
  console.log('Test 2: Reference & Verification Code Format');
  const ref = generateSubmissionRef();
  const code = generateVerificationCode();
  console.log(`Generated Ref: ${ref}, Verification Code: ${code}`);
  if (!ref.startsWith('CC-') || !code.startsWith('VFY-')) {
    throw new Error('Invalid code formats');
  }
  console.log('✔ Reference code generators passed.\n');

  // Test 3: Binary PDF Signature Check (%PDF-)
  console.log('Test 3: Binary PDF Header Verification (%PDF-)');
  // Construct genuine PDF buffer
  const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37]); // %PDF-1.7
  const fakeBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]); // JPEG header

  const hasSignature = (bytes: Uint8Array) => {
    const sig = [0x25, 0x50, 0x44, 0x46, 0x2D];
    for (let i = 0; i < Math.min(bytes.length - 4, 256); i++) {
      if (
        bytes[i] === sig[0] &&
        bytes[i + 1] === sig[1] &&
        bytes[i + 2] === sig[2] &&
        bytes[i + 3] === sig[3] &&
        bytes[i + 4] === sig[4]
      ) {
        return true;
      }
    }
    return false;
  };

  if (!hasSignature(validPdfBytes)) {
    throw new Error('Valid PDF failed signature check');
  }
  if (hasSignature(fakeBytes)) {
    throw new Error('Fake JPEG passed PDF signature check');
  }
  console.log('✔ Binary magic bytes verification passed.\n');

  console.log('ALL WORKFLOW LOGIC VERIFIED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
