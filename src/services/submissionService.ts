import type {
  Submission,
  SubmissionFile,
  StudentRosterItem,
  CheckSubmissionResult,
  SubmitAssignmentPayload,
  SubmitAssignmentResponse,
  SubjectAssignment,
  AdminUser,
} from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { validatePDFFile } from './pdfValidator';
import { normalizeRollNumber, isValidRollNumber } from '../utils/rollNumber';
import {
  generateSubmissionRef,
  generateVerificationCode,
  sha256,
  isValidUrl,
  sanitizeHttpUrl,
  sanitizeText,
  sanitizeFileName,
  sanitizeStorageBucket,
  subjectNameToTableName,
  tableNameToStorageBucket,
} from '../utils/security';

export const DEFAULT_SUBJECT: SubjectAssignment = {
  id: 'default-compiler-construction',
  subject_name: 'Compiler Construction',
  table_name: 'compiler_construction',
  storage_bucket: 'compiler-construction',
  deadline: '2026-12-31T23:59:00.000Z',
  created_by: 'shahmproject@gmail.com',
  is_active: true,
  created_at: '2026-11-03T00:00:00.000Z',
};

const isDefaultCompilerTable = (tableName: string): boolean =>
  tableName === 'compiler_construction' || tableName === 'submissions';

// Default Student Roster (used when local offline test mode is active)
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

// Local offline test persistence keys (only used when Supabase is NOT configured)
const STORAGE_KEY_SUBJECTS = 'asp_portal_subjects_v1';
const STORAGE_KEY_ROSTER = 'cc_portal_roster_v1';

function getLocalSubmissionKey(tableName: string): string {
  return isDefaultCompilerTable(tableName)
    ? 'cc_portal_submissions_v1'
    : `asp_portal_subs_${tableName}_v1`;
}

function getLocalFilesKey(tableName: string): string {
  return isDefaultCompilerTable(tableName)
    ? 'cc_portal_files_v1'
    : `asp_portal_files_${tableName}_v1`;
}

function initializeLocalSubjects(): SubjectAssignment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBJECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  const initial = [DEFAULT_SUBJECT];
  try {
    localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(initial));
  } catch {}
  return initial;
}

function updateLocalSubjectEntry(
  tableName: string,
  updater: (current: SubjectAssignment, all: SubjectAssignment[]) => SubjectAssignment
): SubjectAssignment {
  const existing = initializeLocalSubjects();
  const idx = existing.findIndex((s) => s.table_name === tableName);
  if (idx === -1) {
    throw new Error(`Subject assignment "${tableName}" was not found.`);
  }
  const updated = updater(existing[idx], existing);
  const next = [...existing];
  next[idx] = updated;
  localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(next));
  return updated;
}

