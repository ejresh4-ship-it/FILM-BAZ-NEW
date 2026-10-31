import { useCallback, useEffect, useState } from 'react';
import { Wrench, RefreshCw, Folder, AlertTriangle, CheckCircle2, HardDrive } from 'lucide-react';
import { getLibraryService } from '@/services/LibraryService';
import { getFilesystemService } from '@/services/filesystemFactory';
import type { LibraryFolder } from '@/types/media-library';
import type { DirEntry } from '@/types/filesystem';

type Finding = { path: string; name: string; root: string; empty: boolean; files: number; bytes: number; symlink: boolean };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function ToolsView() {
  const [roots, setRoots] = useState<LibraryFolder[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      const service = getLibraryService();
      await service.load();
      const folders = service.getFolders();
      setRoots(folders);
      setSelected(folders.map((folder) => folder.id));
    };
    void load();
  }, []);

  const scan = useCallback(async () => {
    setBusy(true); setError(''); setDone(false); setFindings([]);
    try {
      const fs = getFilesystemService();
      const service = getLibraryService();
      await service.load();
      const folders = service.getFolders().filter((folder) => selected.includes(folder.id));
      const found: Finding[] = [];
      for (const root of folders) {
        const entries = await fs.scanDir(root.path);
        const directories = entries.filter((entry: DirEntry) => entry.isDirectory && !entry.isSymlink);
        // Include the selected root itself only if it is truly empty.
        const candidates = [{ path: root.path, name: root.label, root: root.path, isRoot: true }, ...directories.map((entry: DirEntry) => ({ path: entry.path, name: entry.name, root: root.path, isRoot: false }))];
        for (const candidate of candidates) {
          const children = await fs.listDir(candidate.path);
          const isEmpty = children.length === 0;
          const files = children.filter((child) => child.isFile || child.isSymlink).length;
          const bytes = children.reduce((sum, child) => sum + (child.isFile ? child.size : 0), 0);
          if (isEmpty || files > 0 || children.length > 0) {
            found.push({ path: candidate.path, name: candidate.name, root: root.path, empty: isEmpty, files, bytes, symlink: false });
          }
        }
      }
      setFindings(found.sort((a, b) => Number(b.empty) - Number(a.empty) || a.path.localeCompare(b.path)));
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'اسکن پوشه‌ها ناموفق بود.');
    } finally { setBusy(false); }
  }, [selected]);

  const emptyCount = findings.filter((item) => item.empty).length;
  return <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8 fade-in" dir="rtl">
    <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-gold/10 p-3 text-gold-bright"><Wrench size={24}/></div><div><h1 className="text-2xl font-extrabold text-white">ابزارها</h1><p className="mt-1 text-sm text-text-muted">پاک‌سازی و سامان‌دهی آرشیو</p></div></div>
    <section className="rounded-xl border border-white/10 bg-surface-2 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white"><HardDrive size={19}/> مسیرهای آرشیو</h2>
      <p className="mt-2 text-sm text-text-muted">پوشه‌هایی را برای بررسی انتخاب کنید. اسکن فقط خواندنی است و هیچ فایل یا پوشه‌ای را حذف یا جابه‌جا نمی‌کند.</p>
      {roots.length === 0 ? <p className="mt-4 rounded-lg bg-white/5 p-4 text-sm text-text-secondary">هنوز پوشه‌ای به کتابخانه اضافه نشده است.</p> : <div className="mt-4 space-y-2">{roots.map((root) => <label key={root.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 p-3 hover:bg-white/5"><input type="checkbox" checked={selected.includes(root.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, root.id] : current.filter((id) => id !== root.id))}/><span className="min-w-0"><span className="block text-sm font-medium text-white">{root.label}</span><span className="block break-all text-xs text-text-muted">{root.path}</span></span></label>)}</div>}
      <button onClick={() => void scan()} disabled={busy || selected.length === 0} className="btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-50">{busy ? <RefreshCw className="animate-spin" size={17}/> : <Folder size={17}/>} {busy ? 'در حال بررسی…' : 'اسکن و تهیه پیش‌نمایش'}</button>
      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
    {done && <section className="mt-6 rounded-xl border border-white/10 bg-surface-2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-white">گزارش بررسی</h2><p className="mt-1 text-sm text-text-muted">{findings.length} پوشه بررسی شد؛ {emptyCount} پوشه کاملاً خالی پیدا شد.</p></div><span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"><CheckCircle2 className="ml-1 inline" size={16}/> پیش‌نمایش آماده است</span></div>
      <div className="mt-4 space-y-2">{findings.map((item) => <div key={item.path} className="rounded-lg border border-white/5 p-3"><div className="flex items-start gap-2"><Folder size={18} className={item.empty ? 'text-emerald-400' : 'text-text-muted'}/><div className="min-w-0 flex-1"><p className="break-all text-sm font-medium text-white">{item.name}</p><p className="break-all text-xs text-text-muted">{item.path}</p><p className="mt-1 text-xs text-text-secondary">{item.empty ? 'کاملاً خالی' : `${item.files} فایل مستقیم · ${formatBytes(item.bytes)}`}</p></div><span className={item.empty ? 'text-xs text-emerald-300' : 'text-xs text-amber-300'}>{item.empty ? 'قابل بررسی برای حذف' : 'دارای محتوا'}</span></div></div>)}</div>
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs leading-6 text-amber-200"><AlertTriangle size={17} className="mt-1 shrink-0"/> در این نسخه حذف عمداً غیرفعال است. برای جلوگیری از حذف ناخواسته، فقط پوشه‌های خالی شناسایی و گزارش می‌شوند؛ پوشه‌های دارای محتوا صرفاً جهت بررسی نمایش داده می‌شوند.</div>
    </section>}
  </div>;
}
