import { ArrowRight, Play, Star, Clock, Calendar, User } from 'lucide-react';
import type { Movie } from '@/types/movie';
import { formatRuntime, toPersianDigits } from '@/lib/movieUtils';

interface MovieDetailsProps {
  movie: Movie;
  onBack: () => void;
  onPlay: (id: string) => void;
  isEnriching?: boolean;
}

export default function MovieDetails({ movie, onBack, onPlay, isEnriching = false }: MovieDetailsProps) {
  return (
    <div className="fade-in">
      {/* Backdrop hero */}
      <div className="relative h-[42vh] min-h-[280px] w-full overflow-hidden">
        {movie.backdropUrl || movie.posterUrl ? <img
          src={movie.backdropUrl || movie.posterUrl}
          alt={`تصویر پس‌زمینه ${movie.title}`}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        /> : <div className="h-full w-full bg-gradient-to-br from-surface-2 via-base to-black" />}
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/70 to-base/20" />
        <button
          onClick={onBack}
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <ArrowRight size={18} />
          بازگشت
        </button>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1200px] px-4 lg:px-8">
        <div className="-mt-32 flex flex-col gap-6 md:flex-row">
          {/* Poster */}
          <div className="flex-shrink-0">
            <div className="aspect-[2/3] w-44 overflow-hidden rounded-xl border border-white/10 shadow-cinematic sm:w-52 lg:w-56">
              {movie.posterUrl ? <img
                src={movie.posterUrl}
                alt={`پوستر ${movie.title}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = '0.2';
                }}
              /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-surface-2 to-elevated"><span className="text-sm text-text-muted">پوستر موجود نیست</span></div>}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-4">
            <h1 className="text-2xl font-extrabold text-white drop-shadow-lg sm:text-3xl lg:text-4xl">
              {movie.title}
            </h1>
            {movie.englishTitle && (
              <p className="mt-1 text-lg font-medium text-gold-bright/80">{movie.englishTitle}</p>
            )}

            {/* Meta */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
              {movie.year > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={15} className="text-text-muted" />
                  {toPersianDigits(movie.year)}
                </span>
              )}
              {movie.runtime > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={15} className="text-text-muted" />
                  {formatRuntime(movie.runtime)}
                </span>
              )}
              {movie.rating > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Star size={15} className="fill-gold-bright text-gold-bright" />
                  {toPersianDigits(movie.rating.toFixed(1))}
                </span>
              )}
            </div>

            {/* Genres */}
            {movie.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {movie.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-text-secondary"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Play */}
            <div className="mt-6">
              <button
                onClick={() => onPlay(movie.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-ember to-gold px-8 py-3 font-bold text-[#0a0e1a] shadow-lg transition-all duration-200 hover:from-gold-bright hover:to-ember hover:shadow-cinematic"
              >
                <Play size={20} className="fill-current" />
                پخش
              </button>
            </div>

            {/* Director */}
            {movie.director && (
              <div className="mt-5 flex items-center gap-2 text-sm">
                <User size={15} className="text-text-muted" />
                <span className="text-text-muted">کارگردان:</span>
                <span className="font-medium text-white">{movie.director}</span>
              </div>
            )}
          </div>
        </div>

        {/* Synopsis */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-white">خلاصه داستان</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white sm:text-base">
            {isEnriching ? 'در حال دریافت خلاصه داستان و اطلاعات بازیگران...' : movie.synopsis && !movie.synopsis.includes('اطلاعات تکمیلی برای این عنوان ثبت نشده') ? movie.synopsis : 'خلاصه داستان این فیلم هنوز از منابع اطلاعاتی دریافت نشده است.'}
          </p>
        </div>

        {/* Cast */}
        {movie.cast.length > 0 && (
          <div className="mt-8 pb-12">
            <h2 className="text-lg font-bold text-white">بازیگران</h2>
            <div className="mt-4 flex flex-wrap gap-4">
              {movie.cast.map((member) => (
                <div
                  key={member.englishName}
                  className="flex w-28 flex-col items-center gap-2 rounded-xl border border-white/5 bg-surface-2 p-3 text-center sm:w-32"
                >
                  <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-surface-2 to-elevated">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-2xl font-bold text-gold/60">
                        {member.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{member.name}</p>
                    <p className="text-xs text-text-muted">{member.englishName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
