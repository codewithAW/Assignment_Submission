import type { 
  Submission, 
  SubmissionFile, 
  StudentRosterItem, 
  CheckSubmissionResult, 
  SubmitAssignmentPayload, 
  SubmitAssignmentResponse,
  AdminUser
} from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { validatePDFFile } from './pdfValidator';
import { normalizeRollNumber, isValidRollNumber } from '../utils/rollNumber';
import { generateSubmissionRef, generateVerificationCode, sha256, isValidUrl } from '../utils/security';

// Default CS421: Compiler Construction Instructor Roster
export const DEFAULT_ROSTER: StudentRosterItem[] = [
  { roll_number: 'FA21-BCS-001', student_name: 'Alexander Vance', email: 'avance@cs.edu' },
  { roll_number: 'FA21-BCS-014', student_name: 'Sophia Chen', email: 'schen@cs.edu' },
  { roll_number: 'FA21-BCS-028', student_name: 'Darius Miller', email: 'dmiller@cs.edu' },
  { roll_number: 'FA21-BCS-042', student_name: 'Elena Rostova', email: 'erostova@cs.edu' },
  { roll_number: 'FA21-BCS-056', student_name: 'Marcus Brody', email: 'mbrody@cs.edu' },
  { roll_number: 'FA21-BCS-070', student_name: 'Aaliyah Khan', email: 'akhan@cs.edu' },
  { roll_number: 'FA21-BCS-083', student_name: 'Tariq Al-Mansoor', email: 'talmansoor@cs.edu' },
  { roll_number: 'FA21-BCS-099', student_name: 'Lucas Lindqvist', email: 'llindqvist@cs.edu' },
  { roll_number: 'FA21-BCS-112', student_name: 'Chloe Davenport', email: 'cdavenport@cs.edu' },
  { roll_number: 'FA21-BCS-125', student_name: 'Rohan Sharma', email: 'rsharma@cs.edu' },
];

// Local test persistence keys
const STORAGE_KEY_SUBMISSIONS = 'cc_portal_submissions_v1';
const STORAGE_KEY_FILES = 'cc_portal_files_v1';
const STORAGE_KEY_ROSTER = 'cc_portal_roster_v1';

// Seed default initial submissions for demo/testing when no submissions exist
function initializeLocalData(): { submissions: Submission[]; files: SubmissionFile[]; roster: StudentRosterItem[] } {
  try {
    const rawSubs = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
    const rawFiles = localStorage.getItem(STORAGE_KEY_FILES);
    const rawRoster = localStorage.getItem(STORAGE_KEY_ROSTER);

    if (rawSubs && rawFiles) {
      return {
        submissions: JSON.parse(rawSubs),
        files: JSON.parse(rawFiles),
        roster: rawRoster ? JSON.parse(rawRoster) : DEFAULT_ROSTER,
      };
    }
  } catch (e) {
    console.error('Error reading local storage', e);
  }

  // Pre-seed 2 sample submissions for demo
  const initialSubs: Submission[] = [
    {
      id: 'sub-demo-1',
      roll_number: 'FA21-BCS-014',
      student_name: 'Sophia Chen',
      live_website_url: 'https://compiler-lex.demo.dev',
      submission_ref: 'CC-2026-SC01',
      verification_code_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', // "test"
      status: 'submitted',
      current_version: 1,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'sub-demo-2',
      roll_number: 'FA21-BCS-042',
      student_name: 'Elena Rostova',
      live_website_url: null,
      submission_ref: 'CC-2026-ER42',
      verification_code_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      status: 'rejected',
      rejection_reason: 'Missing Abstract Syntax Tree (AST) visualization section in the report. Please include grammar definitions and test coverage analysis.',
      rejected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      rejected_by: 'instructor@compiler.edu',
      current_version: 1,
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    }
  ];

  const initialFiles: SubmissionFile[] = [
    {
      id: 'file-demo-1',
      submission_id: 'sub-demo-1',
      version: 1,
      file_path: 'FA21-BCS-014/v1_ast_compiler_report.pdf',
      file_name: 'Sophia_Chen_Compiler_Report.pdf',
      file_size: 1420500,
      mime_type: 'application/pdf',
      uploaded_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'file-demo-2',
      submission_id: 'sub-demo-2',
      version: 1,
      file_path: 'FA21-BCS-042/v1_parser_submission.pdf',
      file_name: 'Elena_Rostova_Assignment_v1.pdf',
      file_size: 2150000,
      mime_type: 'application/pdf',
      uploaded_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    }
  ];

  try {
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(initialSubs));
    localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(initialFiles));
    localStorage.setItem(STORAGE_KEY_ROSTER, JSON.stringify(DEFAULT_ROSTER));
  } catch {}

  return {
    submissions: initialSubs,
    files: initialFiles,
    roster: DEFAULT_ROSTER,
  };
}

