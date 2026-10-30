import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import type { MediaItem } from '@/types/media-library';
import type { MovieMetadata } from '@/types/metadata';
import { getLibraryService } from '@/services/LibraryService';
import { getFilesystemService } from '@/services/filesystemFactory';
import { notifyLibraryUpdated } from '@/services/libraryEvents';

interface RenamePreviewModalProps {
  item: MediaItem;
  metadata: MovieMetadata;
  onClose: () => void;
  onRenamed: () => void;
}

type RenameMode = 'file' | 'folder' | 'both';

export default function RenamePreviewModal({ item, metadata, onClose, onRenamed }: RenamePreviewModalProps) {
  const service = getLibraryService();
  const extension = item.extension ? `.${item.extension}` : '';
  const baseTitle = metadata.year > 0 ? `${metadata.title} (${metadata.year})` : metadata.title;
  const defaultFileName = item.mediaType === 'episode' && item.seasonGuess && item.episodeGuess
    ? `${metadata.title} - S${String(item.seasonGuess).padStart(2, '0')}E${String(item.episodeGuess).padStart(2, '0')}${extension}`
    : `${baseTitle}${extension}`;
  const [mode, setMode] = useState<RenameMode>('file');
  const [fileName, setFileName] = useState(defaultFileName);
  const [folderName, setFolderName] = useState(baseTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentFolderName = useMemo(() => getFilesystemService().baseName(item.parentFolder), [item.parentFolder]);

  async function handleRename() {
    setSaving(true);
    setError(null);
    try {
      await service.renameItem(item.id, { mode, fileName, folderName });
      notifyLibraryUpdated();
      onRenamed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تغییر نام ناموفق بود');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-surface shadow-cinematic" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <h2 className="text-base font-bold text-white">تغییر نام رسمی</h2>
            <p className="mt-1 text-xs text-text-muted">فقط پس از تأیید شما تغییری در فایل‌ها ایجاد می‌شود</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:bg-white/10 hover:text-white" aria-label="بستن"><X size={18} /></button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3 rounded-lg border border-gold/20 bg-gold/5 p-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-gold-bright" />
            <p className="text-xs leading-relaxed text-text-secondary">نام پیشنهادی بر اساس اطلاعات تأییدشده از {metadata.providerName} ساخته شده است. فایل مقصد هرگز بازنویسی نمی‌شود.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-text-muted">عنوان رسمی
              <input value={metadata.title} readOnly dir="ltr" className="mt-1 w-full rounded-lg border border-white/10 bg-base px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-xs text-text-muted">سال انتشار
              <input value={metadata.year || '—'} readOnly dir="ltr" className="mt-1 w-full rounded-lg border border-white/10 bg-base px-3 py-2 text-sm text-white" />
            </label>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-surface-2 p-4">
            <div>
              <p className="mb-2 text-sm font-bold text-white">نوع تغییر</p>
              <div className="flex flex-wrap gap-3 text-sm text-text-secondary">
                {([['file', 'فقط فایل ویدئو'], ['folder', 'فقط پوشه'], ['both', 'فایل و پوشه']] as const).map(([value, label]) => (
                  <label key={value} className="inline-flex items-center gap-2">
                    <input type="radio" checked={mode === value} onChange={() => setMode(value)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <label className="block text-xs text-text-muted">نام فایل جدید
              <input value={fileName} onChange={(event) => setFileName(event.target.value)} dir="ltr" disabled={mode === 'folder'} className="mt-1 w-full rounded-lg border border-white/10 bg-base px-3 py-2 text-sm text-white disabled:opacity-50" />
            </label>
            <label className="block text-xs text-text-muted">نام پوشه جدید
              <input value={folderName} onChange={(event) => setFolderName(event.target.value)} dir="ltr" disabled={mode === 'file'} className="mt-1 w-full rounded-lg border border-white/10 bg-base px-3 py-2 text-sm text-white disabled:opacity-50" />
            </label>
          </div>

          <div className="space-y-1 rounded-lg border border-white/5 bg-base/60 p-3 text-xs">
            <p className="text-text-muted">نام فعلی فایل: <span className="text-white" dir="ltr">{item.fileName}</span></p>
            <p className="text-text-muted">نام فعلی پوشه: <span className="text-white" dir="ltr">{currentFolderName}</span></p>
          </div>

          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">انصراف</button>
            <button onClick={handleRename} disabled={saving || (mode !== 'folder' && !fileName.trim()) || (mode !== 'file' && !folderName.trim())} className="btn-primary text-sm disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              تأیید تغییر نام
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
