// OMDb adapter — implements MetadataProvider using the OMDb API.
//
// When a valid API key is provided, this adapter makes real HTTP requests
// to the OMDb API (https://www.omdbapi.com). When no key is present, it
// falls back to bundled sample data. OMDb is IMDb-keyed and does not provide
// backdrops or actor photos.

import type {
  MatchCandidate,
  MovieMetadata,
  ConnectionTestResult,
  ProviderConfig,
} from '@/types/metadata';
import type { MediaType } from '@/types/media-library';
import type { MetadataProvider } from './MetadataProvider';
import { scoreMatch } from './MetadataProvider';

const OMDB_API_BASE = 'https://www.omdbapi.com';

// --- Mock data ---

const MOCK_SEARCH = [
  { imdbID: 'tt0816692', Title: 'Interstellar', Year: '2014', Type: 'movie', Poster: '', Plot: '' },
  { imdbID: 'tt1375666', Title: 'Inception', Year: '2010', Type: 'movie', Poster: '', Plot: '' },
  { imdbID: 'tt0468569', Title: 'The Dark Knight', Year: '2008', Type: 'movie', Poster: '', Plot: '' },
  { imdbID: 'tt0133093', Title: 'The Matrix', Year: '1999', Type: 'movie', Poster: '', Plot: '' },
  { imdbID: 'tt0903747', Title: 'Breaking Bad', Year: '2008–2013', Type: 'series', Poster: '', Plot: '' },
];

const MOCK_DETAILS: Record<string, Record<string, string>> = {
  tt0816692: { imdbID: 'tt0816692', Title: 'Interstellar', Year: '2014', Runtime: '169 min', Genre: 'Adventure, Drama, Sci-Fi', Director: 'Christopher Nolan', Actors: 'Matthew McConaughey, Anne Hathaway, Jessica Chastain, Michael Caine', Plot: 'A team of explorers travel through a wormhole in space.', imdbRating: '8.6', Poster: '', Type: 'movie' },
  tt1375666: { imdbID: 'tt1375666', Title: 'Inception', Year: '2010', Runtime: '148 min', Genre: 'Action, Sci-Fi, Thriller', Director: 'Christopher Nolan', Actors: 'Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page, Tom Hardy', Plot: 'A thief who steals corporate secrets through dream-sharing technology.', imdbRating: '8.8', Poster: '', Type: 'movie' },
  tt0133093: { imdbID: 'tt0133093', Title: 'The Matrix', Year: '1999', Runtime: '136 min', Genre: 'Action, Sci-Fi', Director: 'Lana Wachowski', Actors: 'Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss', Plot: 'A computer hacker learns about the true nature of his reality.', imdbRating: '8.7', Poster: '', Type: 'movie' },
  tt0903747: { imdbID: 'tt0903747', Title: 'Breaking Bad', Year: '2008–2013', Runtime: '49 min', Genre: 'Crime, Drama, Thriller', Director: 'Vince Gilligan', Actors: 'Bryan Cranston, Aaron Paul, Anna Gunn', Plot: 'A chemistry teacher diagnosed with cancer turns to manufacturing methamphetamine.', imdbRating: '9.5', Poster: '', Type: 'series', totalSeasons: '5' },
};

export class OMDbProvider implements MetadataProvider {
  readonly id = 'omdb';
  readonly name = 'OMDb';
  readonly type = 'omdb';
  get isMock(): boolean {
    return false;
  }

  private hasKey(config: ProviderConfig): boolean {
    return !!config.apiKey && config.apiKey.trim().length > 0;
  }

