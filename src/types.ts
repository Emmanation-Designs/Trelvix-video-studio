export type VideoModelOptionId = 'sora-2-720p' | 'sora-2-pro-720p' | 'sora-2-pro-1024p';

export type QualityMode = 'Sora 2' | 'Sora 2 Pro (720p)' | 'Sora 2 Pro (1024p)' | 'Creative Quality' | 'Super Creative Quality' | string;

export type AspectRatio = '16:9' | '9:16';

export type DurationOption = '4s' | '8s' | '12s';

export type ResolutionOption = '720p' | '1024p';

export type BatchCount = 'x1' | 'x2' | 'x3' | 'x4';

export type GenerationModeType = 'Text-to-Video' | 'Image-to-Video' | 'Video' | 'Frames' | 'Ingredients';

export interface VideoGeneration {
  id: string;
  prompt: string;
  negativePrompt?: string;
  quality: QualityMode;
  aspectRatio: AspectRatio;
  duration: DurationOption;
  resolution?: ResolutionOption;
  batchCount: BatchCount;
  createdAt: string;
  videoUrl: string;
  posterUrl: string;
  isFavorite?: boolean;
  creditCost: number;
  status?: 'queued' | 'generating' | 'synthesizing' | 'completed';
  progress?: number; // 0 - 100
}

export interface CharacterItem {
  id: string;
  number: number;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

export interface SceneItem {
  id: string;
  number: number;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

export interface TrashedItem {
  id: string;
  type: 'video' | 'character' | 'scene' | 'project';
  title: string;
  previewUrl: string;
  deletedAt: string;
  originalData: any;
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
  videoUrl?: string;
  posterUrl: string;
}

