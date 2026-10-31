import { useCallback, useEffect, useState } from 'react';
import { Wrench, RefreshCw, Folder, AlertTriangle, CheckCircle2, HardDrive } from 'lucide-react';
import { getLibraryService } from '@/services/LibraryService';
import { getFilesystemService, isDesktopRuntime } from '@/services/filesystemFactory';
import type { LibraryFolder } from '@/types/media-library';
import type { DirEntry } from '@/types/filesystem';

type Finding = { path: string; name: string; root: string; empty: boolean; files: number; directories: number; bytes: number; symlink: boolean };

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
  const [checked, setChecked] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const desktop = isDesktopRuntime() && !!window.filmBazDesktop;

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
          const prefix = candidate.path.endsWith('\\') || candidate.path.endsWith('/') ? candidate.path : candidate.path + (candidate.path.includes('\\') ? '\\' : '/');
          const descendants = entries.filter((entry: DirEntry) => entry.path.startsWith(prefix));
          const files = descendants.filter((entry: DirEntry) => entry.isFile).length;
          const directories = descendants.filter((entry: DirEntry) => entry.isDirectory && !entry.isSymlink).length;
          const bytes = descendants.reduce((sum, entry) => sum + (entry.isFile ? entry.size : 0), 0);
          if (isEmpty || files > 0 || directories > 0 || children.length > 0) {
            found.push({ path: candidate.path, name: candidate.name, root: root.path, empty: isEmpty, files, directories, bytes, symlink: false });
          }
        }
      }
      setFindings(found.sort((a, b) => Number(b.empty) - Number(a.empty) || a.path.localeCompare(b.path)));
      setChecked([]);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'اسکن پوشه‌ها ناموفق بود.');
    } finally { setBusy(false); }
  }, [selected]);

  const removable = findings.filter((item) => item.empty && item.path !== item.root);
  const emptyCount = removable.length;
  const removeSelected = async () => {
    if (!window.filmBazDesktop || checked.length === 0) return;
    const selectedItems = removable.filter((item) => checked.includes(item.path));
    if (!window.confirm('تأیید نهایی: پوشه‌های کاملاً خالی انتخاب‌شده حذف شوند؟')) return;
    setBusy(true); setNotice(''); setError('');
    let succeeded = 0; let failed = 0;
    try {
      for (const item of selectedItems) {
        const result = await window.filmBazDesktop.removeEmptyDirectory(item.path, item.root);
        if (result.success) succeeded++; else failed++;
      }
      setNotice(succeeded + ' پوشه حذف شد؛ ' + failed + ' مورد ناموفق بود.');
      setChecked([]);
      await scan();
    } finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8 fade-in" dir="rtl">
    <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-gold/10 p-3 text-gold-bright"><Wrench size={24}/></div><div><h1 className="text-2xl font-extrabold text-white">ابزارها</h1><p className="mt-1 text-sm text-text-muted">پاک‌سازی و سامان‌دهی آرشیو</p></div></div>
    <section className="rounded-xl border border-white/10 bg-surface-2 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white"><HardDrive size={19}/> مسیرهای آرشیو</h2>
      <p className="mt-2 text-sm text-text-muted">پوشه‌هایی را برای بررسی انتخاب کنید. فقط زیرپوشه‌های کاملاً خالی، پس از تأیید نهایی، قابل حذف هستند.</p>
      {roots.length === 0 ? <p className="mt-4 rounded-lg bg-white/5 p-4 text-sm text-text-secondary">هنوز پوشه‌ای به کتابخانه اضافه نشده است.</p> : <div className="mt-4 space-y-2">{roots.map((root) => <label key={root.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 p-3 hover:bg-white/5"><input type="checkbox" checked={selected.includes(root.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, root.id] : current.filter((id) => id !== root.id))}/><span className="min-w-0"><span className="block text-sm font-medium text-white">{root.label}</span><span className="block break-all text-xs text-text-muted">{root.path}</span></span></label>)}</div>}
      <button onClick={() => void scan()} disabled={busy || selected.length === 0} className="btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-50">{busy ? <RefreshCw className="animate-spin" size={17}/> : <Folder size={17}/>} {busy ? 'در حال بررسی…' : 'اسکن و تهیه پیش‌نمایش'}</button>
      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
    {done && <section className="mt-6 rounded-xl border border-white/10 bg-surface-2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-white">گزارش بررسی</h2><p className="mt-1 text-sm text-text-muted">{findings.length.toLocaleString('fa-IR')} پوشه بررسی شد؛ {emptyCount.toLocaleString('fa-IR')} زیرپوشه خالی قابل حذف پیدا شد. تعداد و حجم فایل‌ها به‌صورت بازگشتی و شامل محتویات زیرپوشه‌ها محاسبه شده است.</p></div><span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"><CheckCircle2 className="ml-1 inline" size={16}/> پیش‌نمایش آماده است</span></div>
      <div className="mt-4 space-y-2">{findings.map((item) => <div key={item.path} className="rounded-lg border border-white/5 p-3"><div className="flex items-start gap-2">{item.empty && item.path !== item.root && <input aria-label="انتخاب پوشه خالی" type="checkbox" checked={checked.includes(item.path)} onChange={(event) => setChecked((current) => event.target.checked ? [...current, item.path] : current.filter((value) => value !== item.path))} disabled={!desktop || busy}/>}<Folder size={18} className={item.empty ? 'text-emerald-400' : 'text-text-muted'}/><div className="min-w-0 flex-1"><p className="break-all text-sm font-medium text-white">{item.name}</p><p className="break-all text-xs text-text-muted">{item.path}</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-md bg-white/5 px-2.5 py-2"><p className="text-[11px] text-text-muted">تعداد کل فایل‌ها</p><p className="mt-0.5 text-sm font-semibold text-white">{item.files.toLocaleString('fa-IR')}</p></div>
              <div className="rounded-md bg-white/5 px-2.5 py-2"><p className="text-[11px] text-text-muted">تعداد زیرپوشه‌ها</p><p className="mt-0.5 text-sm font-semibold text-white">{item.directories.toLocaleString('fa-IR')}</p></div>
              <div className="rounded-md bg-white/5 px-2.5 py-2"><p className="text-[11px] text-text-muted">حجم کل محتوا</p><p className="mt-0.5 text-sm font-semibold text-white">{formatBytes(item.bytes)}</p></div>
            </div></div><span className={item.empty ? 'text-xs text-emerald-300' : 'text-xs text-amber-300'}>{item.empty ? 'قابل بررسی برای حذف' : 'دارای محتوا'}</span></div></div>)}</div>
      {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
<div className="mt-4 flex flex-wrap items-center gap-3">
<button onClick={() => setChecked(removable.map((item) => item.path))} disabled={!desktop || removable.length === 0 || busy} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-text-secondary disabled:opacity-40">انتخاب همه پوشه‌های خالی</button>
<button onClick={() => setChecked([])} disabled={checked.length === 0 || busy} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-text-secondary disabled:opacity-40">لغو انتخاب</button>
<button onClick={() => void removeSelected()} disabled={!desktop || checked.length === 0 || busy} className="rounded-lg bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-40">حذف پوشه‌های خالی انتخاب‌شده ({checked.length})</button>
</div>
{!desktop && <p className="mt-3 text-xs text-amber-300">حذف امن فقط در نسخه دسکتاپ Electron فعال است.</p>}
<div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs leading-6 text-amber-200"><AlertTriangle size={17} className="mt-1 shrink-0"/> پوشه اصلی آرشیو قابل حذف نیست. پیش از حذف، برنامه دوباره خالی‌بودن پوشه را بررسی می‌کند؛ وجود هر فایل مخفی یا مورد دیگر باعث لغو عملیات می‌شود.</div>
    </section>}
  </div>;
}
