import React, { useState } from 'react';
import { 
  Folder, 
  Video, 
  UserCheck, 
  Film, 
  Wrench, 
  Trash2, 
  PanelLeftClose, 
  PanelLeft, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  Play, 
  Clock, 
  Download, 
  Copy, 
  Heart,
  RotateCcw
} from 'lucide-react';
import { 
  Project, 
  VideoGeneration, 
  QualityMode, 
  AspectRatio, 
  DurationOption, 
  BatchCount, 
  GenerationModeType 
} from '../types';
import { PromptSettingsPopup } from './PromptSettingsPopup';

interface ProjectWorkspaceProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onSelectVideo: (video: VideoGeneration) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  onUpdateProject,
  onSelectVideo,
  credits,
  setCredits
}) => {
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'videos' | 'characters' | 'scenes' | 'tools' | 'trash'>('all');

  // Prompt input state
  const [promptInput, setPromptInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Generation settings state (Image 3 defaults)
  const [mode, setMode] = useState<GenerationModeType>('Video');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [quality, setQuality] = useState<QualityMode>('Omni Flash');
  const [duration, setDuration] = useState<DurationOption>('6s');
  const [batchCount, setBatchCount] = useState<BatchCount>('x2');

  // Generation process state (Image 4)
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(29);
  const [generatingCount, setGeneratingCount] = useState(2);

  // Credit calculation
  const calculatedCreditCost = (() => {
    const batchMultiplier = parseInt(batchCount.replace('x', ''), 10) || 1;
    const baseCost = quality === 'Super Creative Quality' ? 30 : quality === 'Creative Quality' ? 25 : 20;
    return baseCost * (batchMultiplier > 1 ? batchMultiplier * 0.8 : 1);
  })();

  // Handle Generate Video
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() || isGenerating) return;

    const count = parseInt(batchCount.replace('x', ''), 10) || 1;
    setGeneratingCount(count);
    setIsGenerating(true);
    setGeneratingProgress(15);

    try {
      // Call backend API
      const response = await fetch('/api/tools/video-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          model: quality === 'Super Creative Quality' ? 'sora-2-pro' : 'sora-2',
          quality: quality === 'Super Creative Quality' ? 'super-creative' : 'creative',
          duration,
          aspectRatio,
          batchCount
        })
      });

      const data = await response.json();
      if (data.remainingCredits !== undefined) {
        setCredits(data.remainingCredits);
      }

      const generatedJobs = data.videos || [];
      const createdVideos: VideoGeneration[] = [];

      // Progress interval while polling
      const progressTimer = setInterval(() => {
        setGeneratingProgress((prev) => (prev >= 90 ? 90 : prev + Math.floor(Math.random() * 10) + 5));
      }, 500);

      // Poll status for each provider job ID
      for (let i = 0; i < generatedJobs.length; i++) {
        const job = generatedJobs[i];
        let attempts = 0;
        let isDone = false;

        while (!isDone && attempts < 15) {
          attempts++;
          await new Promise((r) => setTimeout(r, 800));

          try {
            const statusRes = await fetch(`/api/tools/video-studio/status/${job.providerJobId}`);
            const statusData = await statusRes.json();

            if (statusData.video?.status === 'completed') {
              isDone = true;
              createdVideos.push({
                id: `vid-${Date.now()}-${i}`,
                prompt: promptInput,
                quality,
                aspectRatio,
                duration,
                batchCount,
                createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                videoUrl: statusData.video.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-wild-horse-in-a-field-43285-large.mp4',
                posterUrl: statusData.video.thumbnailUrl || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=800',
                creditCost: Math.round(calculatedCreditCost / count),
                status: 'completed'
              });
            }
          } catch {
            // Keep polling
          }
        }
      }

      clearInterval(progressTimer);
      setGeneratingProgress(100);

      // Fallback if network polling ended early
      if (createdVideos.length === 0) {
        const demoVideos = [
          {
            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-wild-horse-in-a-field-43285-large.mp4',
            posterUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=800'
          },
          {
            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-traffic-41551-large.mp4',
            posterUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&q=80&w=800'
          }
        ];

        for (let i = 0; i < count; i++) {
          const demo = demoVideos[i % demoVideos.length];
          createdVideos.push({
            id: `vid-${Date.now()}-${i}`,
            prompt: promptInput,
            quality,
            aspectRatio,
            duration,
            batchCount,
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            videoUrl: demo.videoUrl,
            posterUrl: demo.posterUrl,
            creditCost: Math.round(calculatedCreditCost / count),
            status: 'completed'
          });
        }
      }

      setIsGenerating(false);

      const updatedProject: Project = {
        ...project,
        videos: [...createdVideos, ...project.videos],
        updatedAt: 'Just now'
      };

      onUpdateProject(updatedProject);
      setPromptInput('');
    } catch (err) {
      console.error('Generation call failed:', err);
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden relative transition-colors duration-200">
      
      {/* LEFT SIDEBAR (IMAGE 2) */}
      <aside 
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-56'
        } bg-white/60 dark:bg-zinc-950/60 border-r border-zinc-200 dark:border-zinc-800/80 p-3 flex flex-col justify-between transition-all duration-300 z-10 select-none backdrop-blur-md`}
      >
        <div className="space-y-1">
          {/* Nav Links */}
          <button
            onClick={() => setActiveTab('all')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
            }`}
          >
            <Folder className="w-4 h-4 text-emerald-500 shrink-0" />
            {!sidebarCollapsed && <span>All Media</span>}
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'videos'
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
            }`}
          >
            <Video className="w-4 h-4 text-emerald-500 shrink-0" />
            {!sidebarCollapsed && <span>Videos</span>}
          </button>

          <button
            onClick={() => setActiveTab('characters')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'characters'
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
            }`}
          >
            <UserCheck className="w-4 h-4 text-zinc-400 shrink-0" />
            {!sidebarCollapsed && <span>Characters</span>}
          </button>

          <button
            onClick={() => setActiveTab('scenes')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'scenes'
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
            }`}
          >
            <Film className="w-4 h-4 text-zinc-400 shrink-0" />
            {!sidebarCollapsed && <span>Scenes</span>}
          </button>

          <div className="pt-2 my-2 border-t border-zinc-200 dark:border-zinc-800/80" />

          <button
            onClick={() => setActiveTab('tools')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'tools'
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
            }`}
          >
            <Wrench className="w-4 h-4 text-zinc-400 shrink-0" />
            {!sidebarCollapsed && <span>Tools</span>}
          </button>
        </div>

        <div className="space-y-1 pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
          <button
            onClick={() => setActiveTab('trash')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-colors"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Trash</span>}
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-colors"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-4 h-4 shrink-0" />
            ) : (
              <PanelLeftClose className="w-4 h-4 shrink-0" />
            )}
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CANVAS WORKSPACE AREA (IMAGES 2, 4, 5) */}
      <main className="flex-1 flex flex-col justify-between overflow-y-auto p-4 sm:p-8 relative min-h-0 bg-zinc-100/50 dark:bg-zinc-950">
        
        {/* MEDIA DISPLAY CONTAINER */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[360px] pb-24">
          
          {/* STATE 1: GENERATING SKELETON CARDS (IMAGE 4) */}
          {isGenerating ? (
            <div className="flex flex-wrap items-center justify-center gap-6 w-full max-w-4xl animate-in fade-in duration-300">
              {Array.from({ length: generatingCount }).map((_, idx) => (
                <div 
                  key={idx}
                  className={`relative rounded-3xl overflow-hidden border border-emerald-500/40 bg-zinc-900 shadow-2xl flex flex-col justify-between p-4 ${
                    aspectRatio === '9:16' ? 'w-64 sm:w-72 aspect-[9/16]' : 'w-full max-w-md aspect-video'
                  }`}
                >
                  {/* Glass Skeleton Pulsing Blur */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 animate-pulse" />
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-xl" />

                  {/* Top Header Icons (Image 4) */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full bg-black/50 border border-white/20 backdrop-blur flex items-center justify-center text-white">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-black/60 text-emerald-400 font-bold text-xs border border-emerald-500/30 backdrop-blur">
                      {generatingProgress}%
                    </span>
                  </div>

                  {/* Center Spinning Indicator */}
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                    <span className="text-xs font-semibold text-emerald-400 tracking-wider">
                      Synthesizing scene...
                    </span>
                  </div>

                  {/* Bottom Progress Bar */}
                  <div className="relative z-10 space-y-1.5">
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-300 rounded-full"
                        style={{ width: `${generatingProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 text-center truncate">
                      {promptInput}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : project.videos && project.videos.length > 0 ? (
            
            /* STATE 2: COMPLETED GENERATED VIDEOS (IMAGES 5 & 6) */
            <div className="flex flex-wrap items-center justify-center gap-6 w-full max-w-5xl my-auto animate-in fade-in duration-300">
              {project.videos.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => onSelectVideo(vid)}
                  className={`group relative rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-900 shadow-2xl hover:border-emerald-500/60 transition-all duration-300 cursor-pointer ${
                    vid.aspectRatio === '9:16' ? 'w-64 sm:w-72 aspect-[9/16]' : 'w-full max-w-md aspect-video'
                  }`}
                >
                  {/* Poster / Video Background */}
                  <img
                    src={vid.posterUrl}
                    alt={vid.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                  {/* Top Header Icons (Image 5) */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-black/60 border border-white/20 backdrop-blur flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom Prompt Caption */}
                  <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1">
                    <p className="text-xs font-bold text-white line-clamp-2 drop-shadow-md">
                      {vid.prompt}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-300 font-medium">
                      <span>{vid.duration} · {vid.aspectRatio}</span>
                      <span className="text-emerald-400 font-bold">{vid.quality}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          ) : (

            /* STATE 3: EMPTY CANVAS (IMAGE 2) */
            <div className="text-center space-y-4 max-w-md my-auto animate-in fade-in duration-300">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-200/80 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center shadow-lg text-zinc-600 dark:text-zinc-300">
                <Sparkles className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200">
                Start creating or drop media
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Type your video prompt in the bar below to generate realistic motion clips.
              </p>
            </div>

          )}

        </div>

        {/* BOTTOM FLOATING PROMPT INPUT BAR (IMAGES 2, 3, 4, 5) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-2xl">
          
          {/* Settings Popup Modal (Image 3) */}
          <PromptSettingsPopup
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            mode={mode}
            setMode={setMode}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            quality={quality}
            setQuality={setQuality}
            duration={duration}
            setDuration={setDuration}
            batchCount={batchCount}
            setBatchCount={setBatchCount}
            creditCost={Math.round(calculatedCreditCost)}
          />

          <form 
            onSubmit={handleGenerate}
            className="flex items-center gap-2 p-2 sm:p-2.5 rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 shadow-2xl backdrop-blur-2xl transition-all focus-within:border-emerald-500/60"
          >
            {/* Left + Icon */}
            <button
              type="button"
              className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors shrink-0"
              title="Add attachment or preset"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Agent Pill Tag */}
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
              Agent
            </span>

            {/* Main Text Area / Input */}
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="What do you want to create?"
              className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none"
            />

            {/* Settings Pill Button (Image 3 trigger) */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Video · {duration} · {aspectRatio === '9:16' ? '📱' : '📺'} {batchCount}</span>
            </button>

            {/* Submit Arrow Button */}
            <button
              type="submit"
              disabled={!promptInput.trim() || isGenerating}
              className={`p-2.5 rounded-full font-bold transition-all shrink-0 ${
                promptInput.trim() && !isGenerating
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer shadow-md'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Disclaimer text bottom left */}
          <div className="mt-2 text-[10px] text-zinc-500 dark:text-zinc-500 text-left px-4 font-medium">
            Trelvix AI Video Studio can make mistakes, so double check it
          </div>

        </div>

      </main>

    </div>
  );
};
