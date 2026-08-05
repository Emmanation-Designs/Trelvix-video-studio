import { Project, HeroSlide, VideoGeneration } from '../types';

export const INITIAL_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-1',
    title: 'Cinematic 4K scenes generated in seconds.',
    subtitle: 'Turn text prompts into high-definition realistic motion videos with Trelvix AI Video Engine.',
    prompt: 'Hyper-realistic cyberpunk street with neon reflections, cinematic slow motion, 8k',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-traffic-41551-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'hero-2',
    title: 'Photorealistic Motion Synthesis',
    subtitle: 'Create complex physics-based camera movement with state-of-the-art temporal stability.',
    prompt: 'Majestic white horse walking down an opulent interior hallway, soft morning sunlight rays, 4k',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-wild-horse-in-a-field-43285-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'hero-3',
    title: 'Anamorphic Lens & Atmosphere Control',
    subtitle: 'Generate high frame rate camera tracking shots with realistic particle lighting and depth.',
    prompt: 'Golden hour drone flythrough over misty pine mountain peaks, volumetric clouds, photorealistic',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-foggy-forest-42861-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200'
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    title: 'Jul 29, 07:36 PM',
    createdAt: 'Jul 29, 07:36 PM',
    updatedAt: '2 hours ago',
    thumbnailUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=600',
    videos: [
      {
        id: 'vid-101',
        prompt: 'A majestic brown horse standing in a blue sunlit living room with hardwood floors and bookshelves',
        quality: 'Omni Flash',
        aspectRatio: '9:16',
        duration: '6s',
        batchCount: 'x2',
        createdAt: 'Jul 29, 07:36 PM',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-wild-horse-in-a-field-43285-large.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=600',
        isFavorite: true,
        creditCost: 20,
        status: 'completed'
      },
      {
        id: 'vid-102',
        prompt: 'A sleek white horse walking down an elegant blue interior hallway with golden sunlight',
        quality: 'Omni Flash',
        aspectRatio: '9:16',
        duration: '6s',
        batchCount: 'x2',
        createdAt: 'Jul 29, 07:36 PM',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-wild-horse-in-a-field-43285-large.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600',
        isFavorite: false,
        creditCost: 20,
        status: 'completed'
      }
    ]
  },
  {
    id: 'proj-2',
    title: 'Cyberpunk City Fog',
    createdAt: 'Yesterday, 04:12 PM',
    updatedAt: 'Yesterday',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&q=80&w=600',
    videos: [
      {
        id: 'vid-201',
        prompt: 'Cyberpunk neon alley with heavy rain reflections, cinematic slow-motion tracking shot, 8k',
        quality: 'Creative Quality',
        aspectRatio: '16:9',
        duration: '8s',
        batchCount: 'x1',
        createdAt: 'Yesterday, 04:12 PM',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-traffic-41551-large.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&q=80&w=600',
        isFavorite: true,
        creditCost: 25,
        status: 'completed'
      }
    ]
  },
  {
    id: 'proj-3',
    title: 'Misty Alpine Flythrough',
    createdAt: '3 days ago',
    updatedAt: '3 days ago',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600',
    videos: [
      {
        id: 'vid-301',
        prompt: 'Volumetric drone flight over snow-capped mountains at sunset, ultra realistic 4k',
        quality: 'Super Creative Quality',
        aspectRatio: '16:9',
        duration: '10s',
        batchCount: 'x1',
        createdAt: '3 days ago',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-foggy-forest-42861-large.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600',
        isFavorite: false,
        creditCost: 30,
        status: 'completed'
      }
    ]
  }
];
