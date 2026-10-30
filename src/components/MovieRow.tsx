import { ChevronLeft } from 'lucide-react';
import { useRef } from 'react';
import type { Movie } from '@/types/movie';
import MovieCard from './MovieCard';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  onOpenMovie: (id: string) => void;
  onSeeAll?: () => void;
}

export default function MovieRow({ title, movies, onOpenMovie, onSeeAll }: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollLeft() {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: 320, behavior: 'smooth' });
  }

  if (movies.length === 0) {
    return (
      <section className="px-4 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
          </div>
          <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface/50">
            <p className="text-sm text-text-muted">موردی در این بخش موجود نیست</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
          <div className="flex items-center gap-2">
            {onSeeAll && (
              <button
                onClick={onSeeAll}
                className="flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-gold-bright"
              >
                مشاهده همه
                <ChevronLeft size={16} />
              </button>
            )}
            <button
              onClick={scrollLeft}
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-surface-2/80 text-text-secondary transition-colors hover:border-gold/30 hover:text-white sm:flex"
              aria-label="اسکرول به چپ"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
        <div ref={scrollRef} className="row-scroll mt-4">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onClick={onOpenMovie} />
          ))}
        </div>
      </div>
    </section>
  );
}
