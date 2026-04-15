# VibeTO

[![Release](https://img.shields.io/github/v/release/OrakomoRi/VibeTO?style=flat-square)](https://github.com/OrakomoRi/VibeTO/releases/latest)
[![License](https://img.shields.io/github/license/OrakomoRi/VibeTO?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](#installation)

**VibeTO** is a mod loader for [Tanki Online](https://tankionline.com). It patches the game client to support community mods — without touching the game's installation directory.

> **A note on the name.** The "Vibe" in VibeTO is honest: approximately 99% of this project was built with AI-assisted vibecoding. We consider this a feature, not a bug. The other 1% was vibin'.

---

## How it works

Tanki Online runs as an Electron app — all its logic lives in a single archive: `resources/app.asar`. VibeTO patches two files inside that archive:

- **`main.js`** — a bootstrap is prepended that hooks `browser-window-created` and loads `mod-loader.js` from the VibeTO data directory at runtime.
- **`content/scripts/preload.js`** — the mod API is appended, exposing `window.ModLoader` and `window.electronAPI` extensions to the renderer.

Mods are stored in the platform data directory and are completely isolated from the game's own files. When the game updates and replaces `app.asar`, just click **Repair** in the installer to re-apply the patch.

### VibeTO data directory

| Platform | Path |
|----------|------|
| Windows  | `%APPDATA%\VibeTO\` |
| macOS    | `~/Library/Application Support/VibeTO/` |
| Linux    | `$XDG_CONFIG_HOME/VibeTO/` or `~/.config/VibeTO/` |

### Mod directory

Place your mods (`.client.js` files) inside the `mods/` subfolder of the data directory:

```
VibeTO/
├── mod-loader.js        ← the loader runtime (managed automatically)
└── mods/
    ├── your-mod.client.js
    └── another-mod.client.js
```

---

## Installation

The easiest way is to use the installer. For manual installation (or platforms without an installer), see [INSTALL.md](INSTALL.md).

### Installer (Windows)

1. Download `VibeTOInstaller.exe` from the [latest release](https://github.com/OrakomoRi/VibeTO/releases/latest).
2. Run it. Windows SmartScreen may warn about an unknown publisher — click **More info → Run anyway** (the source code is right here).
3. The installer will auto-detect your Tanki Online installation. If it doesn't, click **Browse**.
4. Click **Install**.

That's it. The installer handles patching, backup, and loader deployment automatically.

### After a game update

The game's updater replaces `app.asar` on every update, removing the patch. Open the installer and click **Repair** — it re-downloads the latest loader and re-patches the game.

### Uninstalling

Click **Uninstall** in the installer. The original `app.asar` is restored from the backup that was made during installation.

---

## Building from source

**Prerequisites:** [Rust](https://rustup.rs), [Node.js](https://nodejs.org) 20+

```sh
git clone https://github.com/OrakomoRi/VibeTO
cd VibeTO/installer
npm install
npm run build       # produces installer/target/release/bundle/nsis/VibeTOInstaller.exe
```

To build the patched `app.asar` (for manual distribution):

```sh
cd ..               # project root
npm install
npm run build:asar  # produces release/app.asar
```
