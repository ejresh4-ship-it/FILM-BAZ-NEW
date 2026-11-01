import { useMemo, useState } from 'react';
import { ArrowRight, Play, Star, Clock, CalendarDays, FolderTree, Loader2 } from 'lucide-react';
import type { Movie } from '@/types/movie';
import type { LibraryMovieEntry } from '@/lib/libraryMovieAdapter';
import { formatRuntime, toPersianDigits } from '@/lib/movieUtils';
import { getFilesystemService } from '@/services/filesystemFactory';
import { getLibraryService } from '@/services/LibraryService';
import { notifyLibraryUpdated } from '@/services/libraryEvents';

interface SeriesDetailsProps {
  movie: Movie;
  entries: LibraryMovieEntry[];
  onBack: () => void;
  onPlay: (id: string) => void;
}

export default function SeriesDetails({ movie, entries, onBack, onPlay }: SeriesDetailsProps) {
  const seasons = useMemo(() => {
    const grouped = new Map<number, LibraryMovieEntry[]>();
    for (const entry of entries) {
      const season = entry.item.seasonGuess ?? 0;
      grouped.set(season, [...(grouped.get(season) ?? []), entry]);
    }
    return [...grouped.entries()].sort((a, b) => a[0] - b[0]);
  }, [entries]);
  const [selectedSeason, setSelectedSeason] = useState<number>(seasons.find(([s]) => s > 0)?.[0] ?? seasons[0]?.[0] ?? 0);
  const [organizing, setOrganizing] = useState(false);
  const [organizeMessage, setOrganizeMessage] = useState('');
  const episodes = [...(seasons.find(([season]) => season === selectedSeason)?.[1] ?? [])]
    .sort((a, b) => (a.item.episodeGuess ?? 0) - (b.item.episodeGuess ?? 0));

  const organizeSeasons = async () => {
    if (!window.confirm('فقط قسمت‌هایی که شماره فصل و قسمت آن‌ها با اطمینان شناسایی شده، به پوشه سریال و فصل مربوط منتقل شوند؟ فایل مقصد هرگز بازنویسی نمی‌شود.')) return;
    setOrganizing(true);
    setOrganizeMessage('');
    const fs = getFilesystemService();
    const library = getLibraryService();
    let moved = 0;
    let skipped = 0;
    const affectedFolders = new Set<string>();
    try {
      const seriesName = (movie.englishTitle || movie.title).replace(/[\\/:*?"<>|]/g, '').trim();
      if (!seriesName) throw new Error('نام معتبر برای پوشه سریال پیدا نشد.');
      for (const entry of entries) {
        const item = entry.item;
        const season = item.seasonGuess ?? 0;
        const episode = item.episodeGuess ?? 0;
        if (item.mediaType !== 'episode' || item.identification !== 'identified' || season < 1 || episode < 1) {
          skipped++;
          continue;
        }
        const root = library.getFolders().find(folder => folder.id === item.folderId);
        if (!root) { skipped++; continue; }
        const seriesDir = fs.joinPath(root.path, seriesName);
        const seasonDir = fs.joinPath(seriesDir, `Season ${String(season).padStart(2, '0')}`);
        const destination = fs.joinPath(seasonDir, item.fileName);
        if (item.filePath === destination) continue;
        if (await fs.exists(destination)) { skipped++; continue; }
        const created = await fs.createDir(seasonDir);
        if (!created.success) { skipped++; continue; }
        const result = await fs.moveFile(item.filePath, destination);
        if (!result.success) { skipped++; continue; }
        moved++;
        affectedFolders.add(root.id);
        for (const subtitle of item.subtitles) {
          const subtitleDestination = fs.joinPath(seasonDir, subtitle.fileName);
          if (await fs.exists(subtitleDestination)) { skipped++; continue; }
          const subtitleMove = await fs.moveFile(subtitle.filePath, subtitleDestination);
          if (!subtitleMove.success) skipped++;
        }
      }
      for (const folderId of affectedFolders) await library.scanFolder(folderId);
      notifyLibraryUpdated();
      setOrganizeMessage(`${moved} قسمت منتقل شد. ${skipped} مورد به‌دلیل ابهام، نبود مسیر یا تداخل دست‌نخورده باقی ماند.`);
    } catch (error) {
      setOrganizeMessage(error instanceof Error ? error.message : 'سامان‌دهی پوشه‌ها انجام نشد.');
    } finally {
      setOrganizing(false);
    }
  };

  return <div className="mx-auto max-w-[1200px] px-4 py-6 lg:px-8 fade-in">
    <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white"><ArrowRight size={18}/> بازگشت به سریال‌ها</button>
    <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-surface-2/70 p-5 sm:flex-row">
      <div className="w-36 shrink-0 overflow-hidden rounded-xl border border-white/10">
        {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.title} className="aspect-[2/3] h-full w-full object-cover"/> : <div className="flex aspect-[2/3] items-center justify-center text-xs text-text-muted">پوستر موجود نیست</div>}
      </div>
      <div className="flex-1">
        <h1 className="text-2xl font-extrabold text-white">{movie.title}</h1>
        <p className="mt-1 text-sm text-gold-bright/80">{movie.englishTitle}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-secondary">
          {movie.year > 0 && <span className="inline-flex items-center gap-1"><CalendarDays size={15}/>{toPersianDigits(movie.year)}</span>}
          {movie.rating > 0 && <span className="inline-flex items-center gap-1"><Star size={15} className="text-gold-bright"/>{toPersianDigits(movie.rating.toFixed(1))}</span>}
          <span>{toPersianDigits(entries.length)} قسمت شناسایی‌شده</span>
          <span>{toPersianDigits(seasons.filter(([s])=>s>0).length)} فصل مشخص</span>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-text-secondary">{movie.synopsis}</p>
        <button onClick={organizeSeasons} disabled={organizing} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm font-semibold text-gold-bright disabled:opacity-50">
          {organizing ? <Loader2 size={17} className="animate-spin"/> : <FolderTree size={17}/>} سامان‌دهی پوشه‌های فصل‌ها
        </button>
        {organizeMessage && <p className="mt-2 text-xs leading-6 text-text-secondary">{organizeMessage}</p>}
      </div>
    </div>
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">قسمت‌های سریال</h2>
        <label className="flex items-center gap-2 text-sm text-text-secondary">انتخاب فصل
          <select value={selectedSeason} onChange={e => setSelectedSeason(Number(e.target.value))} className="rounded-lg border border-white/15 bg-surface-2 px-3 py-2 text-white">
            {seasons.map(([season]) => <option key={season} value={season}>{season > 0 ? `فصل ${toPersianDigits(season)}` : 'فصل نامشخص'}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 grid gap-3">
        {episodes.map((entry, index) => {
          const episode = entry.item.episodeGuess || index + 1;
          const runtime = entry.metadata?.runtime || entry.movie.runtime;
          const rating = entry.metadata?.rating || entry.movie.rating;
          const title = entry.metadata?.persianTitle || entry.metadata?.title || `قسمت ${episode}`;
          return <button key={entry.item.id} onClick={() => onPlay(entry.item.id)} className="group flex items-center gap-4 rounded-xl border border-white/10 bg-surface-2 p-3 text-right transition hover:border-gold/40 hover:bg-white/5">
            <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-black/30 text-lg font-bold text-gold-bright">{toPersianDigits(episode)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-white">{title}</span>
              <span className="mt-1 flex flex-wrap gap-3 text-xs text-text-muted">
                {runtime > 0 && <span className="inline-flex items-center gap-1"><Clock size={13}/>{formatRuntime(runtime)}</span>}
                {rating > 0 && <span className="inline-flex items-center gap-1"><Star size={13}/>{toPersianDigits(rating.toFixed(1))}</span>}
                <span>{entry.item.fileName}</span>
              </span>
            </span>
            <span className="rounded-full bg-gold/15 p-2 text-gold-bright transition group-hover:bg-gold group-hover:text-black"><Play size={17} fill="currentColor"/></span>
          </button>;
        })}
        {episodes.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-text-muted">برای این فصل قسمتی در کتابخانه پیدا نشد.</p>}
      </div>
    </section>
  </div>;
}
