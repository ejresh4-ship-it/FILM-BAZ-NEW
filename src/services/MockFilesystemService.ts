// MockFilesystemService — an in-memory virtual filesystem that implements
// the FilesystemService interface for the browser development environment.
//
// It persists the virtual FS tree to IndexedDB so library data survives
// page reloads during development. When the Electron desktop runtime is
// added, this class is swapped for a real implementation backed by Node fs.
//
// This is clearly labelled as a mock; it does NOT touch the real filesystem.

import type { DirEntry, FileInfo, MoveResult, FilesystemService } from '@/types/filesystem';
import { idbGet, idbSet } from './idbStore';

const FS_KEY = 'film-baz:mock-fs';

interface FsNode {
  name: string;
  type: 'dir' | 'file';
  size: number;
  lastModified: number;
  children?: Record<string, FsNode>;
  symlink?: boolean;
  readonly?: boolean;
}

function now(): number {
  return Date.now();
}

function node(entries: Partial<FsNode> & Pick<FsNode, 'name' | 'type'>): FsNode {
  return { size: 0, lastModified: now(), ...entries };
}

// Seed the mock filesystem with sample folders that exercise the scan/organize logic.
function seedFS(): Record<string, FsNode> {
  const t = now();
  const movie = (name: string, ext: string, mb: number, mtime = t): FsNode =>
    node({ name, type: 'file', size: mb * 1024 * 1024, lastModified: mtime });

  // Sample library root: a mix of organized folders, loose files, and a series.
  // Drives are stored hierarchically: root['C:'].children['Films'].children...
  return {
    'C:': node({
      name: 'C:',
      type: 'dir',
      lastModified: t,
      children: {
        Films: node({
          name: 'Films',
          type: 'dir',
          lastModified: t,
          children: {
        // Already organized
        'The Matrix (1999)': node({
          name: 'The Matrix (1999)',
          type: 'dir',
          children: {
            'The Matrix (1999).mkv': movie('The Matrix (1999).mkv', 'mkv', 4200),
            'The Matrix (1999).fa.srt': movie('The Matrix (1999).fa.srt', 'srt', 0.05),
          },
        }),
        'Inception (2010)': node({
          name: 'Inception (2010)',
          type: 'dir',
          children: {
            'Inception (2010).mp4': movie('Inception (2010).mp4', 'mp4', 5100),
          },
        }),
        // Loose files needing organization
        'The.Dark.Knight.2008.1080p.BluRay.mkv': movie('The.Dark.Knight.2008.1080p.BluRay.mkv', 'mkv', 6800),
        'Interstellar.2014.WEB-DL.mkv': movie('Interstellar.2014.WEB-DL.mkv', 'mkv', 8900),
        'Interstellar.2014.fa.srt': movie('Interstellar.2014.fa.srt', 'srt', 0.06),
        // Ambiguous filename
        'movie_2020.mkv': movie('movie_2020.mkv', 'mkv', 2200),
        // Series
        'Breaking Bad': node({
          name: 'Breaking Bad',
          type: 'dir',
          children: {
            'Season 01': node({
              name: 'Season 01',
              type: 'dir',
              children: {
                'Breaking.Bad.S01E01.mkv': movie('Breaking.Bad.S01E01.mkv', 'mkv', 1800),
                'Breaking.Bad.S01E02.mkv': movie('Breaking.Bad.S01E02.mkv', 'mkv', 1750),
                'Breaking.Bad.S01E02.fa.srt': movie('Breaking.Bad.S01E02.fa.srt', 'srt', 0.04),
              },
            }),
          },
        }),
        // Read-only/inaccessible folder
        'Protected': node({
          name: 'Protected',
          type: 'dir',
          readonly: true,
          children: {
            'Backup.Movie.2015.mkv': movie('Backup.Movie.2015.mkv', 'mkv', 3000),
          },
        }),
        // Duplicate-size files (potential duplicates)
        'Action.Movie.2016.1080p.mkv': movie('Action.Movie.2016.1080p.mkv', 'mkv', 5000, t - 86400000),
        'Other.Action.2016.WEB-DL.mkv': movie('Other.Action.2016.WEB-DL.mkv', 'mkv', 5000, t - 172800000),
          },
        }),
      },
    }),
  };
}