  async search(
    query: string,
    year: number | undefined,
    mediaType: MediaType,
    config: ProviderConfig,
    signal?: AbortSignal,
  ): Promise<MatchCandidate[]> {
    if (!this.hasKey(config)) {
      return this.mockSearch(query, year, mediaType);
    }

    const params = new URLSearchParams({
      apikey: config.apiKey!,
      s: query,
      type: mediaType === 'series' ? 'series' : mediaType === 'movie' ? 'movie' : '',
    });
    if (year) params.append('y', String(year));

    const url = `${OMDB_API_BASE}/?${params}`;
    const resp = await fetch(url, { signal });
    if (!resp.ok) throw new Error(`OMDb خطا: ${resp.status} ${resp.statusText}`);
    const data = await resp.json();

    if (data['Response'] === 'False') return [];

    const results = (data['Search'] as Array<Record<string, string>>) || [];
    return results
      .map((r): MatchCandidate => {
        const candidateYear = parseInt(r['Year'] || '') || 0;
        return {
          providerId: r['imdbID'],
          providerName: this.name,
          externalId: r['imdbID'],
          title: r['Title'],
          year: candidateYear,
          mediaType: r['Type'] === 'series' ? 'series' : 'movie',
          posterUrl: r['Poster'] && r['Poster'] !== 'N/A' ? r['Poster'] : undefined,
          matchScore: scoreMatch(query, year, r['Title'], candidateYear),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  async fetchDetails(
    externalId: string,
    _mediaType: MediaType,
    config: ProviderConfig,
    _signal?: AbortSignal,
  ): Promise<MovieMetadata | null> {
    if (!this.hasKey(config)) {
      return this.mockFetchDetails(externalId);
    }

    const url = `${OMDB_API_BASE}/?apikey=${config.apiKey}&i=${externalId}&plot=full`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`OMDb خطا: ${resp.status} ${resp.statusText}`);
    const data = await resp.json();

    if (data['Response'] === 'False') return null;

    const year = parseInt(data['Year'] || '') || 0;
    const cast = data['Actors'] && data['Actors'] !== 'N/A'
      ? (data['Actors'] as string).split(', ').map((name, i) => ({ id: `omdb_${externalId}_${i}`, name, order: i }))
      : [];

    return {
      id: `omdb_${externalId}`,
      providerId: externalId,
      providerName: this.name,
      mediaType: data['Type'] === 'series' ? 'series' : 'movie',
      title: data['Title'] || '',
      year,
      overview: data['Plot'] !== 'N/A' ? data['Plot'] : undefined,
      genres: data['Genre'] && data['Genre'] !== 'N/A' ? (data['Genre'] as string).split(', ') : [],
      runtime: parseInt(data['Runtime'] || '') || 0,
      rating: parseFloat(data['imdbRating'] || '') || 0,
      director: data['Director'] && data['Director'] !== 'N/A' ? data['Director'] : undefined,
      cast,
      posterUrl: data['Poster'] && data['Poster'] !== 'N/A' ? data['Poster'] : undefined,
      backdropUrl: undefined,
      numberOfSeasons: data['totalSeasons'] ? parseInt(data['totalSeasons']) : undefined,
      cachedAt: Date.now(),
    };
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    if (!this.hasKey(config)) {
      return {
        success: true,
        message: 'حالت نمایشی فعال — کلید API تنظیم نشده، از داده‌های نمونه استفاده می‌شود.',
        latencyMs: 0,
      };
    }

    const start = Date.now();
    try {
      const url = `${OMDB_API_BASE}/?apikey=${config.apiKey}&t=test`;
      const resp = await fetch(url);
      const latency = Date.now() - start;
      if (!resp.ok) {
        return { success: false, message: `اتصال ناموفق: ${resp.status} ${resp.statusText}`, latencyMs: latency };
      }
      const data = await resp.json();
      if (data['Response'] === 'False' && data['Error']?.includes('Invalid API key')) {
        return { success: false, message: 'کلید API نامعتبر است.', latencyMs: latency };
      }
      return { success: true, message: 'اتصال به OMDb موفق بود. کلید API معتبر است.', latencyMs: latency };
    } catch (e) {
      return { success: false, message: `خطای شبکه: ${e instanceof Error ? e.message : 'نامشخص'}`, latencyMs: Date.now() - start };
    }
  }

  // --- Mock fallback ---

  private async mockSearch(query: string, year: number | undefined, mediaType: MediaType): Promise<MatchCandidate[]> {
    await delay(250);
    const results = MOCK_SEARCH.filter((r) => {
      const title = r.Title.toLowerCase();
      const q = query.toLowerCase();
      return title.includes(q) || q.includes(title);
    });
    return results
      .filter((r) => {
        if (mediaType === 'series') return r.Type === 'series';
        if (mediaType === 'movie') return r.Type === 'movie';
        return true;
      })
      .map((r) => {
        const candidateYear = parseInt(r.Year) || 0;
        return {
          providerId: r.imdbID, providerName: this.name, externalId: r.imdbID,
          title: r.Title, year: candidateYear, mediaType: r.Type === 'series' ? 'series' : 'movie',
          posterUrl: r.Poster || undefined, matchScore: scoreMatch(query, year, r.Title, candidateYear),
        } as MatchCandidate;
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  private async mockFetchDetails(externalId: string): Promise<MovieMetadata | null> {
    await delay(350);
    const data = MOCK_DETAILS[externalId];
    if (!data) return null;
    const year = parseInt(data['Year'] || '') || 0;
    const cast = data['Actors']
      ? (data['Actors'] as string).split(', ').map((name, i) => ({ id: `omdb_${externalId}_${i}`, name, order: i }))
      : [];
    return {
      id: `omdb_${externalId}`, providerId: externalId, providerName: this.name,
      mediaType: data['Type'] === 'series' ? 'series' : 'movie', title: data['Title'], year,
      overview: data['Plot'], genres: (data['Genre'] || '').split(', '),
      runtime: parseInt(data['Runtime'] || '') || 0, rating: parseFloat(data['imdbRating'] || '') || 0,
      director: data['Director'] !== 'N/A' ? data['Director'] : undefined, cast,
      posterUrl: data['Poster'] || undefined, backdropUrl: undefined,
      numberOfSeasons: data['totalSeasons'] ? parseInt(data['totalSeasons']) : undefined,
      cachedAt: Date.now(),
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
