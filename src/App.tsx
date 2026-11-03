import { useState, useEffect } from 'react';
import { StudentPortal } from './pages/StudentPortal';
import { AdminPortal } from './pages/AdminPortal';
import { ParticleField } from './components/three/ParticleField';
import { ConfigModal } from './components/ui/ConfigModal';
import { isSupabaseConfigured } from './services/supabase';
import { Database } from 'lucide-react';

export function App() {
  // Current route state: strictly '/' or '/admin'
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    return path.startsWith('/admin') ? '/admin' : '/';
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Sync route state with browser URL & history
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path.startsWith('/admin') ? '/admin' : '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: '/' | '/admin') => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-[#06080e] text-slate-100 overflow-x-hidden">
      {/* 3D Instanced Three.js Particle Background */}
      <ParticleField />

      {/* Primary Routing: Strictly '/' and '/admin' */}
      {currentPath === '/admin' ? (
        <AdminPortal onBackToStudentPortal={() => navigateTo('/')} />
      ) : (
        <StudentPortal onNavigateToAdmin={() => navigateTo('/admin')} />
      )}

      {/* Floating Status & Config Indicator */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setIsConfigOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 backdrop-blur-md shadow-xl text-xs font-mono transition group"
          title="Click to view or edit Supabase configuration"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
            }`}
          />
          <span className="text-slate-300 group-hover:text-white">
            {isSupabaseConfigured ? 'Supabase Live' : 'Local Test Mode'}
          </span>
          <Database className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition" />
        </button>
      </div>

      {/* Supabase Configuration Modal */}
      <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </div>
  );
}

export default App;
