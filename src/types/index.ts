export type SubmissionStatus = 'submitted' | 'rejected';

export interface SubjectAssignment {
  id: string;
  subject_name: string;
  table_name: string;
  storage_bucket?: string | null;
  deadline: string;
  created_by?: string | null;
  is_active: boolean;
  closed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SubmissionFile {
  id: string;
  submission_id: string;
  version: number;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  signed_url?: string;
}

export interface Submission {
  id: string;
  roll_number: string;
  student_name: string;
  live_website_url?: string | null;
  submission_ref: string;
  verification_code_hash?: string;
  status: SubmissionStatus;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  current_version: number;
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  created_at: string;
  updated_at: string;
  files?: SubmissionFile[];
}

export interface StudentRosterItem {
  roll_number: string;
  student_name: string;
  email?: string;
  has_submitted?: boolean;
  status?: SubmissionStatus | 'unsubmitted';
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'instructor';
}

export interface CheckSubmissionResult {
  found: boolean;
  invalid_code?: boolean;
  status?: SubmissionStatus;
  student_name?: string;
  roll_number?: string;
  submission_ref?: string;
  subject_name?: string;
  version?: number;
  submitted_at?: string;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  message?: string;
}

export interface SubmitAssignmentPayload {
  student_name: string;
  roll_number: string;
  file: File;
  live_website_url?: string;
  subject_name?: string;
  table_name?: string;
}

export interface SubmitAssignmentResponse {
  success: boolean;
  message: string;
  submission_ref?: string;
  verification_code?: string;
  submitted_at?: string;
  version?: number;
  is_resubmission?: boolean;
  subject_name?: string;
  table_name?: string;
}

