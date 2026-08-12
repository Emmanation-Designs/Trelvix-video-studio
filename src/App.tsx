import React, { useState, useEffect } from 'react';
import { Project, VideoGeneration } from './types';
import { INITIAL_HERO_SLIDES, INITIAL_PROJECTS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { HomeDashboard } from './components/HomeDashboard';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { BillingPage } from './components/BillingPage';
import { VideoModal } from './components/VideoModal';
import { TopUpModal } from './components/TopUpModal';
import { SettingsModal } from './components/SettingsModal';
import { initAuthHandoff, fetchUserCredits, fetchVideoHistory, fetchAuthMe, clearAuthToken, UserProfileData } from './lib/api';

export default function App() {
  // Theme state initialized with localStorage support
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  // Apply dark mode class to html and body elements
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // View state: 'home' | 'project' | 'billing'
  const [currentView, setCurrentView] = useState<'home' | 'project' | 'billing'>('home');
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // App data state
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [credits, setCredits] = useState<number>(0);

  const handleSignOut = () => {
    clearAuthToken();
    setUserProfile(null);
    setCredits(0);
    window.location.href = 'https://trelvixai.com';
  };

  const handleReturnToMainApp = () => {
    window.location.href = 'https://trelvixai.com';
  };

  const handleOpenSupport = () => {
    window.location.href = 'https://trelvixai.com/support';
  };

  const loadUserData = async () => {
    // 1. Check & extract cross-domain auth token if navigating from main app
    initAuthHandoff();

    // 2. Fetch authenticated user profile & live wallet credits
    const authMe = await fetchAuthMe();
    if (authMe && authMe.user) {
      setUserProfile(authMe.user);
      if (authMe.wallet && authMe.wallet.balance !== undefined) {
        setCredits(authMe.wallet.balance);
      }
    } else {
      setUserProfile(null);
      const wallet = await fetchUserCredits();
      if (wallet && wallet.balance !== undefined) {
        setCredits(wallet.balance);
      } else {
        setCredits(0);
      }
    }

    // 3. Fetch persistent video generation history from database
    const historyItems = await fetchVideoHistory();
    if (historyItems && historyItems.length > 0) {
      const dbVideos: VideoGeneration[] = historyItems.map((item: any) => ({
        id: item.id || item.providerJobId,
        prompt: item.prompt || '',
        quality: item.quality || 'Creative Quality',
        aspectRatio: item.aspectRatio || '16:9',
        duration: item.duration || '6s',
        batchCount: 'x1',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        videoUrl: item.videoUrl,
        posterUrl: item.posterUrl,
        creditCost: 10,
        status: item.status || 'completed'
      }));

      // Hydrate persistent library into project workspace state
      const historyProject: Project = {
        id: 'proj-persistent-library',
        title: 'Persistent Generated Library',
        createdAt: 'Synced from Database',
        updatedAt: 'Just now',
        thumbnailUrl: dbVideos[0]?.posterUrl || 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=600',
        videos: dbVideos
      };

      setProjects((prev) => {
        const filtered = prev.filter((p) => p.id !== 'proj-persistent-library');
        return [historyProject, ...filtered];
      });
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== 'proj-persistent-library'));
    }
  };

  // Sync Video Studio auth handoff, credits, & persistent video generations on boot & account changes
  useEffect(() => {
    loadUserData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'trelvix_auth_token') {
        // Token changed or cleared -> Reset user state and reload
        setCredits(0);
        setProjects(INITIAL_PROJECTS);
        loadUserData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Modals & Settings state
  const [selectedVideo, setSelectedVideo] = useState<VideoGeneration | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'billings' | 'support' | 'general'>('billings');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Handle creating a brand new project (Image 2 empty canvas)
  const handleNewProject = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
      ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      title: formattedDate,
      createdAt: formattedDate,
      updatedAt: 'Just now',
      thumbnailUrl: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=600',
      videos: []
    };

    setProjects([newProject, ...projects]);
    setActiveProject(newProject);
    setCurrentView('project');
  };

  // Handle opening an existing project (Image 5 / Image 6)
  const handleOpenProject = (project: Project) => {
    setActiveProject(project);
    setCurrentView('project');
  };

  // Handle deleting a project
  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(projects.filter((p) => p.id !== projectId));
    if (activeProject?.id === projectId) {
      setActiveProject(null);
      setCurrentView('home');
    }
  };

  // Handle updating active project after generation
  const handleUpdateProject = (updatedProject: Project) => {
    setActiveProject(updatedProject);
    setProjects(projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
  };

  // Handle top up credits
  const handleAddCredits = (amount: number) => {
    setCredits((prev) => prev + amount);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-200 selection:bg-emerald-500 selection:text-black">
      
      {/* Top Navigation Bar */}
      <Navbar
        currentView={currentView}
        activeProjectTitle={activeProject?.title}
        allProjects={projects}
        onSelectProject={(proj) => {
          handleOpenProject(proj);
          setIsMobileSidebarOpen(false);
        }}
        onBackToHome={() => {
          setCurrentView('home');
          setIsMobileSidebarOpen(false);
        }}
        onNewProject={handleNewProject}
        credits={credits}
        onOpenTopUp={() => {
          setCurrentView('billing');
        }}
        onOpenBilling={() => {
          setCurrentView('billing');
        }}
        onOpenSettings={() => {
          setSettingsTab('billings');
          setIsSettingsOpen(true);
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        userProfile={userProfile}
        onSignOut={handleSignOut}
        onReturnToMainApp={handleReturnToMainApp}
        onOpenSupport={handleOpenSupport}
      />

      {/* Main View Router */}
      {currentView === 'billing' ? (
        <BillingPage
          currentCredits={credits}
          onCreditsUpdated={setCredits}
          onBackToHome={() => setCurrentView('home')}
          onOpenWorkspace={() => setCurrentView('project')}
          userProfile={userProfile}
        />
      ) : currentView === 'home' ? (
        <HomeDashboard
          heroSlides={INITIAL_HERO_SLIDES}
          projects={projects}
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onDeleteProject={handleDeleteProject}
        />
      ) : activeProject ? (
        <ProjectWorkspace
          project={activeProject}
          allProjects={projects}
          onOpenProject={(p) => {
            handleOpenProject(p);
            setIsMobileSidebarOpen(false);
          }}
          onUpdateProject={handleUpdateProject}
          onSelectVideo={setSelectedVideo}
          credits={credits}
          setCredits={setCredits}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
          userProfile={userProfile}
          onOpenBilling={() => setCurrentView('billing')}
          onOpenSettings={() => {
            setSettingsTab('billings');
            setIsSettingsOpen(true);
          }}
          onReturnToMainApp={handleReturnToMainApp}
          onOpenSupport={handleOpenSupport}
          onSignOut={handleSignOut}
        />
      ) : null}

      {/* Video Details Lightbox Modal */}
      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />

      {/* Video Studio Settings & Billing Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentCredits={credits}
        onCreditsUpdated={setCredits}
        defaultTab={settingsTab}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenSupport={handleOpenSupport}
      />

    </div>
  );
}
