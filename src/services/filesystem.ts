// Filesystem service interface — the contract for real filesystem access.
//
// In the browser development environment, a MockFilesystemService implements
// this interface using an in-memory virtual filesystem (persisted to IndexedDB).
// When the Electron desktop runtime is added, an ElectronFilesystemService
// replaces the mock with Node.js fs operations via IPC — no UI changes needed.

export type {
  DirEntry,
  FileInfo,
  MoveResult,
  FilesystemService,
} from '@/types/filesystem';
