use std::fs;
use std::path::Path;

const REPO: &str = "OrakomoRi/VibeTO";

pub struct ReleaseInfo {
    pub tag: String,
    pub assets: Vec<(String, String)>, // (name, download_url)
}

fn get_string(url: &str) -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent("VibeTO-Installer")
        .build()
        .map_err(|e| e.to_string())?;
    client
        .get(url)
        .send()
        .map_err(|e| e.to_string())?
        .text()
        .map_err(|e| e.to_string())
}

fn download_file(url: &str, dest: &Path) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent("VibeTO-Installer")
        .build()
        .map_err(|e| e.to_string())?;
    let bytes = client
        .get(url)
        .send()
        .map_err(|e| e.to_string())?
        .bytes()
        .map_err(|e| e.to_string())?;
    fs::write(dest, &bytes).map_err(|e| e.to_string())
}

pub fn fetch_latest_release() -> Result<ReleaseInfo, String> {
    let url = format!("https://api.github.com/repos/{}/releases/latest", REPO);
    let body = get_string(&url)?;
    let json: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;

    let tag = json["tag_name"]
        .as_str()
        .ok_or("No releases found on GitHub.")?
        .to_string();

    let assets = json["assets"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|a| {
            let name = a["name"].as_str()?.to_string();
            let url = a["browser_download_url"].as_str()?.to_string();
            Some((name, url))
        })
        .collect();

    Ok(ReleaseInfo { tag, assets })
}

pub fn get_installed_loader_tag(loader_dir: &Path) -> Option<String> {
    let version_file = loader_dir.join("version.json");
    if !version_file.exists() {
        return None;
    }
    let data: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&version_file).ok()?).ok()?;
    data["tag"].as_str().map(str::to_string)
}

pub fn download_loader_files(
    dest_dir: &Path,
    log: impl Fn(&str),
    force: bool,
) -> Result<String, String> {
    log("Fetching latest release info...");
    let release = fetch_latest_release()?;

    if !force {
        if let Some(installed) = get_installed_loader_tag(dest_dir) {
            if installed == release.tag {
                log(&format!("Loader is already up to date ({}).", release.tag));
                return Ok(release.tag);
            }
        }
    }

    log(&format!("Downloading loader {}...", release.tag));
    fs::create_dir_all(dest_dir).map_err(|e| e.to_string())?;

    for name in &["mod-loader.js", "preload.js"] {
        let asset = release
            .assets
            .iter()
            .find(|(n, _)| n == name)
            .ok_or_else(|| {
                format!(
                    "Asset \"{}\" not found in release {}",
                    name, release.tag
                )
            })?;
        download_file(&asset.1, &dest_dir.join(name))?;
        log(&format!("Downloaded {}", name));
    }

    let version_json = serde_json::json!({ "tag": release.tag });
    fs::write(dest_dir.join("version.json"), version_json.to_string())
        .map_err(|e| e.to_string())?;

    Ok(release.tag)
}
