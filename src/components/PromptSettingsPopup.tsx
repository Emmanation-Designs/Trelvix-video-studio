import React from 'react';
import { X } from 'lucide-react';
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
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs" 
        onClick={onClose}
      />

      <div className="fixed sm:absolute inset-x-3 bottom-20 sm:bottom-16 sm:right-0 sm:left-auto sm:inset-x-auto z-50 w-auto sm:w-88 max-h-[85vh] overflow-y-auto p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Specifications
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          
          {/* Section 1: Generation Mode */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 block">
              Mode
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setMode('Text-to-Video')}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                  mode === 'Text-to-Video' || mode === 'Video'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                Text-to-Video
              </button>

              <button
                type="button"
                onClick={() => setMode('Image-to-Video')}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                  mode === 'Image-to-Video'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                Image-to-Video
              </button>
            </div>
          </div>

          {/* Section 2: Model Selection */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 block">
              Model Quality
            </label>
            <div className="space-y-1.5">
              
              {/* Option 1: Sora 2 Standard */}
              <button
                type="button"
                onClick={() => selectModel('sora-2-720p')}
                className={`w-full text-left p-2.5 rounded-xl transition-all border flex items-center justify-between cursor-pointer ${
                  selectedModelId === 'sora-2-720p'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/60 text-zinc-900 dark:text-white'
                    : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Sora 2</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Standard • 720p</div>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">5 credits</span>
              </button>

              {/* Option 2: Sora 2 Pro 720p */}
              <button
                type="button"
                onClick={() => selectModel('sora-2-pro-720p')}
                className={`w-full text-left p-2.5 rounded-xl transition-all border flex items-center justify-between cursor-pointer ${
                  selectedModelId === 'sora-2-pro-720p'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/60 text-zinc-900 dark:text-white'
                    : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Sora 2 Pro</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Enhanced • 720p</div>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">15 credits</span>
              </button>

              {/* Option 3: Sora 2 Pro 1024p */}
              <button
                type="button"
                onClick={() => selectModel('sora-2-pro-1024p')}
                className={`w-full text-left p-2.5 rounded-xl transition-all border flex items-center justify-between cursor-pointer ${
                  selectedModelId === 'sora-2-pro-1024p'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/60 text-zinc-900 dark:text-white'
                    : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Sora 2 Pro Max</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">High Resolution • 1024p</div>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">25 credits</span>
              </button>

            </div>
          </div>

          {/* Section 3: Aspect Ratio */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 block">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                  aspectRatio === '16:9'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/60 text-zinc-900 dark:text-white font-bold'
                    : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                }`}
              >
                <div className="w-3.5 h-2 border border-current rounded-xs" />
                <span>16:9 Landscape</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                  aspectRatio === '9:16'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/60 text-zinc-900 dark:text-white font-bold'
                    : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                }`}
              >
                <div className="w-2 h-3.5 border border-current rounded-xs" />
                <span>9:16 Portrait</span>
              </button>
            </div>
          </div>

          {/* Section 4: Duration */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 block">
              Duration
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['4s', '8s', '12s'] as DurationOption[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all border text-center cursor-pointer ${
                    duration === d
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/60 text-zinc-900 dark:text-white font-bold'
                      : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                  }`}
                >
                  {d.replace('s', ' seconds')}
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Output Count */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 block">
              Batch Output
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['x1', 'x2', 'x3', 'x4'] as BatchCount[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBatchCount(b)}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all border text-center cursor-pointer ${
                    batchCount === b
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/60 text-zinc-900 dark:text-white font-bold'
                      : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Footer: Simple Credit Cost */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Cost required</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{creditCost} credits</span>
          </div>

        </div>
      </div>
    </>
  );
};

