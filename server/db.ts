import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
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

export async function verifyUserToken(authHeader?: string): Promise<{ id: string; email: string }> {
  const defaultUser = { id: '00000000-0000-0000-0000-000000000001', email: 'studio.user@trelvixai.com' };

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return defaultUser;
  }

  const token = authHeader.split(' ')[1];
  const client = getSupabaseAdmin();

  if (!client) {
    return defaultUser;
  }

  try {
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) {
      return defaultUser;
    }
    return { id: user.id, email: user.email || 'studio.user@trelvixai.com' };
  } catch {
    return defaultUser;
  }
}
