import React, { useState, useEffect } from 'react';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import type { AdminUser } from '../types';
import { submissionService } from '../services/submissionService';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AdminPortalProps {
  onBackToStudentPortal: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToStudentPortal }) => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    // Check localStorage for saved session in local/demo mode
    const saved = localStorage.getItem('cc_admin_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check Supabase Auth session if configured
  useEffect(() => {
    async function checkAuth() {
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || 'shahmproject@gmail.com',
            full_name: session.user.user_metadata?.full_name || 'Administrator',
            role: 'admin',
          });
        }
      }
      setIsCheckingAuth(false);
    }
    checkAuth();
  }, []);

  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUser(user);
    localStorage.setItem('cc_admin_session', JSON.stringify(user));
  };

  const handleLogout = async () => {
    await submissionService.logoutAdmin();
    setCurrentUser(null);
    localStorage.removeItem('cc_admin_session');
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
          onLogout={handleLogout}
          onBackToPortal={onBackToStudentPortal}
        />
      )}
    </div>
  );
};
