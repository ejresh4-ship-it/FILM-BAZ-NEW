const LIBRARY_UPDATED_EVENT = 'film-baz:library-updated';

export function notifyLibraryUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LIBRARY_UPDATED_EVENT));
  }
}

export function subscribeToLibraryUpdates(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(LIBRARY_UPDATED_EVENT, listener);
  return () => window.removeEventListener(LIBRARY_UPDATED_EVENT, listener);
}
