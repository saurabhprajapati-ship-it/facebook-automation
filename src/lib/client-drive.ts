/**
 * Client-side helper for persisting Google Drive configuration
 * across page refreshes and browser sessions using localStorage + cookies.
 */

export interface StoredDriveConfig {
  folderId?: string;
  jsonKey?: string;
}

const STORAGE_FOLDER_KEY = 'postnova_drive_folder';
const STORAGE_JSON_KEY = 'postnova_drive_json';

export function getStoredDriveConfig(): StoredDriveConfig {
  if (typeof window === 'undefined') return {};
  try {
    const folderId = localStorage.getItem(STORAGE_FOLDER_KEY) || undefined;
    const jsonKey = localStorage.getItem(STORAGE_JSON_KEY) || undefined;
    return { folderId, jsonKey };
  } catch {
    return {};
  }
}

export function saveStoredDriveConfig(folderId?: string, jsonKey?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (folderId) {
      localStorage.setItem(STORAGE_FOLDER_KEY, folderId);
      document.cookie = `drive_folder=${encodeURIComponent(folderId)}; path=/; max-age=31536000; SameSite=Lax`;
    }
    if (jsonKey) {
      localStorage.setItem(STORAGE_JSON_KEY, jsonKey);
      try {
        const b64 = btoa(unescape(encodeURIComponent(jsonKey)));
        document.cookie = `drive_creds=${encodeURIComponent(b64)}; path=/; max-age=31536000; SameSite=Lax`;
      } catch (e) {
        console.warn('[client-drive] Failed to base64 encode jsonKey for cookie:', e);
      }
    }
  } catch (err) {
    console.warn('[client-drive] Failed to save drive config to localStorage/cookies:', err);
  }
}

export function clearStoredDriveConfig(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_FOLDER_KEY);
    localStorage.removeItem(STORAGE_JSON_KEY);
    document.cookie = 'drive_folder=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'drive_creds=; path=/; max-age=0; SameSite=Lax';
  } catch (err) {
    console.warn('[client-drive] Failed to clear drive config:', err);
  }
}

export function clearAllUserDataOnLogout(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('postnova_user');
    localStorage.removeItem('postnova_token');
    localStorage.removeItem(STORAGE_FOLDER_KEY);
    localStorage.removeItem(STORAGE_JSON_KEY);
    document.cookie = 'drive_folder=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'drive_creds=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'postnova_session=; path=/; max-age=0; SameSite=Lax';
  } catch (err) {
    console.warn('[client-drive] Failed to clear all user data on logout:', err);
  }
}

export function getDriveHeaders(): Record<string, string> {
  const { folderId, jsonKey } = getStoredDriveConfig();
  const headers: Record<string, string> = {};

  if (folderId) {
    headers['x-drive-folder-id'] = folderId;
  }
  if (jsonKey) {
    try {
      headers['x-drive-creds'] = btoa(unescape(encodeURIComponent(jsonKey)));
    } catch {
      // Fallback
    }
  }

  return headers;
}

/**
 * Enhanced fetch that automatically attaches Google Drive folder & credentials headers
 * so Vercel Serverless instances can immediately sync state from Google Drive on cold start.
 */
export async function fetchWithDrive(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const driveHeaders = getDriveHeaders();
  const headers = new Headers(init?.headers);

  for (const [k, v] of Object.entries(driveHeaders)) {
    if (!headers.has(k)) {
      headers.set(k, v);
    }
  }

  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = localStorage.getItem('postnova_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
