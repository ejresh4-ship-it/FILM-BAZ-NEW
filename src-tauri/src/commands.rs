use serde::Serialize;
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{Emitter, State};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub is_file: bool,
    pub is_symlink: bool,
    pub size: u64,
    pub last_modified: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub path: String,
    pub size: u64,
    pub last_modified: f64,
    pub is_directory: bool,
    pub is_symlink: bool,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveResult {
    pub success: bool,
    pub error: Option<String>,
    pub dest_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SimpleResult {
    pub success: bool,
    pub error: Option<String>,
}

// Single active scan is enforced via `active`. Concurrent `fs_scan_dir`
// calls are rejected (return empty) if a scan is already running, which
// prevents the global cancellation flag from being reset/cleared by a
// second scan while the first is still observing it.
pub struct ScanState {
    pub cancelled: Mutex<bool>,
    pub active: AtomicBool,
}

impl Default for ScanState {
    fn default() -> Self {
        ScanState {
            cancelled: Mutex::new(false),
            active: AtomicBool::new(false),
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub scanned: u64,
    pub current_path: String,
}

#[tauri::command]
pub fn fs_list_dir(dir_path: String) -> Vec<DirEntry> {
    let mut results = Vec::new();
    let entries = match fs::read_dir(&dir_path) {
        Ok(e) => e,
        Err(_) => return results,
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        let full_path = entry.path().to_string_lossy().to_string();
        let metadata = entry.metadata().ok();
        let (size, last_modified) = metadata
            .as_ref()
            .map(|m| (m.len(), m.modified().ok()))
            .unwrap_or((0, None));
        let last_modified_ms = last_modified
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0);
        // file_type() does NOT follow symlinks, so is_symlink is accurate
        // and symlinks to directories are not reported as directories.
        let ft = entry.file_type().ok();
        results.push(DirEntry {
            name,
            path: full_path,
            is_directory: ft.as_ref().map(|t| t.is_dir()).unwrap_or(false),
            is_file: ft.as_ref().map(|t| t.is_file()).unwrap_or(false),
            is_symlink: ft.as_ref().map(|t| t.is_symlink()).unwrap_or(false),
            size,
            last_modified: last_modified_ms,
        });
    }
    results
}

#[tauri::command]
pub fn fs_scan_dir(
    app: tauri::AppHandle,
    dir_path: String,
    state: State<'_, ScanState>,
) -> Result<Vec<DirEntry>, String> {
    // Enforce a single active scan. If one is already running, reject this
    // call so the shared cancellation flag cannot be clobbered.
    if state.active.swap(true, Ordering::SeqCst) {
        return Err("اسکن دیگری در حال اجراست".to_string());
    }
    *state.cancelled.lock().unwrap() = false;

    let mut results = Vec::new();
    let mut scanned: u64 = 0;
    walk_dir(&app, &dir_path, &mut results, &mut scanned, &state);

    state.active.store(false, Ordering::SeqCst);
    Ok(results)
}

fn walk_dir(
    app: &tauri::AppHandle,
    dir: &str,
    results: &mut Vec<DirEntry>,
    scanned: &mut u64,
    state: &ScanState,
) {
    if state.cancelled.lock().unwrap().clone() {
        return;
    }
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        if state.cancelled.lock().unwrap().clone() {
            return;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        let full_path = entry.path().to_string_lossy().to_string();
        let metadata = entry.metadata().ok();
        let (size, last_modified) = metadata
            .as_ref()
            .map(|m| (m.len(), m.modified().ok()))
            .unwrap_or((0, None));
        let last_modified_ms = last_modified
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0);
        // file_type() does not follow symlinks: symlinks (including Windows
        // junctions) are reported as is_symlink and is_directory is false,
        // so we never recurse into them. This prevents infinite loops.
        let ft = entry.file_type().ok();
        let is_symlink = ft.as_ref().map(|t| t.is_symlink()).unwrap_or(false);
        let is_dir = ft.as_ref().map(|t| t.is_dir()).unwrap_or(false);
        results.push(DirEntry {
            name,
            path: full_path.clone(),
            is_directory: is_dir,
            is_file: ft.as_ref().map(|t| t.is_file()).unwrap_or(false),
            is_symlink,
            size,
            last_modified: last_modified_ms,
        });
        *scanned += 1;
        if *scanned % 5 == 0 {
            let _ = app.emit(
                "fs:scanProgress",
                ScanProgress {
                    scanned: *scanned,
                    current_path: full_path,
                },
            );
        }
        if is_dir && !is_symlink {
            walk_dir(app, &full_path, results, scanned, state);
        }
    }
}

#[tauri::command]
pub fn fs_cancel_scan(state: State<'_, ScanState>) {
    *state.cancelled.lock().unwrap() = true;
}

#[tauri::command]
pub fn fs_reset_scan(state: State<'_, ScanState>) {
    *state.cancelled.lock().unwrap() = false;
}

#[tauri::command]
pub fn fs_stat(p: String) -> FileInfo {
    match fs::metadata(&p) {
        Ok(meta) => {
            let last_modified = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as f64)
                .unwrap_or(0.0);
            FileInfo {
                path: p,
                size: meta.len(),
                last_modified,
                is_directory: meta.is_dir(),
                is_symlink: fs::symlink_metadata(&p)
                    .map(|m| m.is_symlink())
                    .unwrap_or(false),
                exists: true,
            }
        }
        Err(_) => FileInfo {
            path: p,
            size: 0,
            last_modified: 0.0,
            is_directory: false,
            is_symlink: false,
            exists: false,
        },
    }
}

