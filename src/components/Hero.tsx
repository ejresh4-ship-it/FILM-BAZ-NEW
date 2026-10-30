import { useState, useEffect } from 'react';
import { Play, Info, ChevronRight, ChevronLeft, Film } from 'lucide-react';
import type { Movie } from '@/types/movie';
import { toPersianDigits, formatRuntime } from '@/lib/movieUtils';

interface HeroProps {
  featured: Movie[];
  onOpenDetails: (id: string) => void;
  onQuickView: (id: string) => void;
}

export default function Hero({ featured, onOpenDetails, onQuickView }: HeroProps) {
  const [index, setIndex] = useState(0);
  const [backdropError, setBackdropError] = useState(false);
  const [posterError, setPosterError] = useState(false);

  const current = featured[index];
  useEffect(() => {
    setBackdropError(false);
    setPosterError(false);
  }, [index]);

  if (featured.length === 0) return null;

  function next() {
    setIndex((i) => (i + 1) % featured.length);
  }
  function prev() {
    setIndex((i) => (i - 1 + featured.length) % featured.length);
  }

  const showBackdrop = !backdropError && current?.backdropUrl;
  const showPosterFallback = !showBackdrop && !posterError && current?.posterUrl;

  return (
    <section className="relative h-[78vh] min-h-[480px] w-full overflow-hidden" aria-label="نمایش ویژه">
      {/* Backdrop */}
      <div className="absolute inset-0">
        {showBackdrop ? (
          <img
            src={current.backdropUrl}
            alt={`تصویر پس‌زمینه ${current.title}`}
            className="h-full w-full object-cover"
            onError={() => setBackdropError(true)}
          />
        ) : showPosterFallback ? (
          <img
            src={current.posterUrl}
            alt={`تصویر پس‌زمینه ${current.title}`}
            className="h-full w-full object-cover"
            onError={() => setPosterError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 via-base to-black">
            <Film size={120} className="text-white/10" />
          </div>
        )}
        {/* Gradients for readability */}
        <div className="absolute inset-0 bg-gradient-to-l from-base/95 via-base/60 to-base/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative flex h-full items-end">
        <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 lg:px-8 lg:pb-20">
          <div className="max-w-2xl">
            {current.genres.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-bright">
                  {current.genres[0]}
                </span>
                {current.year > 0 && (
                  <span className="text-sm text-text-secondary">{toPersianDigits(current.year)}</span>
                )}
                {current.runtime > 0 && (
                  <>
                    <span className="text-text-muted">•</span>
                    <span className="text-sm text-text-secondary">{formatRuntime(current.runtime)}</span>
                  </>
                )}
              </div>
            )}

            <h1 className="text-3xl font-extrabold leading-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
              {current.title}
            </h1>
            <p className="mt-1 text-base font-medium text-gold-bright/80 lg:text-lg">
              {current.englishTitle}
            </p>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary sm:text-base line-clamp-3">
              {current.synopsis}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onQuickView(current.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-ember to-gold px-7 py-3 font-bold text-base text-[#0a0e1a] shadow-lg transition-all duration-200 hover:from-gold-bright hover:to-ember hover:shadow-cinematic"
              >
                <Play size={20} className="fill-current" />
                پخش
              </button>
              <button
                onClick={() => onOpenDetails(current.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-7 py-3 font-bold text-base text-white backdrop-blur-sm transition-all duration-200 hover:border-gold/40 hover:bg-white/20"
              >
                <Info size={20} />
                جزئیات
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slider controls */}
      {featured.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70 hover:border-gold/30 lg:flex"
            aria-label="ویژه قبلی"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70 hover:border-gold/30 lg:flex"
            aria-label="ویژه بعدی"
          >
            <ChevronRight size={22} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === index ? 'w-8 bg-gold-bright' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`نمایش ویژه ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