function initializeLocalData(tableName = DEFAULT_SUBJECT.table_name): {
  submissions: Submission[];
  files: SubmissionFile[];
  roster: StudentRosterItem[];
} {
  const subsKey = getLocalSubmissionKey(tableName);
  const filesKey = getLocalFilesKey(tableName);

  try {
    const rawSubs = localStorage.getItem(subsKey);
    const rawFiles = localStorage.getItem(filesKey);
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

  if (!isDefaultCompilerTable(tableName)) {
    return { submissions: [], files: [], roster: DEFAULT_ROSTER };
  }

  const initialSubs: Submission[] = [
    {
      id: 'sub-demo-1',
      roll_number: 'FA21-BCS-014',
      student_name: 'Sophia Chen',
      live_website_url: 'https://compiler-lex.demo.dev',
      submission_ref: 'CC-2026-SC01',
      verification_code_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
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
      rejection_reason: 'Missing sections in the report. Please review requirements and submit an updated version.',
      rejected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      rejected_by: 'shahmproject@gmail.com',
      current_version: 1,
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  const initialFiles: SubmissionFile[] = [
    {
      id: 'file-demo-1',
      submission_id: 'sub-demo-1',
      version: 1,
      file_path: 'FA21-BCS-014/v1_ast_compiler_report.pdf',
      file_name: 'Sophia_Chen_Report.pdf',
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
    },
  ];

  try {
    localStorage.setItem(subsKey, JSON.stringify(initialSubs));
    localStorage.setItem(filesKey, JSON.stringify(initialFiles));
    localStorage.setItem(STORAGE_KEY_ROSTER, JSON.stringify(DEFAULT_ROSTER));
  } catch {}

  return {
    submissions: initialSubs,
    files: initialFiles,
    roster: DEFAULT_ROSTER,
  };
}

// In-memory blob store for offline test previews
const localBlobStore = new Map<string, Blob>();

function isMissingSqlObjectError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '').toUpperCase();
  const msg = String(err.message || '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    code === '42883' ||
    code === '42P01' ||
    code === '42703' ||
    msg.includes('could not find the table') ||
    msg.includes('could not find the function') ||
    (msg.includes('could not find the') && msg.includes('column')) ||
    msg.includes('does not exist')
  );
}

function createAssignmentClosedError(subjectName: string): Error & { code?: string } {
  const err = new Error(
    `Assignment deadline passed. Submissions for ${subjectName} are currently closed.`
  ) as Error & { code?: string };
  err.code = 'ASSIGNMENT_CLOSED';
  return err;
}

function createMigrationRequiredError(detail?: string): Error {
  const err = new Error(
    detail ||
      'Multi-subject database setup has not been applied to Supabase yet. Run supabase/multi_subject_setup.sql in Supabase SQL Editor.'
  ) as Error & { code?: string };
  err.code = 'MIGRATION_REQUIRED';
  return err;
}

function normalizeSubmissionRow(row: any): Submission {
  let files: SubmissionFile[] = [];
  if (Array.isArray(row?.files) && row.files.length > 0) {
    files = [...row.files].sort((a, b) => (b.version || 0) - (a.version || 0));
  } else if (row?.file_path) {
    files = [
      {
        id: `${row.id}-v${row.current_version || 1}`,
        submission_id: row.id,
        version: row.current_version || 1,
        file_path: row.file_path,
        file_name: row.file_name || 'Assignment.pdf',
        file_size: Number(row.file_size || 0),
        mime_type: 'application/pdf',
        uploaded_at: row.updated_at || row.created_at,
      },
    ];
  }
  return {
    ...row,
    files,
  } as Submission;
}

export const submissionService = {
  /**
   * Fetch all registered subject assignments and deadlines
   */
  async getSubjects(): Promise<{ subjects: SubjectAssignment[]; migrationRequired: boolean }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subject_assignments')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (!error) {
        const list = (data as SubjectAssignment[]) || [];
        return {
          subjects: list,
          migrationRequired: false,
        };
      }

      if (isMissingSqlObjectError(error)) {
        return {
          subjects: [DEFAULT_SUBJECT],
          migrationRequired: true,
        };
      }

      throw new Error(error.message || 'Failed to load subject assignments from Supabase.');
    }

    return {
      subjects: initializeLocalSubjects(),
      migrationRequired: false,
    };
  },

  /**
   * Admin: Assign a new subject assignment and dynamically create a Supabase table for that subject
   */
  async createSubjectAssignment(subjectName: string, deadline: string): Promise<SubjectAssignment> {
    const cleanName = sanitizeText(subjectName, 100);
    if (cleanName.length < 2) {
      throw new Error('Subject name must be at least 2 characters.');
    }

    const parsedDate = new Date(deadline);
    if (!deadline || Number.isNaN(parsedDate.getTime())) {
      throw new Error('Please choose a valid assignment deadline date and time.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('create_subject_assignment', {
        p_subject_name: cleanName,
        p_deadline: parsedDate.toISOString(),
      });

      if (error) {
        if (isMissingSqlObjectError(error)) {
          throw createMigrationRequiredError(
            `Supabase SQL setup needed (${error.message}). Copy & run supabase/multi_subject_setup.sql in Supabase Dashboard -> SQL Editor.`
          );
        }
        throw new Error(error.message || 'Failed to create subject table in Supabase.');
      }

      const created = data as SubjectAssignment;
      const desiredBucket = tableNameToStorageBucket(created.table_name);
      if (
        desiredBucket &&
        desiredBucket !== 'assignments' &&
        (!created.storage_bucket || created.storage_bucket === 'assignments')
      ) {
        try {
          const { error: bucketErr } = await supabase.storage.createBucket(desiredBucket, {
            public: false,
            fileSizeLimit: 15728640,
            allowedMimeTypes: ['application/pdf', 'application/x-pdf'],
          });
          if (!bucketErr || bucketErr.message?.toLowerCase().includes('already exists')) {
            await supabase
              .from('subject_assignments')
              .update({ storage_bucket: desiredBucket })
              .eq('table_name', created.table_name);
            created.storage_bucket = desiredBucket;
          }
        } catch {
          // Keep safe isolated folder fallback inside 'assignments' bucket if Storage bucket creation is restricted
        }
      }

      return created;
    }

    // Offline local simulation only when Supabase is not configured
    const existing = initializeLocalSubjects();
    const tableName = subjectNameToTableName(cleanName);
    if (!tableName) {
      throw new Error('Subject name must contain letters or numbers.');
    }

    if (
      existing.some(
        (s) => s.subject_name.toLowerCase() === cleanName.toLowerCase() || s.table_name === tableName
      )
    ) {
      throw new Error(`An assignment for subject "${cleanName}" already exists.`);
    }

    const created: SubjectAssignment = {
      id: `subj-${Date.now()}`,
      subject_name: cleanName,
      table_name: tableName,
      storage_bucket: tableNameToStorageBucket(tableName),
      deadline: parsedDate.toISOString(),
      created_by: 'local-admin',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const next = [...existing, created];
    localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(next));
    return created;
  },

  /**
   * Admin: Close a subject assignment (immediately blocks submissions; hides from Select Subject after 24h)
   */
  async closeSubjectAssignment(tableName: string): Promise<SubjectAssignment> {
    const cleanTable = sanitizeText(tableName, 48) || 'submissions';

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('close_subject_assignment', {
        p_table_name: cleanTable,
      });

      if (error) {
        if (isMissingSqlObjectError(error)) {
          throw createMigrationRequiredError(
            'Database function close_subject_assignment() or column closed_at is not installed in Supabase yet. Copy & run supabase/close_assignment_setup.sql in Supabase Dashboard -> SQL Editor.'
          );
        }
        throw new Error(error.message || 'Failed to close subject assignment.');
      }

      return data as SubjectAssignment;
    }

    return updateLocalSubjectEntry(cleanTable, (current) => {
      const nowIso = new Date().toISOString();
      return {
        ...current,
        closed_at: current.closed_at || nowIso,
        updated_at: nowIso,
      };
    });
  },

  /**
   * Admin: Revert a closed subject assignment so it immediately becomes available again for students
   */
  async revertSubjectAssignment(tableName: string): Promise<SubjectAssignment> {
    const cleanTable = sanitizeText(tableName, 48) || 'submissions';

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('revert_subject_assignment', {
        p_table_name: cleanTable,
      });

      if (error) {
        if (isMissingSqlObjectError(error)) {
          throw createMigrationRequiredError(
            'Database function revert_subject_assignment() is not installed in Supabase yet. Copy & run supabase/close_assignment_setup.sql in Supabase Dashboard -> SQL Editor.'
          );
        }
        throw new Error(error.message || 'Failed to revert subject assignment.');
      }

      return data as SubjectAssignment;
    }

    return updateLocalSubjectEntry(cleanTable, (current) => ({
      ...current,
      is_active: true,
      closed_at: null,
      updated_at: new Date().toISOString(),
    }));
  },

  /**
   * Admin: Update a subject assignment's display name and submission deadline
   */
  async updateSubjectAssignment(
    tableName: string,
    subjectName: string,
    deadline: string
  ): Promise<SubjectAssignment> {
    const cleanTable = sanitizeText(tableName, 48) || 'submissions';
    const cleanName = sanitizeText(subjectName, 100);
    if (cleanName.length < 2) {
      throw new Error('Assignment name must be at least 2 characters.');
    }

    const parsedDate = new Date(deadline);
    if (!deadline || Number.isNaN(parsedDate.getTime())) {
      throw new Error('Please choose a valid assignment deadline date and time.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('update_subject_assignment', {
        p_table_name: cleanTable,
        p_subject_name: cleanName,
        p_deadline: parsedDate.toISOString(),
      });

      if (error) {
        if (isMissingSqlObjectError(error)) {
          throw createMigrationRequiredError(
            `Supabase SQL setup needed (${error.message}). Copy & run supabase/edit_delete_assignment_setup.sql in Supabase Dashboard -> SQL Editor.`
          );
        }
        throw new Error(error.message || 'Failed to update assignment.');
      }

      return data as SubjectAssignment;
    }

    return updateLocalSubjectEntry(cleanTable, (current, existing) => {
      const nextTable = subjectNameToTableName(cleanName);
      if (!nextTable) {
        throw new Error('Assignment name must contain letters or numbers.');
      }
      if (
        existing.some(
          (s) =>
            s.table_name !== cleanTable &&
            (s.subject_name.toLowerCase() === cleanName.toLowerCase() || s.table_name === nextTable)
        )
      ) {
        throw new Error(`An assignment named "${cleanName}" already exists.`);
      }

      if (nextTable !== cleanTable) {
        try {
          const oldSubs = localStorage.getItem(getLocalSubmissionKey(cleanTable));
          const oldFiles = localStorage.getItem(getLocalFilesKey(cleanTable));
          if (oldSubs) {
            localStorage.setItem(getLocalSubmissionKey(nextTable), oldSubs);
            localStorage.removeItem(getLocalSubmissionKey(cleanTable));
          }
          if (oldFiles) {
            localStorage.setItem(getLocalFilesKey(nextTable), oldFiles);
            localStorage.removeItem(getLocalFilesKey(cleanTable));
          }
        } catch {}
      }

      return {
        ...current,
        subject_name: cleanName,
        table_name: nextTable,
        deadline: parsedDate.toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  },

  /**
   * Admin: Permanently delete a subject assignment, its submissions, its dedicated table, and its storage bucket
   */
  async deleteSubjectAssignment(
    tableName: string
  ): Promise<{ table_name: string; subject_name: string }> {
    const cleanTable = sanitizeText(tableName, 48);
    if (!cleanTable) {
      throw new Error('Invalid assignment table identifier.');
    }

    if (isSupabaseConfigured && supabase) {
      // Collect storage bucket and file paths before dropping the subject table
      let bucketToClean = 'assignments';
      try {
        const { data: subjMeta } = await supabase
          .from('subject_assignments')
          .select('storage_bucket')
          .eq('table_name', cleanTable)
          .maybeSingle();
        bucketToClean = sanitizeStorageBucket(subjMeta?.storage_bucket) || 'assignments';
      } catch {
        // Non-fatal
      }

      const pathsToRemove: string[] = [];
      try {
        const { data: rows } = await supabase.rpc('get_subject_submissions', {
          p_table_name: cleanTable,
        });
        if (Array.isArray(rows)) {
          for (const row of rows) {
            if (Array.isArray(row?.files)) {
              for (const f of row.files) {
                if (typeof f?.file_path === 'string' && f.file_path) {
                  pathsToRemove.push(f.file_path);
                }
              }
            }
          }
        }
      } catch {
        // Non-fatal: proceed to database deletion even if file list could not be read
      }

      const { data, error } = await supabase.rpc('delete_subject_assignment', {
        p_table_name: cleanTable,
      });

      if (error) {
        if (isMissingSqlObjectError(error)) {
          throw createMigrationRequiredError(
            `Supabase SQL setup needed (${error.message}). Copy & run supabase/edit_delete_assignment_setup.sql in Supabase Dashboard -> SQL Editor.`
          );
        }
        throw new Error(error.message || 'Failed to delete assignment.');
      }

      const rpcBucket = sanitizeStorageBucket(data?.storage_bucket) || bucketToClean;
      const bucketsToRemoveFrom = new Set<string>(['assignments']);
      if (rpcBucket) bucketsToRemoveFrom.add(rpcBucket);

      if (pathsToRemove.length > 0) {
        for (const b of bucketsToRemoveFrom) {
          try {
            await supabase.storage.from(b).remove(pathsToRemove);
          } catch {
            // Best-effort storage cleanup after DB table removal
          }
        }
      }

      if (rpcBucket && rpcBucket !== 'assignments') {
        try {
          await supabase.storage.emptyBucket(rpcBucket);
          await supabase.storage.deleteBucket(rpcBucket);
        } catch {
          // Best-effort bucket cleanup after DB table removal
        }
      }

      return {
        table_name: String(data?.table_name || cleanTable),
        subject_name: String(data?.subject_name || cleanTable),
      };
    }

    const existing = initializeLocalSubjects();
    const target = existing.find((s) => s.table_name === cleanTable);
    if (!target) {
      throw new Error(`Subject assignment "${cleanTable}" was not found.`);
    }

    const next = existing.filter((s) => s.table_name !== cleanTable);
    try {
      localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(next));
      localStorage.removeItem(getLocalSubmissionKey(cleanTable));
      localStorage.removeItem(getLocalFilesKey(cleanTable));
    } catch {}

    return {
      table_name: cleanTable,
      subject_name: target.subject_name,
    };
  },

  /**
   * Submit or resubmit an assignment to the selected subject's Supabase table
   */
  async submitAssignment(
    payload: SubmitAssignmentPayload,
    onProgress?: (percent: number) => void
  ): Promise<SubmitAssignmentResponse> {
    const studentName = sanitizeText(payload.student_name, 120);
    const rollNumber = normalizeRollNumber(sanitizeText(payload.roll_number, 25));
    const tableName =
      sanitizeText(payload.table_name || DEFAULT_SUBJECT.table_name, 48) ||
      DEFAULT_SUBJECT.table_name;
    const subjectName =
      sanitizeText(payload.subject_name || DEFAULT_SUBJECT.subject_name, 100) ||
      DEFAULT_SUBJECT.subject_name;

    // 1. Validation checks
    if (studentName.length < 2) {
      throw new Error('Student name must be between 2 and 120 characters.');
    }

    const rollCheck = isValidRollNumber(rollNumber);
    if (!rollCheck.valid) {
      throw new Error(rollCheck.error || 'Invalid roll number format.');
    }

    if (!payload.file) {
      throw new Error('Please select an assignment PDF file to upload.');
    }

    if (payload.live_website_url?.trim() && !isValidUrl(payload.live_website_url)) {
      throw new Error('Invalid Live Website URL. Only http:// or https:// links without credentials are allowed.');
    }
    const safeLiveUrl = sanitizeHttpUrl(payload.live_website_url);
    const safeFileName = sanitizeFileName(payload.file.name);

    // 2. Binary PDF Validation (%PDF- signature, mime, size)
    onProgress?.(15);
    const pdfCheck = await validatePDFFile(payload.file);
    if (!pdfCheck.valid) {
      throw new Error(pdfCheck.error || 'File validation failed.');
    }

    onProgress?.(35);

    // 3. Live Supabase Path
    if (isSupabaseConfigured && supabase) {
      // Guard against closed subject & read dedicated storage bucket before uploading PDF
      const { data: subjState, error: subjErr } = await supabase
        .from('subject_assignments')
        .select('*')
        .eq('table_name', tableName)
        .maybeSingle();

      if (!subjErr && subjState && (subjState.closed_at || subjState.is_active === false)) {
        throw createAssignmentClosedError(subjectName);
      }

      let version = 1;
      let submissionRef = generateSubmissionRef();

      // Step A: Pre-check duplicate inside this subject's dedicated table BEFORE uploading PDF
      const { data: checkData, error: checkErr } = await supabase.rpc('check_subject_roll_exists', {
        p_table_name: tableName,
        p_roll_number: rollNumber,
      });

      if (!checkErr && checkData) {
        if (checkData.exists && checkData.status === 'submitted') {
          throw new Error(
            `Roll number ${rollNumber} already has an active submission (${checkData.submission_ref}) for ${subjectName}. Duplicate submissions are prevented.`
          );
        }
        if (checkData.exists) {
          version = Number(checkData.current_version || 1) + 1;
          submissionRef = checkData.submission_ref || submissionRef;
        }
      } else if (isMissingSqlObjectError(checkErr)) {
        throw createMigrationRequiredError(
          `Multi-subject database setup needed (${checkErr?.message || 'missing RPC'}). Copy & run supabase/multi_subject_setup.sql in Supabase Dashboard -> SQL Editor.`
        );
      } else if (checkErr) {
        throw new Error(checkErr.message || 'Failed to verify existing submission status.');
      }

      onProgress?.(60);

      const verificationCode = generateVerificationCode();
      const codeHash = await sha256(verificationCode);
      const nowIso = new Date().toISOString();

      // Step B: Upload PDF to the subject's dedicated private storage bucket (with folder fallback inside 'assignments')
      const preferredBucket = sanitizeStorageBucket(subjState?.storage_bucket) || 'assignments';
      const buildPath = (bucket: string) =>
        bucket !== 'assignments' || tableName === 'submissions'
          ? `${rollNumber}/v${version}_${Date.now()}_${safeFileName}`
          : `${tableName}/${rollNumber}/v${version}_${Date.now()}_${safeFileName}`;

      let activeBucket = preferredBucket;
      let storagePath = buildPath(activeBucket);

      let { error: uploadErr } = await supabase.storage
        .from(activeBucket)
        .upload(storagePath, payload.file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (
        uploadErr &&
        activeBucket !== 'assignments' &&
        uploadErr.message?.toLowerCase().includes('bucket')
      ) {
        activeBucket = 'assignments';
        storagePath = buildPath(activeBucket);
        const fallbackRes = await supabase.storage
          .from(activeBucket)
          .upload(storagePath, payload.file, {
            contentType: 'application/pdf',
            upsert: false,
          });
        uploadErr = fallbackRes.error;
      }

      if (uploadErr) {
        throw new Error(`Failed to upload PDF to secure storage: ${uploadErr.message}`);
      }

      onProgress?.(85);

      // Step C: Write record exclusively through validated PostgreSQL RPC
      const { data: rpcRes, error: submitErr } = await supabase.rpc('submit_to_subject_table', {
        p_table_name: tableName,
        p_roll_number: rollNumber,
        p_student_name: studentName,
        p_live_website_url: safeLiveUrl,
        p_submission_ref: submissionRef,
        p_code_hash: codeHash,
        p_file_path: storagePath,
        p_file_name: safeFileName,
        p_file_size: payload.file.size,
      });

      if (submitErr || !rpcRes) {
        if (isMissingSqlObjectError(submitErr)) {
          throw createMigrationRequiredError(
            `Multi-subject database setup needed (${submitErr?.message || 'missing database object'}). Copy & run supabase/multi_subject_setup.sql in Supabase Dashboard -> SQL Editor.`
          );
        }
        const rpcMsg = submitErr?.message || 'Database submission failed.';
        if (rpcMsg.toLowerCase().includes('assignment deadline passed')) {
          throw createAssignmentClosedError(subjectName);
        }
        throw new Error(rpcMsg);
      }

      onProgress?.(100);
      const finalVersion = Number(rpcRes.version ?? version);
      return {
        success: true,
        message:
          finalVersion > 1
            ? `Corrected assignment version ${finalVersion} submitted for ${subjectName}!`
            : `Assignment submitted successfully for ${subjectName}!`,
        submission_ref: rpcRes.submission_ref || submissionRef,
        verification_code: verificationCode,
        submitted_at: rpcRes.submitted_at || nowIso,
        version: finalVersion,
        is_resubmission: Boolean(rpcRes.is_resubmission ?? finalVersion > 1),
        subject_name: subjectName,
        table_name: tableName,
      };
    }

    // 4. Local Offline Test Mode (when Supabase is NOT configured)
    const localSubject = initializeLocalSubjects().find((s) => s.table_name === tableName);
    if (localSubject?.closed_at) {
      throw createAssignmentClosedError(subjectName);
    }

    await new Promise((r) => setTimeout(r, 500));
    onProgress?.(60);

    const { submissions, files } = initializeLocalData(tableName);
    const existingIndex = submissions.findIndex((s) => s.roll_number === rollNumber);

    if (existingIndex !== -1 && submissions[existingIndex].status === 'submitted') {
      throw new Error(
        `Roll number ${rollNumber} already has an active submission (${submissions[existingIndex].submission_ref}) for ${subjectName}.`
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
    const storagePath = `${tableName}/${rollNumber}/v${version}_${Date.now()}_${safeFileName}`;

    localBlobStore.set(storagePath, payload.file);

    const fileRecord: SubmissionFile = {
      id: `file-${Date.now()}`,
      submission_id: submissionId,
      version,
      file_path: storagePath,
      file_name: safeFileName,
      file_size: payload.file.size,
      mime_type: 'application/pdf',
      uploaded_at: nowIso,
    };

    if (isResubmission && existing) {
      existing.student_name = studentName;
      existing.live_website_url = safeLiveUrl;
      existing.status = 'submitted';
      existing.rejection_reason = null;
      existing.rejected_at = null;
      existing.rejected_by = null;
      existing.current_version = version;
      existing.updated_at = nowIso;
      existing.verification_code_hash = codeHash;
    } else {
      submissions.unshift({
        id: submissionId,
        roll_number: rollNumber,
        student_name: studentName,
        live_website_url: safeLiveUrl,
        submission_ref: submissionRef,
        verification_code_hash: codeHash,
        status: 'submitted',
        current_version: 1,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }

    files.unshift(fileRecord);

    try {
      localStorage.setItem(getLocalSubmissionKey(tableName), JSON.stringify(submissions));
      localStorage.setItem(getLocalFilesKey(tableName), JSON.stringify(files));
    } catch {}

    onProgress?.(100);

    return {
      success: true,
      message:
        version > 1
          ? `Corrected assignment version ${version} uploaded for ${subjectName}!`
          : `Assignment submitted successfully for ${subjectName}!`,
      submission_ref: submissionRef,
      verification_code: verificationCode,
      submitted_at: nowIso,
      version,
      is_resubmission: version > 1,
      subject_name: subjectName,
      table_name: tableName,
    };
  },

  /**
   * Check assignment submission status inside the selected subject table
   */
  async checkSubmission(
    rollNumberInput: string,
    verificationCode?: string,
    tableName = DEFAULT_SUBJECT.table_name,
    subjectName = DEFAULT_SUBJECT.subject_name
  ): Promise<CheckSubmissionResult> {
    const rollNumber = normalizeRollNumber(sanitizeText(rollNumberInput, 25));
    if (!rollNumber) {
      throw new Error('Please enter your roll number.');
    }

    const cleanCode = sanitizeText(verificationCode, 12);
    if (!cleanCode) {
      throw new Error('Please enter the 4-digit verification code from your submission receipt.');
    }
    const codeHash = await sha256(cleanCode);

    // Live Supabase check exclusively via SECURITY DEFINER RPC (never query raw table / hash directly)
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('check_subject_submission_secure', {
        p_table_name: tableName,
        p_roll_number: rollNumber,
        p_code_hash: codeHash,
      });

      if (!error && data) {
        return {
          ...(data as CheckSubmissionResult),
          subject_name: subjectName,
        };
      }

      if (isMissingSqlObjectError(error) && tableName === 'submissions') {
        const { data: legacyRpcData, error: legacyRpcErr } = await supabase.rpc('check_submission_secure', {
          p_roll_number: rollNumber,
          p_code_hash: codeHash,
        });

        if (!legacyRpcErr && legacyRpcData) {
          return {
            ...(legacyRpcData as CheckSubmissionResult),
            subject_name: subjectName,
          };
        }
      }

      throw new Error(error?.message || 'Failed to check submission status in Supabase.');
    }

    // Offline Local Test Mode
    await new Promise((r) => setTimeout(r, 350));
    const { submissions } = initializeLocalData(tableName);
    const sub = submissions.find((s) => s.roll_number === rollNumber);

    if (!sub) {
      return {
        found: false,
        status: undefined,
        subject_name: subjectName,
        message: 'Your assignment has not been submitted yet for this subject.',
      };
    }

    if (codeHash !== sub.verification_code_hash) {
      return {
        found: true,
        invalid_code: true,
        subject_name: subjectName,
        message: 'Verification code does not match this roll number. Please double check your code.',
      };
    }

    return {
      found: true,
      status: sub.status,
      student_name: sub.student_name,
      roll_number: sub.roll_number,
      submission_ref: sub.submission_ref,
      subject_name: subjectName,
      version: sub.current_version,
      submitted_at: sub.created_at,
      rejection_reason: sub.rejection_reason,
      rejected_at: sub.rejected_at,
    };
  },

  /**
   * Admin: Fetch all submissions for the selected subject table + student roster
   */
  async getAdminDashboardData(tableName = DEFAULT_SUBJECT.table_name): Promise<{
    submissions: Submission[];
    roster: StudentRosterItem[];
  }> {
    if (isSupabaseConfigured && supabase) {
      let normalizedSubmissions: Submission[] = [];

      const { data: rpcSubs, error: rpcErr } = await supabase.rpc('get_subject_submissions', {
        p_table_name: tableName,
      });

      if (!rpcErr && Array.isArray(rpcSubs)) {
        normalizedSubmissions = rpcSubs.map(normalizeSubmissionRow);
      } else if (tableName === 'submissions') {
        const { data: subs, error: subErr } = await supabase
          .from('submissions')
          .select(`
            id, roll_number, student_name, live_website_url, submission_ref, status, rejection_reason, rejected_at, rejected_by, current_version, created_at, updated_at,
            files:submission_files(id, submission_id, version, file_path, file_name, file_size, mime_type, uploaded_at)
          `)
          .order('created_at', { ascending: false });

        if (subErr) throw new Error(subErr.message);
        normalizedSubmissions = (subs || []).map(normalizeSubmissionRow);
      } else {
        const { data: directSubs, error: directErr } = await supabase
          .from(tableName)
          .select('id, roll_number, student_name, live_website_url, submission_ref, status, rejection_reason, rejected_at, rejected_by, current_version, file_path, file_name, file_size, files, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (directErr) {
          throw new Error(rpcErr?.message || directErr.message);
        }
        normalizedSubmissions = (directSubs || []).map(normalizeSubmissionRow);
      }

      const { data: roster, error: rosErr } = await supabase
        .from('student_roster')
        .select('*')
        .order('roll_number', { ascending: true });

      if (rosErr) throw new Error(rosErr.message);

      return {
        submissions: normalizedSubmissions,
        roster: (roster as StudentRosterItem[]) || [],
      };
    }

    // Offline Local Test Mode
    const { submissions, files, roster } = initializeLocalData(tableName);
    const enriched = submissions.map((sub) => ({
      ...sub,
      files: files
        .filter((f) => f.submission_id === sub.id)
        .sort((a, b) => b.version - a.version),
    }));

    return {
      submissions: enriched,
      roster,
    };
  },

  /**
   * Admin: Reject an assignment inside the selected subject table
   */
  async rejectSubmission(
    submissionId: string,
    reason: string,
    adminEmail = 'Administrator',
    tableName = DEFAULT_SUBJECT.table_name
  ): Promise<Submission> {
    const nowIso = new Date().toISOString();
    const cleanedReason = sanitizeText(reason, 1000, true);
    const rejectionNote =
      cleanedReason ||
      'Your assignment has been rejected by the instructor. Please upload an assignment that fulfills the requirements.';
    const safeAdminEmail = sanitizeText(adminEmail, 120) || 'Administrator';

    if (isSupabaseConfigured && supabase) {
      const { data: rpcUpdated, error: rpcErr } = await supabase.rpc('reject_subject_submission', {
        p_table_name: tableName,
        p_submission_id: submissionId,
        p_reason: rejectionNote,
        p_rejected_by: safeAdminEmail,
      });

      if (!rpcErr && rpcUpdated) {
        return normalizeSubmissionRow(rpcUpdated);
      }

      if (tableName === 'submissions' && isMissingSqlObjectError(rpcErr)) {
        const { data, error } = await supabase
          .from('submissions')
          .update({
            status: 'rejected',
            rejection_reason: rejectionNote,
            rejected_at: nowIso,
            rejected_by: safeAdminEmail,
            updated_at: nowIso,
          })
          .eq('id', submissionId)
          .select(`
            id, roll_number, student_name, live_website_url, submission_ref, status, rejection_reason, rejected_at, rejected_by, current_version, created_at, updated_at,
            files:submission_files(id, submission_id, version, file_path, file_name, file_size, mime_type, uploaded_at)
          `)
          .single();

        if (error) throw new Error(error.message);
        return normalizeSubmissionRow(data);
      }

      throw new Error(rpcErr?.message || 'Failed to reject submission.');
    }

    // Offline Local Test Mode
    const { submissions, files } = initializeLocalData(tableName);
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) {
      throw new Error('Submission not found.');
    }

    sub.status = 'rejected';
    sub.rejection_reason = rejectionNote;
    sub.rejected_at = nowIso;
    sub.rejected_by = safeAdminEmail;
    sub.updated_at = nowIso;

    localStorage.setItem(getLocalSubmissionKey(tableName), JSON.stringify(submissions));

    return {
      ...sub,
      files: files.filter((f) => f.submission_id === sub.id),
    };
  },

  /**
   * Admin: Get signed URL for PDF viewing or downloading
   */
  async getSignedPdfUrl(
    filePath: string,
    download = false,
    fileName?: string,
    storageBucket?: string | null
  ): Promise<string> {
    const cleanPath = sanitizeText(filePath, 512);
    if (
      !cleanPath ||
      cleanPath.includes('..') ||
      cleanPath.includes('//') ||
      !/^[A-Za-z0-9][A-Za-z0-9._/-]*\.pdf$/i.test(cleanPath)
    ) {
      throw new Error('Invalid PDF storage path requested.');
    }

    const safeDownloadName = fileName ? sanitizeFileName(fileName) : true;

    if (isSupabaseConfigured && supabase) {
      const primaryBucket = sanitizeStorageBucket(storageBucket) || 'assignments';
      let { data, error } = await supabase.storage
        .from(primaryBucket)
        .createSignedUrl(cleanPath, 120, {
          download: download ? safeDownloadName : false,
        });

      // Fallback to shared 'assignments' bucket for historical files uploaded before separate subject buckets
      if ((error || !data?.signedUrl) && primaryBucket !== 'assignments') {
        const legacyRes = await supabase.storage
          .from('assignments')
          .createSignedUrl(cleanPath, 120, {
            download: download ? safeDownloadName : false,
          });
        data = legacyRes.data;
        error = legacyRes.error;
      }

      if (error || !data?.signedUrl) {
        throw new Error(`Failed to create signed URL: ${error?.message || 'Unknown error'}`);
      }
      return data.signedUrl;
    }

    // Offline Test Mode fallback
    const blob = localBlobStore.get(cleanPath);
    if (blob) {
      return URL.createObjectURL(blob);
    }

    const samplePdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (Assignment Document) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
    const fallbackBlob = new Blob([samplePdfContent], { type: 'application/pdf' });
    return URL.createObjectURL(fallbackBlob);
  },

  /**
   * Admin: Verify active Supabase Auth session & membership in admin_users
   */
  async verifyAdminSession(): Promise<AdminUser | null> {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (userErr || !user || !user.email) {
      return null;
    }

    const { data: verifyRpc, error: verifyErr } = await supabase.rpc('verify_admin_access');
    if (!verifyErr && verifyRpc) {
      if (!verifyRpc.is_admin) {
        await supabase.auth.signOut();
        return null;
      }
      return {
        id: user.id,
        email: verifyRpc.email || user.email,
        full_name: sanitizeText(verifyRpc.full_name || 'Administrator', 100),
        role: verifyRpc.role === 'instructor' ? 'instructor' : 'admin',
      };
    }

    // Fallback when verify_admin_access() has not been deployed yet
    const { data: adminRows, error: adminErr } = await supabase
      .from('admin_users')
      .select('email, full_name, role');

    if (adminErr || !Array.isArray(adminRows)) {
      await supabase.auth.signOut();
      return null;
    }

    const match = adminRows.find(
      (row) => row.email && row.email.toLowerCase().trim() === user.email!.toLowerCase().trim()
    );
    if (!match) {
      await supabase.auth.signOut();
      return null;
    }

    return {
      id: user.id,
      email: match.email,
      full_name: sanitizeText(match.full_name || 'Administrator', 100),
      role: match.role === 'instructor' ? 'instructor' : 'admin',
    };
  },

  /**
   * Admin: Authenticate via Supabase Auth and verify admin_users membership
   */
  async loginAdmin(email: string, password: string): Promise<AdminUser> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Live Supabase authentication is not configured. Configure valid Supabase environment credentials to sign in as administrator.'
      );
    }

    const cleanEmail = sanitizeText(email, 160).toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Administrator email and password are required.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data?.user) {
      throw new Error(error?.message || 'Invalid administrator email or password.');
    }

    const verifiedAdmin = await this.verifyAdminSession();
    if (!verifiedAdmin) {
      throw new Error('Forbidden: This account is not registered in admin_users.');
    }

    return verifiedAdmin;
  },

  /**
   * Admin: Logout
   */
  async logoutAdmin(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  },
};
