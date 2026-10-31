// Metadata types for Phase 3: online movie/TV metadata, providers, and offline cache.

import type { MediaType } from './media-library';

/** A person (cast or crew member) with optional photograph. */
export interface MetadataPerson {
  id: string; // provider-specific person ID
  name: string; // display name (English or Persian when available)
  englishName?: string;
  role?: string; // character name or job
  photoUrl?: string; // profile image URL
  order?: number; // billing order
}

/** A TV season with episode count. */
export interface MetadataSeason {
  seasonNumber: number;
  name?: string;
  episodeCount: number;
  airDate?: string;
  posterUrl?: string;
  overview?: string;
}

/** A TV episode. */
export interface MetadataEpisode {
  seasonNumber: number;
  episodeNumber: number;
  name?: string;
  airDate?: string;
  runtime?: number; // minutes
  overview?: string;
  stillUrl?: string;
}

/** Full metadata record for a movie or TV series. */
export interface MovieMetadata {
  id: string; // our internal metadata ID
  providerId: string; // provider-specific ID (e.g. TMDb ID)
  providerName: string; // which provider supplied this
  mediaType: MediaType;
  title: string; // English/original title
  persianTitle?: string; // Persian title when available
  year: number;
  releaseDate?: string; // ISO date
  overview?: string;
  genres: string[];
  runtime: number; // minutes, 0 if unknown
  rating: number; // 0-10, 0 if unavailable
  voteCount?: number;
  director?: string;
  cast: MetadataPerson[]; // up to 10 principal cast
  posterUrl?: string;
  backdropUrl?: string;
  // TV-specific
  seasons?: MetadataSeason[];
  episodes?: MetadataEpisode[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  // cache management
  cachedAt?: number; // when fetched
  imageCacheStatus?: ImageCacheStatus;
  // user correction tracking
  manuallyCorrected?: boolean;
  matchedItemId?: string; // linked MediaItem ID
}

export type ImageCacheStatus = 'none' | 'downloading' | 'cached' | 'failed' | 'unavailable';

/** A candidate result from a provider search, before the user confirms a match. */
export interface MatchCandidate {
  providerId: string;
  providerName: string;
  externalId: string;
  title: string;
  persianTitle?: string;
  year: number;
  mediaType: MediaType;
  posterUrl?: string;
  overview?: string;
  rating?: number;
  matchScore: number; // 0-100 heuristic confidence
}

/** A single metadata provider configuration. */
export interface ProviderConfig {
  id: string; // e.g. "tmdb", "omdb", "custom-1"
  name: string; // display name
  type: ProviderType;
  enabled: boolean;
  apiKey?: string; // stored in secure backend, not in frontend code
  priority: number; // lower = higher priority
  baseUrl?: string; // for custom providers
  // capabilities
  supportsMovies: boolean;
  supportsSeries: boolean;
  supportsImages: boolean;
  supportsPersianTitles: boolean;
}

export type ProviderType = 'tmdb' | 'omdb' | 'wikidata' | 'mediawiki' | 'tvmaze' | 'custom';

/** Provider lookup mode. */
export type LookupMode = 'automatic' | 'manual' | 'combined';

/** Result of a provider connection test. */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  modelInfo?: string;
}

/** Cached metadata entry stored in IndexedDB. */
export interface CachedMetadataEntry {
  metadata: MovieMetadata;
  cachedAt: number;
  itemId?: string; // linked MediaItem
}

/** Export bundle for offline folder export. */
export interface MetadataExportPreview {
  itemId: string;
  folderPath: string;
  files: ExportFileEntry[];
  totalSize: number; // estimated bytes
}

export interface ExportFileEntry {
  fileName: string;
  type: 'json' | 'poster' | 'backdrop' | 'actor';
  url?: string;
  size?: number;
  alreadyExists: boolean;
}
