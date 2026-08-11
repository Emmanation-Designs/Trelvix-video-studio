import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseAdmin && supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('your-supabase-project')) {
    try {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }
  return supabaseAdmin;
}

export async function verifyUserToken(authHeaderOrReq?: string | Request): Promise<{ id: string; email: string; fullName: string; avatarUrl?: string }> {
  let token: string | undefined;

  if (typeof authHeaderOrReq === 'string') {
    if (authHeaderOrReq.startsWith('Bearer ')) {
      token = authHeaderOrReq.split(' ')[1];
    } else {
      token = authHeaderOrReq;
    }
  } else if (authHeaderOrReq) {
    const authHeader = authHeaderOrReq.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (authHeaderOrReq.query) {
      const q = authHeaderOrReq.query as Record<string, any>;
      token = q.access_token;
    }
  }

  if (!token) {
    throw new Error('Invalid or expired authentication token');
  }

  const client = getSupabaseAdmin();

  if (!client) {
    console.warn('[verifyUserToken] Supabase client is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    throw new Error('Database/Auth service not configured');
  }

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data || !data.user) {
      if (error) {
        console.warn('[verifyUserToken] Supabase getUser error:', error.message);
      }
      throw new Error('Invalid or expired authentication token');
    }

    const user = data.user;
    const meta = user.user_metadata || {};
    let fullName = meta.full_name || meta.name || meta.display_name;
    if (!fullName && user.email) {
      const namePart = user.email.split('@')[0].replace(/[._-]/g, ' ');
      fullName = namePart
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    const avatarUrl = meta.avatar_url || meta.picture || undefined;

    return { 
      id: user.id, 
      email: user.email || '',
      fullName: fullName || (user.email ? user.email.split('@')[0] : ''),
      avatarUrl
    };
  } catch (err: any) {
    if (err.message === 'Database/Auth service not configured' || err.message === 'Invalid or expired authentication token') {
      throw err;
    }
    console.error('[verifyUserToken] Unexpected exception during authentication token verification:', err);
    throw new Error('Invalid or expired authentication token');
  }
}
