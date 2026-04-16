# Installation Guide

There are three ways to install VibeTO, from easiest to most manual.

---

## Method 1 — Installer (Windows, recommended)

1. Download **`VibeTOInstaller.exe`** from the [latest release](https://github.com/OrakomoRi/VibeTO/releases/latest).
2. Run it. If Windows SmartScreen appears, click **More info → Run anyway**.
3. The installer will try to locate Tanki Online automatically. If it fails, click **Browse** and select the game folder manually.
4. Click **Install** and wait for the log to say *Installation complete*.

The installer will:
- Download the latest `mod-loader.js` and `preload.js` from this release.
- Back up the original `app.asar` to `VibeTO\app-original.bak`.
- Patch `app.asar` in-place.
- Create the `VibeTO\mods\` folder.

### After a game update

Click **Repair** in the installer. It re-downloads the latest loader files and re-patches the game.

### Uninstalling

Click **Uninstall**. The original `app.asar` is restored from backup. You can choose to keep or remove your mods.

---

## Method 2 — Prebuilt app.asar (all platforms)

Use this if you can't run the installer or prefer not to.

### Step 1 — Back up the original app.asar

Locate the game installation directory:

| Platform | Default path |
|----------|--------------|
| Windows  | `%LOCALAPPDATA%\Programs\Tanki Online\` |
| macOS    | `/Applications/Tanki Online.app/Contents/Resources/` |
| Linux    | `~/.local/share/TankiOnline/` |

Inside the game folder, find `resources/app.asar`. **Copy it somewhere safe** before replacing it.

### Step 2 — Replace app.asar

Download **`app.asar`** from the [latest release](https://github.com/OrakomoRi/VibeTO/releases/latest) and place it at `<game>/resources/app.asar`, replacing the original.

### Step 3 — Create the VibeTO data directory

Create the following folder structure manually:

| Platform | Create this folder |
|----------|--------------------|
| Windows  | `%APPDATA%\VibeTO\mods\` |
| macOS    | `~/Library/Application Support/VibeTO/mods/` |
| Linux    | `~/.config/VibeTO/mods/` |

On Windows you can paste `%APPDATA%\VibeTO\mods` directly into Explorer's address bar and press Enter — it will create the folders automatically.

### Step 4 — Place mod-loader.js

Download **`mod-loader.js`** from the [latest release](https://github.com/OrakomoRi/VibeTO/releases/latest) and place it **directly** in the `VibeTO\` folder (not in `mods\`):

```
VibeTO/
├── mod-loader.js    ← here
└── mods/
```

### Step 5 — Launch the game

Start Tanki Online normally. If everything is in place, the ModLoader will initialise silently in the background.

---

## Method 3 — Manual patch (all platforms)

Use this if you want to patch the game's own `app.asar` yourself — for example, to combine VibeTO with a custom build of the game client.

### Prerequisites

- [Node.js](https://nodejs.org) 18+ (for the `asar` tool)
- The `mod-loader.js` and `preload.js` files from the [latest release](https://github.com/OrakomoRi/VibeTO/releases/latest)

### Step 1 — Install the asar tool

```sh
npm install -g @electron/asar
```

### Step 2 — Extract app.asar

Back up the original first, then extract:

```sh
cp resources/app.asar resources/app.asar.bak
asar extract resources/app.asar resources/app
```

### Step 3 — Patch main.js

Open `resources/app/main.js` in a text editor and insert the following block **immediately after** the opening `"use strict";` line (or at the very top if there is no such line):

```js
// === VibeTO ModLoader Patch ===
try {
    const _mlPath = require('path').join(
        require('electron').app.getPath('appData'),
        'VibeTO',
        'mod-loader.js'
    );
    if (require('fs').existsSync(_mlPath)) {
        const { attachMods } = require(_mlPath);
        require('electron').app.on('browser-window-created', (_event, win) => {
            attachMods(win);
        });
        console.log('[ModLoader] Bootstrap ready');
    } else {
        console.warn('[ModLoader] mod-loader.js not found in AppData — mods disabled');
    }
} catch (e) {
    console.error('[ModLoader] Bootstrap error:', e.message);
}
// === End VibeTO ModLoader Patch ===
```

### Step 4 — Patch preload.js

Open `resources/app/content/scripts/preload.js` and **append** the full contents of `preload.js` (from the release) to the end of the file.

### Step 5 — Repack app.asar

```sh
asar pack resources/app resources/app.asar
```

You can now delete the extracted `resources/app/` folder.

### Step 6 — Set up the VibeTO folder

Follow **Steps 3–4** from [Method 2](#method-2--prebuilt-appasar-all-platforms) to create the data directory and place `mod-loader.js`.

---

## Placing mods

All mods are `.client.js` files placed in the `mods/` subfolder:

| Platform | Mods folder |
|----------|-------------|
| Windows  | `%APPDATA%\VibeTO\mods\` |
| macOS    | `~/Library/Application Support/VibeTO/mods/` |
| Linux    | `~/.config/VibeTO/mods/` |

Each file is loaded automatically when the game starts. No restart required between switching mods — just relaunch the game.

---

## Troubleshooting

**The installer can't find the game.**
Tanki Online must be installed via its own launcher. If you used a non-standard install location, use **Browse** to point the installer to the correct folder. The folder must contain `Tanki Online.exe` and `resources/app.asar`.

**The game launches but mods don't load.**
Open the browser DevTools console (if accessible) and look for `[ModLoader]` log lines. The most common cause is `mod-loader.js` being in the wrong location — double-check the paths in the table above.

**The game updated and mods stopped working.**
The game's updater replaces `app.asar` on every update. Re-apply the patch using the installer (**Repair**) or repeat the manual steps.

**Windows Defender quarantined the installer.**
The binary is unsigned (open-source, no code signing certificate). You can verify the binary by [building from source](README.md#building-from-source) or by inspecting the source code directly. To restore: open Windows Security → Protection History → Allow.
