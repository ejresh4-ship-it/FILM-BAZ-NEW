import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Save,
  RotateCcw,
  ImageOff,
  Star,
  Clock,
  User,
  Film,
  Download,
  Edit3,
  Languages,
  Loader2,
} from 'lucide-react';
import type { MovieMetadata } from '@/types/metadata';
import type { MediaItem } from '@/types/media-library';
import { getMetadataService } from '@/services/metadata/MetadataService';
import { getAIService } from '@/services/ai/AIService';
import { toPersianDigits } from '@/lib/movieUtils';
import { formatRuntime } from '@/lib/movieUtils';
import ExportPreviewModal from '@/components/ExportPreviewModal';
import { notifyLibraryUpdated } from '@/services/libraryEvents';
import RenamePreviewModal from '@/components/RenamePreviewModal';

interface MetadataReviewViewProps {
  item: MediaItem;
  metadata: MovieMetadata;
  onBack: () => void;
  onSaved: () => void;
}

export default function MetadataReviewView({ item, metadata, onBack, onSaved }: MetadataReviewViewProps) {
  const service = getMetadataService();
  const [editTitle, setEditTitle] = useState(metadata.title);
  const [editPersianTitle, setEditPersianTitle] = useState(metadata.persianTitle || '');
  const [editYear, setEditYear] = useState(metadata.year);
  const [editOverview, setEditOverview] = useState(metadata.overview || '');
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showRename, setShowRename] = useState(false);

  useEffect(() => {
    setEditTitle(metadata.title);
    setEditPersianTitle(metadata.persianTitle || '');
    setEditYear(metadata.year);
    setEditOverview(metadata.overview || '');
  }, [metadata]);

  async function handleTranslateTitle() {
    const ai = getAIService();
    if (!ai.isConfigured()) {
      setEditPersianTitle('— هوش مصنوعی پیکربندی نشده است —');
      return;
    }
    setTranslating(true);
    try {
      const translated = await ai.translate(editTitle);
      setEditPersianTitle(translated || editPersianTitle);
    } catch {
      setEditPersianTitle('— خطا در ترجمه —');
    } finally {
      setTranslating(false);
    }
  }

  function handleSave() {
    setSaving(true);
    const corrected: MovieMetadata = {
      ...metadata,
      title: editTitle.trim() || metadata.title,
      persianTitle: editPersianTitle.trim() || undefined,
      year: editYear || metadata.year,
      overview: editOverview.trim() || metadata.overview,
      manuallyCorrected: true,
      cachedAt: Date.now(),
    };
    service.saveManualCorrection(item.id, corrected).then(() => {
      setSaving(false);
      notifyLibraryUpdated();
      onSaved();
    });
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 lg:px-8 fade-in">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-gold-bright"
      >
        <ChevronLeft size={18} className="rotate-180" />
        بازگشت
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">بررسی و اصلاح اطلاعات</h1>
        <p className="mt-1 text-sm text-text-muted">
          پیش از ذخیره، عنوان، سال و سایر اطلاعات را بررسی و در صورت نیاز اصلاح کنید
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Poster + images */}
        <div className="flex-shrink-0">
          <div className="aspect-[2/3] w-44 overflow-hidden rounded-xl border border-white/10 bg-base sm:w-52">
            {metadata.posterUrl ? (
              <img src={metadata.posterUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageOff size={32} className="text-text-muted" />
              </div>
            )}
          </div>
          {metadata.backdropUrl && (
            <div className="mt-3 aspect-video w-44 overflow-hidden rounded-xl border border-white/10 bg-base sm:w-52">
              <img src={metadata.backdropUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }} />
            </div>
          )}
          <div className="mt-3 space-y-1.5 text-xs text-text-muted">
            <p>منبع: {metadata.providerName}</p>
            {metadata.rating > 0 && (
              <p className="inline-flex items-center gap-1">
                <Star size={12} className="fill-gold-bright text-gold-bright" />
                {toPersianDigits(metadata.rating.toFixed(1))}
                {metadata.voteCount && ` (${toPersianDigits(metadata.voteCount)} رأی)`}
              </p>
            )}
          </div>
        </div>

        {/* Editable fields */}
        <div className="flex-1 space-y-4">
          <div className="rounded-xl border border-white/10 bg-surface-2 p-4">
            <h2 className="mb-3 text-sm font-bold text-white">اطلاعات اصلی</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-text-muted">عنوان (انگلیسی)</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  dir="ltr"
                  className="w-full rounded-lg border border-white/10 bg-base px-3 py-2 text-sm text-white focus:border-gold/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">عنوان فارسی</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={editPersianTitle}
                    onChange={(e) => setEditPersianTitle(e.target.value)}
                    placeholder="—"
                    className="w-full rounded-lg border border-white/10 bg-base px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  />
                  <button
                    onClick={handleTranslateTitle}
                    disabled={translating}
                    title="ترجمه خودکار با هوش مصنوعی"
                    className="flex-shrink-0 rounded-lg border border-gold/30 bg-gold/10 px-2.5 text-gold-bright transition-colors hover:bg-gold/20 disabled:opacity-50"
                  >
                    {translating ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">سال انتشار</label>
                <input
                  type="number"
                  value={editYear || ''}
                  onChange={(e) => setEditYear(parseInt(e.target.value) || 0)}
                  dir="ltr"
                  className="w-full rounded-lg border border-white/10 bg-base px-3 py-2 text-sm text-white focus:border-gold/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">نوع</label>
                <div className="flex h-9 items-center rounded-lg border border-white/10 bg-base px-3 text-sm text-text-secondary">
                  {metadata.mediaType === 'series' ? 'سریال' : metadata.mediaType === 'movie' ? 'فیلم' : 'نامشخص'}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs text-text-muted">خلاصه داستان</label>
              <textarea
                value={editOverview}
                onChange={(e) => setEditOverview(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-base px-3 py-2 text-sm leading-relaxed text-white focus:border-gold/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Genres & runtime */}
          <div className="rounded-xl border border-white/10 bg-surface-2 p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {metadata.runtime > 0 && (
                <span className="inline-flex items-center gap-1.5 text-text-secondary">
                  <Clock size={15} className="text-text-muted" />
                  {formatRuntime(metadata.runtime)}
                </span>
              )}
              {metadata.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {metadata.genres.map((g) => (
                    <span key={g} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-text-secondary">{g}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cast */}
          {metadata.cast.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-surface-2 p-4">
              <h2 className="mb-3 text-sm font-bold text-white">بازیگران ({toPersianDigits(metadata.cast.length)})</h2>
              <div className="flex flex-wrap gap-3">
                {metadata.cast.map((person) => (
                  <div key={person.id} className="flex w-24 flex-col items-center gap-1.5 text-center">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-surface-2 to-elevated">
                      {person.photoUrl ? (
                        <img src={person.photoUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <span className="text-xl font-bold text-gold/40">{person.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{person.name}</p>
                      {person.role && <p className="text-[10px] text-text-muted">{person.role}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Director */}
          {metadata.director && (
            <div className="rounded-xl border border-white/10 bg-surface-2 p-4">
              <div className="flex items-center gap-2 text-sm">
                <User size={15} className="text-text-muted" />
                <span className="text-text-muted">کارگردان:</span>
                <span className="font-medium text-white">{metadata.director}</span>
              </div>
            </div>
          )}

          {/* TV seasons */}
          {metadata.seasons && metadata.seasons.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-surface-2 p-4">
              <h2 className="mb-3 text-sm font-bold text-white">فصل‌ها ({toPersianDigits(metadata.seasons.length)})</h2>
              <div className="space-y-2">
                {metadata.seasons.map((s) => (
                  <div key={s.seasonNumber} className="flex items-center justify-between rounded-lg bg-base/50 px-3 py-2 text-sm">
                    <span className="text-white">فصل {toPersianDigits(s.seasonNumber)}</span>
                    <span className="text-xs text-text-muted">{toPersianDigits(s.episodeCount)} قسمت</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual correction notice */}
          <div className="flex items-start gap-3 rounded-lg border border-gold/15 bg-gold/5 p-3.5">
            <Film size={16} className="mt-0.5 flex-shrink-0 text-gold-bright" />
            <div>
              <p className="text-xs font-medium text-white">حفاظت از اصلاحات دستی</p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                پس از ذخیره، این اطلاعات به‌صورت دستی اصلاح‌شده علامت‌گذاری می‌شود و در جستجوهای بعدی به‌صورت خودکار بازنویسی نخواهد شد.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowRename(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-5 py-2.5 text-sm font-semibold text-gold-bright transition-colors hover:bg-gold/20"
            >
              <Edit3 size={16} />
              تغییر نام رسمی
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-gold/40 hover:bg-white/10"
            >
              <Download size={16} />
              صادرات آفلاین
            </button>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              <RotateCcw size={16} />
              انصراف
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? 'در حال ذخیره…' : 'ذخیره اطلاعات'}
              {!saving && <Save size={16} />}
            </button>
          </div>
        </div>
      </div>

      {showExport && (
        <ExportPreviewModal item={item} onClose={() => setShowExport(false)} />
      )}
      {showRename && (
        <RenamePreviewModal
          item={item}
          metadata={metadata}
          onClose={() => setShowRename(false)}
          onRenamed={() => { setShowRename(false); onSaved(); }}
        />
      )}
    </div>
  );
}
