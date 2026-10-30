import { useState, useEffect } from 'react';
import {
  X,
  Search,
  Loader2,
  Star,
  AlertTriangle,
  Check,
  ImageOff,
} from 'lucide-react';
import type { MatchCandidate, MovieMetadata } from '@/types/metadata';
import type { MediaItem } from '@/types/media-library';
import { getMetadataService } from '@/services/metadata/MetadataService';
import { toPersianDigits } from '@/lib/movieUtils';

interface MetadataMatchModalProps {
  item: MediaItem;
  onClose: () => void;
  onMatched: (metadata: MovieMetadata) => void;
}

export default function MetadataMatchModal({ item, onClose, onMatched }: MetadataMatchModalProps) {
  const service = getMetadataService();
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState(item.titleGuess || '');

  useEffect(() => {
    search(item.titleGuess || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  async function search(query: string) {
    if (!query.trim()) {
      setCandidates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await service.searchCandidates({ ...item, titleGuess: query } as MediaItem);
      setCandidates(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در جستجو');
    } finally {
      setLoading(false);
    }
  }

  async function selectCandidate(candidate: MatchCandidate) {
    setFetchingId(candidate.externalId);
    setError(null);
    try {
      const metadata = await service.fetchAndCache(candidate, item.id);
      if (metadata) {
        onMatched(metadata);
      } else {
        setError('دریافت جزئیات ناموفق بود');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در دریافت جزئیات');
    } finally {
      setFetchingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm fade-in" onClick={onClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-cinematic"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white">جستجوی اطلاعات آنلاین</h2>
            <p className="mt-0.5 truncate text-xs text-text-muted" dir="ltr">{item.fileName}</p>
          </div>
          <button onClick={onClose} className="ml-2 rounded-lg p-1.5 text-text-muted hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Search bar */}
        <div className="border-b border-white/5 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') search(customQuery); }}
                placeholder="عنوان فیلم یا سریال…"
                className="w-full rounded-lg border border-white/10 bg-base py-2 pr-9 pl-3 text-sm text-white placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
              />
            </div>
            <button onClick={() => search(customQuery)} className="btn-primary text-sm">
              جستجو
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 size={28} className="animate-spin text-gold-bright" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <AlertTriangle size={18} className="text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <Search size={24} className="text-text-muted" />
              <p className="text-sm text-text-muted">نتیجه‌ای یافت نشد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => (
                <button
                  key={`${c.providerName}-${c.externalId}`}
                  onClick={() => selectCandidate(c)}
                  disabled={fetchingId !== null}
                  className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-surface-2 p-3 text-right transition-all hover:border-gold/30 hover:bg-white/5 disabled:opacity-50"
                >
                  {/* Poster */}
                  <div className="flex h-16 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-base">
                    {c.posterUrl ? (
                      <img src={c.posterUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <ImageOff size={16} className="text-text-muted" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{c.title}</p>
                      {c.year > 0 && <span className="text-xs text-text-muted">({toPersianDigits(c.year)})</span>}
                    </div>
                    {c.overview && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">{c.overview}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-text-muted">
                      <span className="rounded bg-white/5 px-1.5 py-0.5">{c.providerName}</span>
                      {c.rating !== undefined && c.rating > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star size={11} className="fill-gold-bright text-gold-bright" />
                          {toPersianDigits(c.rating.toFixed(1))}
                        </span>
                      )}
                      {c.matchScore >= 80 && (
                        <span className="inline-flex items-center gap-0.5 text-green-400">
                          <Check size={11} />
                          تطابق بالا
                        </span>
                      )}
                    </div>
                  </div>

                  {fetchingId === c.externalId && (
                    <Loader2 size={16} className="mt-1 animate-spin text-gold-bright" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="border-t border-white/5 p-3">
          <p className="text-center text-[10px] text-text-muted">
            ارائه‌دهندگان در حالت نمایشی هستند — اتصال واقعی پس از پیکربندی کلید API
          </p>
        </div>
      </div>
    </div>
  );
}
