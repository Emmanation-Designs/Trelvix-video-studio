import React from 'react';
import { 
  Video, 
  Plus, 
  Sun, 
  Moon, 
  Search, 
  Filter, 
  MoreVertical, 
  ArrowLeft,
  HelpCircle,
  Settings,
  Zap
} from 'lucide-react';

interface NavbarProps {
  currentView: 'home' | 'project';
  activeProjectTitle?: string;
  onBackToHome: () => void;
  onNewProject: () => void;
  credits: number;
  onOpenTopUp: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  activeProjectTitle = 'Jul 29, 07:36 PM',
  onBackToHome,
  onNewProject,
  credits,
  onOpenTopUp,
  isDarkMode,
  onToggleTheme,
  searchQuery = '',
  onSearchChange
}) => {
  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 transition-colors duration-200">
      
      {currentView === 'home' ? (
        /* HOME DASHBOARD HEADER */
        <>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Trelvix AI Video Studio
              </h1>
              <span className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold block -mt-0.5">
                v2.4 Pro Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Credits pill */}
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-3.5 py-1.5">
              <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
              <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {credits.toLocaleString()} Credits
              </span>
              <button 
                onClick={onOpenTopUp}
                className="ml-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-wide cursor-pointer"
              >
                TOP UP
              </button>
            </div>

            {/* Theme Toggle */}
            <button 
              onClick={onToggleTheme}
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-zinc-400 dark:to-zinc-700 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              E
            </div>
          </div>
        </>
      ) : (
        /* PROJECT WORKSPACE HEADER */
        <>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBackToHome}
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {activeProjectTitle}
              </span>
              <button 
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors"
                title="Project options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search bar in header center */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search media or prompts..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 rounded-full pl-9 pr-4 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
            </div>
            <button className="p-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-full transition-colors">
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onNewProject}
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors"
              title="New Project"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button 
              className="hidden sm:block p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors"
              title="Help & Info"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button 
              className="hidden sm:block p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={onToggleTheme}
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-zinc-400 dark:to-zinc-700 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              E
            </div>
          </div>
        </>
      )}

    </header>
  );
};
