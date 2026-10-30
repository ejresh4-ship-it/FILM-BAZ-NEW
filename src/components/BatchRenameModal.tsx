import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Edit3, Loader2, X, XCircle } from 'lucide-react';
import type { MediaItem } from '@/types/media-library';
import type { MovieMetadata } from '@/types/metadata';
import { getLibraryService } from '@/services/LibraryService';
import { getFilesystemService } from '@/services/filesystemFactory';
import { notifyLibraryUpdated } from '@/services/libraryEvents';

interface BatchRenameModalProps {
  items: MediaItem[];
  metadataByItem: Record<string, MovieMetadata>;
  onClose: () => void;
  onCompleted: () => void;
}

type RenameMode = 'file' | 'folder' | 'both';

interface RenamePlan {
  itemId: string;
  item: MediaItem;
  metadata?: MovieMetadata;
  mode: RenameMode;
  fileName: string;
  folderName: string;
  currentFileName: string;
  currentFolderName: string;
  excluded: boolean;
  uncertain: boolean;
  conflict: boolean;
}

export default function BatchRenameModal({ items, metadataByItem, onClose, onCompleted }: BatchRenameModalProps) {
  const service = getLibraryService();
  const fs = getFilesystemService();

  const initialPlans = useMemo<RenamePlan[]>(() => {
    return items
      .filter((item) => metadataByItem[item.id])
      .map((item) => {
        const metadata = metadataByItem[item.id];
        const extension = item.extension ? `.${item.extension}` : '';
        const baseTitle = metadata.year > 0 ? `${metadata.title} (${metadata.year})` : metadata.title;
        const defaultFileName =
          item.mediaType === 'episode' && item.seasonGuess && item.episodeGuess
            ? `${metadata.title} - S${String(item.seasonGuess).padStart(2, '0')}E${String(item.episodeGuess).padStart(2, '0')}${extension}`
            : `${baseTitle}${extension}`;
        const currentFolderName = fs.baseName(item.parentFolder);
        const sameFile = defaultFileName === item.fileName;
        const sameFolder = baseTitle === currentFolderName;
        return {
          itemId: item.id,
          item,
          metadata,
          mode: sameFile && !sameFolder ? 'folder' : 'file',
          fileName: defaultFileName,
          folderName: baseTitle,
          currentFileName: item.fileName,
          currentFolderName,
          excluded: sameFile && sameFolder,
          uncertain: item.identification === 'needs-review',
          conflict: false,
        };
      });
  }, [items, metadataByItem, fs]);

  const [plans, setPlans] = useState<RenamePlan[]>(initialPlans);
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<{ succeeded: number; failed: Array<{ fileName: string; error: string }> } | null>(null);

  const activePlans = plans.filter((p) => !p.excluded);
  const uncertainCount = activePlans.filter((p) => p.uncertain).length;
  const conflictCount = activePlans.filter((p) => p.conflict).length;

  function updatePlan(itemId: string, updates: Partial<RenamePlan>) {
    setPlans((prev) => prev.map((p) => (p.itemId === itemId ? { ...p, ...updates } : p)));
  }

  function toggleExclude(itemId: string) {
    setPlans((prev) => prev.map((p) => (p.itemId === itemId ? { ...p, excluded: !p.excluded } : p)));
  }

  function setAllMode(mode: RenameMode) {
    setPlans((prev) => prev.map((p) => ({ ...p, mode })));
  }

  async function handleExecute() {
    setExecuting(true);
    setResults(null);
    try {
      const batchPlans = activePlans.map((p) => ({
        itemId: p.itemId,
        mode: p.mode,
        fileName: p.mode !== 'folder' ? p.fileName : undefined,
        folderName: p.mode !== 'file' ? p.folderName : undefined,
      }));
      const result = await service.renameItemsBatch(batchPlans);
      notifyLibraryUpdated();
      const failedNames = result.failed.map((f) => {
        const plan = plans.find((p) => p.itemId === f.itemId);
        return { fileName: plan?.currentFileName || f.itemId, error: f.error };
      });
      setResults({ succeeded: result.succeeded.length, failed: failedNames });
      if (result.succeeded.length > 0) onCompleted();
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-surface shadow-cinematic" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <h2 className="text-base font-bold text-white">تغییر نام گروهی رسمی</h2>
            <p className="mt-1 text-xs text-text-muted">
              {activePlans.length} مورد از {plans.length} برای تغییر نام انتخاب شده است
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:bg-white/10 hover:text-white" aria-label="بستن">
            <X size={18} />
          </button>
        </div>

        {/* Warnings */}
        {(uncertainCount > 0 || conflictCount > 0) && (
          <div className="flex flex-wrap gap-3 border-b border-white/10 p-4">
            {uncertainCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                <AlertTriangle size={14} />
                {uncertainCount} مورد با تطابق نامطمئن
              </div>
            )}
            {conflictCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <XCircle size={14} />
                {conflictCount} مورد دارای تداخل در مقصد
              </div>
            )}
          </div>
        )}

        {/* Mode selector */}
        <div className="flex flex-wrap gap-3 border-b border-white/10 p-4 text-sm text-text-secondary">
          <span className="text-text-muted">نوع تغییر برای همه:</span>
          {([['file', 'فقط فایل'], ['folder', 'فقط پوشه'], ['both', 'فایل و پوشه']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setAllMode(value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:border-gold/40 hover:text-gold-bright"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Plan list */}
        <div className="flex-1 overflow-y-auto p-4">
          {plans.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-text-muted">هیچ موردی با اطلاعات تأییدشده یافت نشد. ابتدا برای موارد، اطلاعات را جستجو و تأیید کنید.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => (
                <div
                  key={plan.itemId}
                  className={`rounded-xl border p-3 transition-colors ${
                    plan.excluded ? 'border-white/5 bg-base/30 opacity-50' : 'border-white/10 bg-surface-2'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleExclude(plan.itemId)}
                      className={`mt-0.5 flex-shrink-0 rounded p-1 ${
                        plan.excluded ? 'text-text-muted hover:text-white' : 'text-gold-bright hover:text-gold'
                      }`}
                      aria-label={plan.excluded ? 'درج' : 'حذف'}
                    >
                      {plan.excluded ? <X size={16} /> : <Check size={16} />}
                    </button>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-white" dir="ltr">{plan.currentFileName}</span>
                        {plan.uncertain && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">نامطمئن</span>
                        )}
                        {plan.conflict && (
                          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400">تداخل</span>
                        )}
                      </div>

                      {/* Editable names */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="block text-xs text-text-muted">
                          نام فایل جدید
                          <input
                            value={plan.fileName}
                            onChange={(e) => updatePlan(plan.itemId, { fileName: e.target.value })}
                            dir="ltr"
                            disabled={plan.excluded || plan.mode === 'folder'}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-base px-3 py-2 text-sm text-white disabled:opacity-50"
                          />
                        </label>
                        <label className="block text-xs text-text-muted">
                          نام پوشه جدید
                          <input
                            value={plan.folderName}
                            onChange={(e) => updatePlan(plan.itemId, { folderName: e.target.value })}
                            dir="ltr"
                            disabled={plan.excluded || plan.mode === 'file'}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-base px-3 py-2 text-sm text-white disabled:opacity-50"
                          />
                        </label>
                      </div>

                      {/* Mode toggle per item */}
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Edit3 size={12} />
                        {([['file', 'فایل'], ['folder', 'پوشه'], ['both', 'هر دو']] as const).map(([value, label]) => (
                          <button
                            key={value}
                            onClick={() => updatePlan(plan.itemId, { mode: value })}
                            className={`rounded px-1.5 py-0.5 ${
                              plan.mode === value ? 'bg-gold/20 text-gold-bright' : 'text-text-muted hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="border-t border-white/10 p-4">
            {results.succeeded > 0 && (
              <p className="text-sm text-green-400">{results.succeeded} مورد با موفقیت تغییر نام یافت</p>
            )}
            {results.failed.length > 0 && (
              <div className="mt-2 space-y-1">
                {results.failed.map((f, i) => (
                  <p key={i} className="text-xs text-red-300">
                    <span dir="ltr">{f.fileName}</span> — {f.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 p-4">
          <div className="text-xs text-text-muted">
            هیچ فایل مقصدی بازنویسی نمی‌شود. در صورت تداخل، آن مورد نادیده گرفته می‌شود.
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
              انصراف
            </button>
            <button
              onClick={handleExecute}
              disabled={executing || activePlans.length === 0}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {executing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              تأیید و اجرای تغییر نام ({activePlans.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
