import { uploadToSupabaseStorage } from './storage';

function getOpenAiApiKey(): string {
  return process.env.OPENAI_API_KEY || '';
}

interface OpenAiVideoRequestOptions {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  quality?: string;
  duration?: string | number;
  resolution?: string;
  aspectRatio?: string;
  imageInput?: string;
}

export async function requestOpenAiVideoGeneration(
  options: OpenAiVideoRequestOptions
): Promise<{ providerJobId: string; status: string }> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey || apiKey.includes('your-openai-api-key')) {
    throw new Error('OPENAI_API_KEY environment variable is required for real video generation.');
  }

  const qualityMode = (options.quality || '').toLowerCase().includes('super') ? 'super_creative' : 'creative';
  const durationNum = typeof options.duration === 'number'
    ? options.duration
    : parseInt((options.duration || '6s').toString().replace('s', ''), 10) || 6;

  const modelName = qualityMode === 'super_creative' ? 'sora-1.0' : 'sora-1.0-turbo';

  const payload: Record<string, any> = {
    model: options.model || modelName,
    prompt: options.prompt,
    duration: durationNum,
    resolution: options.resolution || '1080p',
    aspect_ratio: options.aspectRatio || '16:9',
  };

  if (options.imageInput) {
    payload.input_reference_image = options.imageInput;
  }

  const response = await fetch('https://api.openai.com/v1/videos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const message = errJson.error?.message || `OpenAI Video API returned HTTP ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  if (!data.id) {
    throw new Error('OpenAI Video API did not return a valid provider job ID.');
  }

  return {
    providerJobId: data.id,
    status: data.status || 'queued',
  };
}

export async function checkOpenAiVideoStatus(
  providerJobId: string,
  userId: string
): Promise<{
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  progress?: number;
}> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey || apiKey.includes('your-openai-api-key')) {
    return {
      status: 'failed',
      errorMessage: 'OPENAI_API_KEY environment variable is not configured.',
    };
  }

  try {
    const response = await fetch(`https://api.openai.com/v1/videos/${providerJobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      return {
        status: 'failed',
        errorMessage: errJson.error?.message || `Failed checking OpenAI status (HTTP ${response.status})`,
      };
    }

    const data = await response.json();

    if (data.status === 'completed') {
      const rawVideoUrl = data.assets?.[0]?.url || data.video_url || data.output_url || `https://api.openai.com/v1/videos/${providerJobId}/content?variant=video`;
      const rawThumbUrl = data.thumbnail_url || `https://api.openai.com/v1/videos/${providerJobId}/content?variant=thumbnail`;

      // Persist in Supabase Storage if available
      const permVideoUrl = await uploadToSupabaseStorage(userId, providerJobId, rawVideoUrl, 'video');
      const permThumbUrl = await uploadToSupabaseStorage(userId, providerJobId, rawThumbUrl, 'thumbnail');

      return {
        status: 'completed',
        videoUrl: permVideoUrl || rawVideoUrl,
        thumbnailUrl: permThumbUrl || rawThumbUrl,
        progress: 100,
      };
    } else if (data.status === 'failed') {
      return {
        status: 'failed',
        errorMessage: data.error?.message || 'Video synthesis failed on OpenAI server',
        progress: 0,
      };
    } else {
      return {
        status: 'processing',
        progress: data.progress || 50,
      };
    }
  } catch (err: any) {
    console.error('Error checking OpenAI status:', err);
    return {
      status: 'failed',
      errorMessage: err.message || 'Error communicating with OpenAI Video API',
    };
  }
}

export async function generateOpenAiImage(
  prompt: string,
  options: { model?: string; size?: string; quality?: string } = {}
): Promise<{ imageUrl: string }> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey || apiKey.includes('your-openai-api-key')) {
    throw new Error('OPENAI_API_KEY environment variable is required for image generation');
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'gpt-image-2',
      prompt,
      n: 1,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `OpenAI Image Generation failed with status ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('No image URL returned from OpenAI');
  }

  return { imageUrl };
}
