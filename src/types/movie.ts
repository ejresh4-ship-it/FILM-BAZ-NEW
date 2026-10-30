export type ContentCategory = 'movie' | 'series' | 'kids';

export interface CastMember {
  name: string;
  englishName: string;
  photoUrl?: string;
}

export interface Movie {
  id: string;
  title: string;
  englishTitle: string;
  year: number;
  runtime: number; // minutes, 0 if unknown
  rating: number; // 0-10
  genres: string[];
  category: ContentCategory;
  director?: string;
  cast: CastMember[];
  synopsis: string;
  posterUrl: string;
  backdropUrl?: string;
}

export interface ContinueWatchingItem {
  movieId: string;
  progress: number; // 0-100
  remainingLabel: string;
}