// In-memory / browser blob store for simulated files
const localBlobStore = new Map<string, Blob>();

export const submissionService = {
  /**
   * Submit or resubmit an assignment
   */
  async submitAssignment(
    payload: SubmitAssignmentPayload, 
    onProgress?: (percent: number) => void
  ): Promise<SubmitAssignmentResponse> {
    const studentName = payload.student_name.trim();
    const rollNumber = normalizeRollNumber(payload.roll_number);

    // 1. Validation checks
    if (!studentName) {
      throw new Error('Student name is required.');
    }

    const rollCheck = isValidRollNumber(rollNumber);
    if (!rollCheck.valid) {
      throw new Error(rollCheck.error || 'Invalid roll number format.');
    }

    if (!payload.file) {
      throw new Error('Please select an assignment PDF file to upload.');
    }

    if (payload.live_website_url && !isValidUrl(payload.live_website_url)) {
      throw new Error('Invalid Live Website URL. Please include http:// or https://');
    }

    // 2. Binary PDF Validation (%PDF- signature, mime, size)
    onProgress?.(15);
    const pdfCheck = await validatePDFFile(payload.file);
    if (!pdfCheck.valid) {
      throw new Error(pdfCheck.error || 'File validation failed.');
    }

    onProgress?.(35);

    // 3. First priority: Server-Side API endpoint (/api/submit)
    // Runs secure server-side validations, duplicate prevention, and writes directly to Supabase
    try {
      const formData = new FormData();
      formData.append('student_name', studentName);
      formData.append('roll_number', rollNumber);
      if (payload.live_website_url?.trim()) {
        formData.append('live_website_url', payload.live_website_url.trim());
      }
      formData.append('file', payload.file);

      onProgress?.(55);

      const apiRes = await fetch('/api/submit', {
        method: 'POST',
        body: formData,
      });

      if (apiRes.ok) {
        const result = (await apiRes.json()) as SubmitAssignmentResponse;
        onProgress?.(100);
        return result;
      }

      // If server returned 409 (duplicate active submission) or 400 (validation error), throw it directly
      if (apiRes.status === 409 || apiRes.status === 400) {
        const errJson = await apiRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Submission was rejected by the server.');
      }
    } catch (apiErr: any) {
      if (
        apiErr.message?.includes('already has an active submission') ||
        apiErr.message?.includes('Duplicate submissions') ||
        apiErr.message?.includes('Security rejection') ||
        apiErr.message?.includes('Missing required fields')
      ) {
        throw apiErr;
      }
      console.warn('API /api/submit route not reachable, trying direct Supabase write:', apiErr?.message);
    }

    // 4. Second priority: Direct Supabase Client Write
    if (isSupabaseConfigured && supabase) {
      try {
        // First check existing submission in Supabase
        const { data: existingSub, error: fetchErr } = await supabase
          .from('submissions')
          .select('id, status, current_version, submission_ref, verification_code_hash')
          .eq('roll_number', rollNumber)
          .maybeSingle();

        if (fetchErr && fetchErr.code !== 'PGRST116') {
          console.warn('Supabase query error:', fetchErr);
        }

        // Prevent accidental duplicate submissions
        if (existingSub && existingSub.status === 'submitted') {
          throw new Error(
            `Roll number ${rollNumber} already has an active submission (${existingSub.submission_ref}). ` +
            `Duplicate submissions are prevented. Please wait for the instructor to review your assignment.`
          );
        }

        onProgress?.(70);

        const version = existingSub ? existingSub.current_version + 1 : 1;
        const submissionRef = existingSub?.submission_ref || generateSubmissionRef();
        const verificationCode = generateVerificationCode();
        const codeHash = await sha256(verificationCode);
        const nowIso = new Date().toISOString();

        // Upload to private Supabase storage bucket 'assignments'
        const sanitizedFileName = payload.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${rollNumber}/v${version}_${Date.now()}_${sanitizedFileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('assignments')
          .upload(storagePath, payload.file, {
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadErr) {
          throw new Error(`Failed to upload PDF to secure storage: ${uploadErr.message}`);
        }

        onProgress?.(85);

        let submissionId = existingSub?.id;
        if (existingSub) {
          // Resubmission of rejected assignment
          const { error: updateErr } = await supabase
            .from('submissions')
            .update({
              student_name: studentName,
              live_website_url: payload.live_website_url?.trim() || null,
              status: 'submitted',
              rejection_reason: null,
              rejected_at: null,
              rejected_by: null,
              current_version: version,
              verification_code_hash: codeHash,
              updated_at: nowIso,
            })
            .eq('id', existingSub.id);

          if (updateErr) throw updateErr;
        } else {
          // New submission
          const { data: newSub, error: insertErr } = await supabase
            .from('submissions')
            .insert({
              roll_number: rollNumber,
              student_name: studentName,
              live_website_url: payload.live_website_url?.trim() || null,
              submission_ref: submissionRef,
              verification_code_hash: codeHash,
              status: 'submitted',
              current_version: 1,
              created_at: nowIso,
              updated_at: nowIso,
            })
            .select('id')
            .single();

          if (insertErr) throw insertErr;
          submissionId = newSub.id;
        }

        // Record file entry
        const { error: fileErr } = await supabase
          .from('submission_files')
          .insert({
            submission_id: submissionId,
            version: version,
            file_path: storagePath,
            file_name: payload.file.name,
            file_size: payload.file.size,
            mime_type: 'application/pdf',
            uploaded_at: nowIso,
          });

        if (fileErr) throw fileErr;

        onProgress?.(100);

        return {
          success: true,
          message: version > 1 
            ? `Corrected assignment version ${version} submitted successfully!` 
            : 'Assignment submitted successfully!',
          submission_ref: submissionRef,
          verification_code: verificationCode,
          submitted_at: nowIso,
          version: version,
          is_resubmission: version > 1,
        };
      } catch (err: any) {
        console.error('Supabase submission write error:', err);
        // Do NOT silently fall back to local storage if Supabase is configured!
        throw new Error(
          `Supabase submission failed: ${err?.message || 'Database error'}. ` +
          `Please check that Supabase storage & RLS policies are applied.`
        );
      }
    }

    // 4. Local Test Mode (Simulated secure database & private bucket)
    await new Promise((r) => setTimeout(r, 600)); // Simulate realistic server latency
    onProgress?.(60);

    const { submissions, files } = initializeLocalData();
    const existingIndex = submissions.findIndex(s => s.roll_number === rollNumber);

    if (existingIndex !== -1 && submissions[existingIndex].status === 'submitted') {
      throw new Error(
        `Roll number ${rollNumber} already has an active submission (${submissions[existingIndex].submission_ref}). ` +
        `Accidental duplicate submissions are prevented. Please wait for your instructor to review.`
      );
    }

    onProgress?.(80);
    const isResubmission = existingIndex !== -1;
    const existing = isResubmission ? submissions[existingIndex] : null;
    const version = existing ? existing.current_version + 1 : 1;
    const submissionRef = existing ? existing.submission_ref : generateSubmissionRef();
    const verificationCode = generateVerificationCode();
    const codeHash = await sha256(verificationCode);
    const nowIso = new Date().toISOString();

    const submissionId = existing ? existing.id : `sub-${Date.now()}`;
    const storagePath = `${rollNumber}/v${version}_${Date.now()}_${payload.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Store file in local blob store for viewing/downloading
    localBlobStore.set(storagePath, payload.file);

    const fileRecord: SubmissionFile = {
      id: `file-${Date.now()}`,
      submission_id: submissionId,
      version: version,
      file_path: storagePath,
      file_name: payload.file.name,
      file_size: payload.file.size,
      mime_type: 'application/pdf',
      uploaded_at: nowIso,
    };

    if (isResubmission && existing) {
      existing.student_name = studentName;
      existing.live_website_url = payload.live_website_url?.trim() || null;
      existing.status = 'submitted';
      existing.rejection_reason = null;
      existing.rejected_at = null;
      existing.rejected_by = null;
      existing.current_version = version;
      existing.updated_at = nowIso;
      // update verification code hash so student can use new or old code
      existing.verification_code_hash = codeHash;
    } else {
      const newSubmission: Submission = {
        id: submissionId,
        roll_number: rollNumber,
        student_name: studentName,
        live_website_url: payload.live_website_url?.trim() || null,
        submission_ref: submissionRef,
        verification_code_hash: codeHash,
        status: 'submitted',
        current_version: 1,
        created_at: nowIso,
        updated_at: nowIso,
      };
      submissions.unshift(newSubmission);
    }

    files.unshift(fileRecord);

    try {
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
      localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
    } catch {}

    onProgress?.(100);

    return {
      success: true,
      message: version > 1 
        ? `Corrected assignment version ${version} uploaded successfully!` 
        : 'Assignment submitted successfully!',
      submission_ref: submissionRef,
      verification_code: verificationCode,
      submitted_at: nowIso,
      version: version,
      is_resubmission: version > 1,
    };
  },

  /**
   * Check assignment submission status
   * Secure: only returns status, name, ref, timestamp, rejection reason.
   * Never exposes file URLs to unauthenticated users.
   */
  async checkSubmission(rollNumberInput: string, verificationCode?: string): Promise<CheckSubmissionResult> {
    const rollNumber = normalizeRollNumber(rollNumberInput);
    if (!rollNumber) {
      throw new Error('Please enter your roll number.');
    }

    // Live Supabase check
    if (isSupabaseConfigured && supabase) {
      try {
        let codeHash = '';
        if (verificationCode?.trim()) {
          codeHash = await sha256(verificationCode.trim());
        }

        // Try the Postgres RPC function
        const { data, error } = await supabase.rpc('check_submission_secure', {
          p_roll_number: rollNumber,
          p_code_hash: codeHash,
        });

        if (!error && data) {
          return data as CheckSubmissionResult;
        }

        // Fallback direct query if RPC not yet created in user database
        const { data: sub, error: queryErr } = await supabase
          .from('submissions')
          .select('id, roll_number, student_name, submission_ref, status, current_version, created_at, rejection_reason, rejected_at, verification_code_hash')
          .eq('roll_number', rollNumber)
          .maybeSingle();

        if (queryErr) throw queryErr;

        if (!sub) {
          return {
            found: false,
            status: undefined,
            message: 'Your assignment has not been submitted yet.',
          };
        }

        // Verify verification code if provided
        if (verificationCode?.trim() && sub.verification_code_hash) {
          const inputHash = await sha256(verificationCode.trim());
          if (inputHash !== sub.verification_code_hash) {
            return {
              found: true,
              message: 'Verification code does not match this roll number.',
            };
          }
        }

        return {
          found: true,
          status: sub.status,
          student_name: sub.student_name,
          roll_number: sub.roll_number,
          submission_ref: sub.submission_ref,
          version: sub.current_version,
          submitted_at: sub.created_at,
          rejection_reason: sub.rejection_reason,
          rejected_at: sub.rejected_at,
        };
      } catch (err: any) {
        console.warn('Supabase checkSubmission live query error, falling back to local:', err?.message);
      }
    }

    // Local Test Mode
    await new Promise((r) => setTimeout(r, 400));
    const { submissions } = initializeLocalData();
    const sub = submissions.find(s => s.roll_number === rollNumber);

    if (!sub) {
      return {
        found: false,
        status: undefined,
        message: 'Your assignment has not been submitted yet.',
      };
    }

    // If verification code provided, check it
    if (verificationCode?.trim()) {
      const inputHash = await sha256(verificationCode.trim());
      // In local mode allow master test code "DEMO123" or actual hash match
      if (verificationCode.trim().toUpperCase() !== 'DEMO123' && inputHash !== sub.verification_code_hash) {
        return {
          found: true,
          message: 'Verification code does not match this roll number. Please double check your code.',
        };
      }
    }

    return {
      found: true,
      status: sub.status,
      student_name: sub.student_name,
      roll_number: sub.roll_number,
      submission_ref: sub.submission_ref,
      version: sub.current_version,
      submitted_at: sub.created_at,
      rejection_reason: sub.rejection_reason,
      rejected_at: sub.rejected_at,
    };
  },

  /**
   * Admin: Fetch all submissions with file versions & student roster
   */
  async getAdminDashboardData(): Promise<{
    submissions: Submission[];
    roster: StudentRosterItem[];
  }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: subs, error: subErr } = await supabase
          .from('submissions')
          .select(`
            *,
            files:submission_files(*)
          `)
          .order('created_at', { ascending: false });

        if (subErr) throw subErr;

        const { data: roster, error: rosErr } = await supabase
          .from('student_roster')
          .select('*')
          .order('roll_number', { ascending: true });

        if (rosErr) throw rosErr;

        return {
          submissions: (subs as Submission[]) || [],
          roster: (roster as StudentRosterItem[]) || DEFAULT_ROSTER,
        };
      } catch (err) {
        console.warn('Falling back to local admin data due to Supabase fetch error:', err);
      }
    }

    // Local Test Mode
    const { submissions, files, roster } = initializeLocalData();
    const enriched = submissions.map(sub => ({
      ...sub,
      files: files
        .filter(f => f.submission_id === sub.id)
        .sort((a, b) => b.version - a.version),
    }));

    return {
      submissions: enriched,
      roster,
    };
  },

  /**
   * Admin: Reject an assignment
   */
  async rejectSubmission(
    submissionId: string, 
    reason: string, 
    adminEmail = 'shahmproject@gmail.com'
  ): Promise<Submission> {
    const nowIso = new Date().toISOString();
    const rejectionNote = reason.trim() || 'Your assignment has been rejected by the instructor. Please upload an assignment that fulfills the requirements.';

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          rejection_reason: rejectionNote,
          rejected_at: nowIso,
          rejected_by: adminEmail,
          updated_at: nowIso,
        })
        .eq('id', submissionId)
        .select(`
          *,
          files:submission_files(*)
        `)
        .single();

      if (error) throw error;
      return data as Submission;
    }

    // Local Test Mode
    const { submissions, files } = initializeLocalData();
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) {
      throw new Error('Submission not found.');
    }

    sub.status = 'rejected';
    sub.rejection_reason = rejectionNote;
    sub.rejected_at = nowIso;
    sub.rejected_by = adminEmail;
    sub.updated_at = nowIso;

    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));

    return {
      ...sub,
      files: files.filter(f => f.submission_id === sub.id),
    };
  },

  /**
   * Admin: Get signed URL for PDF viewing or downloading
   */
  async getSignedPdfUrl(filePath: string, download = false, fileName?: string): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.storage
        .from('assignments')
        .createSignedUrl(filePath, 120, {
          download: download ? (fileName || true) : false,
        });

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }
      return data.signedUrl;
    }

    // Local Test Mode: If file exists in localBlobStore, create a Blob Object URL
    const blob = localBlobStore.get(filePath);
    if (blob) {
      return URL.createObjectURL(blob);
    }

    // Return a realistic mock PDF blob data URL if not stored in memory
    const samplePdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (CS421 Assignment Document: ${filePath}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
    const fallbackBlob = new Blob([samplePdfContent], { type: 'application/pdf' });
    return URL.createObjectURL(fallbackBlob);
  },

  /**
   * Admin: Authenticate
   */
  async loginAdmin(email: string, password: string): Promise<AdminUser> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data?.user) {
          return {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || 'Course Administrator',
            role: 'instructor',
          };
        }
      } catch (err: any) {
        console.warn('Supabase auth attempt:', err?.message);
      }
    }

    // Local Test Mode fallback
    await new Promise(r => setTimeout(r, 400));
    const validEmails = ['shahmproject@gmail.com', 'admin@compiler.edu', 'instructor@compiler.edu'];
    if (validEmails.includes(email.toLowerCase().trim())) {
      if (email.toLowerCase().trim() === 'shahmproject@gmail.com' && password !== 'shah@8844!') {
        throw new Error('Invalid email or password.');
      }
      return {
        id: 'admin-local-1',
        email: email.trim(),
        full_name: 'Administrator',
        role: 'admin',
      };
    }

    throw new Error('Invalid email or password.');
  },

  /**
   * Admin: Logout
   */
  async logoutAdmin(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  }
};