#[tauri::command]
pub fn fs_exists(p: String) -> bool {
    Path::new(&p).exists()
}

#[tauri::command]
pub fn fs_create_dir(p: String) -> SimpleResult {
    match fs::create_dir_all(&p) {
        Ok(_) => SimpleResult { success: true, error: None },
        Err(e) => SimpleResult { success: false, error: Some(e.to_string()) },
    }
}

#[tauri::command]
pub fn fs_move_file(source: String, dest: String) -> MoveResult {
    if Path::new(&dest).exists() {
        return MoveResult {
            success: false,
            error: Some("فایل مقصد از قبل وجود دارد".to_string()),
            dest_path: None,
        };
    }
    match fs::rename(&source, &dest) {
        Ok(_) => MoveResult { success: true, error: None, dest_path: Some(dest) },
        Err(_) => {
            // rename fails across volumes/drives (and some permission cases).
            // Fall back to copy-then-delete so cross-drive moves work.
            let src = Path::new(&source);
            let dst = Path::new(&dest);
            if let Err(e) = copy_path(src, dst) {
                return MoveResult { success: false, error: Some(e), dest_path: None };
            }
            // Verify the destination was actually created before removing source.
            if !dst.exists() {
                return MoveResult {
                    success: false,
                    error: Some(
                        "انتقال ناموفق: فایل مقصد پس از کپی ایجاد نشد".to_string(),
                    ),
                    dest_path: None,
                };
            }
            match remove_path(src) {
                Ok(_) => MoveResult { success: true, error: None, dest_path: Some(dest) },
                Err(e) => MoveResult {
                    success: false,
                    error: Some(format!(
                        "کپی انجام شد اما حذف فایل مبدأ ناموفق بود: {}",
                        e
                    )),
                    dest_path: Some(dest),
                },
            }
        }
    }
}

fn copy_path(src: &Path, dst: &Path) -> Result<(), String> {
    if src.is_dir() {
        fs::create_dir_all(dst).map_err(|e| e.to_string())?;
        for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            copy_path(&entry.path(), &dst.join(entry.file_name()))?;
        }
    } else {
        let mut source = fs::File::open(src).map_err(|e| e.to_string())?;
        let mut destination = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(dst)
            .map_err(|e| e.to_string())?;
        if let Err(error) = std::io::copy(&mut source, &mut destination) {
            let _ = fs::remove_file(dst);
            return Err(error.to_string());
        }
    }
    Ok(())
}

fn remove_path(p: &Path) -> Result<(), String> {
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn fs_pick_folders() -> Vec<String> {
    rfd::FileDialog::new()
        .set_title("انتخاب پوشه‌های کتابخانه")
        .pick_folders()
        .unwrap_or_default()
        .into_iter()
        .map(|path| path.to_string_lossy().to_string())
        .collect()
}

#[tauri::command]
pub fn fs_is_symlink(p: String) -> bool {
    fs::symlink_metadata(&p)
        .map(|m| m.is_symlink())
        .unwrap_or(false)
}
