export type QualityMode = 'Omni Flash' | 'Creative Quality' | 'Super Creative Quality';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export type DurationOption = '4s' | '6s' | '8s' | '10s';

export type BatchCount = 'x1' | 'x2' | 'x3' | 'x4';

export type GenerationModeType = 'Video' | 'Frames' | 'Ingredients';

export interface VideoGeneration {
  id: string;
  prompt: string;
  negativePrompt?: string;
  quality: QualityMode;
  aspectRatio: AspectRatio;
  duration: DurationOption;
  batchCount: BatchCount;
  createdAt: string;
  videoUrl: string;
  posterUrl: string;
  isFavorite?: boolean;
  creditCost: number;
  status?: 'queued' | 'synthesizing' | 'completed';
  progress?: number; // 0 - 100
}

export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string;
  videos: VideoGeneration[];
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  videoUrl: string;
  posterUrl: string;
}
