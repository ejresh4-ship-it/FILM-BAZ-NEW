// LibraryService — orchestrates scanning, duplicate detection, organization
// proposals, execution, undo, and persistence. Uses the FilesystemService for
// all file operations (mock in browser, real in Electron). UI never touches
// the filesystem directly.

import type {
  LibraryFolder,
  MediaItem,
  ScanProgress,
  ScanSummary,
  OrgProposal,
  OrgOperation,
  OrgExecutionResult,
  OperationLogEntry,
  LibraryPreferences,
  SubtitleFile,
} from '@/types/media-library';
import type { DirEntry } from '@/services/filesystem';
import { getFilesystemService } from '@/services/filesystemFactory';
import { idbGet, idbSet } from '@/services/idbStore';
import { getMetadataService } from '@/services/metadata/MetadataService';
import {
  isVideoFile,
  isSubtitleFile,
  parseFileName,
  buildFolderName,
  parseSubtitleLanguage,
  subtitleMatchesVideo,
  uid,
} from '@/lib/fileParsing';

const FOLDERS_KEY = 'film-baz:library-folders';
const ITEMS_KEY = 'film-baz:media-items';
const LOG_KEY = 'film-baz:operation-log';
const PREFS_KEY = 'film-baz:library-prefs';

export const DEFAULT_PREFERENCES: LibraryPreferences = {
  videoExtensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'm4v', 'webm', 'mpeg', 'mpg', 'ts'],
  subtitleExtensions: ['srt', 'ass', 'ssa', 'vtt', 'sub'],
  skipSymlinks: true,
  maxFilesPerScan: 20000,
};

class LibraryService {
  private folders: LibraryFolder[] = [];
  private items: MediaItem[] = [];
  private log: OperationLogEntry[] = [];
  private prefs: LibraryPreferences = DEFAULT_PREFERENCES;
  private loaded = false;
  private scanCancellers = new Map<string, { cancelled: boolean }>();

  async load(): Promise<void> {
    if (this.loaded) return;
    const [folders, items, log, prefs] = await Promise.all([
      idbGet<LibraryFolder[]>(FOLDERS_KEY),
      idbGet<MediaItem[]>(ITEMS_KEY),
      idbGet<OperationLogEntry[]>(LOG_KEY),
      idbGet<LibraryPreferences>(PREFS_KEY),
    ]);
    this.folders = folders ?? [];
    this.items = items ?? [];
    this.log = log ?? [];
    this.prefs = prefs ?? DEFAULT_PREFERENCES;
    this.loaded = true;
  }

  private async persistFolders(): Promise<void> {
    await idbSet(FOLDERS_KEY, this.folders);
  }
  private async persistItems(): Promise<void> {
    await idbSet(ITEMS_KEY, this.items);
  }
  private async persistLog(): Promise<void> {
    await idbSet(LOG_KEY, this.log);
  }
  private async persistPrefs(): Promise<void> {
    await idbSet(PREFS_KEY, this.prefs);
  }

  // --- Folders ---

  getFolders(): LibraryFolder[] {
    return [...this.folders];
  }

  async addFolder(path: string, label?: string): Promise<LibraryFolder> {
    await this.load();
    const existing = this.folders.find((f) => f.path === path);
    if (existing) return existing;
    const fs = getFilesystemService();
    const exists = await fs.exists(path);
    if (!exists) {
      throw new Error('مسیر پوشه یافت نشد');
    }
    const info = await fs.stat(path);
    if (!info.isDirectory) {
      throw new Error('مسیر انتخاب‌شده یک پوشه نیست');
    }
    const folder: LibraryFolder = {
      id: uid(),
      path,
      label: label || fs.baseName(path) || path,
      addedAt: Date.now(),
    };
    this.folders.push(folder);
    await this.persistFolders();
    return folder;
  }

  async removeFolder(folderId: string): Promise<void> {
    await this.load();
    this.folders = this.folders.filter((f) => f.id !== folderId);
    this.items = this.items.filter((i) => i.folderId !== folderId);
    await this.persistFolders();
    await this.persistItems();
  }

  // --- Preferences ---

  getPreferences(): LibraryPreferences {
    return { ...this.prefs };
  }

