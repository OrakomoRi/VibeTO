use std::fs;
use std::path::{Path, PathBuf};

pub fn modloader_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_default();
    if cfg!(target_os = "windows") {
        home.join("AppData/Roaming/VibeTO")
    } else if cfg!(target_os = "macos") {
        home.join("Library/Application Support/VibeTO")
    } else {
        let config = std::env::var("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| home.join(".config"));
        config.join("VibeTO")
    }
}

fn asar_unpacked_path(asar_path: &Path) -> PathBuf {
    let mut s = asar_path.as_os_str().to_owned();
    s.push(".unpacked");
    PathBuf::from(s)
}

fn copy_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let dest = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir(&entry.path(), &dest)?;
        } else {
            fs::copy(entry.path(), dest)?;
        }
    }
    Ok(())
}

pub fn deploy(
    loader_dir: &Path,
    asar_path: &Path,
    log: impl Fn(&str),
) -> Result<(), String> {
    let ml_dir = modloader_dir();
    fs::create_dir_all(&ml_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(ml_dir.join("mods")).map_err(|e| e.to_string())?;

    let src = loader_dir.join("mod-loader.js");
    let dst = ml_dir.join("mod-loader.js");
    if !src.exists() {
        return Err(format!("mod-loader.js not found in: {}", loader_dir.display()));
    }
    fs::copy(&src, &dst).map_err(|e| e.to_string())?;
    log(&format!("Copied mod-loader.js => {}", dst.display()));

    let backup = ml_dir.join("app-original.bak");
    if !backup.exists() {
        fs::copy(asar_path, &backup).map_err(|e| e.to_string())?;
        log(&format!("Backed up app.asar => {}", backup.display()));

        let unpacked_src = asar_unpacked_path(asar_path);
        if unpacked_src.exists() {
            let unpacked_dst = ml_dir.join("app-original-unpacked");
            copy_dir(&unpacked_src, &unpacked_dst).map_err(|e| e.to_string())?;
            log("Backed up app.asar.unpacked.");
        }
    } else {
        log("Backup already exists — skipping.");
    }

    Ok(())
}

pub fn restore_backup(asar_path: &Path, log: impl Fn(&str)) -> Result<(), String> {
    let ml_dir = modloader_dir();
    let backup = ml_dir.join("app-original.bak");
    if !backup.exists() {
        return Err("Backup not found. Cannot restore original app.asar.".to_string());
    }
    fs::copy(&backup, asar_path).map_err(|e| e.to_string())?;
    log("Restored app.asar from backup.");

    let unpacked_backup = ml_dir.join("app-original-unpacked");
    if unpacked_backup.exists() {
        let unpacked_dst = asar_unpacked_path(asar_path);
        if unpacked_dst.exists() {
            fs::remove_dir_all(&unpacked_dst).map_err(|e| e.to_string())?;
        }
        copy_dir(&unpacked_backup, &unpacked_dst).map_err(|e| e.to_string())?;
        log("Restored app.asar.unpacked from backup.");
    }

    Ok(())
}

pub fn undeploy(keep_mods: bool, log: impl Fn(&str)) -> Result<(), String> {
    let ml_dir = modloader_dir();
    if !ml_dir.exists() {
        log("AppData directory not found — nothing to remove.");
        return Ok(());
    }

    for file in &["mod-loader.js", "app-original.bak"] {
        let p = ml_dir.join(file);
        if p.exists() {
            fs::remove_file(&p).map_err(|e| e.to_string())?;
            log(&format!("Removed {}", file));
        }
    }

    let unpacked_backup = ml_dir.join("app-original-unpacked");
    if unpacked_backup.exists() {
        fs::remove_dir_all(&unpacked_backup).map_err(|e| e.to_string())?;
        log("Removed app.asar.unpacked backup.");
    }

    if !keep_mods {
        let mods_dir = ml_dir.join("mods");
        if mods_dir.exists() {
            fs::remove_dir_all(&mods_dir).map_err(|e| e.to_string())?;
            log("Removed mods directory.");
        }
        let _ = fs::remove_dir(&ml_dir);
    }

    Ok(())
}

pub fn is_deployed() -> bool {
    modloader_dir().join("mod-loader.js").exists()
}
