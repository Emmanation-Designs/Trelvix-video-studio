import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  X, 
  Play, 
  Clock, 
  Video, 
  ChevronRight, 
  Film,
  Trash2
} from 'lucide-react';
import { Project, HeroSlide } from '../types';

interface HomeDashboardProps {
  heroSlides: HeroSlide[];
  projects: Project[];
  onNewProject: () => void;
  onOpenProject: (project: Project) => void;
  onDeleteProject: (projectId: string, e: React.MouseEvent) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  heroSlides,
  projects,
  onNewProject,
  onOpenProject,
  onDeleteProject
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showHero, setShowHero] = useState(true);

  // Auto-slide hero background every 5 seconds
  useEffect(() => {
    if (!showHero || heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length, showHero]);

  const activeSlide = heroSlides[currentSlideIndex] || heroSlides[0];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full transition-colors duration-200">
      
      {/* HERO SLIDER CARD (IMAGE 1) */}
      {showHero && activeSlide && (
        <div className="relative rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800/90 bg-zinc-900 text-white shadow-2xl transition-all duration-500">
          
          {/* Background Video / Image preview */}
          <div className="absolute inset-0 z-0">
            <video
              key={activeSlide.id}
              src={activeSlide.videoUrl}
              poster={activeSlide.posterUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover opacity-40 transition-opacity duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent" />
          </div>

          {/* Close Hero Button */}
          <button
            onClick={() => setShowHero(false)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white backdrop-blur border border-zinc-700/50 transition-colors"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Hero Content */}
          <div className="relative z-10 p-6 sm:p-10 lg:p-12 min-h-[280px] sm:min-h-[320px] flex flex-col justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-md">
                {activeSlide.title}
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 font-medium max-w-xl leading-relaxed">
                {activeSlide.subtitle}
              </p>

              <div className="pt-2">
                <button
                  onClick={onNewProject}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700/90 text-white font-semibold text-xs sm:text-sm border border-zinc-600/60 shadow-lg backdrop-blur transition-all active:scale-95 cursor-pointer"
                >
                  <Film className="w-4 h-4 text-emerald-400" />
                  <span>Create a scene</span>
                </button>
              </div>
            </div>

            {/* Bottom Controls inside Hero */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-white/10">
              {/* Carousel indicators */}
              <div className="flex items-center gap-2">
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentSlideIndex 
                        ? 'w-8 bg-emerald-400' 
                        : 'w-2 bg-zinc-600 hover:bg-zinc-400'
                    }`}
                  />
                ))}
              </div>

              {/* + New project button inside hero bottom right */}
              <button
                onClick={onNewProject}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm border border-zinc-700/80 shadow-xl backdrop-blur transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>+ New project</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GENERATED PROJECTS SECTION (IMAGE 1 BELOW HERO) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Clock className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">
              Generated Projects
            </h3>
          </div>

          <button
            onClick={onNewProject}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New</span>
          </button>
        </div>

        {/* PROJECTS GRID */}
        {projects.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <Video className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mx-auto" />
            <p className="text-base font-bold text-zinc-700 dark:text-zinc-300">No generated projects yet</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Start creating your first AI video project to view generated scenes here.
            </p>
            <button
              onClick={onNewProject}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Start First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {projects.map((project) => {
              const videoCount = project.videos?.length || 0;
              const firstVideo = project.videos?.[0];
              const displayPoster = firstVideo?.posterUrl || project.thumbnailUrl;

              return (
                <div
                  key={project.id}
                  onClick={() => onOpenProject(project)}
                  className="group relative rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                    <img
                      src={displayPoster}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Video Count Tag */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      <span>{videoCount} {videoCount === 1 ? 'Video' : 'Videos'}</span>
                    </div>

                    {/* Delete Action */}
                    <button
                      onClick={(e) => onDeleteProject(project.id, e)}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-red-500 text-zinc-300 hover:text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/90 text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-black ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Info Footer */}
                  <div className="p-3.5 space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-emerald-500 transition-colors">
                      {project.title}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>{project.createdAt}</span>
                      <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        Open <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
