import { Platform } from 'react-native';

/**
 * After a new deploy, a page opened on an older version may ask for a JS chunk
 * (e.g. `_expo/static/js/web/welcome-<hash>.js`) that is no longer served, or a
 * flaky mobile connection can drop a chunk request. Reloading the page fetches
 * the current HTML and its matching chunks, which fixes it.
 */
const RELOAD_KEY = 'onekids:chunk-reload-at';
const RELOAD_COOLDOWN_MS = 30_000;

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return /Loading (CSS )?(module|chunk)[\s\S]*failed|ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    message,
  );
}

/**
 * True if we have not auto-reloaded in the last 30 seconds, so a real outage
 * never turns into a reload loop. False when sessionStorage is unavailable.
 */
export function canAutoReload(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
    return Date.now() - last >= RELOAD_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function autoReload() {
  try {
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
}

export function hardReload() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.reload();
  }
}
