import React from 'react';
import { 
  Video, 
  Layers, 
  Sparkles, 
  Check, 
  Smartphone, 
  Tv, 
  Square,
  ChevronDown 
} from 'lucide-react';
import { 
  QualityMode, 
  AspectRatio, 
  DurationOption, 
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

      <div className="absolute bottom-16 right-0 z-50 w-80 sm:w-88 p-4 rounded-2xl bg-zinc-900/95 dark:bg-zinc-900/95 bg-white/95 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="space-y-4">
          
          {/* Row 1: Mode Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setMode('Video')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'Video'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-zinc-200 dark:border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('Frames')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'Frames'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-zinc-200 dark:border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Frames</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('Ingredients')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'Ingredients'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-zinc-200 dark:border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ingredients</span>
            </button>
          </div>

          {/* Row 2: Aspect Ratio */}
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

          {/* Row 3: Model Quality Dropdown */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Generation Engine
            </label>
            <div className="relative">
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as QualityMode)}
                className="w-full appearance-none bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 pr-8"
              >
                <option value="Omni Flash">Omni Flash (Fastest & Sharp)</option>
                <option value="Creative Quality">Creative Quality (High Dynamic)</option>
                <option value="Super Creative Quality">Super Creative Quality (Pro Cinematic)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Row 4: Duration */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Clip Duration
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['4s', '6s', '8s', '10s'] as DurationOption[]).map((d) => (
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

          {/* Row 5: Batch Variants */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Output Variants (Batch)
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
