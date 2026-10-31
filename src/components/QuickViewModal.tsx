import { useState, useEffect, useRef } from 'react';
import { X, Play, Info, Star, Clock, Calendar, User } from 'lucide-react';
import type { Movie } from '@/types/movie';
import { formatRuntime, toPersianDigits } from '@/lib/movieUtils';

interface QuickViewModalProps {
  movie: Movie;
  onClose: () => void;
  onPlay: (id: string) => void;
  onOpenDetails: (id: string) => void;
}

export default function QuickViewModal({ movie, onClose, onPlay, onOpenDetails }: QuickViewModalProps) {
  const [posterError, setPosterError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape key + focus management
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handlePlay() {
    onPlay(movie.id);
  }

  function handleDetails() {
    onOpenDetails(movie.id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`نمایش سریع ${movie.title}`}
    >
      <div
        ref={dialogRef}
        className="relative my-8 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-cinematic scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/90"
          aria-label="بستن"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col sm:flex-row">
          {/* Poster */}
          <div className="relative flex-shrink-0 sm:w-44 lg:w-52">
            <div className="aspect-[2/3] w-full sm:h-full">
              {!posterError && movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={`پوستر ${movie.title}`}
                  className="h-full w-full object-cover"
                  onError={() => setPosterError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-elevated p-4">
                  <p className="text-center text-sm font-medium text-text-secondary">{movie.title}</p>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col p-5 sm:p-6">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">
                  {movie.title}
                </h2>
                {movie.englishTitle && (
                  <p className="mt-0.5 text-sm font-medium text-gold-bright/80">{movie.englishTitle}</p>
                )}
              </div>
            </div>

            {/* Meta row */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
              {movie.year > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={13} className="text-text-muted" />
                  {toPersianDigits(movie.year)}
                </span>
              )}
              {movie.runtime > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} className="text-text-muted" />
                  {formatRuntime(movie.runtime)}
                </span>
              )}
              {movie.rating > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star size={13} className="fill-gold-bright text-gold-bright" />
                  {toPersianDigits(movie.rating.toFixed(1))}
                </span>
              )}
            </div>

            {/* Genres */}
            {movie.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-text-secondary"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Synopsis */}
            <p className="mt-3 text-sm leading-relaxed text-text-secondary line-clamp-4">
              {movie.synopsis}
            </p>

            {/* Cast */}
            {movie.cast.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-text-muted">بازیگران</p>
                <p className="mt-1 text-sm text-text-secondary line-clamp-1">
                  {movie.cast.map((c) => c.name).join('، ')}
                </p>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action buttons */}
            <div className="mt-5 flex gap-3 border-t border-white/5 pt-4">
              <button
                onClick={handlePlay}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-l from-ember to-gold px-5 py-2.5 font-bold text-[#0a0e1a] transition-colors duration-200 hover:from-gold-bright hover:to-ember"
              >
                <Play size={18} className="fill-current" />
                پخش
              </button>
              <button
                onClick={handleDetails}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 font-bold text-white transition-colors duration-200 hover:border-gold/40 hover:bg-white/10"
              >
                <Info size={18} />
                جزئیات
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