export class MockFilesystemService implements FilesystemService {
  readonly isMock = true;
  private root: Record<string, FsNode>;
  private loaded = false;

  constructor() {
    this.root = {};
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const stored = await idbGet<Record<string, FsNode>>(FS_KEY);
    this.root = stored ?? seedFS();
    if (!stored) await idbSet(FS_KEY, this.root);
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await idbSet(FS_KEY, this.root);
  }

  // --- path helpers (Windows-style but works with the mock) ---

  normalizePath(path: string): string {
    return path.replace(/\/+/g, '\\').replace(/\\+$/, '') || '\\';
  }

  joinPath(...segments: string[]): string {
    return segments.join('\\').replace(/\\+/g, '\\').replace(/\\+$/, '');
  }

  parentPath(path: string): string {
    const norm = this.normalizePath(path);
    const idx = norm.lastIndexOf('\\');
    return idx <= 0 ? '\\' : norm.slice(0, idx);
  }

  baseName(path: string): string {
    const norm = this.normalizePath(path);
    const idx = norm.lastIndexOf('\\');
    return idx >= 0 ? norm.slice(idx + 1) : norm;
  }

  // --- node resolution ---

  private resolve(path: string): FsNode | null {
    const norm = this.normalizePath(path);
    if (norm === '\\' || norm === '') return { name: '\\', type: 'dir', size: 0, lastModified: 0, children: this.root };
    const parts = norm.split('\\').filter(Boolean);
    let current: Record<string, FsNode> | undefined = this.root;
    for (const part of parts) {
      if (!current || !current[part]) return null;
      const node: FsNode = current[part];
      if (part === parts[parts.length - 1]) return node;
      if (node.type !== 'dir' || !node.children) return null;
      current = node.children;
    }
    return null;
  }

  private resolveParent(path: string): { parent: Record<string, FsNode> | null; name: string } {
    const norm = this.normalizePath(path);
    const name = this.baseName(norm);
    const parentPath = this.parentPath(norm);
    const parts = parentPath.split('\\').filter(Boolean);
    let current: Record<string, FsNode> | undefined = this.root;
    for (const part of parts) {
      if (!current || !current[part]) return { parent: null, name };
      const node: FsNode = current[part];
      if (node.type !== 'dir' || !node.children) return { parent: null, name };
      current = node.children;
    }
    return { parent: current ?? null, name };
  }

  async listDir(path: string): Promise<DirEntry[]> {
    await this.ensureLoaded();
    const node = this.resolve(path);
    if (!node || node.type !== 'dir' || !node.children) return [];
    return Object.values(node.children).map((n) => this.toDirEntry(n, this.joinPath(path, n.name)));
  }

  async scanDir(
    path: string,
    onProgress?: (scanned: number, currentPath: string) => void,
    signal?: { cancelled: boolean },
  ): Promise<DirEntry[]> {
    await this.ensureLoaded();
    const results: DirEntry[] = [];
    let count = 0;
    const walk = (dirPath: string, node: FsNode) => {
      if (signal?.cancelled) return;
      if (!node.children) return;
      for (const child of Object.values(node.children)) {
        if (signal?.cancelled) return;
        const childPath = this.joinPath(dirPath, child.name);
        count++;
        if (onProgress && count % 5 === 0) onProgress(count, childPath);
        results.push(this.toDirEntry(child, childPath));
        if (child.type === 'dir' && !child.symlink) {
          walk(childPath, child);
        }
      }
    };
    const start = this.resolve(path);
    if (start && start.type === 'dir') {
      walk(path, start);
    }
    return results;
  }

  async stat(path: string): Promise<FileInfo> {
    await this.ensureLoaded();
    const node = this.resolve(path);
    if (!node) {
      return { path, size: 0, lastModified: 0, isDirectory: false, isSymlink: false, exists: false };
    }
    return {
      path,
      size: node.size,
      lastModified: node.lastModified,
      isDirectory: node.type === 'dir',
      isSymlink: !!node.symlink,
      exists: true,
    };
  }

  async exists(path: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.resolve(path) !== null;
  }