  async setPreferences(prefs: Partial<LibraryPreferences>): Promise<void> {
    await this.load();
    this.prefs = { ...this.prefs, ...prefs };
    await this.persistPrefs();
  }

  // --- Items ---

  getItems(): MediaItem[] {
    return [...this.items];
  }

  getItemsForFolder(folderId: string): MediaItem[] {
    return this.items.filter((i) => i.folderId === folderId);
  }

  async renameItem(
    itemId: string,
    options: { mode: 'file' | 'folder' | 'both'; fileName?: string; folderName?: string },
  ): Promise<MediaItem> {
    await this.load();
    const item = this.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new Error('فایل کتابخانه یافت نشد');

    const fs = getFilesystemService();
    const sourceItemPath = item.filePath;
    const sourceFolderPath = item.parentFolder;
    const libraryFolder = this.folders.find((folder) => folder.id === item.folderId);
    const renameFolder = options.mode === 'folder' || options.mode === 'both';
    const renameFile = options.mode === 'file' || options.mode === 'both';

    if (renameFolder && libraryFolder?.path === sourceFolderPath) {
      throw new Error('پوشه اصلی کتابخانه قابل تغییر نام نیست');
    }

    const fileName = renameFile ? validateRenameName(options.fileName, item.extension, 'نام فایل') : item.fileName;
    const folderName = renameFolder ? validateRenameName(options.folderName, '', 'نام پوشه') : fs.baseName(sourceFolderPath);
    const destinationFolder = renameFolder
      ? fs.joinPath(fs.parentPath(sourceFolderPath), folderName)
      : sourceFolderPath;
    const destinationFile = fs.joinPath(destinationFolder, fileName);

    if (renameFolder && destinationFolder !== sourceFolderPath && await fs.exists(destinationFolder)) {
      throw new Error('پوشه مقصد از قبل وجود دارد');
    }
    if (renameFile && destinationFile !== sourceItemPath && await fs.exists(destinationFile)) {
      throw new Error('فایل مقصد از قبل وجود دارد');
    }
    if (!await fs.exists(sourceItemPath)) throw new Error('فایل اصلی یافت نشد');
    if (renameFolder && !await fs.exists(sourceFolderPath)) throw new Error('پوشه اصلی یافت نشد');

    if (renameFolder && destinationFolder !== sourceFolderPath) {
      const result = await fs.moveFile(sourceFolderPath, destinationFolder);
      if (!result.success) throw new Error(result.error || 'تغییر نام پوشه ناموفق بود');
    }
    if (renameFile && destinationFile !== sourceItemPath) {
      const currentFilePath = renameFolder
        ? fs.joinPath(destinationFolder, item.fileName)
        : sourceItemPath;
      const result = await fs.moveFile(currentFilePath, destinationFile);
      if (!result.success) {
        if (renameFolder) await fs.moveFile(destinationFolder, sourceFolderPath);
        throw new Error(result.error || 'تغییر نام فایل ناموفق بود');
      }
    }

    // Keep sidecar subtitles paired with the video when its filename changes.
    const renamedSubtitlePaths = new Map<string, string>();
    if (renameFile && item.subtitles.length > 0) {
      const oldVideoBase = item.fileName.slice(0, item.fileName.lastIndexOf('.'));
      const newVideoBase = fileName.slice(0, fileName.lastIndexOf('.'));
      for (const subtitle of item.subtitles) {
        const oldSubtitleBase = subtitle.fileName.slice(0, subtitle.fileName.lastIndexOf('.'));
        const suffix = oldSubtitleBase.toLowerCase().startsWith(oldVideoBase.toLowerCase())
          ? oldSubtitleBase.slice(oldVideoBase.length)
          : '';
        const subtitleName = `${newVideoBase}${suffix}.${subtitle.extension}`;
        const movedSource = renameFolder ? subtitle.filePath.replace(sourceFolderPath, destinationFolder) : subtitle.filePath;
        const subtitleDestination = fs.joinPath(destinationFolder, subtitleName);
        if (subtitleDestination === movedSource || await fs.exists(subtitleDestination)) continue;
        const subtitleMove = await fs.moveFile(movedSource, subtitleDestination);
        if (subtitleMove.success) renamedSubtitlePaths.set(subtitle.filePath, subtitleDestination);
      }
    }

    const oldFolderPrefix = sourceFolderPath.endsWith('\\') ? sourceFolderPath : `${sourceFolderPath}\\`;
    for (const current of this.items) {
      if (renameFolder && (current.parentFolder === sourceFolderPath || current.filePath.startsWith(oldFolderPrefix))) {
        current.parentFolder = destinationFolder;
        current.filePath = current.filePath === sourceItemPath
          ? destinationFile
          : current.filePath.replace(sourceFolderPath, destinationFolder);
        current.subtitles = current.subtitles.map((subtitle) => {
          const movedPath = renamedSubtitlePaths.get(subtitle.filePath);
          const nextPath = movedPath || subtitle.filePath.replace(sourceFolderPath, destinationFolder);
          return { ...subtitle, filePath: nextPath, fileName: fs.baseName(nextPath) };
        });
        if (current.id === itemId && renameFile) current.fileName = fileName;
      } else if (current.id === itemId && renameFile) {
        current.filePath = destinationFile;
        current.fileName = fileName;
        current.subtitles = current.subtitles.map((subtitle) => {
          const nextPath = renamedSubtitlePaths.get(subtitle.filePath) || subtitle.filePath;
          return { ...subtitle, filePath: nextPath, fileName: fs.baseName(nextPath) };
        });
      }
    }

    await this.persistItems();
    return { ...item, subtitles: item.subtitles.map((subtitle) => ({ ...subtitle })) };
  }

