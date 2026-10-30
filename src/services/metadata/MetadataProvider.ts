// MetadataProvider — the contract for online metadata sources.
// Each adapter implements this interface. The MetadataService orchestrates
// multiple providers by priority and handles caching/fallback.
//
// SECURITY: API keys are passed via ProviderConfig at call time — never
// stored in frontend code. In the browser/mock environment, adapters run
// in "test mode" with bundled sample data when no key is present. When a
// key is provided, real API requests are made directly from the renderer
// (browser CORS permitting). In the Electron desktop build, requests can
// be proxied through the main process for key protection.

import type {
  MatchCandidate,
  MovieMetadata,
  ProviderConfig,
  ConnectionTestResult,
} from '@/types/metadata';
import type { MediaType } from '@/types/media-library';

export interface MetadataProvider {
  readonly id: string;
  readonly name: string;
  readonly type: string;

  /** Search for candidates by title/year. Returns ranked results. */
  search(
    query: string,
    year: number | undefined,
    mediaType: MediaType,
    config: ProviderConfig,
    signal?: AbortSignal,
  ): Promise<MatchCandidate[]>;

  /** Fetch full metadata for a candidate's external ID. */
  fetchDetails(
    externalId: string,
    mediaType: MediaType,
    config: ProviderConfig,
    signal?: AbortSignal,
  ): Promise<MovieMetadata | null>;

  /** Test the connection with the configured API key. */
  testConnection(config: ProviderConfig): Promise<ConnectionTestResult>;

  /** Whether this provider is running in test/mock mode (no real API calls). */
  isMock: boolean;
}

/** Common search parameters. */
export interface SearchParams {
  query: string;
  year?: number;
  mediaType: MediaType;
}

/** Normalize a title for matching: lowercase, strip punctuation, collapse spaces. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[._\-:]/g, ' ')
    .replace(/[^\w\s\u0600-\u06FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Heuristic match score (0-100) between a query and a candidate title/year. */
export function scoreMatch(
  queryTitle: string,
  queryYear: number | undefined,
  candidateTitle: string,
  candidateYear: number | undefined,
): number {
  const normQ = normalizeTitle(queryTitle);
  const normC = normalizeTitle(candidateTitle);
  if (!normQ || !normC) return 0;

  let score = 0;
  if (normQ === normC) {
    score = 100;
  } else if (normQ.includes(normC) || normC.includes(normQ)) {
    score = 85;
  } else {
    const qTokens = new Set(normQ.split(' ').filter(Boolean));
    const cTokens = normC.split(' ').filter(Boolean);
    const shared = cTokens.filter((t) => qTokens.has(t)).length;
    score = Math.round((shared / Math.max(qTokens.size, cTokens.length)) * 70);
  }

  if (queryYear && candidateYear) {
    const diff = Math.abs(queryYear - candidateYear);
    if (diff === 0) score = Math.min(100, score + 15);
    else if (diff === 1) score = Math.min(100, score + 8);
    else if (diff > 3) score = Math.max(0, score - 20);
  }

  return Math.max(0, Math.min(100, score));
}
