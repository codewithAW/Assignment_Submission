import React from 'react';
import { Terminal, UploadCloud, Search, Lock, Home, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', label: 'Home', shortLabel: 'Home', icon: <Home className="w-4 h-4" /> },
    { path: '/submit', label: 'Submit Assignment', shortLabel: 'Submit', icon: <UploadCloud className="w-4 h-4" /> },
    { path: '/check', label: 'Check Submission', shortLabel: 'Check', icon: <Search className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* ========================================================
          TOP APP BAR (Desktop, Tablet, and Mobile Header)
          ======================================================== */}
      <header className="sticky top-0 z-40 glossy-nav">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Brand Logo & Course Header */}
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 sm:gap-3 text-left group transition shrink-0"
            aria-label="CS421 Compiler Construction Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 p-0.5 shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-sky-400">
                <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div>
              <div className="font-bold text-xs sm:text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-1 sm:gap-1.5 leading-none">
                <span>CS421</span>
                <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
                <span className="hidden xs:inline sm:inline">Compiler Construction</span>
                <span className="xs:hidden sm:hidden">Portal</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
                Assignment Vault
              </span>
            </div>
          </button>

          {/* Desktop Center Navigation Pills (Hidden on Mobile < md to prevent horizontal overflow) */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md">
            {navItems.map((item) => {
              const isActive =
                currentPath === item.path ||
                (item.path === '/check' && currentPath === '/submission');

              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white dark:bg-sky-500 text-sky-600 dark:text-white shadow-sm dark:shadow-md dark:shadow-sky-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools: Dark/Light Mode Toggle & ALWAYS-VISIBLE Admin Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Dark / Light Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition shadow-sm touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* Prominent Admin Portal Button (Guaranteed Visible on Mobile & Desktop) */}
            <button
              onClick={() => onNavigate('/admin')}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition border touch-manipulation min-h-[36px] ${
                currentPath === '/admin'
                  ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-500/25'
                  : 'bg-slate-900 text-slate-100 hover:bg-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:text-white border-slate-700/80 shadow-sm'
              }`}
              title="Instructor & Administrator Portal"
              aria-label="Open Administrator Portal"
            >
              <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="hidden sm:inline">Admin Portal</span>
              <span className="sm:hidden">Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================
          MOBILE BOTTOM NAVIGATION DOCK (HCI Mobile Best Practice)
          Ergonomic thumb-zone navigation on phones & small screens
          ======================================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-[#0b101e]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shadow-lg px-2 py-1.5">
        <nav className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {/* Tab 1: Home */}
          <button
            onClick={() => onNavigate('/')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[11px] font-semibold transition-all touch-manipulation min-h-[44px] ${
              currentPath === '/'
                ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Home className="w-4 h-4 mb-0.5" />
            <span>Home</span>
          </button>

          {/* Tab 2: Submit */}
          <button
            onClick={() => onNavigate('/submit')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[11px] font-semibold transition-all touch-manipulation min-h-[44px] ${
              currentPath === '/submit'
                ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UploadCloud className="w-4 h-4 mb-0.5" />
            <span>Submit</span>
          </button>

          {/* Tab 3: Check */}
          <button
            onClick={() => onNavigate('/check')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[11px] font-semibold transition-all touch-manipulation min-h-[44px] ${
              currentPath === '/check' || currentPath === '/submission'
                ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Search className="w-4 h-4 mb-0.5" />
            <span>Check</span>
          </button>

          {/* Tab 4: Admin Portal */}
          <button
            onClick={() => onNavigate('/admin')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[11px] font-semibold transition-all touch-manipulation min-h-[44px] ${
              currentPath === '/admin'
                ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 mb-0.5" />
            <span>Admin</span>
          </button>
        </nav>
      </div>
    </>
  );
};
