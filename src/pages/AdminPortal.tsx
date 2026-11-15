import React, { useState, useEffect } from 'react';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import type { AdminUser, SubjectAssignment } from '../types';
import { submissionService } from '../services/submissionService';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AdminPortalProps {
  subjects: SubjectAssignment[];
  onSubjectsChanged: () => Promise<void> | void;
  onBackToStudentPortal: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  subjects,
  onSubjectsChanged,
  onBackToStudentPortal,
}) => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Purge legacy insecure localStorage admin session cache if present
    try {
      localStorage.removeItem('cc_admin_session');
    } catch {}

    let isMounted = true;

    async function checkAuth() {
      try {
        if (isSupabaseConfigured && supabase) {
          const verifiedUser = await submissionService.verifyAdminSession();
          if (isMounted) {
            setCurrentUser(verifiedUser);
          }
        } else if (isMounted) {
          setCurrentUser(null);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    }

    checkAuth();

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        isMounted = false;
      };
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const verified = await submissionService.verifyAdminSession();
        if (isMounted) {
          setCurrentUser(verified);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await submissionService.logoutAdmin();
    try {
      localStorage.removeItem('cc_admin_session');
    } catch {}
    setCurrentUser(null);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {!currentUser ? (
        <AdminLogin
          onLoginSuccess={handleLoginSuccess}
          onBackToStudentPortal={onBackToStudentPortal}
        />
      ) : (
        <AdminDashboard
          user={currentUser}
          subjects={subjects}
          onSubjectsChanged={onSubjectsChanged}
          onLogout={handleLogout}
          onBackToPortal={onBackToStudentPortal}
        />
      )}
    </div>
  );
};
