// ElectronFilesystemService — real filesystem adapter that delegates to the
// Electron main process via the secure desktop bridge.
//
// This replaces MockFilesystemService when running inside the Electron desktop
// runtime. All operations are proxied through IPC to the main process where
// Node.js fs is available. The renderer never touches the filesystem directly.

import type { FilesystemService, DirEntry, FileInfo, MoveResult } from '@/types/filesystem';
import type { DesktopBridge } from '@/types/desktop';

export class ElectronFilesystemService implements FilesystemService {
  readonly isMock = false;
  private bridge: DesktopBridge;

  constructor(bridge: DesktopBridge) {
    this.bridge = bridge;
  }

  async listDir(path: string): Promise<DirEntry[]> {
    return this.bridge.listDir(path);
  }

  async scanDir(
    path: string,
    onProgress?: (scanned: number, currentPath: string) => void,
    signal?: { cancelled: boolean },
  ): Promise<DirEntry[]> {
    return this.bridge.scanDir(path, onProgress ?? (() => {}), signal ?? { cancelled: false });
  }

  async stat(path: string): Promise<FileInfo> {
    return this.bridge.stat(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.bridge.exists(path);
  }

  async createDir(path: string): Promise<{ success: boolean; error?: string }> {
    return this.bridge.createDir(path);
  }

  async moveFile(source: string, dest: string): Promise<MoveResult> {
    return this.bridge.moveFile(source, dest);
  }

  async writeTextFile(path: string, content: string): Promise<{ success: boolean; error?: string }> {
    return this.bridge.writeTextFile(path, content);
  }

  async downloadFile(url: string, destPath: string): Promise<{ success: boolean; error?: string }> {
    return this.bridge.downloadFile(url, destPath);
  }

  async isSymlink(path: string): Promise<boolean> {
    return this.bridge.isSymlink(path);
  }

  normalizePath(path: string): string {
    // The main process normalizes via IPC, but this is called synchronously
    // in some code paths. We do a simple local normalization.
    return path.replace(/\//g, '\\');
  }

  joinPath(...segments: string[]): string {
    return segments.join('\\').replace(/\\+/g, '\\');
  }

  parentPath(path: string): string {
    const normalized = path.replace(/\//g, '\\');
    const idx = normalized.lastIndexOf('\\');
    if (idx <= 0) return normalized;
    return normalized.slice(0, idx);
  }

  baseName(path: string): string {
    const normalized = path.replace(/\//g, '\\');
    const idx = normalized.lastIndexOf('\\');
    return idx >= 0 ? normalized.slice(idx + 1) : normalized;
  }
}
