import { useEffect, useState } from 'react';
import MovieGrid from './MovieGrid';
import type { Movie } from '@/types/movie';

interface GenresViewProps {
  movies: Movie[];
  onOpenMovie: (id: string) => void;
}

function getAllGenres(movies: Movie[]): string[] {
  const set = new Set<string>();
  movies.forEach((movie) => movie.genres.forEach((genre) => set.add(genre)));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'fa'));
}

export default function GenresView({ movies, onOpenMovie }: GenresViewProps) {
  const genres = getAllGenres(movies);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    if (!genres.includes(selected)) setSelected(genres[0] || '');
  }, [genres, selected]);

  const filtered = selected ? movies.filter((movie) => movie.genres.includes(selected)) : [];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 fade-in">
      <h1 className="mb-2 text-2xl font-extrabold text-white">ژانرها</h1>
      <p className="mb-5 text-sm text-text-muted">محتوا را بر اساس ژانر فیلتر کنید</p>
      {genres.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface/50">
          <p className="text-sm text-text-muted">پس از دریافت اطلاعات معتبر، ژانرها اینجا نمایش داده می‌شوند</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelected(genre)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${selected === genre ? 'border-gold/40 bg-gold/15 text-gold-bright' : 'border-white/10 bg-surface-2 text-text-secondary hover:border-white/20 hover:text-white'}`}
              >
                {genre}
              </button>
            ))}
          </div>
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-bold text-white">{selected} <span className="text-text-muted">({filtered.length})</span></h2>
            <MovieGrid movies={filtered} onOpenMovie={onOpenMovie} emptyMessage="فیلمی در این ژانر موجود نیست" />
          </div>
        </>
      )}
    </div>
  );
}
