import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Undo2,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import type { OperationLogEntry } from '@/types/media-library';
import { getLibraryService } from '@/services/LibraryService';
import { formatTimestamp } from '@/lib/mediaFormat';
import { toPersianDigits } from '@/lib/movieUtils';

interface OperationLogViewProps {
  onBack: () => void;
}

export default function OperationLogView({ onBack }: OperationLogViewProps) {
  const service = getLibraryService();
  const [log, setLog] = useState<OperationLogEntry[]>([]);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [undoMessage, setUndoMessage] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setLog(service.getOperationLog());
  }, [service]);

  async function handleUndo(entry: OperationLogEntry) {
    setUndoMessage(null);
    if (!window.confirm('این عملیات بازگردانده شود؟ فایل به محل اصلی برگردانده می‌شود.')) return;
    setUndoingId(entry.id);
    try {
      const result = await service.undoOperation(entry);
      if (result.success) {
        setUndoMessage({ ok: true, msg: 'بازگشت با موفقیت انجام شد' });
      } else {
        setUndoMessage({ ok: false, msg: result.error || 'بازگشت ناموفق بود' });
      }
      setLog(service.getOperationLog());
    } finally {
      setUndoingId(null);
      setTimeout(() => setUndoMessage(null), 4000);
    }
  }

  const moveCount = log.filter((e) => e.type === 'move' && e.success).length;
  const failedCount = log.filter((e) => !e.success).length;
  const undoCount = log.filter((e) => e.type === 'undo' && e.success).length;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 lg:px-8 fade-in">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-gold-bright"
      >
        <ChevronLeft size={18} className="rotate-180" />
        بازگشت
      </button>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white">
          <FileText size={24} className="text-gold-bright" />
          گزارش عملیات
        </h1>
        <p className="mt-1 text-sm text-text-muted">تاریخچه انتقال‌ها و بازگشت‌ها با مهر زمانی</p>
      </div>

      {/* Summary */}
      {log.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-surface-2 p-3">
            <p className="text-xs text-text-muted">انتقال موفق</p>
            <p className="mt-1 text-xl font-bold text-green-400">{toPersianDigits(moveCount)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-2 p-3">
            <p className="text-xs text-text-muted">ناموفق</p>
            <p className="mt-1 text-xl font-bold text-red-400">{toPersianDigits(failedCount)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-2 p-3">
            <p className="text-xs text-text-muted">بازگشت</p>
            <p className="mt-1 text-xl font-bold text-gold-bright">{toPersianDigits(undoCount)}</p>
          </div>
        </div>
      )}

      {undoMessage && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm fade-in ${
            undoMessage.ok
              ? 'border-green-500/30 bg-green-500/10 text-green-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {undoMessage.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <p>{undoMessage.msg}</p>
        </div>
      )}

      {/* Log entries */}
      {log.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface/50">
          <div className="text-center">
            <FileText size={32} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-muted">هنوز عملیاتی ثبت نشده است</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {log.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-white/10 bg-surface-2 p-3.5"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  {entry.type === 'undo' ? (
                    <Undo2 size={18} className="text-gold-bright" />
                  ) : entry.success ? (
                    <CheckCircle2 size={18} className="text-green-400" />
                  ) : (
                    <XCircle size={18} className="text-red-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        entry.type === 'undo'
                          ? 'bg-gold/15 text-gold-bright'
                          : entry.success
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {entry.type === 'undo' ? 'بازگشت' : 'انتقال'}
                    </span>
                    <span className="text-xs text-text-muted">{formatTimestamp(entry.timestamp)}</span>
                  </div>

                  <div className="mt-2 rounded-lg bg-base/50 p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 text-text-muted">
                        {entry.type === 'undo' ? 'از:' : 'از:'}
                      </span>
                      <span className="truncate text-text-secondary" dir="ltr">
                        {entry.sourcePath}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="flex-shrink-0 text-text-muted">
                        {entry.type === 'undo' ? 'به:' : 'به:'}
                      </span>
                      <span className="truncate text-text-secondary" dir="ltr">
                        {entry.destPath}
                      </span>
                    </div>
                  </div>

                  {entry.error && (
                    <p className="mt-1.5 text-xs text-red-400">خطا: {entry.error}</p>
                  )}

                  {entry.success && entry.type === 'move' && (
                    <button
                      onClick={() => handleUndo(entry)}
                      disabled={undoingId === entry.id}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-gold/30 hover:text-gold-bright disabled:opacity-50"
                    >
                      {undoingId === entry.id ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          در حال بازگشت…
                        </>
                      ) : (
                        <>
                          <RotateCcw size={13} />
                          بازگشت این عملیات
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
