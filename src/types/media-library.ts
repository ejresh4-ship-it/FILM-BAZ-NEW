// Media library types for Phase 2: local media scanning and safe file organization.

export type MediaType = 'movie' | 'series' | 'episode' | 'unknown';

export type IdentificationStatus =
  | 'identified' // parser found a likely title/year/season/episode
  | 'needs-review' // ambiguous filename, user must confirm
  | 'pending'; // not yet analyzed

export type ScanStatus = 'pending' | 'scanning' | 'completed' | 'cancelled' | 'failed';

/** A library location (folder) the user has added. */
export interface LibraryFolder {
  id: string;
  path: string;
  label: string; // friendly name, e.g. "Movies (D:)"
  addedAt: number;
  lastScannedAt?: number;
}

/** A discovered video file and its parsed metadata. */
export interface MediaItem {
  id: string;
  folderId: string;
  filePath: string;
  fileName: string;
  extension: string;
  parentFolder: string;
  mediaType: MediaType;
  /** parsed title guess (may be empty when needs-review) */
  titleGuess?: string;
  /** parsed year, 0 if unknown */
  yearGuess?: number;
  /** parsed season number, 0 if unknown */
  seasonGuess?: number;
  /** parsed episode number, 0 if unknown */
  episodeGuess?: number;
  fileSize: number; // bytes, 0 if unknown
  lastModified?: number; // epoch ms
  subtitles: SubtitleFile[];
  identification: IdentificationStatus;
  scanStatus: ScanStatus;
  /** optional link to a metadata-provider record (later phase) */
  providerId?: string;
  /** duplicate-candidate flag set during scan */
  duplicateOfId?: string;
}

/** A subtitle file associated with a video. */
export interface SubtitleFile {
  filePath: string;
  fileName: string;
  extension: string;
  language?: string; // e.g. "fa" if parsed from filename
}

/** Progress reported during a scan. */
export interface ScanProgress {
  folderId: string;
  scanned: number;
  total?: number;
  currentPath?: string;
  status: 'idle' | 'scanning' | 'completed' | 'cancelled' | 'failed';
  error?: string;
  foundVideos: number;
  foundSubtitles: number;
  duplicates: number;
}

/** Summary of a completed (or in-progress) scan. */
export interface ScanSummary {
  folderId: string;
  startedAt: number;
  finishedAt?: number;
  status: ScanStatus;
  videoCount: number;
  subtitleCount: number;
  duplicateCount: number;
  needsReviewCount: number;
  error?: string;
}

/** A single proposed file-organization operation. */
export interface OrgOperation {
  id: string;
  itemId: string;
  type: 'move';
  sourcePath: string;
  destFolderPath: string;
  destFilePath: string;
  /** subtitle files that move alongside the video */
  relatedSubtitles: SubtitleFile[];
  /** whether the destination folder already exists */
  destFolderExists: boolean;
  /** whether the destination file already exists (conflict) */
  destFileExists: boolean;
  /** whether the item's identification is uncertain */
  uncertain: boolean;
  /** user-excluded from execution */
  excluded: boolean;
}

/** A full organization proposal: preview of operations before execution. */
export interface OrgProposal {
  id: string;
  folderId: string;
  createdAt: number;
  operations: OrgOperation[];
  conflicts: number;
  uncertainCount: number;
}

/** Result of executing an organization proposal. */
export interface OrgExecutionResult {
  proposalId: string;
  executedAt: number;
  succeeded: OrgOperation[];
  failed: { operation: OrgOperation; error: string }[];
}

/** A single entry in the operation log (transaction log). */
export interface OperationLogEntry {
  id: string;
  timestamp: number;
  type: 'move' | 'undo';
  sourcePath: string;
  destPath: string;
  success: boolean;
  error?: string;
  proposalId?: string;
}

/** User preferences for the library. */
export interface LibraryPreferences {
  videoExtensions: string[];
  subtitleExtensions: string[];
  /** skip symlinks during scan */
  skipSymlinks: boolean;
  /** max files to report per scan pass (memory guard for old hardware) */
  maxFilesPerScan: number;
}
