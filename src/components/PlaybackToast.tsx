import { useEffect, useState } from 'react';
import { X, Check, AlertTriangle, Info, Loader2 } from 'lucide-react';
import type { PlayOutcome } from '@/services/playback/PlaybackService';

interface PlaybackToastProps {
  outcome: PlayOutcome | null;
  loading: boolean;
  movieTitle: string;
  onClose: () => void;
}

// Shows real playback results: launching, success, browser-mode, or error.
// Never pretends playback succeeded — the outcome comes from PlaybackService.
export default function PlaybackToast({ outcome, loading, movieTitle, onClose }: PlaybackToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (outcome && !loading) {
      const t = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(t);
    }
  }, [outcome, loading]);

  if (!visible) return null;

  let icon = <Loader2 size={18} className="animate-spin text-gold-bright" />;
  let title = 'در حال آماده‌سازی پخش...';
  let message = `در حال باز کردن «${movieTitle}»`;
  let borderColor = 'border-gold/20';
  let bgColor = 'bg-gold/5';

  if (outcome && !loading) {
    if (outcome.browserMode) {
      icon = <Info size={18} className="text-blue-400" />;
      title = 'پخش در مرورگر ممکن نیست';
      message = outcome.error ?? 'پخش فایل‌های محلی نیازمند نسخه دسکتاپ ویندوز است.';
      borderColor = 'border-blue-400/30';
      bgColor = 'bg-blue-400/5';
    } else if (outcome.success) {
      icon = <Check size={18} className="text-green-400" />;
      title = 'پخش آغاز شد';
      const parts = [`پخش‌کننده: ${outcome.playerUsed ?? 'پیش‌فرض سیستم'}`];
      if (outcome.subtitlePath) parts.push('زیرنویس مرتبط یافت شد');
      message = parts.join(' • ');
      borderColor = 'border-green-400/30';
      bgColor = 'bg-green-400/5';
    } else {
      icon = <AlertTriangle size={18} className="text-red-400" />;
      title = 'پخش ناموفق بود';
      message = outcome.error ?? 'خطای ناشناخته در پخش.';
      borderColor = 'border-red-400/30';
      bgColor = 'bg-red-400/5';
    }
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4 fade-in"
      role="status"
      aria-live="polite"
    >
      <div className={`flex max-w-md items-start gap-3 rounded-xl border ${borderColor} ${bgColor} bg-surface-2 p-4 shadow-cinematic`}>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">{message}</p>
          {outcome?.filePath && !outcome.browserMode && (
            <p className="mt-1.5 truncate font-mono text-[10px] text-text-muted" dir="ltr">
              {outcome.filePath}
            </p>
          )}
        </div>
        <button
          onClick={() => { setVisible(false); onClose(); }}
          className="flex-shrink-0 rounded p-1 text-text-muted transition-colors hover:text-white"
          aria-label="بستن"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
