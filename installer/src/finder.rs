use std::path::{Path, PathBuf};

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameLocation {
    pub game_dir: String,
    pub asar_path: String,
    pub exe_path: String,
}

fn game_executable() -> &'static str {
    if cfg!(target_os = "windows") {
        "Tanki Online.exe"
    } else if cfg!(target_os = "macos") {
        "Tanki Online"
    } else {
        "TankiOnline"
    }
}

fn default_paths() -> Vec<PathBuf> {
    let home = dirs::home_dir().unwrap_or_default();
    if cfg!(target_os = "windows") {
        vec![
            home.join("AppData/Local/Programs/Tanki Online"),
            PathBuf::from("C:/Program Files/Tanki Online"),
            PathBuf::from("C:/Program Files (x86)/Tanki Online"),
        ]
    } else if cfg!(target_os = "macos") {
        vec![
            PathBuf::from("/Applications/Tanki Online.app/Contents/Resources"),
            home.join("Applications/Tanki Online.app/Contents/Resources"),
        ]
    } else {
        vec![
            home.join(".local/share/TankiOnline"),
            PathBuf::from("/opt/tankionline"),
        ]
    }
}

/// Best starting directory for the Browse dialog when no game is selected.
pub fn default_browse_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_default();
    if cfg!(target_os = "windows") {
        // AppData\Local\Programs is where user-installed apps live
        let p = home.join("AppData/Local/Programs");
        if p.exists() { return p; }
        home.join("AppData/Local")
    } else if cfg!(target_os = "macos") {
        PathBuf::from("/Applications")
    } else {
        home.join(".local/share")
    }
}

#[cfg(target_os = "windows")]
fn find_from_registry() -> Option<PathBuf> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let uninstall = hkcu
        .open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall")
        .ok()?;

    for name in uninstall.enum_keys().filter_map(|k: Result<String, _>| k.ok()) {
        if !name.contains("Tanki Online") {
            continue;
        }
        if let Ok(subkey) = uninstall.open_subkey(&name) {
            if let Ok(path) = subkey.get_value::<String, _>("InstallLocation") {
                let p = PathBuf::from(path);
                if p.exists() {
                    return Some(p);
                }
            }
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
fn find_from_registry() -> Option<PathBuf> {
    None
}

pub fn validate_game_path(game_dir: &str) -> Option<GameLocation> {
    let dir = Path::new(game_dir);
    let exe = dir.join(game_executable());
    let asar = dir.join("resources/app.asar");
    if exe.exists() && asar.exists() {
        Some(GameLocation {
            game_dir: game_dir.to_string(),
            asar_path: asar.to_string_lossy().into_owned(),
            exe_path: exe.to_string_lossy().into_owned(),
        })
    } else {
        None
    }
}

pub fn find_game() -> Option<GameLocation> {
    let mut candidates = default_paths();
    if let Some(p) = find_from_registry() {
        candidates.insert(0, p);
    }
    for dir in candidates {
        if let Some(loc) = validate_game_path(&dir.to_string_lossy()) {
            return Some(loc);
        }
    }
    None
}
