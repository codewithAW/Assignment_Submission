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
    { path: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { path: '/submit', label: 'Submit Assignment', icon: <UploadCloud className="w-4 h-4" /> },
    { path: '/check', label: 'Check Submission', icon: <Search className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 glossy-nav">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Course Header */}
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-3 text-left group transition"
          aria-label="CS421 Compiler Construction Home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 p-0.5 shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-sky-400">
              <Terminal className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              CS421 <span className="text-slate-400 dark:text-slate-600 font-normal">|</span> Compiler Construction
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block -mt-0.5">
              Assignment Portal
            </span>
          </div>
        </button>

        {/* Center / Primary Navigation Pills (HCI Consistency & Fitts's Law) */}
        <nav className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md">
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
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">
                  {item.path === '/' ? 'Home' : item.path === '/submit' ? 'Submit' : 'Check'}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right Action Tools: Dark/Light Mode Toggle & Admin Button */}
        <div className="flex items-center gap-2">
          {/* Dark / Light Mode Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition shadow-sm"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* Admin Portal Button */}
          <button
            onClick={() => onNavigate('/admin')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              currentPath === '/admin'
                ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-500/25'
                : 'bg-slate-900 text-slate-200 hover:bg-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:text-white border-slate-700/80 shadow-sm'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Admin Portal</span>
            <span className="md:hidden">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
