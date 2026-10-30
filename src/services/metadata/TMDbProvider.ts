// TMDb adapter — implements MetadataProvider using The Movie Database API.
//
// When a valid API key is provided in the config, this adapter makes real
// HTTP requests to the TMDb v3 API (https://api.themoviedb.org/3). When no
// key is present, it falls back to bundled sample data so the UI flow can
// be demonstrated. TMDb images are served from https://image.tmdb.org/t/p.

import type {
  MatchCandidate,
  MovieMetadata,
  MetadataPerson,
  MetadataSeason,
  ConnectionTestResult,
  ProviderConfig,
} from '@/types/metadata';
import type { MediaType } from '@/types/media-library';
import type { MetadataProvider } from './MetadataProvider';
import { scoreMatch } from './MetadataProvider';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// --- Mock data (used when no API key is configured) ---

const MOCK_SEARCH_RESULTS: Array<{
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  overview: string;
  vote_average: number;
  poster_path: string | null;
  media_type: string;
}> = [
  { id: 157336, title: 'Interstellar', original_title: 'Interstellar', release_date: '2014-11-05', overview: 'The adventures of a group of explorers who make use of a newly discovered rift in space-time to surpass the limits of human space travel and find a new habitable planet.', vote_average: 8.4, poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', media_type: 'movie' },
  { id: 27205, title: 'Inception', original_title: 'Inception', release_date: '2010-07-15', overview: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.', vote_average: 8.4, poster_path: '/9gk7adHYeGvP87seuFwtTLbpxKe.jpg', media_type: 'movie' },
  { id: 155, title: 'The Dark Knight', original_title: 'The Dark Knight', release_date: '2008-07-16', overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and DA Harvey Dent.', vote_average: 8.5, poster_path: '/qJ2tW6WMUDux9111494vq2WySeZv.jpg', media_type: 'movie' },
  { id: 603, title: 'The Matrix', original_title: 'The Matrix', release_date: '1999-03-30', overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.', vote_average: 8.2, poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', media_type: 'movie' },
  { id: 1396, title: 'Breaking Bad', original_title: 'Breaking Bad', release_date: '2008-01-20', overview: 'A high school chemistry teacher diagnosed with cancer turns to manufacturing and selling methamphetamine.', vote_average: 8.9, poster_path: '/ggFzNuV3WAf0hM3UgT7Nz.jpg', media_type: 'tv' },
];

const MOCK_DETAILS: Record<number, Record<string, unknown>> = {
  157336: { id: 157336, title: 'Interstellar', original_title: 'Interstellar', release_date: '2014-11-05', overview: 'The adventures of a group of explorers who make use of a newly discovered rift in space-time.', runtime: 169, vote_average: 8.4, vote_count: 35000, genres: [{ id: 12, name: 'Adventure' }, { id: 18, name: 'Drama' }, { id: 878, name: 'Science Fiction' }], poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', backdrop_path: '/xJHokMbljvjADYdit5nK3y3Vg.jpg', credits: { crew: [{ id: 525, name: 'Christopher Nolan', job: 'Director' }], cast: [{ id: 10297, name: 'Matthew McConaughey', character: 'Cooper', order: 0, profile_path: null }, { id: 1813, name: 'Anne Hathaway', character: 'Brand', order: 1, profile_path: null }] } },
  27205: { id: 27205, title: 'Inception', original_title: 'Inception', release_date: '2010-07-15', overview: 'A thief who steals corporate secrets through dream-sharing technology.', runtime: 148, vote_average: 8.4, vote_count: 36000, genres: [{ id: 28, name: 'Action' }, { id: 878, name: 'Science Fiction' }, { id: 53, name: 'Thriller' }], poster_path: '/9gk7adHYeGvP87seuFwtTLbpxKe.jpg', backdrop_path: '/8ZTVqvKDQ8emSGUEMjsS4yHA.jpg', credits: { crew: [{ id: 525, name: 'Christopher Nolan', job: 'Director' }], cast: [{ id: 6193, name: 'Leonardo DiCaprio', character: 'Cobb', order: 0, profile_path: null }] } },
  603: { id: 603, title: 'The Matrix', original_title: 'The Matrix', release_date: '1999-03-30', overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality.', runtime: 136, vote_average: 8.2, vote_count: 26000, genres: [{ id: 28, name: 'Action' }, { id: 878, name: 'Science Fiction' }], poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', backdrop_path: '/fNG7i7RqMEr.jpg', credits: { crew: [{ id: 934, name: 'Lana Wachowski', job: 'Director' }], cast: [{ id: 6384, name: 'Keanu Reeves', character: 'Neo', order: 0, profile_path: null }] } },
  1396: { id: 1396, name: 'Breaking Bad', original_name: 'Breaking Bad', first_air_date: '2008-01-20', overview: 'A high school chemistry teacher diagnosed with cancer.', episode_run_time: [49], vote_average: 8.9, vote_count: 14000, genres: [{ id: 18, name: 'Drama' }, { id: 80, name: 'Crime' }], poster_path: '/ggFzNuV3WAf0hM3UgT7Nz.jpg', backdrop_path: '/tsRy63Mu5cu8.jpg', number_of_seasons: 5, number_of_episodes: 62, credits: { crew: [{ id: 66633, name: 'Vince Gilligan', job: 'Creator' }], cast: [{ id: 17419, name: 'Bryan Cranston', character: 'Walter White', order: 0, profile_path: null }] }, seasons: [{ season_number: 1, name: 'Season 1', episode_count: 7, air_date: '2008-01-20', poster_path: null, overview: 'Season 1' }] },
};

function tmdbImageUrl(path: string | null, size: string): string | undefined {
  if (!path) return undefined;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export class TMDbProvider implements MetadataProvider {
  readonly id = 'tmdb';
  readonly name = 'TMDb';
  readonly type = 'tmdb';
  get isMock(): boolean {
    return false; // real mode when key is present, mock fallback otherwise
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

    const type = mediaType === 'series' ? 'tv' : 'movie';
    const params = new URLSearchParams({
      api_key: config.apiKey!,
      query,
    });
    if (year) params.append('year', String(year));

    const url = `${TMDB_API_BASE}/search/${type}?${params}`;
    const resp = await fetch(url, { signal });
    if (!resp.ok) throw new Error(`TMDb خطا: ${resp.status} ${resp.statusText}`);
    const data = await resp.json();

    const results = (data.results || []) as Array<Record<string, unknown>>;
    return results
      .map((r): MatchCandidate => {
        const id = r['id'] as number;
        const title = (r['title'] as string) || (r['name'] as string) || '';
        const releaseDate = (r['release_date'] as string) || (r['first_air_date'] as string) || '';
        const candidateYear = parseInt(releaseDate.slice(0, 4)) || 0;
        const rType = (r['media_type'] as string) || type;
        return {
          providerId: String(id),
          providerName: this.name,
          externalId: String(id),
          title,
          year: candidateYear,
          mediaType: rType === 'tv' ? 'series' : 'movie',
          posterUrl: tmdbImageUrl(r['poster_path'] as string | null, 'w342'),
          overview: (r['overview'] as string) || undefined,
          rating: r['vote_average'] as number | undefined,
          matchScore: scoreMatch(query, year, title, candidateYear),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  async fetchDetails(
    externalId: string,
    mediaType: MediaType,
    config: ProviderConfig,
    signal?: AbortSignal,
  ): Promise<MovieMetadata | null> {
    if (!this.hasKey(config)) {
      return this.mockFetchDetails(externalId, mediaType);
    }

    const type = mediaType === 'series' ? 'tv' : 'movie';
    const url = `${TMDB_API_BASE}/${type}/${externalId}?api_key=${config.apiKey}&append_to_response=credits`;
    const resp = await fetch(url, { signal });
    if (!resp.ok) throw new Error(`TMDb خطا: ${resp.status} ${resp.statusText}`);
    const data = await resp.json();

    const isTV = mediaType === 'series' || !!data['name'];
    const title = (data['title'] as string) || (data['name'] as string) || '';
    const releaseDate = (data['release_date'] as string) || (data['first_air_date'] as string) || '';
    const year = parseInt(releaseDate.slice(0, 4)) || 0;

    const cast: MetadataPerson[] = ((data['credits']?.cast as Array<Record<string, unknown>>) || [])
      .slice(0, 10)
      .map((c, i) => ({
        id: String(c['id']),
        name: (c['name'] as string) || '',
        role: (c['character'] as string) || undefined,
        photoUrl: tmdbImageUrl(c['profile_path'] as string | null, 'w185'),
        order: (c['order'] as number) ?? i,
      }));

    const director = (data['credits']?.crew as Array<Record<string, unknown>>)?.find(
      (c) => c['job'] === 'Director' || c['job'] === 'Creator',
    );

    const seasons: MetadataSeason[] | undefined = (data['seasons'] as Array<Record<string, unknown>>)?.map((s) => ({
      seasonNumber: s['season_number'] as number,
      name: s['name'] as string | undefined,
      episodeCount: s['episode_count'] as number,
      airDate: s['air_date'] as string | undefined,
      posterUrl: tmdbImageUrl(s['poster_path'] as string | null, 'w342'),
      overview: s['overview'] as string | undefined,
    }));

    return {
      id: `tmdb_${externalId}`,
      providerId: externalId,
      providerName: this.name,
      mediaType: isTV ? 'series' : 'movie',
      title,
      year,
      releaseDate,
      overview: (data['overview'] as string) || undefined,
      genres: ((data['genres'] as Array<Record<string, unknown>>) || []).map((g) => g['name'] as string),
      runtime: (data['runtime'] as number) || (data['episode_run_time']?.[0] as number) || 0,
      rating: (data['vote_average'] as number) || 0,
      voteCount: data['vote_count'] as number | undefined,
      director: director?.['name'] as string | undefined,
      cast,
      posterUrl: tmdbImageUrl(data['poster_path'] as string | null, 'w500'),
      backdropUrl: tmdbImageUrl(data['backdrop_path'] as string | null, 'w1280'),
      seasons,
      numberOfSeasons: data['number_of_seasons'] as number | undefined,
      numberOfEpisodes: data['number_of_episodes'] as number | undefined,
      cachedAt: Date.now(),
    };
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    if (!this.hasKey(config)) {
      return {
        success: true,
        message: 'حالت نمایشی فعال — کلید API تنظیم نشده، از داده‌های نمونه استفاده می‌شود.',
        latencyMs: 0,
        modelInfo: 'mock',
      };
    }

    const start = Date.now();
    try {
      const url = `${TMDB_API_BASE}/configuration?api_key=${config.apiKey}`;
      const resp = await fetch(url);
      const latency = Date.now() - start;
      if (!resp.ok) {
        return {
          success: false,
          message: `اتصال ناموفق: ${resp.status} ${resp.statusText}. کلید API را بررسی کنید.`,
          latencyMs: latency,
        };
      }
      return {
        success: true,
        message: 'اتصال به TMDb موفق بود. کلید API معتبر است.',
        latencyMs: latency,
      };
    } catch (e) {
      return {
        success: false,
        message: `خطای شبکه: ${e instanceof Error ? e.message : 'نامشخص'}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  // --- Mock fallback methods ---

  private async mockSearch(query: string, year: number | undefined, mediaType: MediaType): Promise<MatchCandidate[]> {
    await delay(300);
    const results = MOCK_SEARCH_RESULTS.filter((r) => {
      const title = r.title.toLowerCase();
      const q = query.toLowerCase();
      return title.includes(q) || q.includes(title);
    });
    return results
      .filter((r) => {
        if (mediaType === 'series') return r.media_type === 'tv';
        if (mediaType === 'movie') return r.media_type === 'movie';
        return true;
      })
      .map((r) => {
        const candidateYear = parseInt((r.release_date || '').slice(0, 4)) || 0;
        return {
          providerId: String(r.id),
          providerName: this.name,
          externalId: String(r.id),
          title: r.title,
          year: candidateYear,
          mediaType: r.media_type === 'tv' ? 'series' : 'movie',
          posterUrl: undefined,
          overview: r.overview,
          rating: r.vote_average,
          matchScore: scoreMatch(query, year, r.title, candidateYear),
        } as MatchCandidate;
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  private async mockFetchDetails(externalId: string, mediaType: MediaType): Promise<MovieMetadata | null> {
    await delay(400);
    const id = parseInt(externalId, 10);
    const data = MOCK_DETAILS[id] as Record<string, unknown> | undefined;
    if (!data) return null;
    const isTV = mediaType === 'series' || !!data['name'];
    const title = (data['title'] as string) || (data['name'] as string) || '';
    const releaseDate = (data['release_date'] as string) || (data['first_air_date'] as string) || '';
    const year = parseInt((releaseDate || '').slice(0, 4)) || 0;
    const cast: MetadataPerson[] = ((data['credits'] as Record<string, unknown>)?.['cast'] as Array<Record<string, unknown>> || [])
      .slice(0, 10)
      .map((c, i) => ({ id: String(c['id']), name: c['name'] as string, role: c['character'] as string | undefined, order: (c['order'] as number) ?? i }));
    const director = ((data['credits'] as Record<string, unknown>)?.['crew'] as Array<Record<string, unknown>>)?.find((c) => c['job'] === 'Director' || c['job'] === 'Creator');
    return {
      id: `tmdb_${id}`, providerId: String(id), providerName: this.name,
      mediaType: isTV ? 'series' : 'movie', title, year, releaseDate,
      overview: data['overview'] as string, genres: ((data['genres'] as Array<Record<string, unknown>>) || []).map((g) => g['name'] as string),
      runtime: (data['runtime'] as number) || ((data['episode_run_time'] as number[])?.[0] ?? 0),
      rating: (data['vote_average'] as number) || 0, voteCount: data['vote_count'] as number | undefined,
      director: director?.['name'] as string | undefined, cast, posterUrl: undefined, backdropUrl: undefined,
      seasons: undefined, numberOfSeasons: data['number_of_seasons'] as number | undefined,
      numberOfEpisodes: data['number_of_episodes'] as number | undefined, cachedAt: Date.now(),
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
