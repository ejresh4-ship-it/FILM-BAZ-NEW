import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPlaybackService } from './PlaybackService';

vi.mock('@/services/idbStore', () => ({
  idbGet: vi.fn().mockResolvedValue(null),
  idbSet: vi.fn().mockResolvedValue(undefined),
}));

describe('PlaybackService', () => {
  let svc: ReturnType<typeof getPlaybackService>;

  beforeEach(() => {
    svc = getPlaybackService();
  });

  it('isDesktop returns false in browser mode', () => {
    expect(svc.isDesktop()).toBe(false);
  });

  it('detectPlayers returns empty array in browser mode', async () => {
    const players = await svc.detectPlayers();
    expect(players).toEqual([]);
  });

  it('play() returns browserMode=true with error in browser', async () => {
    const result = await svc.play({
      id: 'test',
      title: 'Test Movie',
      englishTitle: 'Test',
      year: 2020,
      genres: [],
      category: 'movie',
      posterUrl: '',
      backdropUrl: '',
      synopsis: '',
      rating: 0,
      runtime: 0,
      cast: [],
    });
    expect(result.success).toBe(false);
    expect(result.browserMode).toBe(true);
    expect(result.error).toBeDefined();
  });

  it('validateExecutable fails in browser mode', async () => {
    const result = await svc.validateExecutable('C:\\test.exe');
    expect(result.valid).toBe(false);
  });

  it('browseForExecutable returns null in browser mode', async () => {
    const result = await svc.browseForExecutable();
    expect(result).toBeNull();
  });

  it('getPreferences returns default with system player', async () => {
    const prefs = await svc.getPreferences();
    expect(prefs.selectedPlayerId).toBe('system');
  });

  it('setPreferences persists and returns updated values', async () => {
    await svc.setPreferences({ selectedPlayerId: 'vlc' });
    const prefs = await svc.getPreferences();
    expect(prefs.selectedPlayerId).toBe('vlc');
  });

  it('findSubtitle returns undefined for item with no subtitles', () => {
    const result = svc.findSubtitle({
      id: 'test',
      folderId: 'f1',
      filePath: 'C:\\test.mkv',
      fileName: 'test.mkv',
      extension: 'mkv',
      parentFolder: 'C:\\',
      mediaType: 'movie',
      fileSize: 1000,
      subtitles: [],
      identification: 'identified',
      scanStatus: 'completed',
    });
    expect(result).toBeUndefined();
  });

  it('findSubtitle prefers Persian subtitle', () => {
    const result = svc.findSubtitle({
      id: 'test',
      folderId: 'f1',
      filePath: 'C:\\test.mkv',
      fileName: 'test.mkv',
      extension: 'mkv',
      parentFolder: 'C:\\',
      mediaType: 'movie',
      fileSize: 1000,
      subtitles: [
        { filePath: 'C:\\test.en.srt', fileName: 'test.en.srt', extension: 'srt', language: 'en' },
        { filePath: 'C:\\test.fa.srt', fileName: 'test.fa.srt', extension: 'srt', language: 'fa' },
      ],
      identification: 'identified',
      scanStatus: 'completed',
    });
    expect(result).toBe('C:\\test.fa.srt');
  });
});
