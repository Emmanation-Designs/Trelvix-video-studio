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

      // Clean access_token out of URL to prevent exposure in location bar/browser history
      url.searchParams.delete('access_token');
      const cleanUrl = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
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
    const data = await res.json();
    if (data.success && data.user) {
      return { user: data.user, wallet: data.wallet };
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
    const data = await res.json();
    if (data.success && data.wallet) {
      return data.wallet;
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
    const data = await res.json();
    if (data.success && Array.isArray(data.history)) {
      return data.history;
    }
  } catch (e) {
    console.error('Failed fetching video generation history:', e);
  }
  return [];
}
