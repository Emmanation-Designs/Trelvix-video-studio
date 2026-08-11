import React, { useState, useRef } from 'react';
import { authFetch, fetchUserCredits, safeParseJsonResponse, UserProfileData } from '../lib/api';
import { UserAvatar } from './Navbar';
import { 
  LayoutGrid, 
  User, 
  Layers, 
  Trash2, 
  PanelLeftClose, 
  PanelLeft, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  Play, 
  Download, 
  Image as ImageIcon,
  RotateCcw,
  Square,
  X,
  Clock,
  Film,
  Wand2,
  Upload,
  FolderPlus,
  Video,
  ArrowLeft,
  HelpCircle,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { 
  Project, 
  VideoGeneration, 
  QualityMode, 
  AspectRatio, 
  DurationOption, 
  ResolutionOption,
  BatchCount, 
  GenerationModeType,
  CharacterItem,
  SceneItem,
  TrashedItem
} from '../types';
import { PromptSettingsPopup } from './PromptSettingsPopup';

interface ProjectWorkspaceProps {
  project: Project;
  allProjects?: Project[];
  onOpenProject?: (p: Project) => void;
  onUpdateProject: (updatedProject: Project) => void;
  onSelectVideo: (video: VideoGeneration) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  isMobileSidebarOpen?: boolean;
  onCloseMobileSidebar?: () => void;
  userProfile?: UserProfileData | null;
  onOpenSettings?: () => void;
  onReturnToMainApp?: () => void;
  onOpenSupport?: () => void;
  onSignOut?: () => void;
}

interface UploadedFileItem {
  id: string;
  name: string;
  size: string;
  url: string;
  type: 'image' | 'video';
  uploadedAt: string;
}

const SAMPLE_CHARACTERS = [
  {
    id: 'sample-1',
    title: 'The Eccentric',
    description: 'Unforgettable quirky humans. Magnetic scene-stealers with offbeat charm.',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'sample-2',
    title: 'The Professional',
    description: 'Clean cut, well spoken, competent',
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'sample-3',
    title: 'The Wildcard',
    description: 'Beyond human, anything can be a character, right?',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'sample-4',
    title: 'The Familiar',
    description: 'Grounded and authentic, a relatable anchor for your story',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'sample-5',
    title: 'The Wicked',
    description: 'Powerful antagonistic figures that command the screen',
    imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'sample-6',
    title: 'The Fantastical',
    description: 'Ethereal, dreamlike beings fusing the human and the mythical',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400'
  }
];

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  allProjects = [],
  onOpenProject,
  onUpdateProject,
  onSelectVideo,
  setCredits,
  isMobileSidebarOpen = false,
  onCloseMobileSidebar,
  userProfile,
  onOpenSettings,
  onReturnToMainApp,
  onOpenSupport,
  onSignOut
}) => {
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'videos' | 'characters' | 'scenes' | 'trash'>('all');
  const [showMobileAccountMenu, setShowMobileAccountMenu] = useState(false);

  // Attachment & Uploaded Files state
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Prompt input & settings state
  const [promptInput, setPromptInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Generation settings
  const [mode, setMode] = useState<GenerationModeType>('Text-to-Video');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [quality, setQuality] = useState<QualityMode>('Creative Quality');
  const [duration, setDuration] = useState<DurationOption>('6s');
  const [resolution, setResolution] = useState<ResolutionOption>('1080p');
  const [batchCount, setBatchCount] = useState<BatchCount>('x2');

  // Generation process state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(15);
  const [generatingCount, setGeneratingCount] = useState(2);

  // Characters & Scenes State
  const [characterInput, setCharacterInput] = useState('');
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);

  const [sceneInput, setSceneInput] = useState('');
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);

  // Trash State
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([]);

  // Credit calculation matching authoritative server rates
  const calculatedCreditCost = (() => {
    const batchMultiplier = parseInt(batchCount.replace('x', ''), 10) || 1;
    const durSec = parseInt(duration.replace('s', ''), 10) || 6;
    const isSuper = quality.toLowerCase().includes('super');
    let baseRate = 15;
    if (!isSuper) {
      if (durSec === 4) baseRate = 10;
      else if (durSec === 6) baseRate = 15;
      else if (durSec === 8) baseRate = 20;
      else if (durSec === 12) baseRate = 30;
    } else {
      if (durSec === 4) baseRate = 20;
      else if (durSec === 6) baseRate = 30;
      else if (durSec === 8) baseRate = 40;
      else if (durSec === 12) baseRate = 60;
    }
    return baseRate * batchMultiplier;
  })();

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAttachedImage(result);
        setMode('Image-to-Video');

        const newUploadedItem: UploadedFileItem = {
          id: `up-${Date.now()}`,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          url: result,
          type: file.type.startsWith('video') ? 'video' : 'image',
          uploadedAt: 'Just now'
        };
        setUploadedFiles((prev) => [newUploadedItem, ...prev]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Generate Video
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() || isGenerating) return;

    const count = parseInt(batchCount.replace('x', ''), 10) || 1;
    setGeneratingCount(count);
    setIsGenerating(true);
    setGeneratingProgress(15);

    try {
      const response = await authFetch('/api/video-studio/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: attachedImage ? `[Image Reference] ${promptInput}` : promptInput,
          model: quality === 'Super Creative Quality' ? 'sora-1.0' : 'sora-1.0-turbo',
          quality: quality === 'Super Creative Quality' ? 'super_creative' : 'creative',
          duration,
          resolution,
          aspectRatio,
          batchCount,
          imageInput: attachedImage || undefined
        })
      });

      const parsedGen = await safeParseJsonResponse(response);
      const data = parsedGen.data || {};

      if (!parsedGen.ok || !data.success) {
        alert(parsedGen.error || data.error || 'Video generation request failed.');
        setIsGenerating(false);
        if (data.remainingCredits !== undefined) {
          setCredits(data.remainingCredits);
        }
        return;
      }

      if (data.remainingCredits !== undefined) {
        setCredits(data.remainingCredits);
      }

      const generatedJobs = data.videos || [];
      const createdVideos: VideoGeneration[] = [];

      // Poll status for each provider job ID
      for (let i = 0; i < generatedJobs.length; i++) {
        const job = generatedJobs[i];
        let attempts = 0;
        let isDone = false;
        const maxAttempts = 60; // 60 * 3s = 3 minutes max

        while (!isDone && attempts < maxAttempts) {
          attempts++;
          await new Promise((r) => setTimeout(r, 3000));

          try {
            const statusRes = await authFetch(`/api/video-studio/generations/${job.providerJobId || job.id}/status`);
            const statusParsed = await safeParseJsonResponse(statusRes);
            const statusData = statusParsed.data || {};

            if (statusData.status === 'completed' || statusData.video?.status === 'completed') {
              isDone = true;
              const completedUrl = statusData.video?.videoUrl || statusData.videoUrl;
              createdVideos.push({
                id: job.id || `vid-${Date.now()}-${i}`,
                prompt: promptInput,
                quality,
                aspectRatio,
                duration,
                resolution,
                batchCount,
                createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                videoUrl: completedUrl,
                posterUrl: statusData.video?.thumbnailUrl || '',
                creditCost: Math.round(calculatedCreditCost / count),
                status: 'completed'
              });
            } else if (statusData.status === 'failed' || statusData.video?.status === 'failed') {
              isDone = true;
              alert(`Generation failed: ${statusData.error || statusData.video?.errorMessage || 'AI provider error'}`);
              const freshWallet = await fetchUserCredits();
              if (freshWallet) setCredits(freshWallet.balance);
            } else {
              if (statusData.video?.progress) {
                setGeneratingProgress(statusData.video.progress);
              }
            }
          } catch (pollErr) {
            console.warn('Polling status check error:', pollErr);
          }
        }
      }

      setIsGenerating(false);

      if (createdVideos.length > 0) {
        const updatedProject: Project = {
          ...project,
          videos: [...createdVideos, ...(project.videos || [])],
          updatedAt: 'Just now'
        };

        onUpdateProject(updatedProject);
        setPromptInput('');
        setAttachedImage(null);
      }
    } catch (err: any) {
      console.error('Generation call failed:', err);
      alert(`Generation failed: ${err.message || 'Network error'}`);
      setIsGenerating(false);
    }
  };

  // Actions for Characters
  const handleAddCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterInput.trim() || isGeneratingCharacter) return;

    setIsGeneratingCharacter(true);
    try {
      const res = await authFetch('/api/video-studio/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: characterInput })
      });
      const parsedChar = await safeParseJsonResponse(res);
      const data = parsedChar.data || {};
      if (parsedChar.ok && data.success && data.imageUrl) {
        const newChar: CharacterItem = {
          id: `char-${Date.now()}`,
          number: characters.length + 1,
          title: characterInput.slice(0, 24),
          description: characterInput,
          imageUrl: data.imageUrl,
          createdAt: 'Just now'
        };
        setCharacters([newChar, ...characters]);
        setCharacterInput('');
      } else {
        alert(parsedChar.error || data.error || 'Character image generation failed');
      }
    } catch (err: any) {
      alert(`Image generation failed: ${err.message || 'Error'}`);
    } finally {
      setIsGeneratingCharacter(false);
    }
  };

  const handleUseCharacter = (char: CharacterItem) => {
    setPromptInput(`Consistent character: ${char.title} - ${char.description}. `);
    setActiveTab('all');
    textareaRef.current?.focus();
  };

  const handleTrashCharacter = (charId: string) => {
    const char = characters.find(c => c.id === charId);
    if (char) {
      setTrashedItems([
        {
          id: char.id,
          type: 'character',
          title: char.title,
          previewUrl: char.imageUrl,
          deletedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          originalData: char
        },
        ...trashedItems
      ]);
      setCharacters(characters.filter(c => c.id !== charId));
    }
  };

  // Actions for Scenes
  const handleAddScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sceneInput.trim() || isGeneratingScene) return;

    setIsGeneratingScene(true);
    try {
      const res = await authFetch('/api/video-studio/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: sceneInput })
      });
      const parsedScene = await safeParseJsonResponse(res);
      const data = parsedScene.data || {};
      if (parsedScene.ok && data.success && data.imageUrl) {
        const newScene: SceneItem = {
          id: `scene-${Date.now()}`,
          number: scenes.length + 1,
          title: sceneInput.slice(0, 24),
          description: sceneInput,
          imageUrl: data.imageUrl,
          createdAt: 'Just now'
        };
        setScenes([newScene, ...scenes]);
        setSceneInput('');
      } else {
        alert(parsedScene.error || data.error || 'Scene image generation failed');
      }
    } catch (err: any) {
      alert(`Image generation failed: ${err.message || 'Error'}`);
    } finally {
      setIsGeneratingScene(false);
    }
  };

  const handleUseScene = (scene: SceneItem) => {
    setPromptInput(`Scene setting: ${scene.title} - ${scene.description}. `);
    setActiveTab('all');
    textareaRef.current?.focus();
  };

  const handleTrashScene = (sceneId: string) => {
    const sc = scenes.find(s => s.id === sceneId);
    if (sc) {
      setTrashedItems([
        {
          id: sc.id,
          type: 'scene',
          title: sc.title,
          previewUrl: sc.imageUrl,
          deletedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          originalData: sc
        },
        ...trashedItems
      ]);
      setScenes(scenes.filter(s => s.id !== sceneId));
    }
  };

  // Action for Trashing Video
  const handleTrashVideo = (video: VideoGeneration, e: React.MouseEvent) => {
    e.stopPropagation();
    setTrashedItems([
      {
        id: video.id,
        type: 'video',
        title: video.prompt.slice(0, 30),
        previewUrl: video.posterUrl,
        deletedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        originalData: video
      },
      ...trashedItems
    ]);
    const updated = {
      ...project,
      videos: project.videos.filter(v => v.id !== video.id)
    };
    onUpdateProject(updated);
  };

  // Trash actions
  const handleRestoreItem = (item: TrashedItem) => {
    if (item.type === 'character') {
      setCharacters([item.originalData, ...characters]);
    } else if (item.type === 'scene') {
      setScenes([item.originalData, ...scenes]);
    } else if (item.type === 'video') {
      onUpdateProject({
        ...project,
        videos: [item.originalData, ...project.videos]
      });
    }
    setTrashedItems(trashedItems.filter(i => i.id !== item.id));
  };

  const handleDeletePermanently = (itemId: string) => {
    setTrashedItems(trashedItems.filter(i => i.id !== itemId));
  };

  const handleEmptyTrash = () => {
    setTrashedItems([]);
  };

  // Recent projects list (up to 8)
  const recentProjects = allProjects.slice(0, 8);

  return (
    <div className="flex-1 flex overflow-hidden relative transition-colors duration-200">
      
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm md:hidden animate-in fade-in"
          onClick={onCloseMobileSidebar}
        />
      )}

      {/* LEFT SIDEBAR (Inline on desktop, Off-canvas drawer on mobile) */}
      <aside 
        className={`
          max-md:fixed max-md:top-16 max-md:bottom-0 max-md:left-0 max-md:z-50 max-md:w-64 max-md:bg-white max-md:dark:bg-zinc-950 max-md:shadow-2xl max-md:transition-transform max-md:duration-300
          ${isMobileSidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
          md:relative md:top-0 md:inset-auto md:z-10 md:translate-x-0
          ${sidebarCollapsed ? 'md:w-16' : 'md:w-56'}
          bg-white/90 dark:bg-zinc-950/90 border-r border-zinc-200 dark:border-zinc-800/80 p-3 flex flex-col justify-between select-none backdrop-blur-md shrink-0
        `}
      >
        <div className="space-y-4">
          
          {/* Main Navigation Items */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveTab('all');
                onCloseMobileSidebar?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className={sidebarCollapsed ? 'md:hidden' : ''}>All Media</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('videos');
                onCloseMobileSidebar?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'videos'
                  ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
              }`}
            >
              <Video className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className={sidebarCollapsed ? 'md:hidden' : ''}>Videos</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('characters');
                onCloseMobileSidebar?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'characters'
                  ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
              }`}
            >
              <User className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className={sidebarCollapsed ? 'md:hidden' : ''}>Characters</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('scenes');
                onCloseMobileSidebar?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'scenes'
                  ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className={sidebarCollapsed ? 'md:hidden' : ''}>Scenes</span>
            </button>

          </div>

          {/* Uploaded Files Section */}
          <div className={`space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Upload className="w-3 h-3 text-emerald-500" />
                Uploaded Files ({uploadedFiles.length})
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-emerald-500 transition-colors cursor-pointer"
                title="Upload file"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
              {uploadedFiles.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50">
                  <p className="text-[11px] text-zinc-400">No uploaded files yet.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 text-[10px] font-bold text-emerald-500 hover:underline cursor-pointer"
                  >
                    + Upload File
                  </button>
                </div>
              ) : (
                uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      setAttachedImage(file.url);
                      setMode('Image-to-Video');
                    }}
                    className={`group w-full flex items-center gap-2 p-1.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                      attachedImage === file.url
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700">
                      <img src={file.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] truncate font-semibold text-zinc-800 dark:text-zinc-200">{file.name}</div>
                      <div className="text-[9px] text-zinc-400">{file.size} · {file.uploadedAt}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFiles((prev) => prev.filter(f => f.id !== file.id));
                        if (attachedImage === file.url) setAttachedImage(null);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity"
                      title="Delete file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Bottom Section: Trash & Collapse */}
        <div className="space-y-1 pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
          <button
            onClick={() => {
              setActiveTab('trash');
              onCloseMobileSidebar?.();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'trash'
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 shrink-0 text-zinc-400" />
              <span className={sidebarCollapsed ? 'md:hidden' : ''}>Trash</span>
            </div>
            {trashedItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold text-[10px]">
                {trashedItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex w-full items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-4 h-4 shrink-0" />
            ) : (
              <PanelLeftClose className="w-4 h-4 shrink-0" />
            )}
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>

          {/* Mobile Account Control in Drawer */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 md:hidden">
            <button
              onClick={() => setShowMobileAccountMenu(!showMobileAccountMenu)}
              className="w-full flex items-center gap-2.5 p-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer text-left"
            >
              <UserAvatar userProfile={userProfile} className="w-8 h-8" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {userProfile?.fullName || userProfile?.email || 'Trelvix User'}
                </div>
                {userProfile?.email && (
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                    {userProfile.email}
                  </div>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${showMobileAccountMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMobileAccountMenu && (
              <div className="mt-1 space-y-0.5 p-1 bg-zinc-50 dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setShowMobileAccountMenu(false);
                    onCloseMobileSidebar?.();
                    onReturnToMainApp ? onReturnToMainApp() : (window.location.href = 'https://trelvixai.com');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Return to Trelvix AI</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAccountMenu(false);
                    onCloseMobileSidebar?.();
                    onOpenSupport ? onOpenSupport() : (window.location.href = 'https://trelvixai.com/support');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Help & Support</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAccountMenu(false);
                    onCloseMobileSidebar?.();
                    onOpenSettings?.();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Video Studio Settings</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAccountMenu(false);
                    onCloseMobileSidebar?.();
                    onSignOut?.();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-left transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CANVAS WORKSPACE AREA */}
      <main className="flex-1 flex flex-col justify-between overflow-y-auto p-4 sm:p-8 relative min-h-0 bg-zinc-100/50 dark:bg-zinc-950">
        
        {/* CANVAS VIEWS ROUTER */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[360px] pb-28">
          
          {/* VIEW 1: ALL MEDIA & VIDEOS */}
          {(activeTab === 'all' || activeTab === 'videos') && (
            <>
              {isGenerating ? (
                /* GENERATING SKELETON CARDS */
                <div className="flex flex-wrap items-center justify-center gap-6 w-full max-w-4xl animate-in fade-in duration-300">
                  {Array.from({ length: generatingCount }).map((_, idx) => (
                    <div 
                      key={idx}
                      className={`relative rounded-3xl overflow-hidden border border-emerald-500/40 bg-zinc-900 shadow-2xl flex flex-col justify-between p-4 ${
                        aspectRatio === '9:16' ? 'w-64 sm:w-72 aspect-[9/16]' : 'w-full max-w-md aspect-video'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 animate-pulse" />
                      <div className="absolute inset-0 bg-white/5 backdrop-blur-xl" />

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold shadow-lg">
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-black/60 text-emerald-400 font-bold text-xs border border-emerald-500/30 backdrop-blur">
                          {generatingProgress}%
                        </span>
                      </div>

                      <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-emerald-400 tracking-wider">
                          Synthesizing scene...
                        </span>
                      </div>

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
                /* COMPLETED GENERATED VIDEOS GALLERY (IMAGE 1: HORIZONTAL SCROLL / FLEX CARDS SIDE BY SIDE) */
                <div className="flex items-center justify-start gap-4 sm:gap-6 overflow-x-auto py-4 px-2 w-full max-w-full my-auto animate-in fade-in duration-300 scrollbar-thin">
                  {project.videos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => onSelectVideo(vid)}
                      className="group relative rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-900 shadow-2xl hover:border-emerald-500/60 transition-all duration-300 cursor-pointer w-48 sm:w-56 md:w-64 aspect-[9/16] shrink-0"
                    >
                      <img
                        src={vid.posterUrl}
                        alt={vid.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                      {/* Top Overlay Play Badge (Matching Image 1: White circle play button top-left) */}
                      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold shadow-lg shadow-black/50 group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                        </div>

                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={vid.videoUrl}
                            download="trelvix-ai-video.mp4"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-emerald-500 text-white hover:text-black transition-colors backdrop-blur"
                            title="Download video"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={(e) => handleTrashVideo(vid, e)}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-red-500 text-white transition-colors backdrop-blur"
                            title="Move to trash"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Prompt Caption & Settings Tags */}
                      <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1.5">
                        <p className="text-xs font-bold text-white line-clamp-2 drop-shadow-md">
                          {vid.prompt}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-zinc-300 font-medium">
                          <span className="px-2 py-0.5 rounded bg-black/50 backdrop-blur">
                            {vid.duration} · {vid.aspectRatio}
                          </span>
                          <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-black/50 backdrop-blur">
                            {vid.quality}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* EMPTY CANVAS */
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
            </>
          )}

          {/* VIEW 2: CHARACTERS (MATCHING IMAGE 2 EXACTLY) */}
          {activeTab === 'characters' && (
            <div className="w-full max-w-4xl space-y-6 my-auto animate-in fade-in duration-300 py-4">
              {/* Header Title & Subtitle Centered */}
              <div className="text-center space-y-2 max-w-2xl mx-auto mb-6">
                <h2 className="text-2xl sm:text-3xl font-medium text-zinc-900 dark:text-zinc-100 tracking-tight font-sans">
                  Build and reuse characters for consistent videos.
                </h2>
                <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 font-normal">
                  Use a sample prompt below, or create from scratch.
                </p>
              </div>

              {/* 6 Preset Sample Characters Cards Grid (2 rows x 3 cols matching Image 2) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                {SAMPLE_CHARACTERS.map((char) => (
                  <div 
                    key={char.id}
                    onClick={() => setPromptInput(`A character video featuring ${char.title}: ${char.description}`)}
                    className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/90 hover:border-emerald-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all cursor-pointer flex items-center gap-3.5 shadow-sm group"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-zinc-800 border border-zinc-200 dark:border-zinc-800">
                      <img src={char.imageUrl} alt={char.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">{char.title}</h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {char.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Character Input Form */}
              <form onSubmit={handleAddCharacter} className="flex gap-2 my-2">
                <input
                  type="text"
                  value={characterInput}
                  onChange={(e) => setCharacterInput(e.target.value)}
                  placeholder="Describe character (e.g. 'Cyberpunk street rover in neon leather jacket with silver visor')"
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!characterInput.trim() || isGeneratingCharacter}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isGeneratingCharacter ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{isGeneratingCharacter ? 'Generating...' : 'Create Character'}</span>
                </button>
              </form>

              {/* Action Buttons Below Cards: Upload & Add from Project (Matching Image 2) */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </button>
                <button 
                  onClick={() => setActiveTab('all')} 
                  className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <FolderPlus className="w-4 h-4 text-emerald-500" />
                  <span>Add from Project</span>
                </button>
              </div>

              {/* Saved Characters Section */}
              {characters.length > 0 && (
                <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Your Saved Characters</h3>
                    <span className="text-xs text-zinc-400">{characters.length} characters</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {characters.map((char) => (
                      <div 
                        key={char.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-sm hover:border-emerald-500/50 transition-all"
                      >
                        <div className="aspect-square rounded-xl overflow-hidden bg-zinc-800 relative">
                          <img src={char.imageUrl} alt={char.title} className="w-full h-full object-cover" />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                            #{char.number}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">{char.title}</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                            {char.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <button
                            onClick={() => handleUseCharacter(char)}
                            className="text-xs font-bold text-emerald-500 hover:underline cursor-pointer"
                          >
                            Use in Prompt →
                          </button>
                          <button
                            onClick={() => handleTrashCharacter(char.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                            title="Delete character"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: SCENES */}
          {activeTab === 'scenes' && (
            <div className="w-full max-w-4xl space-y-6 my-auto animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-bold">Scene Environment Studio</h3>
                </div>
                <span className="text-xs text-zinc-400">
                  {scenes.length} Saved Scenes
                </span>
              </div>

              {/* Scene Input Form */}
              <form onSubmit={handleAddScene} className="flex gap-2">
                <input
                  type="text"
                  value={sceneInput}
                  onChange={(e) => setSceneInput(e.target.value)}
                  placeholder="Describe scene environment (e.g. 'Futuristic rainy rooftop garden with neon skyline')"
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!sceneInput.trim()}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Scene</span>
                </button>
              </form>

              {/* Scene Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scenes.map((sc) => (
                  <div 
                    key={sc.id}
                    className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-md hover:border-emerald-500/50 transition-all"
                  >
                    <div className="aspect-video rounded-2xl overflow-hidden bg-zinc-800 relative">
                      <img src={sc.imageUrl} alt={sc.title} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                        Scene #{sc.number}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{sc.title}</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                        {sc.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <button
                        onClick={() => handleUseScene(sc)}
                        className="text-xs font-bold text-emerald-500 hover:underline cursor-pointer"
                      >
                        Use in Prompt →
                      </button>
                      <button
                        onClick={() => handleTrashScene(sc.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                        title="Delete scene"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 4: TRASH */}
          {activeTab === 'trash' && (
            <div className="w-full max-w-4xl space-y-6 my-auto animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-bold">Trash & Deleted Items</h3>
                </div>
                {trashedItems.length > 0 && (
                  <button
                    onClick={handleEmptyTrash}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold text-xs border border-red-500/20 transition-colors cursor-pointer"
                  >
                    Empty Trash
                  </button>
                )}
              </div>

              {trashedItems.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Trash2 className="w-12 h-12 text-zinc-400 mx-auto" />
                  <p className="font-bold text-zinc-500">Trash is empty</p>
                  <p className="text-xs text-zinc-400">Deleted videos, characters, or scenes will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trashedItems.map((item) => (
                    <div 
                      key={item.id}
                      className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-md"
                    >
                      <div className="aspect-video rounded-2xl overflow-hidden bg-zinc-800 relative">
                        <img src={item.previewUrl} alt={item.title} className="w-full h-full object-cover opacity-75" />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] uppercase font-bold text-red-400">
                          {item.type}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs truncate">{item.title}</h4>
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          onClick={() => handleRestoreItem(item)}
                          className="flex items-center gap-1 text-xs font-bold text-emerald-500 hover:underline cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => handleDeletePermanently(item.id)}
                          className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                        >
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* BOTTOM FLOATING PROMPT INPUT BAR */}
        <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 w-[95%] sm:w-[92%] max-w-2xl">
          
          {/* Settings Popup Modal */}
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
            resolution={resolution}
            setResolution={setResolution}
            batchCount={batchCount}
            setBatchCount={setBatchCount}
            creditCost={Math.round(calculatedCreditCost)}
          />

          {/* Hidden File Input for Image-to-Video */}
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            className="hidden" 
          />

          {/* Floating Dark/Light Backdrop-blur Card Container */}
          <div className="bg-white dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl transition-all">
            
            {/* Image Attachment Tag Badge */}
            {attachedImage && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-full w-fit text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image attached (Image-to-Video)</span>
                <button 
                  type="button" 
                  onClick={() => setAttachedImage(null)} 
                  className="hover:text-red-400 ml-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-2 sm:space-y-3">
              {/* Clean textarea, placeholder 'What do you want to create?', rows={2}, no ring */}
              <textarea
                ref={textareaRef}
                rows={2}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="What do you want to create?"
                className="w-full bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none resize-none border-0 p-0"
              />

              {/* Bottom Controls Row */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                
                {/* Left: ONLY a single circular '+' button for file upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Attach image for Image-to-Video"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Right: Format Settings Toggle Button & Send Button */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Format Settings Toggle Pill */}
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-[10px] sm:text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 transition-all shrink-0 flex items-center gap-1 sm:gap-1.5 cursor-pointer"
                  >
                    <Square className="w-3 h-3 text-emerald-500" />
                    <span>{aspectRatio}</span>
                    <span>•</span>
                    <span>{duration}</span>
                    <span>•</span>
                    <span>{batchCount}</span>
                  </button>

                  {/* Send / Generate Circular Button */}
                  <button
                    type="submit"
                    disabled={!promptInput.trim() || isGenerating}
                    className={`w-9 h-9 rounded-full font-bold transition-all flex items-center justify-center shrink-0 ${
                      promptInput.trim() && !isGenerating
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer shadow-md'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {isGenerating ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>
                </div>

              </div>
            </form>

          </div>

          {/* Disclaimer text */}
          <div className="mt-1.5 text-[10px] text-zinc-500 dark:text-zinc-500 text-center font-medium">
            Trelvix AI Video Studio can make mistakes. Verify important generated details.
          </div>

        </div>

      </main>

    </div>
  );
};
