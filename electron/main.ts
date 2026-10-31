// Electron main process entry point for FILM BAZ.
//
// SECURITY: contextIsolation is enabled, nodeIntegration is disabled.
// The preload script exposes only a restricted API via contextBridge.
// No unrestricted filesystem or shell access is exposed to the renderer.

import { app, BrowserWindow, ipcMain, dialog, safeStorage } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { spawn, execSync as nodeExecSync } from 'node:child_process';
import type { DirEntry, FileInfo, MoveResult } from '../src/types/filesystem';
import type { DetectedPlayer, PlaybackResult } from '../src/types/desktop';

app.setAppUserModelId('com.filmbaz.desktop');

let mainWindow: BrowserWindow | null = null;
const cancelledScans = new Set<string>();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#070a12',
    title: 'فیلم باز — FILM BAZ',
    icon: path.join(app.getAppPath(), 'src-tauri', 'icons', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // In dev mode, load from the Vite dev server; in production, load the built file.
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC: Filesystem operations ---

ipcMain.handle('fs:listDir', async (_evt, dirPath: string): Promise<DirEntry[]> => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const results: DirEntry[] = [];
    for (const entry of entries) {
      let stat: fs.Stats | null = null;
      try {
        stat = await fs.promises.stat(path.join(dirPath, entry.name));
      } catch {
        // skip entries we can't stat (permission issues)
      }
      results.push({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        isSymlink: entry.isSymbolicLink(),
        size: stat?.size ?? 0,
        lastModified: stat?.mtimeMs ?? 0,
      });
    }
    return results;
  } catch {
    return [];
  }
});

ipcMain.handle('fs:scanDir', async (
  _evt,
  dirPath: string,
  onProgressChannel: string,
  scanId: string,
): Promise<DirEntry[]> => {
  const results: DirEntry[] = [];
  let scanned = 0;

  async function walk(dir: string): Promise<void> {
    if (cancelledScans.has(scanId)) return;
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (cancelledScans.has(scanId)) return;
      const fullPath = path.join(dir, entry.name);
      let stat: fs.Stats | null = null;
      try {
        stat = await fs.promises.stat(fullPath);
      } catch {
        // skip
      }
      const dirEntry: DirEntry = {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        isSymlink: entry.isSymbolicLink(),
        size: stat?.size ?? 0,
        lastModified: stat?.mtimeMs ?? 0,
      };
      results.push(dirEntry);
      scanned++;
      if (scanned % 5 === 0) {
        // Report progress via the dedicated channel
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(onProgressChannel, scanned, fullPath);
        }
      }
      if (entry.isDirectory()) {
        await walk(fullPath);
      }
    }
  }

  try {
    await walk(dirPath);
    return results;
  } finally {
    cancelledScans.delete(scanId);
  }
});

ipcMain.handle('fs:cancelScan', (_evt, scanId: string): void => {
  cancelledScans.add(scanId);
});

ipcMain.handle('fs:stat', async (_evt, p: string): Promise<FileInfo> => {
  try {
    const stat = await fs.promises.stat(p);
    return {
      path: p,
      size: stat.size,
      lastModified: stat.mtimeMs,
      isDirectory: stat.isDirectory(),
      isSymlink: stat.isSymbolicLink(),
      exists: true,
    };
  } catch {
    return { path: p, size: 0, lastModified: 0, isDirectory: false, isSymlink: false, exists: false };
  }
});

