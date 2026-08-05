import React, { useState, useEffect } from 'react';
import { Project, VideoGeneration } from './types';
import { INITIAL_HERO_SLIDES, INITIAL_PROJECTS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { HomeDashboard } from './components/HomeDashboard';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { VideoModal } from './components/VideoModal';
import { TopUpModal } from './components/TopUpModal';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Apply dark mode class to root element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // View state: 'home' | 'project'
  const [currentView, setCurrentView] = useState<'home' | 'project'>('home');
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // App data state
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [credits, setCredits] = useState<number>(4850);

  // Sync credits & plan on boot from API
  useEffect(() => {
    fetch('/api/video-studio/billing/plan')
      .then((res) => res.json())
      .then((data) => {
        if (data.plan?.remainingCredits !== undefined) {
          setCredits(data.plan.remainingCredits);
        }
      })
      .catch(() => {});
  }, []);

  // Modals state
  const [selectedVideo, setSelectedVideo] = useState<VideoGeneration | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        onBackToHome={() => setCurrentView('home')}
        onNewProject={handleNewProject}
        credits={credits}
        onOpenTopUp={() => setIsTopUpOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main View Router */}
      {currentView === 'home' ? (
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
          onUpdateProject={handleUpdateProject}
          onSelectVideo={setSelectedVideo}
          credits={credits}
          setCredits={setCredits}
        />
      ) : null}

      {/* Video Details Lightbox Modal */}
      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />

      {/* Top Up Credits Modal */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onAddCredits={handleAddCredits}
      />

    </div>
  );
}
