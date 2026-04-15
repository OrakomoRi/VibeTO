use std::fs;
use std::path::Path;

pub const PATCH_MARKER: &str = "// === VibeTO ModLoader Patch ===";
const PATCH_MARKER_END: &str = "// === End VibeTO ModLoader Patch ===";

fn bootstrap_code() -> String {
    [
        "// === VibeTO ModLoader Patch ===",
        "try {",
        "\tconst _mlPath = require('path').join(",
        "\t\trequire('electron').app.getPath('appData'),",
        "\t\t'VibeTO',",
        "\t\t'mod-loader.js'",
        "\t);",
        "\tif (require('fs').existsSync(_mlPath)) {",
        "\t\tconst { attachMods } = require(_mlPath);",
        "\t\trequire('electron').app.on('browser-window-created', (_event, win) => {",
        "\t\t\tattachMods(win);",
        "\t\t});",
        "\t\tconsole.log('[ModLoader] Bootstrap ready');",
        "\t} else {",
        "\t\tconsole.warn('[ModLoader] mod-loader.js not found in AppData \u{2014} mods disabled');",
        "\t}",
        "} catch (e) {",
        "\tconsole.error('[ModLoader] Bootstrap error:', e.message);",
        "}",
        "// === End VibeTO ModLoader Patch ===",
    ]
    .join("\n")
        + "\n"
}

fn strip_bootstrap(content: &str) -> String {
    match (content.find(PATCH_MARKER), content.find(PATCH_MARKER_END)) {
        (Some(s), Some(e)) => {
            let before = content[..s].trim_end();
            let after = content[e + PATCH_MARKER_END.len()..].trim_start();
            if before.is_empty() || after.is_empty() {
                format!("{}{}", before, after)
            } else {
                format!("{}\n\n{}", before, after)
            }
        }
        _ => content.to_string(),
    }
}

struct AsarFile {
    path: String,
    offset: usize,
    size: usize,
    unpacked: bool,
}

fn parse_asar(buf: &[u8]) -> Result<(serde_json::Value, usize), String> {
    if buf.len() < 16 {
        return Err("asar file too small".to_string());
    }
    let header_pickle_size =
        u32::from_le_bytes(buf[4..8].try_into().map_err(|_| "bad header".to_string())?)
            as usize;
    let data_start = 8 + header_pickle_size;
    let str_len =
        u32::from_le_bytes(buf[12..16].try_into().map_err(|_| "bad header".to_string())?)
            as usize;
    if buf.len() < 16 + str_len {
        return Err("asar header truncated".to_string());
    }
    let json_str =
        std::str::from_utf8(&buf[16..16 + str_len]).map_err(|e| e.to_string())?;
    let header: serde_json::Value =
        serde_json::from_str(json_str).map_err(|e| e.to_string())?;
    Ok((header, data_start))
}

fn serialize_asar_header(header: &serde_json::Value) -> Result<Vec<u8>, String> {
    let json_str = serde_json::to_string(header).map_err(|e| e.to_string())?;
    let json_bytes = json_str.as_bytes();
    let padded_len = (json_bytes.len() + 3) / 4 * 4;
    let mut out = vec![0u8; 16 + padded_len];
    let n = json_bytes.len() as u32;
    let pl = padded_len as u32;
    out[0..4].copy_from_slice(&4u32.to_le_bytes());
    out[4..8].copy_from_slice(&(pl + 8).to_le_bytes());
    out[8..12].copy_from_slice(&(pl + 4).to_le_bytes());
    out[12..16].copy_from_slice(&n.to_le_bytes());
    out[16..16 + json_bytes.len()].copy_from_slice(json_bytes);
    Ok(out)
}

fn collect_files(node: &serde_json::Value, prefix: &str) -> Vec<AsarFile> {
    let mut result = Vec::new();
    if let Some(files) = node["files"].as_object() {
        for (name, child) in files {
            let path = if prefix.is_empty() {
                name.clone()
            } else {
                format!("{}/{}", prefix, name)
            };
            if child["files"].is_object() {
                result.extend(collect_files(child, &path));
            } else {
                let offset = child["offset"]
                    .as_str()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0);
                let size = child["size"].as_u64().unwrap_or(0) as usize;
                let unpacked = child["unpacked"].as_bool().unwrap_or(false);
                result.push(AsarFile { path, offset, size, unpacked });
            }
        }
    }
    result
}

