// Filesystem types — shared between renderer and Electron main process.
// This file has no runtime dependencies so it can be imported from both contexts.

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
  size: number; // bytes, 0 for directories
  lastModified: number; // epoch ms
}

export interface FileInfo {
  path: string;
  size: number;
  lastModified: number;
  isDirectory: boolean;
  isSymlink: boolean;
  exists: boolean;
}

export interface MoveResult {
  success: boolean;
  error?: string;
  destPath?: string;
}

export interface FilesystemService {
  readonly isMock: boolean;

  /** List the immediate contents of a directory. Returns empty array if not found. */
  listDir(path: string): Promise<DirEntry[]>;

  /** Recursively list all files (with relative paths) under a directory.
   *  Reports progress via callback for large folders. Supports cancellation. */
  scanDir(
    path: string,
    onProgress?: (scanned: number, currentPath: string) => void,
    signal?: { cancelled: boolean },
  ): Promise<DirEntry[]>;

  /** Get info about a single path. */
  stat(path: string): Promise<FileInfo>;

  /** Check whether a path exists. */
  exists(path: string): Promise<boolean>;

  /** Create a directory (and parents if needed). */
  createDir(path: string): Promise<{ success: boolean; error?: string }>;

  /** Move (rename) a file from source to destination. Must not overwrite. */
  moveFile(source: string, dest: string): Promise<MoveResult>;

  /** Write text content to a file. Overwrites if the file already exists. */
  writeTextFile(path: string, content: string): Promise<{ success: boolean; error?: string }>;

  /** Download a URL and save it to a local path. */
  downloadFile(url: string, destPath: string): Promise<{ success: boolean; error?: string }>;

  /** Check if path is a symbolic link. */
  isSymlink(path: string): Promise<boolean>;

  /** Normalize a path (join, resolve .., etc.). */
  normalizePath(path: string): string;

  /** Join path segments. */
  joinPath(...segments: string[]): string;

  /** Get the parent directory of a path. */
  parentPath(path: string): string;

  /** Get the file/folder name from a path. */
  baseName(path: string): string;
}
