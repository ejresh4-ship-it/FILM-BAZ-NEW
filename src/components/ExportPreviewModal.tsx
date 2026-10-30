import { useState } from 'react';
import {
  X,
  Download,
  FileJson,
  Image,
  FolderTree,
  AlertTriangle,
  Check,
  Loader2,
  HardDrive,
} from 'lucide-react';
import type { MediaItem } from '@/types/media-library';
import type { MetadataExportPreview } from '@/types/metadata';
import { getMetadataService } from '@/services/metadata/MetadataService';
import { getFilesystemService } from '@/services/filesystemFactory';
import { toPersianDigits } from '@/lib/movieUtils';
import { formatFileSize } from '@/lib/mediaFormat';

interface ExportPreviewModalProps {
  item: MediaItem;
  onClose: () => void;
}

export default function ExportPreviewModal({ item, onClose }: ExportPreviewModalProps) {
  const metaService = getMetadataService();
  const fs = getFilesystemService();
  const [exportPath, setExportPath] = useState(fs.joinPath(item.parentFolder, 'metadata'));
  const [preview, setPreview] = useState<MetadataExportPreview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function generatePreview() {
    setGenerating(true);
    try {
      const p = metaService.buildExportPreview(item, exportPath);
      setPreview(p);
    } finally {
      setGenerating(false);
    }
  }

  async function handleExport() {
    if (!preview) return;
    if (!window.confirm(`صادرات ${toPersianDigits(preview.files.length)} فایل به «${exportPath}» انجام شود؟`)) return;
    setExporting(true);
    setResult(null);
    try {
      const fsService = getFilesystemService();
      // Create the export folder
      const mkdir = await fsService.createDir(exportPath);
      if (!mkdir.success) {
        setResult({ ok: false, message: mkdir.error || 'امکان ایجاد پوشه صادرات نبود' });
        return;
      }

      const metadata = metaService.getMetadataForItem(item.id);
      if (!metadata) {
        setResult({ ok: false, message: 'اطلاعات متادیتا برای این مورد یافت نشد' });
        return;
      }

      let written = 0;
      let failed = 0;

      // Write movie_info.json
      const jsonPath = fsService.joinPath(exportPath, 'movie_info.json');
      const writeJson = await fsService.writeTextFile(jsonPath, JSON.stringify(metadata, null, 2));
      if (writeJson.success) written++;
      else failed++;

      // Download poster
      if (metadata.posterUrl) {
        const posterPath = fsService.joinPath(exportPath, 'poster.jpg');
        const dlPoster = await fsService.downloadFile(metadata.posterUrl, posterPath);
        if (dlPoster.success) written++;
        else failed++;
      }

      // Download backdrop
      if (metadata.backdropUrl) {
        const backdropPath = fsService.joinPath(exportPath, 'backdrop.jpg');
        const dlBackdrop = await fsService.downloadFile(metadata.backdropUrl, backdropPath);
        if (dlBackdrop.success) written++;
        else failed++;
      }

      // Download actor photos
      const actorsWithPhotos = metadata.cast.filter((c) => c.photoUrl);
      if (actorsWithPhotos.length > 0) {
        const actorsDir = fsService.joinPath(exportPath, 'actors');
        await fsService.createDir(actorsDir);
        for (const actor of actorsWithPhotos) {
          const safeName = actor.name.replace(/[^\w\s]/g, '').replace(/\s+/g, '_');
          const actorPath = fsService.joinPath(actorsDir, `${safeName}.jpg`);
          const dlActor = await fsService.downloadFile(actor.photoUrl!, actorPath);
          if (dlActor.success) written++;
          else failed++;
        }
      }

      setResult({
        ok: failed === 0,
        message: `${toPersianDigits(written)} فایل نوشته شد${failed > 0 ? `، ${toPersianDigits(failed)} ناموفق` : ''}.`,
      });
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'خطا در صادرات' });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm fade-in" onClick={onClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-cinematic"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Download size={18} className="text-gold-bright" />
            صادرات اطلاعات آفلاین
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
          {/* Path input */}
          <div>
            <label className="mb-1 block text-xs text-text-muted">مسیر پوشه صادرات</label>
            <input
              type="text"
              value={exportPath}
              onChange={(e) => setExportPath(e.target.value)}
              dir="ltr"
              className="w-full rounded-lg border border-white/10 bg-base px-3 py-2 text-sm text-white focus:border-gold/40 focus:outline-none"
            />
            <button
              onClick={generatePreview}
              className="btn-primary mt-2 text-sm"
            >
              <FolderTree size={15} />
              پیش‌نمایش فایل‌ها
            </button>
          </div>

          {/* Preview */}
          {generating ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 size={24} className="animate-spin text-gold-bright" />
            </div>
          ) : preview ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-base/50 p-3">
                <p className="mb-2 text-xs font-medium text-text-secondary">
                  {toPersianDigits(preview.files.length)} فایل — حجم تخمینی: {formatFileSize(preview.totalSize)}
                </p>
                <div className="space-y-1.5">
                  {preview.files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      {file.type === 'json' ? (
                        <FileJson size={14} className="flex-shrink-0 text-gold-bright" />
                      ) : file.type === 'actor' ? (
                        <div className="flex-shrink-0 pl-2">
                          <Image size={14} className="text-text-muted" />
                        </div>
                      ) : (
                        <Image size={14} className="flex-shrink-0 text-text-muted" />
                      )}
                      <span className="truncate text-text-secondary" dir="ltr">{file.fileName}</span>
                      {file.size !== undefined && (
                        <span className="mr-auto flex-shrink-0 text-text-muted">{formatFileSize(file.size)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety notice */}
              <div className="flex items-start gap-2 rounded-lg border border-gold/15 bg-gold/5 p-3">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-gold-bright" />
                <p className="text-xs leading-relaxed text-text-secondary">
                  هیچ فایل رسانه‌ای جابه‌جا، حذف یا بازنویسی نمی‌شود. فقط فایل‌های اطلاعات و تصاویر در پوشه جداگانه نوشته می‌شوند.
                </p>
              </div>

              {/* Export button */}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn-primary w-full text-sm disabled:opacity-50"
              >
                {exporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    در حال صادرات…
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    تأیید و صادرات
                  </>
                )}
              </button>
            </div>
          ) : null}

          {/* Result */}
          {result && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                result.ok
                  ? 'border-green-500/20 bg-green-500/5 text-green-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}
            >
              {result.ok ? <Check size={14} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />}
              <p>{result.message}</p>
            </div>
          )}

          {/* Mock mode note */}
          <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-base/50 p-2.5">
            <HardDrive size={14} className="mt-0.5 flex-shrink-0 text-text-muted" />
            <p className="text-xs leading-relaxed text-text-muted">
              در محیط دسکتاپ (Electron)، فایل‌ها مستقیماً روی دیسک ویندوز نوشته می‌شوند. در حالت نمایشی مرورگر، از سیستم فایل فرضی استفاده می‌شود.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