ipcMain.handle('fs:exists', async (_evt, p: string): Promise<boolean> => {
  try {
    await fs.promises.access(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:createDir', async (_evt, p: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await fs.promises.mkdir(p, { recursive: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
});

ipcMain.handle('fs:moveFile', async (_evt, source: string, dest: string): Promise<MoveResult> => {
  try {
    try {
      await fs.promises.access(dest, fs.constants.F_OK);
      return { success: false, error: 'فایل مقصد از قبل وجود دارد' };
    } catch {
      // destination does not exist
    }
    try {
      await fs.promises.rename(source, dest);
      return { success: true, destPath: dest };
    } catch {
      await fs.promises.copyFile(source, dest, fs.constants.COPYFILE_EXCL);
      try {
        await fs.promises.unlink(source);
      } catch (e) {
        return {
          success: false,
          error: `کپی انجام شد اما حذف فایل مبدأ ناموفق بود: ${e instanceof Error ? e.message : String(e)}`,
          destPath: dest,
        };
      }
      return { success: true, destPath: dest };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
});

ipcMain.handle('fs:writeTextFile', async (_evt, p: string, content: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await fs.promises.mkdir(path.dirname(p), { recursive: true });
    await fs.promises.writeFile(p, content, 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
});

ipcMain.handle('fs:downloadFile', async (_evt, url: string, destPath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return { success: false, error: `دانلود ناموفق: ${response.status}` };
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await fs.promises.writeFile(destPath, buffer);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
});

ipcMain.handle('fs:isSymlink', async (_evt, p: string): Promise<boolean> => {
  try {
    const stat = await fs.promises.lstat(p);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
});

ipcMain.handle('fs:normalizePath', async (_evt, p: string): Promise<string> => {
  return path.resolve(p).replace(/\//g, '\\');
});

ipcMain.handle('fs:joinPath', async (_evt, ...segments: string[]): Promise<string> => {
  return path.join(...segments).replace(/\//g, '\\');
});

ipcMain.handle('fs:parentPath', async (_evt, p: string): Promise<string> => {
  return path.dirname(p).replace(/\//g, '\\');
});

ipcMain.handle('fs:baseName', async (_evt, p: string): Promise<string> => {
  return path.basename(p);
});



// Remove one strictly-empty child directory. Never recursive: rmdir only succeeds
// for an empty directory. The selected library root itself is never removable.
ipcMain.handle('fs:removeEmptyDirectory', async (_evt, targetPath: string, selectedRoot: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (typeof targetPath !== 'string' || typeof selectedRoot !== 'string' || !path.isAbsolute(targetPath) || !path.isAbsolute(selectedRoot)) {
      return { success: false, error: 'مسیر نامعتبر است' };
    }
    const root = path.resolve(selectedRoot);
    const target = path.resolve(targetPath);
    const relative = path.relative(root, target);
    if (!relative || relative === '.' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
      return { success: false, error: 'فقط زیرپوشه‌های مسیر آرشیو قابل حذف هستند؛ پوشه اصلی محافظت می‌شود' };
    }
    const rootStat = await fs.promises.lstat(root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      return { success: false, error: 'مسیر اصلی آرشیو پوشه معتبر و امنی نیست' };
    }
    const targetStat = await fs.promises.lstat(target);
    if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) {
      return { success: false, error: 'مسیر انتخاب‌شده پوشه عادی نیست یا پیوند نمادین است' };
    }
    const realRoot = await fs.promises.realpath(root);
    const realTarget = await fs.promises.realpath(target);
    const realRelative = path.relative(realRoot, realTarget);
    if (!realRelative || realRelative.startsWith('..' + path.sep) || path.isAbsolute(realRelative)) {
      return { success: false, error: 'مسیر واقعی پوشه خارج از آرشیو است' };
    }
    const entries = await fs.promises.readdir(target);
    if (entries.length !== 0) {
      return { success: false, error: 'پوشه دیگر خالی نیست؛ هیچ فایلی حذف نشد' };
    }
    // Re-check immediately before rmdir to reduce the scan/delete race window.
    const finalStat = await fs.promises.lstat(target);
    if (!finalStat.isDirectory() || finalStat.isSymbolicLink() || (await fs.promises.readdir(target)).length !== 0) {
      return { success: false, error: 'وضعیت پوشه تغییر کرده است؛ عملیات لغو شد' };
    }
    await fs.promises.rmdir(target);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
});

// --- IPC: Player discovery ---

ipcMain.handle('player:detect', async (): Promise<DetectedPlayer[]> => {
  return detectWindowsPlayers();
});

ipcMain.handle('player:validateExe', async (_evt, exePath: string): Promise<{ valid: boolean; error?: string }> => {
  return validateExecutable(exePath);
});

ipcMain.handle('player:browseExe', async (): Promise<string | null> => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'انتخاب پخش‌کننده ویدئو',
    filters: [{ name: 'برنامه‌های اجرایی', extensions: ['exe'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('fs:browseFolders', async (): Promise<string[]> => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'انتخاب پوشه‌های کتابخانه',
    properties: ['openDirectory', 'multiSelections', 'createDirectory'],
  });
  return result.canceled ? [] : result.filePaths;
});

// --- IPC: OS-encrypted settings ---
const secureSettingsPath = (): string => path.join(app.getPath('userData'), 'secure-settings.json');

function readSecureSettings(): Record<string, string> {
  try {
    const raw = fs.readFileSync(secureSettingsPath(), 'utf8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeSecureSettings(settings: Record<string, string>): void {
  fs.mkdirSync(path.dirname(secureSettingsPath()), { recursive: true });
  fs.writeFileSync(secureSettingsPath(), JSON.stringify(settings), { mode: 0o600 });
}

ipcMain.handle('secure:set', async (_evt, key: string, value: string): Promise<void> => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('ویندوز ذخیره‌سازی امن را در دسترس قرار نداده است');
  const settings = readSecureSettings();
  settings[key] = safeStorage.encryptString(value).toString('base64');
  writeSecureSettings(settings);
});

ipcMain.handle('secure:get', async (_evt, key: string): Promise<string | null> => {
  if (!safeStorage.isEncryptionAvailable()) return null;
  const encoded = readSecureSettings()[key];
  if (!encoded) return null;
  try {
    return safeStorage.decryptString(Buffer.from(encoded, 'base64'));
  } catch {
    return null;
  }
});

// --- IPC: Playback ---

ipcMain.handle('playback:playFile', async (
  _evt,
  filePath: string,
  playerExecutable: string,
  subtitlePath?: string,
): Promise<PlaybackResult> => {
  return launchPlayer(filePath, playerExecutable, subtitlePath);
});

ipcMain.handle('playback:playSystemDefault', async (_evt, filePath: string): Promise<PlaybackResult> => {
  return launchSystemDefault(filePath);
});

// --- Player detection logic ---

function detectWindowsPlayers(): DetectedPlayer[] {
  const players: DetectedPlayer[] = [];
  const seen = new Set<string>();

  // System default handler
  players.push({
    id: 'system-default',
    name: 'پخش‌کننده پیش‌فرض ویندوز',
    executablePath: 'system-default',
    isSystemDefault: true,
    supportsSubtitles: true,
  });
  seen.add('system-default');

  // Known player registry: App Paths registry keys + known install locations.
  // We query these locations rather than scanning the drive.
  const knownPlayers: Array<{ id: string; name: string; registryKey: string; exeName: string }> = [
    { id: 'vlc', name: 'VLC media player', registryKey: 'vlc', exeName: 'vlc.exe' },
    { id: 'mpc-hc', name: 'Media Player Classic - Home Cinema', registryKey: 'mpc-hc64', exeName: 'mpc-hc64.exe' },
    { id: 'mpc-be', name: 'Media Player Classic - Black Edition', registryKey: 'mpc-be64', exeName: 'mpc-be64.exe' },
    { id: 'potplayer', name: 'PotPlayer', registryKey: 'PotPlayer64', exeName: 'PotPlayerMini64.exe' },
    { id: 'kmp', name: 'KMPlayer', registryKey: 'KMPlayer', exeName: 'KMPlayer.exe' },
    { id: 'gom', name: 'GOM Player', registryKey: 'GOM Player', exeName: 'GOM.exe' },
    { id: 'bsplayer', name: 'BS.Player', registryKey: 'BSplayer', exeName: 'bsplayer.exe' },
    { id: 'mpv', name: 'mpv', registryKey: '', exeName: 'mpv.exe' },
    { id: 'cyberlink-powerdvd', name: 'PowerDVD', registryKey: 'PowerDVD', exeName: 'PowerDVD.exe' },
    { id: 'windows-media-player', name: 'Windows Media Player', registryKey: '', exeName: 'wmplayer.exe' },
  ];

  // Check HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths
  // and HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths
  for (const kp of knownPlayers) {
    if (seen.has(kp.id)) continue;

    const exePath = findViaAppPaths(kp.exeName, kp.registryKey) || findViaKnownLocations(kp.exeName);
    if (exePath) {
      const isValid = fs.existsSync(exePath) && exePath.toLowerCase().endsWith('.exe');
      if (isValid) {
        players.push({
          id: kp.id,
          name: kp.name,
          executablePath: exePath,
          isSystemDefault: false,
          supportsSubtitles: playerSupportsSubtitles(kp.id),
        });
        seen.add(kp.id);
      }
    }
  }

  return players;
}

function findViaAppPaths(exeName: string, appPathKey: string): string | null {
  if (process.platform !== 'win32') return null;

  // Use reg.exe to query App Paths registry (avoids native regedit module dependency)
  const keys = [
    appPathKey ? `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${appPathKey}.exe` : '',
    `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${exeName}`,
  ].filter(Boolean);

  for (const key of keys) {
    for (const hive of ['HKLM', 'HKCU']) {
      try {
        const result = execSync(`reg query "${hive}\\${key}" /ve 2>nul`);
        const match = /REG_SZ\s+(.+)/.exec(result.toString());
        if (match) {
          let p = match[1].trim();
          // Remove surrounding quotes
          p = p.replace(/^"|"$/g, '');
          if (p) return p;
        }
      } catch {
        // reg query failed — key doesn't exist
      }
    }
  }
  return null;
}

function findViaKnownLocations(exeName: string): string | null {
  if (process.platform !== 'win32') return null;

  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFiles86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const localAppData = process.env['LOCALAPPDATA'] || path.join(os.homedir(), 'AppData', 'Local');

  const searchDirs = [
    path.join(programFiles, 'VideoLAN', 'VLC'),
    path.join(programFiles86, 'VideoLAN', 'VLC'),
    path.join(programFiles, 'K-Lite Codec Pack', 'MPC-HC'),
    path.join(programFiles86, 'K-Lite Codec Pack', 'MPC-HC'),
    path.join(programFiles, 'K-Lite Codec Pack', 'MPC-HC64'),
    path.join(programFiles86, 'K-Lite Codec Pack', 'MPC-HC64'),
    path.join(programFiles, 'Daum', 'PotPlayer'),
    path.join(programFiles86, 'Daum', 'PotPlayer'),
    path.join(programFiles, 'KMP'),
    path.join(programFiles86, 'KMP'),
    path.join(programFiles, 'GRETECH', 'GomPlayer'),
    path.join(programFiles86, 'GRETECH', 'GomPlayer'),
    path.join(programFiles, 'Windows Media Player'),
    path.join(localAppData, 'Programs', 'mpv'),
    path.join(programFiles, 'mpv'),
    path.join(programFiles86, 'mpv'),
  ];

  for (const dir of searchDirs) {
    const candidate = path.join(dir, exeName);
    if (fs.existsSync(candidate)) return candidate;
  }

  // Also check if it's directly on the PATH
  try {
    const result = execSync(`where "${exeName}" 2>nul`);
    const lines = result.toString().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) return lines[0];
  } catch {
    // not on PATH
  }

  return null;
}

function playerSupportsSubtitles(playerId: string): boolean {
  const supported = new Set(['vlc', 'mpc-hc', 'mpc-be', 'mpv', 'potplayer', 'kmp', 'bsplayer']);
  return supported.has(playerId);
}

function validateExecutable(exePath: string): { valid: boolean; error?: string } {
  if (!exePath || !exePath.toLowerCase().endsWith('.exe')) {
    return { valid: false, error: 'فایل انتخابی یک فایل اجرایی (.exe) نیست' };
  }
  try {
    fs.accessSync(exePath, fs.constants.F_OK | fs.constants.X_OK);
    return { valid: true };
  } catch {
    return { valid: false, error: 'فایل اجرایی یافت نشد یا قابل اجرا نیست' };
  }
}

function launchPlayer(
  filePath: string,
  playerExecutable: string,
  subtitlePath?: string,
): PlaybackResult {
  try {
    // Verify the media file exists before launching
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'فایل ویدئو یافت نشد. ممکن است درایو متصل نباشد یا فایل جابه‌جا شده باشد.' };
    }

    // Build argument array — NEVER use shell concatenation for untrusted paths
    const args: string[] = [filePath];

    // Subtitle switches are player-specific. Keep paths as separate argv items
    // so spaces and non-Latin characters are passed safely to the player.
    if (subtitlePath && fs.existsSync(subtitlePath)) {
      const playerId = path.basename(playerExecutable).toLowerCase();
      if (playerId === 'kmplayer.exe' || playerExecutable.toLowerCase().includes('kmplayer')) {
        args.push('/sub', subtitlePath);
      } else if (playerId === 'potplayermini64.exe' || playerExecutable.toLowerCase().includes('potplayer')) {
        args.push('/sub', subtitlePath);
      } else if (playerId === 'mpc-hc64.exe' || playerId === 'mpc-be64.exe' || playerExecutable.toLowerCase().includes('mpc-hc') || playerExecutable.toLowerCase().includes('mpc-be')) {
        args.push('/sub', subtitlePath);
      } else if (playerId === 'mpv.exe' || playerExecutable.toLowerCase().includes('mpv')) {
        args.push(`--sub-file=${subtitlePath}`);
      } else if (playerId === 'vlc.exe' || playerExecutable.toLowerCase().includes('vlc')) {
        args.push('--sub-file', subtitlePath);
      } else {
        // Unknown players still receive the video; don't send an unsupported switch.
      }
    }

    // spawn() with explicit args array — no shell interpolation
    const child = spawn(playerExecutable, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();

    return {
      success: true,
      playerUsed: playerExecutable,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'خطا در اجرای پخش‌کننده',
    };
  }
}

function launchSystemDefault(filePath: string): PlaybackResult {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'فایل ویدئو یافت نشد. ممکن است درایو متصل نباشد یا فایل جابه‌جا شده باشد.' };
    }

    // Use the Windows "start" command via spawn with no shell
    // `start "" "path"` opens with the default handler
    const child = spawn('cmd.exe', ['/c', 'start', '""', filePath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();

    return { success: true, playerUsed: 'system-default' };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'خطا در اجرای پخش با برنامه پیش‌فرض ویندوز',
    };
  }
}

// Helper: synchronous exec for registry queries (only used in detectWindowsPlayers)
function execSync(command: string): Buffer {
  return nodeExecSync(command, { timeout: 3000 });
}
