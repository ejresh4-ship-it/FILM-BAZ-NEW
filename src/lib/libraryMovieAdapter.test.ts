import { describe, it, expect } from 'vitest';
import { mediaItemToMovie } from '@/lib/libraryMovieAdapter';
import type { MediaItem } from '@/types/media-library';
import type { MovieMetadata } from '@/types/metadata';

function makeItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 'item1',
    folderId: 'f1',
    filePath: 'D:\\Movies\\The.Matrix.1999.mkv',
    fileName: 'The.Matrix.1999.mkv',
    extension: 'mkv',
    parentFolder: 'D:\\Movies',
    mediaType: 'movie',
    titleGuess: 'The Matrix',
    yearGuess: 1999,
    fileSize: 0,
    subtitles: [],
    identification: 'identified',
    scanStatus: 'completed',
    ...overrides,
  };
}

describe('mediaItemToMovie', () => {
  it('uses metadata title when available', () => {
    const item = makeItem();
    const meta: MovieMetadata = {
      id: 'm1', providerId: 'tmdb-1', providerName: 'TMDb', mediaType: 'movie',
      title: 'The Matrix', year: 1999, genres: ['Sci-Fi'], runtime: 136, rating: 8.7,
      cast: [], persianTitle: 'ماتریکس', overview: 'A computer hacker learns...',
    };
    const movie = mediaItemToMovie(item, meta);
    expect(movie.title).toBe('ماتریکس');
    expect(movie.englishTitle).toBe('The Matrix');
    expect(movie.year).toBe(1999);
    expect(movie.runtime).toBe(136);
    expect(movie.rating).toBe(8.7);
    expect(movie.synopsis).toBe('A computer hacker learns...');
  });

  it('falls back to file parsing when no metadata', () => {
    const item = makeItem({ titleGuess: 'The Matrix', yearGuess: 1999 });
    const movie = mediaItemToMovie(item);
    expect(movie.englishTitle).toBe('The Matrix');
    expect(movie.title).toBe('The Matrix');
    expect(movie.year).toBe(1999);
    expect(movie.synopsis).toContain('اطلاعات تکمیلی');
  });

  it('detects series from metadata', () => {
    const item = makeItem({ mediaType: 'movie' });
    const meta: MovieMetadata = {
      id: 'm2', providerId: 'tmdb-2', providerName: 'TMDb', mediaType: 'series',
      title: 'Breaking Bad', year: 2008, genres: [], runtime: 0, rating: 9.5, cast: [],
    };
    const movie = mediaItemToMovie(item, meta);
    expect(movie.category).toBe('series');
  });

  it('detects series from item mediaType', () => {
    const item = makeItem({ mediaType: 'episode' });
    const movie = mediaItemToMovie(item);
    expect(movie.category).toBe('series');
  });

  it('trims cast to 10 members', () => {
    const item = makeItem();
    const cast = Array.from({ length: 15 }, (_, i) => ({
      id: `p${i}`, name: `Actor ${i}`, englishName: `Actor ${i}`,
    }));
    const meta: MovieMetadata = {
      id: 'm3', providerId: 'tmdb-3', providerName: 'TMDb', mediaType: 'movie',
      title: 'Test', year: 2020, genres: [], runtime: 0, rating: 0, cast,
    };
    const movie = mediaItemToMovie(item, meta);
    expect(movie.cast).toHaveLength(10);
  });
});
