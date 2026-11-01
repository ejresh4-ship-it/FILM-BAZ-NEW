import { useMemo } from 'react';
import Hero from './Hero';
import MovieRow from './MovieRow';
import ContinueWatching from './ContinueWatching';
import type { LibraryMovieEntry } from '@/lib/libraryMovieAdapter';
import type { Movie } from '@/types/movie';

interface HomePageProps {
  entries: LibraryMovieEntry[];
  featured: Movie[];
  recentlyPlayed: Movie[];
  onOpenDetails: (id: string) => void;
  onQuickView: (id: string) => void;
}

export default function HomePage({ entries, featured, recentlyPlayed, onOpenDetails, onQuickView }: HomePageProps) {
  const [newest, action, crime, comedy, other] = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      const aTime = a.item.lastModified || a.metadata?.cachedAt || 0;
      const bTime = b.item.lastModified || b.metadata?.cachedAt || 0;
      return bTime - aTime;
    });
    const genreRows = (genre: string) => sorted
      .filter((entry) => entry.movie.genres.some((value) => value.toLowerCase() === genre))
      .map((entry) => entry.movie);
    const assigned = new Set([...genreRows('action'), ...genreRows('crime'), ...genreRows('comedy')].map((movie) => movie.id));
    return [
      sorted.map((entry) => entry.movie),
      genreRows('action'),
      genreRows('crime'),
      genreRows('comedy'),
      sorted.filter((entry) => entry.movie.genres.length === 0 || !assigned.has(entry.movie.id)).map((entry) => entry.movie),
    ];
  }, [entries]);

  return (
    <div className="fade-in">
      {entries.length === 0 && (
        <div className="mx-auto max-w-[1400px] px-4 pt-6 lg:px-8">
          <div className="rounded-xl border border-dashed border-white/10 bg-surface-2 p-5 text-center">
            <p className="text-sm font-semibold text-white">کتابخانه شما هنوز خالی است</p>
            <p className="mt-1 text-xs text-text-secondary">برای نمایش فیلم‌ها، ابتدا از بخش کتابخانه یک پوشه اضافه و آن را اسکن کنید.</p>
          </div>
        </div>
      )}
      <Hero featured={featured} onOpenDetails={onOpenDetails} onQuickView={onQuickView} />
      <div className="space-y-10 py-10">
        <MovieRow title="تازه‌های آرشیو" movies={newest} onOpenMovie={onQuickView} />
        <ContinueWatching movies={recentlyPlayed} onOpenMovie={onQuickView} />
        <MovieRow title="اکشن" movies={action} onOpenMovie={onQuickView} />
        <MovieRow title="جنایی" movies={crime} onOpenMovie={onQuickView} />
        <MovieRow title="کمدی" movies={comedy} onOpenMovie={onQuickView} />
        <MovieRow title="سایر ژانرها" movies={other} onOpenMovie={onQuickView} />
      </div>
    </div>
  );
}
