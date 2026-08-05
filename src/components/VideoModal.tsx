import React, { useState, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Download, 
  Copy, 
  Check, 
  Heart, 
  RotateCcw, 
  Sparkles,
  Zap,
  Maximize2
} from 'lucide-react';
import { VideoGeneration } from '../types';

interface VideoModalProps {
  video: VideoGeneration | null;
  onClose: () => void;
  onReusePrompt?: (prompt: string) => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  video,
  onClose,
  onReusePrompt
}) => {
  if (!video) return null;

  const [isPlaying, setIsPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(video.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadVideo = () => {
    const a = document.createElement('a');
    a.href = video.videoUrl;
    a.download = `trelvix-${video.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      
      {/* Container Card */}
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black text-white backdrop-blur border border-white/20 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Video Preview Player */}
        <div className="flex-1 bg-black relative flex items-center justify-center min-h-[300px] md:min-h-[480px]">
          <video
            ref={videoRef}
            src={video.videoUrl}
            poster={video.posterUrl}
            autoPlay
            loop
            playsInline
            onClick={togglePlay}
            className="w-full h-full max-h-[60vh] md:max-h-[80vh] object-contain cursor-pointer"
          />

          {/* Overlay Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="absolute bottom-4 left-4 p-3 rounded-full bg-black/60 hover:bg-black text-white backdrop-blur border border-white/20 transition-transform active:scale-95 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>
        </div>

        {/* Right Side: Details & Actions */}
        <div className="w-full md:w-80 p-6 flex flex-col justify-between space-y-6 bg-zinc-50 dark:bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800">
          
          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                Trelvix AI Video Output
              </span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                Generation Parameters
              </h3>
            </div>

            {/* Prompt Box */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                <span>PROMPT</span>
                <button
                  onClick={copyPrompt}
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                {video.prompt}
              </p>
            </div>

            {/* Spec Badges */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                <span className="text-[9px] block text-zinc-400 font-bold uppercase">Quality</span>
                {video.quality}
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                <span className="text-[9px] block text-zinc-400 font-bold uppercase">Ratio</span>
                {video.aspectRatio}
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                <span className="text-[9px] block text-zinc-400 font-bold uppercase">Duration</span>
                {video.duration}
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                <span className="text-[9px] block text-zinc-400 font-bold uppercase">Cost</span>
                {video.creditCost} Credits
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            {onReusePrompt && (
              <button
                onClick={() => {
                  onReusePrompt(video.prompt);
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Reuse Prompt</span>
              </button>
            )}

            <button
              onClick={downloadVideo}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download MP4</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
