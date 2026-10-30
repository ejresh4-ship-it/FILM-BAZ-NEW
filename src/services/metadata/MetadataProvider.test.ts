import { describe, it, expect } from 'vitest';
import { TMDbProvider } from './TMDbProvider';
import { OMDbProvider } from './OMDbProvider';
import type { ProviderConfig } from '@/types/metadata';

const noKeyConfig: ProviderConfig = {
  id: 'tmdb',
  name: 'TMDb',
  type: 'tmdb',
  enabled: true,
  apiKey: undefined,
  priority: 1,
  supportsMovies: true,
  supportsSeries: true,
  supportsImages: true,
  supportsPersianTitles: false,
};

const omdbNoKey: ProviderConfig = {
  ...noKeyConfig,
  id: 'omdb',
  name: 'OMDb',
  type: 'omdb',
  supportsImages: false,
};

describe('TMDbProvider (mock mode — no API key)', () => {
  const provider = new TMDbProvider();

  it('returns candidates for "Interstellar" without throwing', async () => {
    const results = await provider.search('Interstellar', 2014, 'movie', noKeyConfig);
    expect(results.length).toBeGreaterThan(0);
    const interstellar = results.find((r) => r.title === 'Interstellar');
    expect(interstellar).toBeDefined();
    expect(interstellar?.year).toBe(2014);
    expect(interstellar?.matchScore).toBeGreaterThan(0);
  });

  it('fetchDetails returns full metadata for mock ID 157336 (Interstellar)', async () => {
    const meta = await provider.fetchDetails('157336', 'movie', noKeyConfig);
    expect(meta).not.toBeNull();
    expect(meta?.title).toBe('Interstellar');
    expect(meta?.year).toBe(2014);
    expect(meta?.runtime).toBe(169);
    expect(meta?.cast.length).toBeGreaterThan(0);
    expect(meta?.director).toBe('Christopher Nolan');
  });

  it('testConnection succeeds in mock mode', async () => {
    const result = await provider.testConnection(noKeyConfig);
    expect(result.success).toBe(true);
  });

  it('returns Breaking Bad as series in mock search', async () => {
    const results = await provider.search('Breaking Bad', undefined, 'series', noKeyConfig);
    expect(results.some((r) => r.title === 'Breaking Bad' && r.mediaType === 'series')).toBe(true);
  });
});

describe('OMDbProvider (mock mode — no API key)', () => {
  const provider = new OMDbProvider();

  it('returns candidates for "Interstellar" without throwing', async () => {
    const results = await provider.search('Interstellar', 2014, 'movie', omdbNoKey);
    expect(results.length).toBeGreaterThan(0);
    const interstellar = results.find((r) => r.title === 'Interstellar');
    expect(interstellar).toBeDefined();
    expect(interstellar?.year).toBe(2014);
  });

  it('fetchDetails returns full metadata for mock IMDb ID tt0816692', async () => {
    const meta = await provider.fetchDetails('tt0816692', 'movie', omdbNoKey);
    expect(meta).not.toBeNull();
    expect(meta?.title).toBe('Interstellar');
    expect(meta?.year).toBe(2014);
    expect(meta?.runtime).toBe(169);
    expect(meta?.director).toBe('Christopher Nolan');
  });

  it('testConnection succeeds in mock mode', async () => {
    const result = await provider.testConnection(omdbNoKey);
    expect(result.success).toBe(true);
  });
});
