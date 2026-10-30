// TauriFilesystemService — real filesystem adapter that delegates to
// Rust commands via Tauri 2's invoke API.
//
// This is the Tauri 2 equivalent of ElectronFilesystemService. All operations
// are proxied through Tauri commands to the Rust backend where std::fs is
// available. The renderer never touches the filesystem directly.

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { FilesystemService, DirEntry, FileInfo, MoveResult } from '@/types/filesystem';

export class TauriFilesystemService implements FilesystemService {
  readonly isMock = false;

  async listDir(path: string): Promise<DirEntry[]> {
    return invoke<DirEntry[]>('fs_list_dir', { dirPath: path });
  }

  async scanDir(
    path: string,
    onProgress?: (scanned: number, currentPath: string) => void,
    signal?: { cancelled: boolean },
  ): Promise<DirEntry[]> {
    let unlisten: UnlistenFn | undefined;

    if (onProgress) {
      unlisten = await listen<{ scanned: number; currentPath: string }>(
        'fs:scanProgress',
        (event) => {
          onProgress(event.payload.scanned, event.payload.currentPath);
        },
      );
    }

    try {
      // Poll the JS-side signal and forward cancellation to the Rust scan.
      // The Rust walk checks the flag between entries, so cancellation
      // takes effect promptly without blocking the UI thread.
      let cancelTimer: ReturnType<typeof setInterval> | undefined;
      if (signal) {
        cancelTimer = setInterval(() => {
          if (signal.cancelled) {
            void invoke('fs_cancel_scan');
          }
        }, 100);
      }

      try {
        return await invoke<DirEntry[]>('fs_scan_dir', { dirPath: path });
      } finally {
        if (cancelTimer) clearInterval(cancelTimer);
      }
    } finally {
      unlisten?.();
    }
  }

  async stat(path: string): Promise<FileInfo> {
    return invoke<FileInfo>('fs_stat', { p: path });
  }

  async exists(path: string): Promise<boolean> {
    return invoke<boolean>('fs_exists', { p: path });
  }

  async createDir(path: string): Promise<{ success: boolean; error?: string }> {
    const result = await invoke<{ success: boolean; error: string | null }>('fs_create_dir', {
      p: path,
    });
    return { success: result.success, error: result.error ?? undefined };
  }

  async moveFile(source: string, dest: string): Promise<MoveResult> {
    const result = await invoke<{
      success: boolean;
      error: string | null;
      destPath: string | null;
    }>('fs_move_file', { source, dest });
    return {
      success: result.success,
      error: result.error ?? undefined,
      destPath: result.destPath ?? undefined,
    };
  }

  async writeTextFile(path: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      await invoke('fs_write_text_file', { path, content });
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'نامشخص' };
    }
  }

  async downloadFile(url: string, destPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      await invoke('fs_download_file', { url, destPath });
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'نامشخص' };
    }
  }

  async isSymlink(path: string): Promise<boolean> {
    return invoke<boolean>('fs_is_symlink', { p: path });
  }

  normalizePath(path: string): string {
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
