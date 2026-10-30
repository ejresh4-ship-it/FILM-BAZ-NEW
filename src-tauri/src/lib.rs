// FILM BAZ — Tauri 2 main entry point.
// Application logic and window setup are driven from the lib crate.

mod commands;

use commands::ScanState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ScanState::default())
        .invoke_handler(tauri::generate_handler![
            commands::fs_list_dir,
            commands::fs_scan_dir,
            commands::fs_cancel_scan,
            commands::fs_reset_scan,
            commands::fs_stat,
            commands::fs_exists,
            commands::fs_create_dir,
            commands::fs_pick_folders,
            commands::fs_move_file,
            commands::fs_is_symlink,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
