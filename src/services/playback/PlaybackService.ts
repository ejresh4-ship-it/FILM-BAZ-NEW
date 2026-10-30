// PlaybackService — orchestrates media playback in the renderer.
//
// In the desktop (Electron) runtime, it resolves a Movie's corresponding
// MediaItem, checks the file exists, finds matching subtitles, and launches
// the user's chosen player via the secure desktop bridge.
//
// In the browser runtime (no Electron), it reports that desktop playback is
// unavailable — never fabricates a path or claims success.
//
// SECURITY: File paths are passed as argument arrays to spawn() in the main
// process — never concatenated into shell commands. API keys and filesystem
// access stay in the main process; the renderer only calls the restricted bridge.

import type { Movie } from '@/types/movie';
import type { MediaItem } from '@/types/media-library';
import type { DetectedPlayer, PlaybackResult, PlaybackPreferences } from '@/types/desktop';
import { getLibraryService } from '@/services/LibraryService';
import { getMetadataService } from '@/services/metadata/MetadataService';
import { isDesktopRuntime } from '@/services/filesystemFactory';
import { idbGet, idbSet } from '@/services/idbStore';
import { subtitleMatchesVideo } from '@/lib/fileParsing';

const PREFS_KEY = 'film-baz:playback-prefs';

const DEFAULT_PREFS: PlaybackPreferences = {
  selectedPlayerId: 'system',
};

export interface PlayRequest {
  movie: Movie;
  mediaItem?: MediaItem;
}

export interface PlayOutcome {
  success: boolean;
  error?: string;
  /** whether we're in browser mode and playback is unavailable */
  browserMode: boolean;
  /** the file path that was (or would be) played */
  filePath?: string;
  /** the player that was used */
  playerUsed?: string;
  /** subtitle path passed to the player, if any */
  subtitlePath?: string;
}

class PlaybackService {
  private cachedPlayers: DetectedPlayer[] | null = null;
  private prefs: PlaybackPreferences | null = null;

  /** Whether the app is running inside the Electron desktop runtime. */
  isDesktop(): boolean {
    return isDesktopRuntime();
  }

  /** Get the desktop bridge, or null in browser mode. */
  private getBridge() {
    return window.filmBazDesktop ?? null;
  }

  // --- Playback preferences ---

  async getPreferences(): Promise<PlaybackPreferences> {
    if (this.prefs) return this.prefs;
    const stored = await idbGet<PlaybackPreferences>(PREFS_KEY);
    this.prefs = stored ?? DEFAULT_PREFS;
    return this.prefs;
  }

  async setPreferences(prefs: Partial<PlaybackPreferences>): Promise<void> {
    const current = await this.getPreferences();
    this.prefs = { ...current, ...prefs };
    await idbSet(PREFS_KEY, this.prefs);
  }

  // --- Player discovery ---

  /** Detect installed players. Returns empty array in browser mode. */
  async detectPlayers(): Promise<DetectedPlayer[]> {
    if (!this.isDesktop()) return [];
    if (this.cachedPlayers) return this.cachedPlayers;
    const bridge = this.getBridge();
    if (!bridge) return [];
    this.cachedPlayers = await bridge.detectPlayers();
    return this.cachedPlayers;
  }

  /** Invalidate cached player list (e.g. after installing a new player). */
  invalidatePlayerCache(): void {
    this.cachedPlayers = null;
  }

  /** Validate a manually-selected executable path. */
  async validateExecutable(exePath: string): Promise<{ valid: boolean; error?: string }> {
    if (!this.isDesktop()) return { valid: false, error: 'نیازمند نسخه دسکتاپ ویندوز' };
    const bridge = this.getBridge();
    if (!bridge) return { valid: false, error: 'اتصال دسکتاپ در دسترس نیست' };
    return bridge.validateExecutable(exePath);
  }

  /** Open a file picker to browse for an .exe file. */
  async browseForExecutable(): Promise<string | null> {
    if (!this.isDesktop()) return null;
    const bridge = this.getBridge();
    if (!bridge) return null;
    return bridge.browseForExecutable();
  }

  /** Get the executable path for the currently selected player. */
  async resolvePlayerExecutable(): Promise<{ executable: string | null; player: DetectedPlayer | null }> {
    const prefs = await this.getPreferences();
    const players = await this.detectPlayers();

    if (prefs.selectedPlayerId === 'system') {
      const sysDefault = players.find((p) => p.isSystemDefault) ?? null;
      return { executable: null, player: sysDefault };
    }

    // Manual executable path takes priority
    if (prefs.manualExecutablePath) {
      return { executable: prefs.manualExecutablePath, player: null };
    }

    const selected = players.find((p) => p.id === prefs.selectedPlayerId) ?? null;
    return { executable: selected?.executablePath ?? null, player: selected };
  }

  // --- Playback ---

