import type { MediaItem } from '@/types/media-library';
import type { MovieMetadata } from '@/types/metadata';
import type { Movie } from '@/types/movie';

export interface LibraryMovieEntry {
  item: MediaItem;
  metadata?: MovieMetadata;
  movie: Movie;
}

export function mediaItemToMovie(item: MediaItem, metadata?: MovieMetadata): Movie {
  const fallbackTitle = cleanFileTitle(item.titleGuess || stripExtension(item.fileName));
  const englishTitle = metadata?.title || fallbackTitle;
  const displayTitle = metadata?.persianTitle || englishTitle;
  const isSeries = metadata?.mediaType === 'series' || item.mediaType === 'series' || item.mediaType === 'episode';

  return {
    id: item.id,
    title: displayTitle,
    englishTitle,
    year: metadata?.year || item.yearGuess || 0,
    runtime: metadata?.runtime || 0,
    rating: metadata?.rating || 0,
    ratingSource: metadata?.ratingSource || metadata?.providerName,
    voteCount: metadata?.voteCount,
    genres: metadata?.genres ?? [],
    category: isSeries ? 'series' : 'movie',
    director: metadata?.director,
    cast: (metadata?.cast ?? []).slice(0, 10).map((person) => ({
      name: person.name,
      englishName: person.englishName || person.name,
      photoUrl: person.photoUrl,
    })),
    synopsis: metadata?.overview || 'اطلاعات تکمیلی برای این عنوان ثبت نشده است.',
    posterUrl: metadata?.posterUrl || '',
    backdropUrl: metadata?.backdropUrl,
  };
}

export function buildLibraryMovieEntries(items: MediaItem[], metadataService: { getMetadataForItem: (itemId: string) => MovieMetadata | undefined }): LibraryMovieEntry[] {
  return items.map((item) => {
    const metadata = metadataService.getMetadataForItem(item.id);
    return { item, metadata, movie: mediaItemToMovie(item, metadata) };
  });
}

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

function cleanFileTitle(value: string): string {
  return value
    .replace(/[._]+/g, ' ')
    .replace(/\b(?:2160p|1080p|720p|4k|x264|x265|hevc|bluray|web[- ]?dl|webrip|hdrip)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'عنوان نامشخص';
}
