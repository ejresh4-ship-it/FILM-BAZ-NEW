import { useState, useRef, useEffect } from 'react';
import { Search, Settings, Download, X } from 'lucide-react';
import Logo from './Logo';
import type { Movie } from '@/types/movie';

export type NavView = 'home' | 'movies' | 'series' | 'kids' | 'genres' | 'settings' | 'library' | 'assistant';

interface HeaderProps {
  activeView: NavView;
  onNavigate: (view: NavView) => void;
  onOpenMovie: (movieId: string) => void;
  movies: Movie[];
}

const navItems: { id: NavView; label: string }[] = [
  { id: 'home', label: 'صفحه اصلی' },
  { id: 'movies', label: 'فیلم' },
  { id: 'series', label: 'سریال' },
  { id: 'kids', label: 'کودک' },
  { id: 'genres', label: 'ژانرها' },
  { id: 'library', label: 'کتابخانه' },
  { id: 'assistant', label: 'دستیار هوشمند' },
];

interface SearchResult {
  id: string;
  title: string;
  englishTitle: string;
  year: number;
}

function searchCatalog(query: string, movies: Movie[]): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return movies
    .filter((m) => {
      const title = m.title.toLowerCase();
      const enTitle = m.englishTitle.toLowerCase();
      return (
        title.includes(q) ||
        enTitle.includes(q) ||
        title.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        enTitle.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      );
    })
    .slice(0, 8)
    .map((m) => ({ id: m.id, title: m.title, englishTitle: m.englishTitle, year: m.year }));
}

export default function Header({ activeView, onNavigate, onOpenMovie, movies }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResults(searchCatalog(query, movies));
  }, [query, movies]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelectResult(id: string) {
    if (movies.some((movie) => movie.id === id)) {
      onOpenMovie(id);
      setSearchOpen(false);
      setQuery('');
      setSearchFocused(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-base/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 lg:px-8">
        {/* Right side (RTL): Logo + nav */}
        <Logo size="sm" />
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                activeView === item.id
                  ? 'bg-white/10 text-gold-bright'
                  : 'text-text-secondary hover:bg-white/5 hover:text-white'
              }`}
              aria-current={activeView === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div ref={searchRef} className="relative">
          {searchOpen ? (
            <div className="relative animate-[fadeIn_0.15s_ease-out]">
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="جستجو در کتابخانه…"
                className="w-56 rounded-lg border border-white/10 bg-surface-2 py-2 pr-10 pl-9 text-sm text-white placeholder:text-text-muted focus:border-gold/40 focus:outline-none sm:w-72"
                aria-label="جستجو در کتابخانه"
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setQuery('');
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-white"
                aria-label="بستن جستجو"
              >
                <X size={16} />
              </button>

              {/* Results dropdown */}
              {searchFocused && query.trim() && (
                <div className="absolute left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-surface-2 py-1 shadow-cinematic sm:left-auto sm:right-0 sm:w-80">
                  {results.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                      <Search className="text-text-muted" size={20} />
                      <p className="text-sm text-text-secondary">
                        نتیجه‌ای برای «{query}» یافت نشد
                      </p>
                      <p className="text-xs text-text-muted">جستجوی آنلاین در فاز بعدی فعال خواهد شد</p>
                    </div>
                  ) : (
                    results.map((r) => {
                      const movie = movies.find((entry) => entry.id === r.id);
                      return (
                        <button
                          key={r.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectResult(r.id)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-right transition-colors hover:bg-white/5"
                        >
                          {movie?.posterUrl && <img
                            src={movie.posterUrl}
                            alt=""
                            loading="lazy"
                            className="h-12 w-9 flex-shrink-0 rounded object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{r.title}</p>
                            <p className="truncate text-xs text-text-muted">{r.englishTitle} · {r.year}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/5 hover:text-white"
              aria-label="جستجو"
            >
              <Search size={20} />
            </button>
          )}
        </div>

        {/* Icon buttons */}
        <button
          onClick={() => onNavigate('library')}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            activeView === 'library' ? 'bg-white/10 text-gold-bright' : 'text-text-secondary hover:bg-white/5 hover:text-white'
          }`}
          aria-label="کتابخانه رسانه"
          title="کتابخانه رسانه"
        >
          <Download size={20} />
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            activeView === 'settings' ? 'bg-white/10 text-gold-bright' : 'text-text-secondary hover:bg-white/5 hover:text-white'
          }`}
          aria-label="تنظیمات"
          title="تنظیمات"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Mobile nav row */}
      <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden scrollbar-hidden">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeView === item.id
                ? 'bg-white/10 text-gold-bright'
                : 'text-text-secondary hover:bg-white/5 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