  async renameItemsBatch(
    plans: Array<{ itemId: string; mode: 'file' | 'folder' | 'both'; fileName?: string; folderName?: string }>,
  ): Promise<{ succeeded: Array<{ itemId: string }>; failed: Array<{ itemId: string; error: string }> }> {
    await this.load();
    const succeeded: Array<{ itemId: string }> = [];
    const failed: Array<{ itemId: string; error: string }> = [];
    for (const plan of plans) {
      try {
        await this.renameItem(plan.itemId, { mode: plan.mode, fileName: plan.fileName, folderName: plan.folderName });
        succeeded.push({ itemId: plan.itemId });
      } catch (e) {
        failed.push({ itemId: plan.itemId, error: e instanceof Error ? e.message : 'تغییر نام ناموفق بود' });
      }
    }
    return { succeeded, failed };
  }

  // --- Scanning ---

  async scanFolder(
    folderId: string,
    onProgress?: (progress: ScanProgress) => void,
  ): Promise<ScanSummary> {
    await this.load();
    const folder = this.folders.find((f) => f.id === folderId);
    if (!folder) throw new Error('پوشه یافت نشد');

    // Set up cancellation handle
    const cancelToken = { cancelled: false };
    this.scanCancellers.set(folderId, cancelToken);

    const fs = getFilesystemService();
    const startedAt = Date.now();
    const progress: ScanProgress = {
      folderId,
      scanned: 0,
      status: 'scanning',
      foundVideos: 0,
      foundSubtitles: 0,
      duplicates: 0,
      currentPath: folder.path,
    };

    let allEntries: DirEntry[] = [];
    try {
      allEntries = await fs.scanDir(
        folder.path,
        (scanned, currentPath) => {
          if (cancelToken.cancelled) return;
          progress.scanned = scanned;
          progress.currentPath = currentPath;
          onProgress?.({ ...progress });
        },
        cancelToken,
      );
    } catch (e) {
      progress.status = 'failed';
      progress.error = e instanceof Error ? e.message : 'خطای ناشناخته';
      onProgress?.({ ...progress });
      this.scanCancellers.delete(folderId);
      return {
        folderId,
        startedAt,
        status: 'failed',
        videoCount: 0,
        subtitleCount: 0,
        duplicateCount: 0,
        needsReviewCount: 0,
        error: progress.error,
      };
    }

    if (cancelToken.cancelled) {
      progress.status = 'cancelled';
      onProgress?.({ ...progress });
      this.scanCancellers.delete(folderId);
      return {
        folderId,
        startedAt,
        status: 'cancelled',
        videoCount: 0,
        subtitleCount: 0,
        duplicateCount: 0,
        needsReviewCount: 0,
      };
    }

    // Filter by extension preferences (skip symlinks if configured)
    const videoEntries = allEntries.filter(
      (e) =>
        e.isFile &&
        isVideoFile(e.name, this.prefs.videoExtensions) &&
        (!this.prefs.skipSymlinks || !e.isSymlink),
    );
    const subtitleEntries = allEntries.filter(
      (e) => e.isFile && isSubtitleFile(e.name, this.prefs.subtitleExtensions),
    );

    // Build MediaItems
    const newItems: MediaItem[] = [];
    const subtitlesByParent: Record<string, DirEntry[]> = {};
    for (const sub of subtitleEntries) {
      const parent = fs.parentPath(sub.path);
      if (!subtitlesByParent[parent]) subtitlesByParent[parent] = [];
      subtitlesByParent[parent].push(sub);
    }

    for (const vEntry of videoEntries) {
      const parsed = parseFileName(vEntry.name);
      const parentDir = fs.parentPath(vEntry.path);

      // Find matching subtitles in the same folder
      const folderSubs = subtitlesByParent[parentDir] || [];
      const matchedSubs: SubtitleFile[] = folderSubs
        .filter((s) => subtitleMatchesVideo(s.name, vEntry.name))
        .map((s) => ({
          filePath: s.path,
          fileName: s.name,
          extension: s.name.split('.').pop() || '',
          language: parseSubtitleLanguage(s.name),
        }));

      newItems.push({
        id: uid(),
        folderId,
        filePath: vEntry.path,
        fileName: vEntry.name,
        extension: vEntry.name.split('.').pop() || '',
        parentFolder: parentDir,
        mediaType: parsed.mediaType,
        titleGuess: parsed.titleGuess,
        yearGuess: parsed.yearGuess,
        seasonGuess: parsed.seasonGuess,
        episodeGuess: parsed.episodeGuess,
        fileSize: vEntry.size,
        lastModified: vEntry.lastModified,
        subtitles: matchedSubs,
        identification: parsed.confident ? 'identified' : 'needs-review',
        scanStatus: 'completed',
      });
    }

    // Duplicate detection (filename + size heuristics — no auto-delete, no content hash)
    this.markDuplicates(newItems);

    // Replace items for this folder
    this.items = this.items.filter((i) => i.folderId !== folderId);
    this.items.push(...newItems);
    folder.lastScannedAt = Date.now();
    await this.persistFolders();
    await this.persistItems();

    progress.status = 'completed';
    progress.foundVideos = newItems.length;
    progress.foundSubtitles = subtitleEntries.length;
    progress.duplicates = newItems.filter((i) => i.duplicateOfId).length;
    onProgress?.({ ...progress });

    this.scanCancellers.delete(folderId);

    return {
      folderId,
      startedAt,
      finishedAt: Date.now(),
      status: 'completed',
      videoCount: newItems.length,
      subtitleCount: subtitleEntries.length,
      duplicateCount: newItems.filter((i) => i.duplicateOfId).length,
      needsReviewCount: newItems.filter((i) => i.identification === 'needs-review').length,
    };
  }

