import { useState, useEffect, useCallback } from 'react';
import {
  MonitorPlay,
  Search,
  Check,
  X,
  Loader2,
  FolderOpen,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { DetectedPlayer, PlaybackPreferences } from '@/types/desktop';
import { getPlaybackService } from '@/services/playback/PlaybackService';
import { isDesktopRuntime } from '@/services/filesystemFactory';

export default function PlayerSettingsPanel() {
  const service = getPlaybackService();
  const [isDesktop] = useState(isDesktopRuntime());
  const [players, setPlayers] = useState<DetectedPlayer[]>([]);
  const [prefs, setPrefs] = useState<PlaybackPreferences>({ selectedPlayerId: 'system' });
  const [scanning, setScanning] = useState(false);
  const [manualPath, setManualPath] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationMsg, setValidationMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = await service.getPreferences();
    setPrefs(p);
    setManualPath(p.manualExecutablePath ?? '');
    if (isDesktop) {
      setScanning(true);
      setScanError(null);
      try {
        const detected = await service.detectPlayers();
        setPlayers(detected);
      } catch (e) {
        setScanError(e instanceof Error ? e.message : 'خطا در تشخیص پخش‌کننده‌ها');
      } finally {
        setScanning(false);
      }
    }
  }, [service, isDesktop]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRescan() {
    service.invalidatePlayerCache();
    setScanning(true);
    setScanError(null);
    setPlayers([]);
    try {
      const detected = await service.detectPlayers();
      setPlayers(detected);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'خطا در تشخیص پخش‌کننده‌ها');
    } finally {
      setScanning(false);
    }
  }

  async function handleSelectPlayer(playerId: string) {
    const newPrefs = { selectedPlayerId: playerId, manualExecutablePath: undefined };
    setPrefs(newPrefs);
    await service.setPreferences(newPrefs);
  }

  async function handleBrowse() {
    const path = await service.browseForExecutable();
    if (path) {
      setManualPath(path);
      await handleValidate(path);
    }
  }

  async function handleValidate(exePath?: string) {
    const p = exePath ?? manualPath;
    if (!p.trim()) return;
    setValidating(true);
    setValidationMsg(null);
    const result = await service.validateExecutable(p.trim());
    if (result.valid) {
      const newPrefs: PlaybackPreferences = { selectedPlayerId: 'manual', manualExecutablePath: p.trim() };
      setPrefs(newPrefs);
      await service.setPreferences(newPrefs);
      setValidationMsg({ ok: true, text: 'فایل اجرایی معتبر است و انتخاب شد' });
    } else {
      setValidationMsg({ ok: false, text: result.error ?? 'فایل اجرایی معتبر نیست' });
    }
    setValidating(false);
  }

  // --- Browser mode (no Electron) ---
  if (!isDesktop) {
    return (
      <div>
        <h2 className="text-xl font-bold text-white">پخش‌کننده</h2>
        <p className="mt-1 text-sm text-text-muted">انتخاب پخش‌کننده ویدئوی نصب‌شده روی ویندوز</p>
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-gold/15 bg-gold/5 p-4">
          <MonitorPlay size={18} className="mt-0.5 flex-shrink-0 text-gold-bright" />
          <div>
            <p className="text-sm font-medium text-white">نیازمند نسخه دسکتاپ ویندوز</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              تشخیص پخش‌کننده‌های نصب‌شده و پخش فایل‌های محلی فقط در نسخه دسکتاپ ویندوز (Electron) فعال می‌شود.
              در حال حاضر برنامه در مرورگر اجرا می‌شود. تنظیمات پخش پس از نصب نسخه دسکتاپ در دسترس خواهد بود.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Desktop mode ---
  return (
    <div>
      <h2 className="text-xl font-bold text-white">پخش‌کننده</h2>
      <p className="mt-1 text-sm text-text-muted">انتخاب پخش‌کننده ویدئوی نصب‌شده روی ویندوز</p>

      <div className="mt-5 space-y-4">
        {/* Scan button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRescan}
            disabled={scanning}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-gold/40 hover:bg-white/10 disabled:opacity-50"
          >
          {scanning ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
            {scanning ? 'در حال جستجو…' : 'جستجوی پخش‌کننده‌ها'}
          </button>
          {players.length > 0 && !scanning && (
            <span className="text-xs text-text-muted">
              {players.length} پخش‌کننده یافت شد
            </span>
          )}
        </div>

        {/* Scan error */}
        {scanError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <p>{scanError}</p>
          </div>
        )}

        {/* Player list */}
        {players.length > 0 ? (
          <div className="space-y-2">
            {players.map((player) => {
              const isSelected = prefs.selectedPlayerId === player.id;
              return (
                <button
                  key={player.id}
                  onClick={() => handleSelectPlayer(player.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-right transition-all ${
                    isSelected
                      ? 'border-gold bg-gold/5'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                    isSelected ? 'bg-gold/15' : 'bg-white/5'
                  }`}>
                    <MonitorPlay size={20} className={isSelected ? 'text-gold-bright' : 'text-text-muted'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{player.name}</p>
                    <p className="truncate text-xs text-text-muted" dir="ltr">{player.executablePath}</p>
                  </div>
                  {isSelected && <Check size={18} className="flex-shrink-0 text-gold-bright" />}
                </button>
              );
            })}
          </div>
        ) : !scanning ? (
          <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-base/50 p-3 text-xs text-text-muted">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <p>هیچ پخش‌کننده‌ای به‌صورت خودکار یافت نشد. می‌توانید با دکمه «جستجو» دوباره تلاش کنید یا یک فایل اجرایی را به‌صورت دستی انتخاب کنید.</p>
          </div>
        ) : null}

        {/* Manual selection */}
        <div className="border-t border-white/5 pt-4">
          <p className="mb-2 text-sm font-medium text-text-secondary">انتخاب دستی پخش‌کننده</p>
          <p className="mb-3 text-xs leading-relaxed text-text-muted">
            اگر پخش‌کننده مورد نظر در فهرست بالا نیست، می‌توانید فایل اجرایی (.exe) آن را به‌صورت دستی انتخاب کنید.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              dir="ltr"
              placeholder="C:\Program Files\VideoLAN\VLC\vlc.exe"
              className="flex-1 rounded-lg border border-white/10 bg-base px-3 py-2 text-sm text-white focus:border-gold/40 focus:outline-none"
            />
            <button
              onClick={handleBrowse}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition-colors hover:border-gold/40 hover:bg-white/10"
            >
              <FolderOpen size={16} />
              مرور
            </button>
          </div>
          {manualPath.trim() && (
            <button
              onClick={() => handleValidate()}
              disabled={validating}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white transition-colors hover:border-gold/40 hover:bg-white/10 disabled:opacity-50"
            >
              {validating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              بررسی و تأیید
            </button>
          )}
          {validationMsg && (
            <div className={`mt-2 flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
              validationMsg.ok
                ? 'border-green-500/20 bg-green-500/5 text-green-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}>
              {validationMsg.ok ? <Check size={14} className="mt-0.5 flex-shrink-0" /> : <X size={14} className="mt-0.5 flex-shrink-0" />}
              <p>{validationMsg.text}</p>
            </div>
          )}
        </div>

        {/* Subtitle support notice */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-base/50 p-3 text-xs text-text-muted">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">
              زیرنویس‌های منطبق با فایل ویدئو به‌صورت خودکار پیدا و به پخش‌کننده ارسال می‌شوند.
              پشتیبانی از زیرنویس به نوع پخش‌کننده بستگی دارد. فایل زیرنویس هرگز تغییر، بازنویسی یا حذف نمی‌شود.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
