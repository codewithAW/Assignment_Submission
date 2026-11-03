import React from 'react';
import { Terminal, UploadCloud, Search, Lock, Home } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const navItems = [
    { path: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { path: '/submit', label: 'Submit Assignment', icon: <UploadCloud className="w-4 h-4" /> },
    { path: '/check', label: 'Check Submission', icon: <Search className="w-4 h-4" /> },
    { path: '/admin', label: 'Admin Portal', icon: <Lock className="w-3.5 h-3.5" />, isAdmin: true },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#080b14]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Course Logo */}
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-3 text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#080b14] rounded-[10px] flex items-center justify-center text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
              CS421 <span className="text-slate-500 font-normal">|</span> Compiler Construction
            </span>
            <span className="text-[11px] text-slate-400 block -mt-0.5">
              Assignment Submission Portal
            </span>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive =
              currentPath === item.path ||
              (item.path === '/check' && currentPath === '/submission');

            if (item.isAdmin) {
              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ml-1 sm:ml-2 ${
                    isActive
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Admin Portal</span>
                  <span className="sm:hidden">Admin</span>
                </button>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                }`}
              >
                {item.icon}
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">
                  {item.path === '/' ? 'Home' : item.path === '/submit' ? 'Submit' : 'Check'}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
