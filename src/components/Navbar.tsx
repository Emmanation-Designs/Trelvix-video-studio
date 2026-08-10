import React, { useState } from 'react';
import { 
  Video, 
  Plus, 
  Sun, 
  Moon, 
  Search, 
  ArrowLeft,
  HelpCircle,
  Menu,
  Zap,
  X,
  ChevronDown,
  FolderKanban,
  Clock,
  Check,
  Settings,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { Project } from '../types';
import { UserProfileData } from '../lib/api';

export interface NavbarProps {
  currentView: 'home' | 'project';
  activeProjectTitle?: string;
  allProjects?: Project[];
  onSelectProject?: (project: Project) => void;
  onBackToHome: () => void;
  onNewProject: () => void;
  credits: number;
  onOpenTopUp: () => void;
  onOpenSettings?: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onToggleSidebar?: () => void;
  userProfile?: UserProfileData | null;
  onSignOut?: () => void;
  onReturnToMainApp?: () => void;
  onOpenSupport?: () => void;
}

/**
 * Avatar component displaying user profile picture or derived initials fallback
 */
export const UserAvatar: React.FC<{ userProfile?: UserProfileData | null; className?: string }> = ({ 
  userProfile, 
  className = "w-8 h-8" 
}) => {
  const [imgError, setImgError] = useState(false);

  const initials = React.useMemo(() => {
    if (userProfile?.fullName && userProfile.fullName.trim().length > 0) {
      const parts = userProfile.fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (userProfile?.email && userProfile.email.trim().length > 0) {
      const namePart = userProfile.email.split('@')[0];
      return namePart.slice(0, 2).toUpperCase();
    }
    return userProfile ? 'U' : '?';
  }, [userProfile]);

  if (userProfile?.avatarUrl && !imgError) {
    return (
      <img
        src={userProfile.avatarUrl}
        alt={userProfile.fullName || 'User Avatar'}
        onError={() => setImgError(true)}
        className={`${className} rounded-full object-cover border border-emerald-500/40 shadow-sm shrink-0`}
      />
    );
  }

  return (
    <div className={`${className} rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 border border-emerald-400/40 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0 tracking-wider`}>
      {initials}
    </div>
  );
};

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  activeProjectTitle = '04:39 PM',
  allProjects = [],
  onSelectProject,
  onBackToHome,
  onNewProject,
  credits,
  onOpenTopUp,
  onOpenSettings,
  isDarkMode,
  onToggleTheme,
  searchQuery = '',
  onSearchChange,
  onToggleSidebar,
  userProfile,
  onSignOut,
  onReturnToMainApp,
  onOpenSupport
}) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const handleReturnToMainApp = () => {
    setShowAccountDropdown(false);
    if (onReturnToMainApp) {
      onReturnToMainApp();
    } else {
      window.location.href = 'https://trelvixai.com';
    }
  };

  const handleOpenSupport = () => {
    setShowAccountDropdown(false);
    if (onOpenSupport) {
      onOpenSupport();
    } else {
      window.location.href = 'https://trelvixai.com/support';
    }
  };

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 gap-2 transition-colors duration-200">
      
      {currentView === 'home' ? (
        /* HOME DASHBOARD HEADER */
        <>
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white shrink-0">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                Trelvix AI Video Studio
              </h1>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold block -mt-0.5">
                v2.4 Pro Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Credits pill */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 fill-emerald-500/20 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {credits.toLocaleString()}<span className="hidden sm:inline"> Credits</span>
              </span>
              <button 
                onClick={onOpenTopUp}
                className="ml-0.5 sm:ml-1 text-[9px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-wide cursor-pointer"
              >
                TOP UP
              </button>
            </div>

            {/* Settings Button */}
            <button 
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
              title="Video Studio Settings & Billing"
            >
              <Settings className="w-4 h-4 text-emerald-500" />
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={onToggleTheme}
              className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Help Button */}
            <button 
              onClick={handleOpenSupport}
              className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer hidden xs:flex"
              title="Help & Support"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* User Account Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-emerald-500/50 transition-all cursor-pointer"
                title="Account & Profile"
              >
                <UserAvatar userProfile={userProfile} className="w-7 h-7 sm:w-8 sm:h-8" />
              </button>

              {/* Account Dropdown Menu */}
              {showAccountDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowAccountDropdown(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    {/* User Info Header */}
                    <div className="flex items-center gap-3 p-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                      <UserAvatar userProfile={userProfile} className="w-10 h-10" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {userProfile?.fullName?.trim() || (userProfile?.email ? userProfile.email.split('@')[0] : (userProfile ? 'Account' : 'Sign in'))}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {userProfile?.email || (userProfile ? '' : 'No active session')}
                        </div>
                      </div>
                    </div>

                    {/* Actions List */}
                    <div className="pt-1 space-y-0.5">
                      <button
                        onClick={handleReturnToMainApp}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                      >
                        <ArrowLeft className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Return to Trelvix AI</span>
                      </button>

                      <button
                        onClick={handleOpenSupport}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                      >
                        <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Help & Support</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAccountDropdown(false);
                          onOpenSettings?.();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                      >
                        <Settings className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Video Studio Settings</span>
                      </button>

                      <div className="border-t border-zinc-100 dark:border-zinc-800/80 my-1" />

                      <button
                        onClick={() => {
                          setShowAccountDropdown(false);
                          onSignOut?.();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        /* PROJECT WORKSPACE HEADER */
        <>
          {showMobileSearch ? (
            /* Mobile Full-width Search Bar */
            <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={() => {
                  setShowMobileSearch(false);
                  onSearchChange?.('');
                }}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Left side: Back Arrow, Mobile Sidebar Toggle Icon (☰), Project Title */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
                <button
                  onClick={onBackToHome}
                  className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Return to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {onToggleSidebar && (
                  <button
                    onClick={onToggleSidebar}
                    className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer md:hidden shrink-0"
                    title="Toggle Sidebar"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                )}

                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[110px] xs:max-w-[160px] sm:max-w-xs md:max-w-sm">
                    {activeProjectTitle}
                  </span>
                </div>
              </div>

              {/* Center: Desktop Search bar */}
              <div className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-md mx-4">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search media..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500/60 transition-colors"
                  />
                </div>
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
                {/* Mobile search toggle button */}
                <button
                  onClick={() => setShowMobileSearch(true)}
                  className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors md:hidden"
                  title="Search"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Compact Credits Pill */}
                <div className="hidden sm:flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-2.5 py-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {credits.toLocaleString()}
                  </span>
                  <button 
                    onClick={onOpenTopUp}
                    className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-wide cursor-pointer ml-0.5"
                  >
                    +
                  </button>
                </div>

                {/* Recent Projects Dropdown Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowProjectsDropdown(!showProjectsDropdown)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Recent Projects"
                  >
                    <FolderKanban className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="hidden sm:inline">Recent Projects</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${showProjectsDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showProjectsDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowProjectsDropdown(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800/80">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            Recent Projects
                          </span>
                          <button
                            onClick={() => {
                              setShowProjectsDropdown(false);
                              onNewProject();
                            }}
                            className="text-[10px] font-bold text-emerald-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            New
                          </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                          {allProjects.map((proj) => {
                            const isActive = proj.title === activeProjectTitle || proj.createdAt === activeProjectTitle;
                            return (
                              <button
                                key={proj.id}
                                onClick={() => {
                                  onSelectProject?.(proj);
                                  setShowProjectsDropdown(false);
                                }}
                                className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                                  isActive
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30'
                                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700">
                                  {proj.thumbnailUrl ? (
                                    <img src={proj.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[10px]">
                                      AI
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs truncate font-semibold">{proj.title}</div>
                                  <div className="text-[10px] text-zinc-400">{proj.updatedAt || proj.createdAt}</div>
                                </div>
                                {isActive && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* + New Project button */}
                <button
                  onClick={onNewProject}
                  className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  title="New Project"
                >
                  <Plus className="w-4 h-4 text-emerald-500" />
                </button>

                {/* Theme Toggle */}
                <button 
                  onClick={onToggleTheme}
                  className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
                  title="Toggle theme"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Help button */}
                <button 
                  onClick={handleOpenSupport}
                  className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer hidden xs:flex"
                  title="Help & Support"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                {/* User Account Button & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                    className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-emerald-500/50 transition-all cursor-pointer"
                    title="Account & Profile"
                  >
                    <UserAvatar userProfile={userProfile} className="w-7 h-7 sm:w-8 sm:h-8" />
                  </button>

                  {/* Account Dropdown Menu */}
                  {showAccountDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowAccountDropdown(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                        {/* User Info Header */}
                        <div className="flex items-center gap-3 p-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                          <UserAvatar userProfile={userProfile} className="w-10 h-10" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {userProfile?.fullName?.trim() || (userProfile?.email ? userProfile.email.split('@')[0] : (userProfile ? 'Account' : 'Sign in'))}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {userProfile?.email || (userProfile ? '' : 'No active session')}
                            </div>
                          </div>
                        </div>

                        {/* Actions List */}
                        <div className="pt-1 space-y-0.5">
                          <button
                            onClick={handleReturnToMainApp}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                          >
                            <ArrowLeft className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Return to Trelvix AI</span>
                          </button>

                          <button
                            onClick={handleOpenSupport}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                          >
                            <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Help & Support</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowAccountDropdown(false);
                              onOpenSettings?.();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                          >
                            <Settings className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Video Studio Settings</span>
                          </button>

                          <div className="border-t border-zinc-100 dark:border-zinc-800/80 my-1" />

                          <button
                            onClick={() => {
                              setShowAccountDropdown(false);
                              onSignOut?.();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                          >
                            <LogOut className="w-4 h-4 shrink-0" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Help & Support Dialog */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm sm:text-base">Trelvix AI Video Studio Support</h3>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Welcome to Trelvix AI Video Studio! You can generate high-definition video clips using OpenAI Sora 2 engines, craft characters and consistent scenes, or perform image-to-video synthesis.
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 font-medium">
                💡 <strong>Tip:</strong> Click the format button (e.g. 9:16 • 6s • x2) in the prompt bar to toggle generation resolution, engine quality, and batch size.
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 font-medium">
                🖼️ <strong>Image-to-Video:</strong> Click the + icon on the left of the prompt bar to attach an image reference.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowHelpModal(false);
                  handleOpenSupport();
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                Main Support Page
              </button>
              <button
                onClick={() => setShowHelpModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
};
