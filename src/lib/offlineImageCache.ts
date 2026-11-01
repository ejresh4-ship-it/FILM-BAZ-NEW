const CACHE_NAME = 'film-baz-offline-images-v2';
const MAX_CONCURRENT_DOWNLOADS = 3;

function canUseCache(): boolean {
  return typeof caches !== 'undefined' && typeof fetch !== 'undefined';
}

async function fetchArtwork(url: string): Promise<Response | null> {
  // Electron main-process fetch bypasses renderer CORS restrictions.
  if (typeof window !== 'undefined' && window.filmBazDesktop?.isDesktop) {
    const dataUrl = await window.filmBazDesktop.downloadImage(url);
    if (!dataUrl) return null;
    const response = await fetch(dataUrl);
    return response.ok ? response : null;
  }

  // Browser fallback: only servers that explicitly permit CORS can be cached.
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!response.ok || !/^(basic|cors)$/.test(response.type)) return null;
  return response;
}

/** Download artwork into persistent Cache Storage. */
export async function cacheOfflineImage(url?: string): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url) || !canUseCache()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    if (await cache.match(url)) return true;
    const response = await fetchArtwork(url);
    if (!response) return false;
    await cache.put(url, response.clone());
    return true;
  } catch {
    return false;
  }
}

/** Return a local object URL when artwork is available in the offline cache. */
export async function resolveOfflineImage(url: string): Promise<string> {
  if (!url || !canUseCache()) return url;
  try {
    const cache = await caches.open(CACHE_NAME);
    let response = await cache.match(url);
    if (!response) {
      const fetched = await fetchArtwork(url);
      if (!fetched) return url;
      await cache.put(url, fetched.clone());
      response = fetched;
    }
    return URL.createObjectURL(await response.blob());
  } catch {
    return url;
  }
}

/** Warm known artwork in the background without flooding image providers. */
export async function warmOfflineImages(urls: Array<string | undefined>): Promise<{ cached: number; skipped: number }> {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url) && /^https?:\/\//i.test(url)))];
  let cached = 0;
  let skipped = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < unique.length) {
      const url = unique[cursor++];
      if (!url) continue;
      if (await cacheOfflineImage(url)) cached++;
      else skipped++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_DOWNLOADS, unique.length) }, () => worker()));
  return { cached, skipped };
}
