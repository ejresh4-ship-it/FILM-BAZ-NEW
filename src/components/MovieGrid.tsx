import MovieCard from './MovieCard';
import type { Movie } from '@/types/movie';

interface MovieGridProps {
  movies: Movie[];
  onOpenMovie: (id: string) => void;
  emptyMessage?: string;
}

export default function MovieGrid({ movies, onOpenMovie, emptyMessage }: MovieGridProps) {
  if (movies.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface/50">
        <p className="text-sm text-text-muted">
          {emptyMessage || 'موردی در این بخش موجود نیست'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} onClick={onOpenMovie} />
      ))}
    </div>
  );
}
