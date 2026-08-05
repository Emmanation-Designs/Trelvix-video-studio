import { getSupabaseAdmin } from './db';

/**
 * Downloads a video or thumbnail from temporary CDN URL and uploads to Supabase Storage bucket 'videos'
 * Returns the permanent public storage URL.
 */
export async function uploadToSupabaseStorage(
  userId: string,
  providerJobId: string,
  fileUrl: string,
  type: 'video' | 'thumbnail'
): Promise<string> {
  const client = getSupabaseAdmin();
  if (!client) {
    // Return original URL if Supabase client not configured
    return fileUrl;
  }

  try {
    const ext = type === 'video' ? 'mp4' : 'jpg';
    const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';
    const storagePath = `${userId}/${providerJobId}_${type}.${ext}`;

    // Download content buffer
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return fileUrl;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to 'videos' bucket
    const { error: uploadError } = await client.storage
      .from('videos')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      console.warn(`Supabase storage upload error for ${type}:`, uploadError.message);
      return fileUrl;
    }

    // Get public URL
    const { data } = client.storage.from('videos').getPublicUrl(storagePath);
    return data.publicUrl || fileUrl;
  } catch (err) {
    console.warn(`Error uploading ${type} to Supabase storage:`, err);
    return fileUrl;
  }
}