  async createDir(path: string): Promise<{ success: boolean; error?: string }> {
    await this.ensureLoaded();
    const norm = this.normalizePath(path);
    const parts = norm.split('\\').filter(Boolean);
    if (parts.length === 0) return { success: true };
    let current: Record<string, FsNode> = this.root;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = node({ name: part, type: 'dir', children: {} });
      } else if (current[part].type !== 'dir') {
        return { success: false, error: 'یک فایل با این نام از قبل وجود دارد' };
      }
      current = current[part].children!;
    }
    await this.persist();
    return { success: true };
  }

  async moveFile(source: string, dest: string): Promise<MoveResult> {
    await this.ensureLoaded();
    const srcNode = this.resolve(source);
    if (!srcNode) return { success: false, error: 'فایل مبدأ یافت نشد' };

    // Never overwrite
    if (await this.exists(dest)) {
      return { success: false, error: 'فایل مقصد از قبل وجود دارد — بازنویسی انجام نمی‌شود' };
    }

    const { parent: destParent, name: destName } = this.resolveParent(dest);
    if (!destParent) return { success: false, error: 'پوشه مقصد یافت نشد' };

    // Remove from source
    const { parent: srcParent, name: srcName } = this.resolveParent(source);
    if (!srcParent || !srcParent[srcName]) return { success: false, error: 'امکان حذف از مبدأ وجود ندارد' };
    if (srcParent[srcName]?.readonly) return { success: false, error: 'فایل مبدأ فقط‌خواندنی است' };

    const moved = srcParent[srcName];
    delete srcParent[srcName];
    destParent[destName] = moved;
    await this.persist();

    // Verify
    const verify = this.resolve(dest);
    if (!verify) {
      return { success: false, error: 'بررسی پس از انتقال ناموفق بود' };
    }
    return { success: true, destPath: dest };
  }

  async writeTextFile(path: string, content: string): Promise<{ success: boolean; error?: string }> {
    await this.ensureLoaded();
    const norm = this.normalizePath(path);
    const fileName = this.baseName(norm);
    const parentPath = this.parentPath(norm);
    // Create parent directories recursively
    const parts = parentPath.split('\\').filter(Boolean);
    let current: Record<string, FsNode> = this.root;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = node({ name: part, type: 'dir', children: {} });
      } else if (current[part].type !== 'dir') {
        return { success: false, error: 'پوشه والد یافت نشد' };
      }
      current = current[part].children!;
    }
    if (!current[fileName] || current[fileName].type === 'file') {
      current[fileName] = node({ name: fileName, type: 'file', size: content.length, lastModified: now() });
    }
    await this.persist();
    return { success: true };
  }

  async downloadFile(url: string, destPath: string): Promise<{ success: boolean; error?: string }> {
    await this.ensureLoaded();
    const norm = this.normalizePath(destPath);
    const fileName = this.baseName(norm);
    const parentPath = this.parentPath(norm);
    // Create parent directories recursively
    const parts = parentPath.split('\\').filter(Boolean);
    let current: Record<string, FsNode> = this.root;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = node({ name: part, type: 'dir', children: {} });
      } else if (current[part].type !== 'dir') {
        return { success: false, error: 'پوشه مقصد یافت نشد' };
      }
      current = current[part].children!;
    }
    try {
      const resp = await fetch(url);
      if (!resp.ok) return { success: false, error: `دانلود ناموفق: ${resp.status}` };
      const blob = await resp.blob();
      current[fileName] = node({ name: fileName, type: 'file', size: blob.size, lastModified: now() });
      await this.persist();
      return { success: true };
    } catch {
      // Fallback: create placeholder so mock flow works even without network
      current[fileName] = node({ name: fileName, type: 'file', size: 50000, lastModified: now() });
      await this.persist();
      return { success: true };
    }
  }

  async isSymlink(path: string): Promise<boolean> {
    await this.ensureLoaded();
    const node = this.resolve(path);
    return !!node?.symlink;
  }

  private toDirEntry(node: FsNode, path: string): DirEntry {
    return {
      name: node.name,
      path,
      isDirectory: node.type === 'dir',
      isFile: node.type === 'file',
      isSymlink: !!node.symlink,
      size: node.size,
      lastModified: node.lastModified,
    };
  }
}
