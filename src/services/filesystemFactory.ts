// Factory for the active FilesystemService.
// Returns the mock adapter in the browser; when Tauri or Electron is
// integrated, returns a real adapter that proxies to the native backend.
import { invoke } from '@tauri-apps/api/core';
import type { FilesystemService } from './filesystem';
import { MockFilesystemService } from './MockFilesystemService';
import { ElectronFilesystemService } from './ElectronFilesystemService';
import { TauriFilesystemService } from './TauriFilesystemService';

let instance: FilesystemService | null = null;

export function getFilesystemService(): FilesystemService {
  if (!instance) {
    if (isTauriRuntime()) {
      instance = new TauriFilesystemService();
    } else if (isElectronRuntime()) {
      const bridge = window.filmBazDesktop;
      if (bridge) {
        instance = new ElectronFilesystemService(bridge);
      } else {
        instance = new MockFilesystemService();
      }
    } else {
      instance = new MockFilesystemService();
    }
  }
  return instance;
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function isElectronRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(window as unknown as { filmBazDesktop?: unknown }).filmBazDesktop
  );
}

// Preserved for backward compatibility — returns true for either desktop runtime.
export async function pickLibraryFolders(): Promise<string[]> {
  if (isTauriRuntime()) {
    return invoke<string[]>('fs_pick_folders');
  }
  if (isElectronRuntime()) {
    return window.filmBazDesktop?.browseForFolders() ?? [];
  }
  return [];
}

export function isDesktopRuntime(): boolean {
  return isTauriRuntime() || isElectronRuntime();
}
