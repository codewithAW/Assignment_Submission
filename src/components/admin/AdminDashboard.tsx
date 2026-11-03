import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ArrowUpDown, 
  RefreshCw, 
  LogOut, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import type { Submission, StudentRosterItem, AdminUser } from '../../types';
import { submissionService } from '../../services/submissionService';
import { SubmissionsTable } from './SubmissionsTable';
import { RosterTable } from './RosterTable';
import { RejectionModal } from './RejectionModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { PdfViewerModal } from './PdfViewerModal';
import { ToastContainer } from '../ui/Toast';
import type { ToastMessage } from '../ui/Toast';

interface AdminDashboardProps {
  user: AdminUser;
  onLogout: () => void;
  onBackToPortal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onLogout,
  onBackToPortal,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'rejected' | 'roster'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals state
  const [rejectingSub, setRejectingSub] = useState<Submission | null>(null);
  const [versionSub, setVersionSub] = useState<Submission | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfName, setPreviewPdfName] = useState<string>('');

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await submissionService.getAdminDashboardData();
      setSubmissions(data.submissions);
      setRoster(data.roster);
    } catch (err: any) {
      showToast('error', 'Failed to load dashboard data', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Dashboard Statistics
  const stats = useMemo(() => {
    const total = submissions.length;
    const submitted = submissions.filter((s) => s.status === 'submitted').length;
    const rejected = submissions.filter((s) => s.status === 'rejected').length;

    const submittedRolls = new Set(submissions.map((s) => s.roll_number));
    const unsubmitted = roster.filter((r) => !submittedRolls.has(r.roll_number)).length;

    return { total, submitted, rejected, unsubmitted };
  }, [submissions, roster]);

  // Filtering, Searching, and Sorting
  const filteredSubmissions = useMemo(() => {
    return submissions
      .filter((sub) => {
        if (statusFilter !== 'all' && statusFilter !== 'roster') {
          if (sub.status !== statusFilter) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = sub.student_name.toLowerCase().includes(q);
          const rollMatch = sub.roll_number.toLowerCase().includes(q);
          const refMatch = sub.submission_ref.toLowerCase().includes(q);
          if (!nameMatch && !rollMatch && !refMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [submissions, statusFilter, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / pageSize));
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, currentPage, pageSize]);

  const handleViewPdf = async (filePath: string, fileName: string) => {
    try {
      showToast('info', 'Generating Secure Stream', 'Authorizing administrator access...');
      const url = await submissionService.getSignedPdfUrl(filePath, false, fileName);
      setPreviewPdfUrl(url);
      setPreviewPdfName(fileName);
    } catch (err: any) {
      showToast('error', 'Could not open PDF', err.message);
    }
  };

  const handleDownloadPdf = async (filePath: string, fileName: string) => {
    try {
      showToast('info', 'Preparing Download', 'Generating secure attachment token...');
      const url = await submissionService.getSignedPdfUrl(filePath, true, fileName);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('success', 'Download Started', fileName);
    } catch (err: any) {
      showToast('error', 'Download Failed', err.message);
    }
  };

  const handleConfirmReject = async (submissionId: string, reason: string) => {
    try {
      const updated = await submissionService.rejectSubmission(submissionId, reason, user.email);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, ...updated } : s))
      );
      showToast('success', 'Assignment Rejected', 'Student can now submit a corrected version.');
    } catch (err: any) {
      showToast('error', 'Rejection failed', err.message);
      throw err;
    }
  };

  return (
    <div className="min-h-screen relative z-10">
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* Top Admin Sub-bar */}
      <div className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-sky-500" />
            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              Instructor Dashboard • Logged in as <span className="font-mono text-sky-600 dark:text-sky-400">{user.email}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-500' : ''}`} />
            </button>

            <button
              onClick={onBackToPortal}
              className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm transition"
            >
              Student View
            </button>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-bold transition shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Metric Statistics Cards (Glossy) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Total Submissions */}
          <div className="glossy-card rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Submissions
              </span>
              <div className="w-9 h-9 rounded-2xl bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats.total}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Submitted compiler assignments
            </div>
          </div>

          {/* Submitted Assignments */}
          <div className="glossy-card rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Active / Submitted
              </span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats.submitted}
            </div>
            <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400/80">
              Awaiting or completed evaluation
            </div>
          </div>

          {/* Rejected Assignments */}
          <div className="glossy-card rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Rejected Assignments
              </span>
              <div className="w-9 h-9 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats.rejected}
            </div>
            <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400/80">
              Resubmission requested
            </div>
          </div>

          {/* Unsubmitted Roster */}
          <div className="glossy-card rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Pending Submission
              </span>
              <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats.unsubmitted}
            </div>
            <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400/80">
              From instructor roster ({roster.length} total)
            </div>
          </div>
        </div>

        {/* Filter, Search, and Sort Controls Bar (Glossy) */}
        <div className="glossy-card rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between shadow-sm">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="glossy-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm"
            />
          </div>

          {/* Filter Tabs & Sort Toggle */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Status Filter buttons */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl transition ${
                  statusFilter === 'all'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({submissions.length})
              </button>

              <button
                onClick={() => {
                  setStatusFilter('submitted');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl transition ${
                  statusFilter === 'submitted'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Submitted ({stats.submitted})
              </button>

              <button
                onClick={() => {
                  setStatusFilter('rejected');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl transition ${
                  statusFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Rejected ({stats.rejected})
              </button>

              <button
                onClick={() => {
                  setStatusFilter('roster');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl transition ${
                  statusFilter === 'roster'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Roster ({roster.length})
              </button>
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-mono transition shadow-sm"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-500" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Content Table: Either Submissions Table or Roster Table */}
        {isLoading ? (
          <div className="py-20 text-center glossy-card rounded-3xl">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Synchronizing submissions archive...</p>
          </div>
        ) : statusFilter === 'roster' ? (
          <RosterTable roster={roster} submissions={submissions} />
        ) : (
          <div className="space-y-4">
            <SubmissionsTable
              submissions={paginatedSubmissions}
              onViewPdf={handleViewPdf}
              onDownloadPdf={handleDownloadPdf}
              onOpenRejectModal={(sub) => setRejectingSub(sub)}
              onOpenVersionModal={(sub) => setVersionSub(sub)}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 glossy-card rounded-2xl text-xs text-slate-600 dark:text-slate-400 font-mono">
                <div>
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredSubmissions.length)} of{' '}
                  {filteredSubmissions.length} records
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-2 font-bold text-slate-900 dark:text-slate-200">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <RejectionModal
        submission={rejectingSub}
        isOpen={!!rejectingSub}
        onClose={() => setRejectingSub(null)}
        onConfirmReject={handleConfirmReject}
      />

      <VersionHistoryModal
        submission={versionSub}
        isOpen={!!versionSub}
        onClose={() => setVersionSub(null)}
        onViewPdf={handleViewPdf}
        onDownloadPdf={handleDownloadPdf}
      />

      <PdfViewerModal
        isOpen={!!previewPdfUrl}
        onClose={() => setPreviewPdfUrl(null)}
        pdfUrl={previewPdfUrl}
        fileName={previewPdfName}
      />
    </div>
  );
};
