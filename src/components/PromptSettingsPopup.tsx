import React from 'react';
import { 
  Video, 
  Image as ImageIcon, 
  Crown,
  Sparkles,
  Layers
} from 'lucide-react';
import { 
  QualityMode, 
  AspectRatio, 
  DurationOption, 
  ResolutionOption,
  BatchCount, 
  GenerationModeType 
} from '../types';

interface PromptSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  mode: GenerationModeType;
  setMode: (m: GenerationModeType) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ar: AspectRatio) => void;
  quality: QualityMode;
  setQuality: (q: QualityMode) => void;
  duration: DurationOption;
  setDuration: (d: DurationOption) => void;
  resolution: ResolutionOption;
  setResolution: (r: ResolutionOption) => void;
  batchCount: BatchCount;
  setBatchCount: (b: BatchCount) => void;
  creditCost: number;
}

export const PromptSettingsPopup: React.FC<PromptSettingsPopupProps> = ({
  isOpen,
  onClose,
  mode,
  setMode,
  aspectRatio,
  setAspectRatio,
  quality,
  setQuality,
  duration,
  setDuration,
  resolution,
  setResolution,
  batchCount,
  setBatchCount,
  creditCost
}) => {
  if (!isOpen) return null;

  const isPro = quality.includes('Pro') || quality.includes('Super');
  const is1024 = resolution === '1024p' || quality.includes('1024');

  const selectedModelId = isPro
    ? (is1024 ? 'sora-2-pro-1024p' : 'sora-2-pro-720p')
    : 'sora-2-720p';

  const selectModel = (id: 'sora-2-720p' | 'sora-2-pro-720p' | 'sora-2-pro-1024p') => {
    if (id === 'sora-2-720p') {
      setQuality('Sora 2');
      setResolution('720p');
    } else if (id === 'sora-2-pro-720p') {
      setQuality('Sora 2 Pro (720p)');
      setResolution('720p');
    } else if (id === 'sora-2-pro-1024p') {
      setQuality('Sora 2 Pro (1024p)');
      setResolution('1024p');
    }
  };

  return (
    <>
      {/* Backdrop overlay for quick dismissal */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />

      <div className="fixed sm:absolute inset-x-3 bottom-20 sm:bottom-16 sm:right-0 sm:left-auto sm:inset-x-auto z-50 w-auto sm:w-96 max-h-[85vh] overflow-y-auto p-4 sm:p-5 rounded-3xl bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="space-y-4">
          
          {/* Row 1: Mode Selector Tabs (Text-to-Video vs Image-to-Video) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Generation Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setMode('Text-to-Video')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'Text-to-Video' || mode === 'Video'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-zinc-200 dark:border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Text-to-Video</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('Image-to-Video')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'Image-to-Video'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-zinc-200 dark:border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image-to-Video</span>
              </button>
            </div>
          </div>

          {/* Row 2: Model Selection (Authoritative OpenAI Sora 2 Models) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              OpenAI Video Model
            </label>
            <div className="space-y-2">
              {/* Option 1: Sora 2 Standard */}
              <button
                type="button"
                onClick={() => selectModel('sora-2-720p')}
                className={`w-full text-left p-2.5 rounded-xl transition-all border flex items-center justify-between ${
                  selectedModelId === 'sora-2-720p'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/50 text-zinc-900 dark:text-white shadow-sm'
                    : 'bg-zinc-100/80 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">Sora 2</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">Standard 720p</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Fast, crisp generation • 4/8/12 sec</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">From 5 credits</span>
                </div>
              </button>

              {/* Option 2: Sora 2 Pro 720p */}
              <button
                type="button"
                onClick={() => selectModel('sora-2-pro-720p')}
                className={`w-full text-left p-2.5 rounded-xl transition-all border flex items-center justify-between ${
                  selectedModelId === 'sora-2-pro-720p'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/50 text-zinc-900 dark:text-white shadow-sm'
                    : 'bg-zinc-100/80 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">Sora 2 Pro</span>
                    <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">Pro 720p</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Enhanced motion realism & details</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">From 15 credits</span>
                </div>
              </button>

              {/* Option 3: Sora 2 Pro 1024p */}
              <button
                type="button"
                onClick={() => selectModel('sora-2-pro-1024p')}
                className={`w-full text-left p-2.5 rounded-xl transition-all border flex items-center justify-between ${
                  selectedModelId === 'sora-2-pro-1024p'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/50 text-zinc-900 dark:text-white shadow-sm'
                    : 'bg-zinc-100/80 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">Sora 2 Pro</span>
                    <Sparkles className="w-3 h-3 text-purple-400 fill-purple-400" />
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">Pro 1024p</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Ultra high resolution cinematic output</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">From 25 credits</span>
                </div>
              </button>
            </div>
          </div>

          {/* Row 3: Aspect Ratio / Size Toggle */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Orientation & Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                  aspectRatio === '16:9'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
                    : 'bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                }`}
              >
                <div className="w-4 h-2.5 border-2 border-current rounded-xs" />
                <span>16:9 Landscape ({is1024 ? '1792x1024' : '1280x720'})</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                  aspectRatio === '9:16'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
                    : 'bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                }`}
              >
                <div className="w-2.5 h-4 border-2 border-current rounded-xs" />
                <span>9:16 Portrait ({is1024 ? '1024x1792' : '720x1280'})</span>
              </button>
            </div>
          </div>

          {/* Row 4: Duration (4 sec, 8 sec, 12 sec ONLY) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Clip Duration (OpenAI Supported)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['4s', '8s', '12s'] as DurationOption[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center ${
                    duration === d
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
                      : 'bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                  }`}
                >
                  <span>{d.replace('s', ' sec')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 5: Output Count (x1, x2, x3, x4) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Output Count (Batch)
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['x1', 'x2', 'x3', 'x4'] as BatchCount[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBatchCount(b)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    batchCount === b
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
                      : 'bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Footer: Credit usage info */}
          <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Total Required: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{creditCost} credits</strong>
            </span>
          </div>

        </div>
      </div>
    </>
  );
};
