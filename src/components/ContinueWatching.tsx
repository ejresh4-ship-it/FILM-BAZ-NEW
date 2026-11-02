import type { Movie } from '@/types/movie';
import MovieCard from './MovieCard';

interface ContinueWatchingProps {
  movies: Movie[];
  onOpenMovie: (id: string) => void;
}

export default function ContinueWatching({ movies, onOpenMovie }: ContinueWatchingProps) {
  return (
    <section className="px-4 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="text-lg font-bold text-white sm:text-xl">ادامه تماشا</h2>
        {movies.length === 0 ? (
          <div className="mt-4 flex h-28 items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface/50">
            <p className="text-sm text-text-muted">فیلم‌هایی که پخش می‌کنید اینجا نمایش داده می‌شوند.</p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-text-muted">آخرین عنوان‌هایی که پخش آن‌ها را شروع کرده‌اید</p>
            <div className="row-scroll mt-4">
              {movies.map((movie) => <MovieCard key={movie.id} movie={movie} onClick={onOpenMovie} />)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
