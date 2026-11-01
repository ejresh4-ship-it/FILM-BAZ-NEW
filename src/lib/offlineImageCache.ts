const CACHE_NAME = 'film-baz-offline-images-v1';

function canUseCache(): boolean {
  return typeof caches !== 'undefined' && typeof fetch !== 'undefined';
}

/** Download an image into the browser/Electron persistent Cache Storage without replacing the source URL. */
export async function cacheOfflineImage(url?: string): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url) || !canUseCache()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    if (await cache.match(url)) return true;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok || !response.type.match(/^(basic|cors)$/)) return false;
    await cache.put(url, response.clone());
    return true;
  } catch {
    // Offline, blocked by CORS, or quota errors are non-fatal; keep the remote URL.
    return false;
  }
}

/** Resolve an image to a local object URL when it has been cached for offline use. */
export async function resolveOfflineImage(url: string): Promise<string> {
  if (!url || !canUseCache()) return url;
  try {
    const cache = await caches.open(CACHE_NAME);
    let response = await cache.match(url);
    if (!response) {
      const fetched = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!fetched.ok || !fetched.type.match(/^(basic|cors)$/)) return url;
      await cache.put(url, fetched.clone());
      response = fetched;
    }
    return URL.createObjectURL(await response.blob());
  } catch {
    return url;
  }
}

/** Warm all known artwork automatically, with a small concurrency limit. */
export async function warmOfflineImages(urls: Array<string | undefined>): Promise<{ cached: number; skipped: number }> {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
  let cached = 0;
  let skipped = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < unique.length) {
      const url = unique[cursor++];
      if (await cacheOfflineImage(url)) cached++;
      else skipped++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, unique.length) }, () => worker()));
  return { cached, skipped };
}
