import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  sanitizeFileName,
  sanitizeHttpUrl,
  sanitizeText,
} from '../src/utils/security.ts';
import { normalizeRollNumber, isValidRollNumber } from '../src/utils/rollNumber.ts';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MAX_UPLOAD_BODY_BYTES = 16 * 1024 * 1024;
const MAX_PDF_BYTES = 15 * 1024 * 1024;

const adminClient =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}

function generateSubmissionRef(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars.charAt(crypto.randomInt(chars.length));
  }
  return `SUB-${year}-${rand}`;
}

function generateVerificationCode(): string {
  return crypto.randomInt(1000, 10000).toString();
}

function sendJson(res: ServerResponse, statusCode: number, body: Record<string, unknown>): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

export async function handleApiSubmit(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!adminClient) {
    sendJson(res, 503, { error: 'Server service role key not configured. Use client Supabase RPC.' });
    return;
  }

  // Same-origin CSRF guard when browser Origin header is present
  const originHeader = req.headers.origin;
  const hostHeader = req.headers.host;
  if (originHeader && hostHeader) {
    try {
      const originUrl = new URL(originHeader);
      if (originUrl.host !== hostHeader) {
        sendJson(res, 403, { error: 'Forbidden cross-origin submission request.' });
        return;
      }
    } catch {
      sendJson(res, 403, { error: 'Invalid request origin.' });
      return;
    }
  }

  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_UPLOAD_BODY_BYTES) {
    sendJson(res, 413, { error: 'Request payload exceeds maximum allowed size.' });
    return;
  }

  try {
    const url = 'http://' + (req.headers.host || 'localhost') + (req.url || '/api/submit');
    const webReq = new Request(url, {
      method: req.method,
      headers: req.headers as any,
      body: req as any,
      duplex: 'half',
    });

    const formData = await webReq.formData();
    const rawStudentName = formData.get('student_name') as string;
    const rawRoll = formData.get('roll_number') as string;
    const rawLiveUrl = formData.get('live_website_url') as string;
    const file = formData.get('file') as File | null;

    if (!rawStudentName?.trim() || !rawRoll?.trim() || !file) {
      sendJson(res, 400, {
        error: 'Missing required fields: Student Name, Roll Number, and Assignment PDF are required.',
      });
      return;
    }

    const studentName = sanitizeText(rawStudentName, 120);
    if (studentName.length < 2) {
      sendJson(res, 400, { error: 'Student name must be between 2 and 120 characters.' });
      return;
    }

    const rollNumber = normalizeRollNumber(sanitizeText(rawRoll, 25));
    const rollCheck = isValidRollNumber(rollNumber);
    if (!rollCheck.valid) {
      sendJson(res, 400, { error: rollCheck.error || 'Invalid roll number format.' });
      return;
    }

    let liveWebsiteUrl: string | null = null;
    if (rawLiveUrl && rawLiveUrl.trim()) {
      liveWebsiteUrl = sanitizeHttpUrl(rawLiveUrl);
      if (!liveWebsiteUrl) {
        sendJson(res, 400, {
          error: 'Invalid Live Website URL. Only http:// or https:// links without credentials are permitted.',
        });
        return;
      }
    }

    // 1. File size validation (100 bytes to 15MB)
    if (file.size > MAX_PDF_BYTES) {
      sendJson(res, 400, { error: 'File size exceeds 15MB limit. Please compress your PDF.' });
      return;
    }
    if (file.size < 100) {
      sendJson(res, 400, { error: 'File is too small to be a genuine PDF document.' });
      return;
    }

    // 2. Extension validation & filename sanitization
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      sendJson(res, 400, { error: 'Invalid file format. Only genuine .pdf documents are accepted.' });
      return;
    }
    const safeFileName = sanitizeFileName(file.name);

    // 3. Binary PDF Magic Bytes validation (%PDF-)
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const headerSlice = buffer.subarray(0, 1024);
    const pdfSignature = Buffer.from('%PDF-');
    if (!headerSlice.includes(pdfSignature)) {
      sendJson(res, 400, {
        error: 'Security rejection: Uploaded file does not contain a valid %PDF- binary header.',
      });
      return;
    }

    // 4. Check existing submission in Supabase
    const { data: existingSub, error: fetchErr } = await adminClient
      .from('submissions')
      .select('id, status, current_version, submission_ref')
      .eq('roll_number', rollNumber)
      .maybeSingle();

    if (fetchErr) {
      console.error('Supabase query error:', fetchErr.message);
      sendJson(res, 500, { error: 'Failed to verify existing submission status.' });
      return;
    }

    if (existingSub && existingSub.status === 'submitted') {
      sendJson(res, 409, {
        error: `Roll number ${rollNumber} already has an active submission (${existingSub.submission_ref}). Duplicate submissions are prevented.`,
      });
      return;
    }

    const isResubmission = Boolean(existingSub && existingSub.status === 'rejected');
    const version = existingSub ? existingSub.current_version + 1 : 1;
    const submissionRef = existingSub?.submission_ref || generateSubmissionRef();
    const verificationCode = generateVerificationCode();
    const codeHash = sha256(verificationCode);
    const nowIso = new Date().toISOString();

    // 5. Upload PDF to private Supabase storage bucket 'assignments' (no overwrite)
    const storagePath = `${rollNumber}/v${version}_${Date.now()}_${safeFileName}`;

    const { error: uploadErr } = await adminClient.storage
      .from('assignments')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr.message);
      sendJson(res, 500, { error: 'Failed to store uploaded assignment PDF.' });
      return;
    }

    // 6. Record in submissions table
    let submissionId = existingSub?.id;
    if (existingSub) {
      const { error: updateErr } = await adminClient
        .from('submissions')
        .update({
          student_name: studentName,
          live_website_url: liveWebsiteUrl,
          status: 'submitted',
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          current_version: version,
          verification_code_hash: codeHash,
          updated_at: nowIso,
        })
        .eq('id', existingSub.id);

      if (updateErr) {
        console.error('Update submission error:', updateErr.message);
        sendJson(res, 500, { error: 'Failed to update submission record.' });
        return;
      }
    } else {
      const { data: newSub, error: insertErr } = await adminClient
        .from('submissions')
        .insert({
          roll_number: rollNumber,
          student_name: studentName,
          live_website_url: liveWebsiteUrl,
          submission_ref: submissionRef,
          verification_code_hash: codeHash,
          status: 'submitted',
          current_version: 1,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('Insert submission error:', insertErr.message);
        sendJson(res, 500, { error: 'Failed to save submission record.' });
        return;
      }
      submissionId = newSub.id;
    }

    // 7. Record file version in submission_files table
    const { error: fileErr } = await adminClient
      .from('submission_files')
      .insert({
        submission_id: submissionId,
        version: version,
        file_path: storagePath,
        file_name: safeFileName,
        file_size: file.size,
        mime_type: 'application/pdf',
        uploaded_at: nowIso,
      });

    if (fileErr) {
      console.error('Insert file error:', fileErr.message);
      sendJson(res, 500, { error: 'Failed to save file version metadata.' });
      return;
    }

    sendJson(res, 200, {
      success: true,
      message: isResubmission
        ? `Corrected assignment version ${version} submitted successfully!`
        : 'Assignment submitted successfully!',
      submission_ref: submissionRef,
      verification_code: verificationCode,
      submitted_at: nowIso,
      version: version,
      is_resubmission: isResubmission,
    });
  } catch (err) {
    console.error('API submit error:', err);
    sendJson(res, 500, { error: 'Internal server error occurred during submission.' });
  }
}
