use serde::Serialize;
use tauri::Manager;

/// Metadata about the host system — useful for diagnostics and UI hints.
/// Exposed to the frontend via the `host_info` command.
#[derive(Serialize)]
struct HostInfo {
    os: String,
    arch: String,
    family: String,
    app_version: String,
}

#[tauri::command]
fn host_info() -> HostInfo {
    HostInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        family: std::env::consts::FAMILY.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![host_info])
        .setup(|app| {
            // Surface the main window once it's ready — avoids the
            // "blank window flash" some platforms exhibit on cold start.
            #[cfg(any(target_os = "macos", target_os = "windows"))]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            #[cfg(not(any(target_os = "macos", target_os = "windows")))]
            {
                let _ = app;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running JSONPrism");
}
