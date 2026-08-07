import React from 'react';
import { 
  Video, 
  Image as ImageIcon, 
  Crown,
  ChevronDown 
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

  return (
    <>
      {/* Backdrop overlay for quick dismissal */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />

      <div className="fixed sm:absolute inset-x-3 bottom-20 sm:bottom-16 sm:right-0 sm:left-auto sm:inset-x-auto z-50 w-auto sm:w-96 max-h-[82vh] overflow-y-auto p-4 sm:p-5 rounded-3xl bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
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

          {/* Row 2: Aspect Ratio Toggle */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                  aspectRatio === '9:16'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
                    : 'bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                }`}
              >
                <div className="w-3 h-4 border-2 border-current rounded-xs" />
                <span>9:16 Portrait</span>
              </button>

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
                <span>16:9 Landscape</span>
              </button>
            </div>
          </div>

          {/* Row 3: Quality Engine (Creative sora-2 vs Super Creative sora-2-pro with Crown badge) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Quality Engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQuality('Creative Quality')}
                className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl text-xs font-semibold transition-all border ${
                  quality === 'Creative Quality' || quality === 'Creative (sora-2)' || quality === 'Omni Flash'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
                    : 'bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                }`}
              >
                <span>Creative</span>
                <span className="text-[10px] opacity-75 font-normal">(sora-2)</span>
              </button>

              <button
                type="button"
                onClick={() => setQuality('Super Creative Quality')}
                className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl text-xs font-semibold transition-all border relative ${
                  quality === 'Super Creative Quality' || quality === 'Super Creative (sora-2-pro)'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
                    : 'bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>Super Creative</span>
                  <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>
                <span className="text-[10px] opacity-75 font-normal">(sora-2-pro)</span>
              </button>
            </div>
          </div>

          {/* Row 4: Duration (4s, 8s, 12s) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Clip Duration
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['4s', '8s', '12s'] as DurationOption[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    duration === d
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
                      : 'bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Row 5: Resolution (720p, 1080p, 4K) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Resolution
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['720p', '1080p', '4K'] as ResolutionOption[]).map((res) => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setResolution(res)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    resolution === res
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
                      : 'bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          {/* Row 6: Output Count (x1, x2, x3, x4) */}
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
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Generating will use <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{creditCost} credits</strong>
            </span>
          </div>

        </div>
      </div>
    </>
  );
};