  cancelScan(folderId: string): void {
    const token = this.scanCancellers.get(folderId);
    if (token) token.cancelled = true;
  }

  isScanning(folderId: string): boolean {
    return this.scanCancellers.has(folderId);
  }

  private markDuplicates(items: MediaItem[]): void {
    // Group by normalized base name and size. Two files with the same name+size
    // are *potential* duplicates — never treated as definitely identical.
    const byKey = new Map<string, MediaItem[]>();
    for (const item of items) {
      const key = `${item.fileName.toLowerCase()}|${item.fileSize}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(item);
    }
    for (const group of byKey.values()) {
      if (group.length > 1) {
        // First one is the "original", rest point to it
        const original = group[0];
        for (let i = 1; i < group.length; i++) {
          group[i].duplicateOfId = original.id;
        }
      }
    }
  }

  getDuplicateCandidates(): MediaItem[] {
    return this.items.filter((i) => i.duplicateOfId);
  }

  // --- Organization proposals ---

  /**
   * Generate an organization proposal: identify loose video files (not in their
   * own dedicated folder) and propose moving each into a folder named
   * "Title (Year)". Never auto-execute.
   */
  async generateProposal(folderId: string): Promise<OrgProposal> {
    await this.load();
    const fs = getFilesystemService();
    const folder = this.folders.find((f) => f.id === folderId);
    if (!folder) throw new Error('پوشه یافت نشد');

    const items = this.getItemsForFolder(folderId);
    const operations: OrgOperation[] = [];

    for (const item of items) {
      // Skip episodes inside a series season folder (already organized in their series)
      if (item.mediaType === 'episode' || item.mediaType === 'series') {
        // For series, check if the file is loose (parent is the library root)
        const relDepth = this.relativeDepth(folder.path, item.parentFolder);
        if (relDepth > 0) continue; // already nested
      }

      // Determine if the file is "loose" — its parent is the library root
      // or the same folder as many other files.
      const siblingsInSameFolder = items.filter(
        (i) => i.parentFolder === item.parentFolder && i.id !== item.id,
      );
      // If the file lives in a dedicated folder (folder name matches title), skip.
      const parentBaseName = fs.baseName(item.parentFolder).toLowerCase();
      const titleGuess = (item.titleGuess || '').toLowerCase();
      const isDedicated =
        siblingsInSameFolder.length === 0 &&
        titleGuess &&
        (parentBaseName.includes(titleGuess) || titleGuess.includes(parentBaseName));

      if (isDedicated) continue;

      // Prefer confirmed provider metadata; fall back to the conservative filename parser.
      const metadata = getMetadataService().getMetadataForItem(item.id);
      const canonicalTitle = metadata?.title?.trim() || item.titleGuess || item.fileName;
      const canonicalYear = metadata?.year || item.yearGuess;
      const folderName = buildFolderName(canonicalTitle, canonicalYear);
      const extension = item.extension ? `.${item.extension}` : '';
      const canonicalBase = item.mediaType === 'episode' && item.seasonGuess && item.episodeGuess
        ? `${canonicalTitle} - S${String(item.seasonGuess).padStart(2, '0')}E${String(item.episodeGuess).padStart(2, '0')}`
        : folderName;
      const proposedFileName = `${canonicalBase}${extension}`;
      const destFolderPath = fs.joinPath(folder.path, folderName);
      const destFilePath = fs.joinPath(destFolderPath, proposedFileName);

      const destFolderExists = await fs.exists(destFolderPath);
      const destFileExists = await fs.exists(destFilePath);

      operations.push({
        id: uid(),
        itemId: item.id,
        type: 'move',
        sourcePath: item.filePath,
        destFolderPath,
        destFilePath,
        relatedSubtitles: item.subtitles,
        destFolderExists,
        destFileExists,
        uncertain: item.identification === 'needs-review',
        excluded: false,
      });
    }

    return {
      id: uid(),
      folderId,
      createdAt: Date.now(),
      operations,
      conflicts: operations.filter((o) => o.destFileExists).length,
      uncertainCount: operations.filter((o) => o.uncertain).length,
    };
  }

  private relativeDepth(rootPath: string, itemPath: string): number {
    const root = rootPath.replace(/\\+$/, '');
    const rel = itemPath.startsWith(root) ? itemPath.slice(root.length).replace(/^\\+/, '') : itemPath;
    return rel.split('\\').filter(Boolean).length;
  }

  /** Recalculate proposal after user edits/exclusions. */
  recalcProposal(proposal: OrgProposal): OrgProposal {
    const operations = proposal.operations.map((op) => ({ ...op }));
    return {
      ...proposal,
      operations,
      conflicts: operations.filter((o) => !o.excluded && o.destFileExists).length,
      uncertainCount: operations.filter((o) => !o.excluded && o.uncertain).length,
    };
  }

  /** Update a single operation's destination folder name (user edit). */
  updateOperationDest(
    proposal: OrgProposal,
    operationId: string,
    newFolderName: string,
  ): OrgProposal {
    const folder = this.folders.find((f) => f.id === proposal.folderId);
    if (!folder) return proposal;
    const fs = getFilesystemService();
    const operations = proposal.operations.map((op) => {
      if (op.id !== operationId || op.excluded) return op;
      const destFolderPath = fs.joinPath(folder.path, newFolderName);
      const destFilePath = fs.joinPath(destFolderPath, fs.baseName(op.sourcePath));
      return {
        ...op,
        destFolderPath,
        destFilePath,
        destFileExists: false, // will be re-checked on execute
      };
    });
    return this.recalcProposal({ ...proposal, operations });
  }

  toggleExclude(proposal: OrgProposal, operationId: string): OrgProposal {
    const operations = proposal.operations.map((op) =>
      op.id === operationId ? { ...op, excluded: !op.excluded } : op,
    );
    return this.recalcProposal({ ...proposal, operations });
  }

  // --- Execution ---

  async executeProposal(proposal: OrgProposal): Promise<OrgExecutionResult> {
    await this.load();
    const fs = getFilesystemService();
    const succeeded: OrgOperation[] = [];
    const failed: { operation: OrgOperation; error: string }[] = [];

    for (const op of proposal.operations) {
      if (op.excluded) continue;

      // Re-check conflicts before each move (safety)
      if (await fs.exists(op.destFilePath)) {
        failed.push({ operation: op, error: 'فایل مقصد از قبل وجود دارد' });
        this.addLog({
          id: uid(),
          timestamp: Date.now(),
          type: 'move',
          sourcePath: op.sourcePath,
          destPath: op.destFilePath,
          success: false,
          error: 'فایل مقصد از قبل وجود دارد',
          proposalId: proposal.id,
        });
        continue;
      }

      // Ensure destination folder exists
      if (!op.destFolderExists && !(await fs.exists(op.destFolderPath))) {
        const mkdir = await fs.createDir(op.destFolderPath);
        if (!mkdir.success) {
          failed.push({ operation: op, error: mkdir.error || 'امکان ایجاد پوشه مقصد نبود' });
          this.addLog({
            id: uid(),
            timestamp: Date.now(),
            type: 'move',
            sourcePath: op.sourcePath,
            destPath: op.destFilePath,
            success: false,
            error: mkdir.error,
            proposalId: proposal.id,
          });
          continue;
        }
      }

      // Move the video file
      const result = await fs.moveFile(op.sourcePath, op.destFilePath);
      if (!result.success) {
        failed.push({ operation: op, error: result.error || 'انتقال ناموفق بود' });
        this.addLog({
          id: uid(),
          timestamp: Date.now(),
          type: 'move',
          sourcePath: op.sourcePath,
          destPath: op.destFilePath,
          success: false,
          error: result.error,
          proposalId: proposal.id,
        });
        continue;
      }

      succeeded.push(op);
      this.addLog({
        id: uid(),
        timestamp: Date.now(),
        type: 'move',
        sourcePath: op.sourcePath,
        destPath: op.destFilePath,
        success: true,
        proposalId: proposal.id,
      });

      // Move and rename related subtitles to match the new video basename.
      const item = this.items.find((i) => i.id === op.itemId);
      const sourceVideoName = fs.baseName(op.sourcePath);
      const sourceVideoBase = sourceVideoName.slice(0, sourceVideoName.lastIndexOf('.'));
      const destinationVideoName = fs.baseName(op.destFilePath);
      const destinationVideoBase = destinationVideoName.slice(0, destinationVideoName.lastIndexOf('.'));
      for (const sub of op.relatedSubtitles) {
        const sourceSubtitleName = fs.baseName(sub.filePath);
        const sourceSubtitleBase = sourceSubtitleName.slice(0, sourceSubtitleName.lastIndexOf('.'));
        const suffix = sourceSubtitleBase.toLowerCase().startsWith(sourceVideoBase.toLowerCase())
          ? sourceSubtitleBase.slice(sourceVideoBase.length)
          : '';
        const subDestName = `${destinationVideoBase}${suffix}.${sub.extension}`;
        const subDestPath = fs.joinPath(op.destFolderPath, subDestName);
        if (await fs.exists(subDestPath)) {
          this.addLog({ id: uid(), timestamp: Date.now(), type: 'move', sourcePath: sub.filePath, destPath: subDestPath, success: false, error: 'زیرنویس مقصد از قبل وجود دارد', proposalId: proposal.id });
          continue;
        }
        const subResult = await fs.moveFile(sub.filePath, subDestPath);
        this.addLog({ id: uid(), timestamp: Date.now(), type: 'move', sourcePath: sub.filePath, destPath: subDestPath, success: subResult.success, error: subResult.error, proposalId: proposal.id });
        if (subResult.success && item) {
          const tracked = item.subtitles.find((entry) => entry.filePath === sub.filePath);
          if (tracked) { tracked.filePath = subDestPath; tracked.fileName = subDestName; }
        }
      }

      // Update the in-memory item to reflect the new path
      if (item) {
        item.filePath = op.destFilePath;
        item.fileName = destinationVideoName;
        item.parentFolder = op.destFolderPath;
      }
    }

    await this.persistItems();
    await this.persistLog();

    return { proposalId: proposal.id, executedAt: Date.now(), succeeded, failed };
  }

  // --- Operation log & undo ---

  getOperationLog(): OperationLogEntry[] {
    return [...this.log].sort((a, b) => b.timestamp - a.timestamp);
  }

  private addLog(entry: OperationLogEntry): void {
    this.log.unshift(entry);
    if (this.log.length > 500) this.log = this.log.slice(0, 500);
  }

  /**
   * Undo a completed move operation: move the file back to its original
   * location, verifying the original location is free and won't overwrite.
   * Only succeeds for operations that completed successfully.
   */
  async undoOperation(entry: OperationLogEntry): Promise<{ success: boolean; error?: string }> {
    await this.load();
    if (!entry.success) return { success: false, error: 'این عملیات ناموفق بوده است' };
    const fs = getFilesystemService();

    // Verify the current (destination) file still exists
    if (!(await fs.exists(entry.destPath))) {
      return { success: false, error: 'فایل در محل فعلی یافت نشد — امکان بازگشت نیست' };
    }

    // Verify original location is available and won't overwrite
    if (await fs.exists(entry.sourcePath)) {
      return { success: false, error: 'محل اصلی اکنون اشغال شده است — برای جلوگیری از بازنویسی، بازگشت انجام نشد' };
    }

    // Ensure original parent folder exists
    const origParent = fs.parentPath(entry.sourcePath);
    if (!(await fs.exists(origParent))) {
      const mkdir = await fs.createDir(origParent);
      if (!mkdir.success) return { success: false, error: 'امکان بازسازی پوشه اصلی نبود' };
    }

    const result = await fs.moveFile(entry.destPath, entry.sourcePath);
    if (!result.success) return { success: false, error: result.error };

    this.addLog({
      id: uid(),
      timestamp: Date.now(),
      type: 'undo',
      sourcePath: entry.destPath,
      destPath: entry.sourcePath,
      success: true,
      proposalId: entry.proposalId,
    });

    // Update the in-memory item path
    const item = this.items.find((i) => i.filePath === entry.destPath);
    if (item) {
      item.filePath = entry.sourcePath;
      item.parentFolder = fs.parentPath(entry.sourcePath);
      await this.persistItems();
    }

    await this.persistLog();
    return { success: true };
  }
}

function validateRenameName(value: string | undefined, extension: string, label: string): string {
  const name = value?.trim() || '';
  const hasControlCharacter = Array.from(name).some((character) => character.charCodeAt(0) < 32);
  if (!name || name === '.' || name === '..' || /[<>:"/\\|?*]/.test(name) || hasControlCharacter) {
    throw new Error(`${label} معتبر نیست`);
  }
  if (extension && !name.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
    throw new Error('پسوند فایل باید حفظ شود');
  }
  if (name.length > 240) throw new Error(`${label} بیش از حد طولانی است`);
  return name;
}

// Singleton instance.
let serviceInstance: LibraryService | null = null;

export function getLibraryService(): LibraryService {
  if (!serviceInstance) {
    serviceInstance = new LibraryService();
  }
  return serviceInstance;
}