fn get_file_entry_mut<'a>(
    header: &'a mut serde_json::Value,
    file_path: &str,
) -> Option<&'a mut serde_json::Value> {
    let parts: Vec<&str> = file_path.split('/').collect();
    let mut node = header.get_mut("files")?;
    for part in &parts[..parts.len() - 1] {
        node = node.get_mut(part)?.get_mut("files")?;
    }
    node.get_mut(parts.last()?)
}

pub fn patch_asar(
    asar_path: &Path,
    loader_dir: &Path,
    log: impl Fn(&str),
) -> Result<(), String> {
    let preload_patch_path = loader_dir.join("preload.js");
    if !preload_patch_path.exists() {
        return Err(format!(
            "preload.js not found in loader dir: {}",
            loader_dir.display()
        ));
    }
    let preload_patch =
        fs::read_to_string(&preload_patch_path).map_err(|e| e.to_string())?;
    let bootstrap = bootstrap_code();

    let buf = fs::read(asar_path).map_err(|e| e.to_string())?;
    let (mut header, data_start) = parse_asar(&buf)?;

    // Collect all packed file entries (immutable pass)
    let mut all_files = collect_files(&header, "");
    all_files.retain(|f| !f.unpacked);
    all_files.sort_by_key(|f| f.offset);

    // Build new data section and record new offsets/sizes
    let mut segments: Vec<Vec<u8>> = Vec::new();
    let mut new_meta: Vec<(String, usize, usize)> = Vec::new(); // (path, new_offset, new_size)
    let mut new_offset = 0usize;
    let mut main_js_found = false;
    let mut preload_js_found = false;

    for file in &all_files {
        let orig = &buf[data_start + file.offset..data_start + file.offset + file.size];

        let data: Vec<u8> = if file.path == "main.js" {
            main_js_found = true;
            let mut content = String::from_utf8_lossy(orig).into_owned();
            if content.contains(PATCH_MARKER) {
                content = strip_bootstrap(&content);
            }
            let patched = if content.starts_with("\"use strict\";") {
                content.replacen(
                    "\"use strict\";",
                    &format!("\"use strict\";\n\n{}", bootstrap),
                    1,
                )
            } else {
                format!("{}\n\n{}", bootstrap, content)
            };
            log("main.js patched.");
            patched.into_bytes()
        } else if file.path == "content/scripts/preload.js" {
            preload_js_found = true;
            let content = String::from_utf8_lossy(orig);
            if !content.contains("window.ModLoader") {
                let patched = format!("{}\n\n{}", content, preload_patch);
                log("preload.js patched.");
                patched.into_bytes()
            } else {
                log("preload.js already patched — skipped.");
                orig.to_vec()
            }
        } else {
            orig.to_vec()
        };

        new_meta.push((file.path.clone(), new_offset, data.len()));
        new_offset += data.len();
        segments.push(data);
    }

    if !main_js_found {
        log("WARNING: main.js not found in asar — bootstrap not injected.");
    }
    if !preload_js_found {
        log("WARNING: content/scripts/preload.js not found in asar — preload not patched.");
    }

    // Update header with new offsets/sizes
    for (path, offset, size) in &new_meta {
        if let Some(entry) = get_file_entry_mut(&mut header, path) {
            entry["offset"] = serde_json::json!(offset.to_string());
            entry["size"] = serde_json::json!(*size);
            if let Some(obj) = entry.as_object_mut() {
                obj.remove("integrity");
            }
        }
    }

    let mut out = serialize_asar_header(&header)?;
    for seg in segments {
        out.extend_from_slice(&seg);
    }
    fs::write(asar_path, &out).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn is_patched(asar_path: &Path) -> bool {
    match fs::read(asar_path) {
        Ok(buf) => buf
            .windows(PATCH_MARKER.len())
            .any(|w| w == PATCH_MARKER.as_bytes()),
        Err(_) => false,
    }
}
