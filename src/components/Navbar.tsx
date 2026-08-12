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
  currentView: 'home' | 'project' | 'billing';
  activeProjectTitle?: string;
  allProjects?: Project[];
  onSelectProject?: (project: Project) => void;
  onBackToHome: () => void;
  onNewProject: () => void;
  credits: number;
  onOpenTopUp: () => void;
  onOpenBilling?: () => void;
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
  onOpenBilling,
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
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 transition-colors duration-200">
      
      {/* LEFT: ONLY "Video Studio" TEXT */}
      <div className="flex items-center gap-3">
        {currentView !== 'home' && (
          <button
            onClick={onBackToHome}
            className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div 
          onClick={onBackToHome}
          className="cursor-pointer"
        >
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Video Studio
          </h1>
        </div>
      </div>

      {/* RIGHT: JUST THE PROFILE ICON */}
      <div className="flex items-center">
        <button
          onClick={handleOpenSettings}
          className="p-0.5 rounded-full hover:ring-2 hover:ring-emerald-500/50 transition-all cursor-pointer"
          title="Profile & Settings"
        >
          <UserAvatar userProfile={userProfile} className="w-8 h-8 sm:w-9 sm:h-9" />
        </button>
      </div>

    </header>
  );
};
