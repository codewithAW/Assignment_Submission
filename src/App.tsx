import { useState, useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { SubmitAssignmentPage } from './pages/SubmitAssignmentPage';
import { CheckSubmissionPage } from './pages/CheckSubmissionPage';
import { AdminPortal } from './pages/AdminPortal';
import { Navbar } from './components/navigation/Navbar';
import { ParticleField } from './components/three/ParticleField';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) return '/admin';
    if (path.startsWith('/submit')) return '/submit';
    if (path.startsWith('/check') || path.startsWith('/submission')) return '/check';
    return '/';
  });

  const [prefillRoll, setPrefillRoll] = useState('');
  const [prefillName, setPrefillName] = useState('');

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) setCurrentPath('/admin');
      else if (path.startsWith('/submit')) setCurrentPath('/submit');
      else if (path.startsWith('/check') || path.startsWith('/submission')) setCurrentPath('/check');
      else setCurrentPath('/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string, roll?: string, name?: string) => {
    if (roll) setPrefillRoll(roll);
    if (name) setPrefillName(name);

    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen transition-colors duration-300 overflow-x-hidden text-slate-900 dark:text-slate-100 selection:bg-sky-500/30 selection:text-sky-600 dark:selection:text-sky-200">
      {/* 3D Instanced Three.js Particle Background */}
      <ParticleField />

      {/* Global Glossy Navigation Bar */}
      <Navbar currentPath={currentPath} onNavigate={(path) => navigateTo(path)} />

      {/* Page Routing */}
      <main>
        {currentPath === '/admin' ? (
          <AdminPortal onBackToStudentPortal={() => navigateTo('/')} />
        ) : currentPath === '/submit' ? (
          <SubmitAssignmentPage
            prefillRollNumber={prefillRoll}
            prefillStudentName={prefillName}
            onNavigateHome={() => navigateTo('/')}
            onNavigateToCheck={() => navigateTo('/check')}
          />
        ) : currentPath === '/check' || currentPath === '/submission' ? (
          <CheckSubmissionPage
            onNavigateHome={() => navigateTo('/')}
            onNavigateToSubmit={(roll, name) => navigateTo('/submit', roll, name)}
          />
        ) : (
          <HomePage
            onNavigateToSubmit={() => navigateTo('/submit')}
            onNavigateToCheck={() => navigateTo('/check')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
