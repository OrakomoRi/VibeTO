mod deployer;
mod finder;
mod github;
mod patcher;

use std::path::Path;
use tauri::Emitter;

fn emit_log(app: &tauri::AppHandle, msg: &str) {
    let _ = app.emit("log", msg.to_string());
}

fn kill_game(exe_path: &str, log: impl Fn(&str)) {
    let exe_name = Path::new(exe_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Tanki Online.exe");

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", exe_name, "/T"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .status();
    }

    #[cfg(not(target_os = "windows"))]
    let _ = std::process::Command::new("pkill")
        .args(["-f", exe_name])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status();

    log(&format!("Closed running {} processes.", exe_name));
}

fn loader_dir() -> std::path::PathBuf {
    deployer::modloader_dir().join("loader")
}

// ── Commands ──────────────────────────────────────────────────────────────

#[tauri::command]
fn get_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
fn get_default_browse_path() -> String {
    // Return the first sensible default path for each platform
    finder::default_browse_path()
        .to_string_lossy()
        .into_owned()
}

#[tauri::command]
async fn find_game() -> Option<finder::GameLocation> {
    tauri::async_runtime::spawn_blocking(finder::find_game)
        .await
        .ok()
        .flatten()
}

#[tauri::command]
async fn validate_game_path(game_dir: String) -> Option<finder::GameLocation> {
    tauri::async_runtime::spawn_blocking(move || finder::validate_game_path(&game_dir))
        .await
        .ok()
        .flatten()
}

#[tauri::command]
async fn get_status(game_dir: String) -> serde_json::Value {
    tauri::async_runtime::spawn_blocking(move || {
        match finder::validate_game_path(&game_dir) {
            None => serde_json::json!({ "valid": false, "patched": false, "deployed": false }),
            Some(loc) => serde_json::json!({
                "valid": true,
                "patched": patcher::is_patched(Path::new(&loc.asar_path)),
                "deployed": deployer::is_deployed(),
            }),
        }
    })
    .await
    .unwrap_or_else(|_| serde_json::json!({ "valid": false, "patched": false, "deployed": false }))
}

#[tauri::command]
fn get_modloader_dir() -> String {
    deployer::modloader_dir().to_string_lossy().into_owned()
}

#[tauri::command]
async fn install(app: tauri::AppHandle, game_dir: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let loc = finder::validate_game_path(&game_dir)
            .ok_or_else(|| "Invalid game directory.".to_string())?;
        let ld = loader_dir();
        let log = |msg: &str| emit_log(&app, msg);

        log("Starting installation...");
        kill_game(&loc.exe_path, &log);
        github::download_loader_files(&ld, &log, true)?;
        deployer::deploy(&ld, Path::new(&loc.asar_path), &log)?;
        patcher::patch_asar(Path::new(&loc.asar_path), &ld, &log)?;
        log("Installation complete!");
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn repair(app: tauri::AppHandle, game_dir: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let loc = finder::validate_game_path(&game_dir)
            .ok_or_else(|| "Invalid game directory.".to_string())?;
        let ld = loader_dir();
        let log = |msg: &str| emit_log(&app, msg);

        log("Repairing...");
        kill_game(&loc.exe_path, &log);
        github::download_loader_files(&ld, &log, false)?;
        deployer::deploy(&ld, Path::new(&loc.asar_path), &log)?;
        deployer::restore_backup(Path::new(&loc.asar_path), &log)?;
        patcher::patch_asar(Path::new(&loc.asar_path), &ld, &log)?;
        log("Repair complete!");
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn uninstall(
    app: tauri::AppHandle,
    game_dir: String,
    keep_mods: bool,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let loc = finder::validate_game_path(&game_dir)
            .ok_or_else(|| "Invalid game directory.".to_string())?;
        let log = |msg: &str| emit_log(&app, msg);

        log("Uninstalling...");
        kill_game(&loc.exe_path, &log);

        if patcher::is_patched(Path::new(&loc.asar_path)) {
            if let Err(e) = deployer::restore_backup(Path::new(&loc.asar_path), &log) {
                log(&format!(
                    "Warning: Could not restore app.asar ({}). You may need to reinstall the game.",
                    e
                ));
            }
        } else {
            log("app.asar is not patched — skipping restore.");
        }

        deployer::undeploy(keep_mods, &log)?;
        log("Uninstall complete!");
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn check_update() -> Option<serde_json::Value> {
    tauri::async_runtime::spawn_blocking(|| {
        let release = github::fetch_latest_release().ok()?;
        let installed = github::get_installed_loader_tag(&loader_dir());
        Some(serde_json::json!({
            "latestTag": release.tag,
            "installedTag": installed,
        }))
    })
    .await
    .ok()
    .flatten()
}

#[tauri::command]
fn open_dir(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
    }
    open::that(&path).map_err(|e| e.to_string())
}

// ── Entry point ────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Ensure VibeTO and mods directories exist on every launch
    let ml_dir = deployer::modloader_dir();
    let _ = std::fs::create_dir_all(ml_dir.join("mods"));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_version,
            get_default_browse_path,
            find_game,
            validate_game_path,
            get_status,
            get_modloader_dir,
            install,
            repair,
            uninstall,
            check_update,
            open_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