  /**
   * Attempt to play a movie. Resolves the MediaItem from the library,
   * checks the file exists, finds subtitles, and launches the player.
   * Never fabricates a path or claims success before the player actually launches.
   */
  async play(movie: Movie): Promise<PlayOutcome> {
    if (!this.isDesktop()) {
      return {
        success: false,
        browserMode: true,
        error: 'پخش فایل‌های محلی نیازمند نسخه دسکتاپ ویندوز است. در حال حاضر برنامه در مرورگر اجرا می‌شود.',
      };
    }

    const bridge = this.getBridge();
    if (!bridge) {
      return { success: false, browserMode: false, error: 'اتصال دسکتاپ برقرار نیست' };
    }

    // Resolve the MediaItem for this Movie
    const mediaItem = this.resolveMediaItem(movie);
    if (!mediaItem) {
      return {
        success: false,
        browserMode: false,
        error: 'فایل ویدئو برای این عنوان در کتابخانه یافت نشد. ابتدا پوشه فیلم‌ها را اسکن کنید.',
      };
    }

    // Check the file exists before attempting playback
    let exists: boolean;
    try {
      exists = await bridge.exists(mediaItem.filePath);
    } catch {
      exists = false;
    }
    if (!exists) {
      return {
        success: false,
        browserMode: false,
        filePath: mediaItem.filePath,
        error: 'فایل ویدئو یافت نشد. ممکن است درایو متصل نباشد، فایل جابه‌جا یا حذف شده باشد.',
      };
    }

    // Find the best matching subtitle
    const subtitlePath = this.findSubtitle(mediaItem);

    // Resolve player
    const { executable, player } = await this.resolvePlayerExecutable();

    let result: PlaybackResult;
    if (executable) {
      result = await bridge.playFile(mediaItem.filePath, executable, subtitlePath);
    } else {
      // Use system default
      result = await bridge.playWithSystemDefault(mediaItem.filePath);
    }

    return {
      success: result.success,
      browserMode: false,
      error: result.error,
      filePath: mediaItem.filePath,
      playerUsed: result.playerUsed ?? player?.name,
      subtitlePath: subtitlePath,
    };
  }

  /**
   * Resolve a Movie to its corresponding MediaItem.
   * Tries metadata matchedItemId first, then falls back to title/IMDb-ID matching.
   */
  resolveMediaItem(movie: Movie): MediaItem | null {
    const lib = getLibraryService();
    const items = lib.getItems();

    if (items.length === 0) return null;

    // Strategy 1: Check if metadata service has a match for this movie's id
    const metaService = getMetadataService();
    const cached = metaService.getCachedMetadata();
    for (const meta of cached) {
      if (meta.matchedItemId) {
        const item = items.find((i) => i.id === meta.matchedItemId);
        if (item && (meta.title === movie.englishTitle || meta.title === movie.title || meta.id.includes(movie.id))) {
          return item;
        }
      }
    }

    // Strategy 2: Match by providerId (IMDb ID)
    const byProviderId = items.find((i) => i.providerId === movie.id);
    if (byProviderId) return byProviderId;

    // Strategy 3: Match by title guess (normalized comparison)
    const normalizedTitle = movie.englishTitle.toLowerCase().replace(/[._\-:]/g, ' ').trim();
    const byTitle = items.find((i) => {
      const guess = (i.titleGuess || '').toLowerCase().replace(/[._\-:]/g, ' ').trim();
      if (!guess) return false;
      return guess === normalizedTitle || guess.includes(normalizedTitle) || normalizedTitle.includes(guess);
    });
    if (byTitle) return byTitle;

    // Strategy 4: Match by filename containing the english title
    const byFileName = items.find((i) =>
      i.fileName.toLowerCase().includes(movie.englishTitle.toLowerCase().replace(/\s+/g, '.')) ||
      i.fileName.toLowerCase().includes(movie.englishTitle.toLowerCase().replace(/\s+/g, ' ')),
    );
    return byFileName ?? null;
  }

  /**
   * Find the best matching subtitle for a media item.
   * Prefers Persian subtitles, falls back to any matching subtitle.
   * Never modifies or overwrites subtitle files.
   */
  findSubtitle(item: MediaItem): string | undefined {
    if (!item.subtitles || item.subtitles.length === 0) return undefined;

    // Prefer Persian subtitle
    const faSub = item.subtitles.find((s) => s.language === 'fa');
    if (faSub) return faSub.filePath;

    // Fall back to first matching subtitle
    const matching = item.subtitles.find((s) => subtitleMatchesVideo(s.fileName, item.fileName));
    return matching?.filePath ?? item.subtitles[0]?.filePath;
  }

  /** Check whether the selected player supports external subtitle arguments. */
  async selectedPlayerSupportsSubtitles(): Promise<boolean> {
    const prefs = await this.getPreferences();
    if (prefs.selectedPlayerId === 'system') return true;
    const players = await this.detectPlayers();
    if (prefs.manualExecutablePath) return true; // assume supported for manual selection
    const selected = players.find((p) => p.id === prefs.selectedPlayerId);
    return selected?.supportsSubtitles ?? false;
  }
}

let instance: PlaybackService | null = null;

export function getPlaybackService(): PlaybackService {
  if (!instance) instance = new PlaybackService();
  return instance;
}
