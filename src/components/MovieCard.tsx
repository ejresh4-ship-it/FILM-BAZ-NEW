import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import type { Movie } from '@/types/movie';
import { toPersianDigits } from '@/lib/movieUtils';\nimport { resolveOfflineImage } from '@/lib/offlineImageCache';

interface MovieCardProps {
  movie: Movie;
  onClick: (id: string) => void;
}

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);\n  const [posterSrc, setPosterSrc] = useState(movie.posterUrl || '');\n\n  useEffect(() => {\n    let active = true;\n    setImgError(false);\n    setPosterSrc(movie.posterUrl || '');\n    if (movie.posterUrl) {\n      void resolveOfflineImage(movie.posterUrl).then((src) => { if (active) setPosterSrc(src); else if (src.startsWith('blob:')) URL.revokeObjectURL(src); });\n    }\n    return () => { active = false; };\n  }, [movie.posterUrl]);

  return (
    <button
      onClick={() => onClick(movie.id)}
      className="group block w-40 text-right transition-transform duration-200 focus:outline-none sm:w-44 lg:w-48"
      aria-label={`نمایش جزئیات ${movie.title}`}
    >
      <div className="relative overflow-hidden rounded-xl border border-white/5 bg-surface-2 shadow-card transition-all duration-200 group-hover:border-gold/30 group-hover:shadow-cinematic group-focus-visible:border-gold/40">
        <div className="aspect-[2/3] w-full">
          {!imgError && posterSrc ? (
            <img
              src={posterSrc}
              alt={`پوستر ${movie.title}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-2 to-elevated p-3 text-center">
              <FilmPlaceholderIcon />
              <p className="text-sm font-medium text-text-secondary">{movie.title}</p>
            </div>
          )}
        </div>

        {/* Rating badge */}
        {movie.rating > 0 && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 backdrop-blur-sm">
            <Star size={11} className="fill-gold-bright text-gold-bright" />
            <span className="text-xs font-bold text-white">{toPersianDigits(movie.rating.toFixed(1))}</span>
          </div>
        )}
      </div>

      <div className="mt-2 px-0.5">
        <h3 className="truncate text-sm font-semibold text-white transition-colors group-hover:text-gold-bright">
          {movie.title}
        </h3>
        {movie.year > 0 && (
          <p className="text-xs text-text-muted">{toPersianDigits(movie.year)}</p>
        )}
      </div>
    </button>
  );
}

function FilmPlaceholderIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="8" y="12" width="48" height="40" rx="4" stroke="#d4af37" strokeWidth="2" opacity="0.4" />
      <circle cx="12" cy="20" r="2" fill="#e8853a" opacity="0.5" />
      <circle cx="12" cy="32" r="2" fill="#e8853a" opacity="0.5" />
      <circle cx="12" cy="44" r="2" fill="#e8853a" opacity="0.5" />
      <circle cx="52" cy="20" r="2" fill="#e8853a" opacity="0.5" />
      <circle cx="52" cy="32" r="2" fill="#e8853a" opacity="0.5" />
      <circle cx="52" cy="44" r="2" fill="#e8853a" opacity="0.5" />
      <path d="M28 26v12l10-6z" fill="#f0c75e" opacity="0.5" />
    </svg>
  );
}
