// Trelvix AI <-> Video Studio Authentication & API Client Helper

const AUTH_TOKEN_KEY = 'trelvix_auth_token';

/**
 * Initializes and extracts cross-domain auth handoff tokens from URL parameters
 * or location hash (strictly using 'access_token'), cleans the URL bar, and saves
 * the token to localStorage.
 */
export function initAuthHandoff(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const url = new URL(window.location.href);
    let token = url.searchParams.get('access_token');

    // Check hash parameters if not in search query
    if (!token && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      token = hashParams.get('access_token');
    }

    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);

      // Clean access_token out of search params and hash to prevent exposure in location bar/browser history
      url.searchParams.delete('access_token');
      let cleanHash = url.hash;
      if (cleanHash && cleanHash.includes('access_token')) {
        const hashParams = new URLSearchParams(cleanHash.replace(/^#/, ''));
        hashParams.delete('access_token');
        cleanHash = hashParams.toString() ? '#' + hashParams.toString() : '';
      }

      const cleanUrl = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + cleanHash;
      window.history.replaceState(null, '', cleanUrl);

      return token;
    }
  } catch (e) {
    // Suppress token leakage in error logs
    console.warn('Failed parsing auth handoff token');
  }

  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Retrieves the stored Supabase authentication token for Video Studio
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Stores a new authentication token (e.g. on user login or account switch)
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Clears stored authentication token (e.g. on logout or invalid session)
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Safely parses response as JSON, protecting against HTML 404/500 error pages
 * and eliminating SyntaxError: Unexpected token 'T'
 */
export async function safeParseJsonResponse<T = any>(
  response: Response
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!contentType.includes('application/json')) {
    return {
      ok: false,
      status: response.status,
      data: null,
      error: `Server returned non-JSON response (HTTP ${response.status})`,
    };
  }

  try {
    const json = JSON.parse(text);
    return {
      ok: response.ok,
      status: response.status,
      data: json,
      error: !response.ok ? json.error || `HTTP ${response.status}` : undefined,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: response.status,
      data: null,
      error: `Failed to parse JSON response (HTTP ${response.status}): ${err.message}`,
    };
  }
}

/**
 * Wrapper around standard fetch that automatically attaches the
 * Bearer authorization header for Supabase user verification.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  // Handle unauthorized/expired token
  if (response.status === 401) {
    console.warn('Received 401 Unauthorized from Video Studio API. Clearing stale session token.');
    clearAuthToken();
  }

  return response;
}

/**
 * Fetches current authenticated user profile and credit wallet from backend
 */
export interface UserProfileData {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export async function fetchAuthMe(): Promise<{ user: UserProfileData; wallet: { balance: number; lifetimeCreditsPurchased: number; lifetimeCreditsUsed: number } } | null> {
  try {
    const res = await authFetch('/api/video-studio/auth/me');
    const parsed = await safeParseJsonResponse(res);
    if (parsed.ok && parsed.data && parsed.data.success && parsed.data.user) {
      return { user: parsed.data.user, wallet: parsed.data.wallet };
    }
  } catch (e) {
    console.error('Failed checking auth session:', e);
  }
  return null;
}

/**
 * Fetches the user's current Video Studio credit balance from the database
 */
export async function fetchUserCredits(): Promise<{ balance: number; lifetimeCreditsPurchased: number; lifetimeCreditsUsed: number } | null> {
  try {
    const res = await authFetch('/api/video-studio/credits');
    const parsed = await safeParseJsonResponse(res);
    if (parsed.ok && parsed.data && parsed.data.success && parsed.data.wallet) {
      return parsed.data.wallet;
    }
  } catch (e) {
    console.error('Failed fetching user credits:', e);
  }
  return null;
}

/**
 * Fetches the persistent Video Studio video generation history from the backend
 */
export async function fetchVideoHistory(): Promise<any[]> {
  try {
    const res = await authFetch('/api/tools/video-studio/history');
    const parsed = await safeParseJsonResponse(res);
    if (parsed.ok && parsed.data && parsed.data.success && Array.isArray(parsed.data.history)) {
      return parsed.data.history;
    }
  } catch (e) {
    console.error('Failed fetching video generation history:', e);
  }
  return [];
}
