import type { Movie } from '@/types/movie';

interface ContinueWatchingProps {
  movies: Movie[];
  onOpenMovie: (id: string) => void;
}

export default function ContinueWatching({ movies, onOpenMovie }: ContinueWatchingProps) {
  void movies;
  void onOpenMovie;
  return (
    <section className="px-4 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="text-lg font-bold text-white sm:text-xl">ادامه تماشا</h2>
        <div className="mt-4 flex h-28 items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface/50">
          <p className="text-sm text-text-muted">موردی برای ادامه تماشا وجود ندارد</p>
        </div>
      </div>
    </section>
  );
}
