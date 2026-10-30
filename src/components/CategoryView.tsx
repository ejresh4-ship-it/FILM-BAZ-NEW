import MovieGrid from './MovieGrid';
import type { ContentCategory, Movie } from '@/types/movie';

interface CategoryViewProps {
  category: ContentCategory;
  onOpenMovie: (id: string) => void;
  title: string;
  subtitle?: string;
  movies: Movie[];
}

export default function CategoryView({ category, onOpenMovie, title, subtitle, movies }: CategoryViewProps) {
  const filtered = movies.filter((movie) => movie.category === category);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 fade-in">
      <h1 className="text-2xl font-extrabold text-white">{title}</h1>
      {subtitle && <p className="mt-1 mb-5 text-sm text-text-muted">{subtitle}</p>}
      <div className="mt-6">
        <MovieGrid
          movies={filtered}
          onOpenMovie={onOpenMovie}
          emptyMessage="موردی در این بخش موجود نیست"
        />
      </div>
    </div>
  );
}
