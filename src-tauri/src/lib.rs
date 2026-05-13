use serde::Serialize;
use tauri::{Manager, RunEvent, WindowEvent};

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
    let mut builder = tauri::Builder::default();

    // Single-instance plugin must be registered FIRST so it can intercept
    // launches before other plugins initialize. Desktop only — the plugin
    // doesn't compile for mobile.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // A second JSONPrism launch arrived — focus the existing window
            // instead of starting another process.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    let app = builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![host_info])
        .on_window_event(|window, event| {
            // Ensure the main window doesn't hold up the runtime on close.
            // Without this, Windows builds occasionally leave the host
            // process alive when the webview is the last live handle.
            if let WindowEvent::CloseRequested { .. } = event {
                if window.label() == "main" {
                    let _ = window.app_handle().exit(0);
                }
            }
        })
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
        .build(tauri::generate_context!())
        .expect("error while building JSONPrism");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { .. } = event {
            // Let Tauri's default exit path proceed — plugins clean up on drop.
            // Explicitly request cleanup so any spawned shell children are
            // sent SIGTERM/TerminateProcess before the process exits.
            app_handle.cleanup_before_exit();
        }
    });
}
