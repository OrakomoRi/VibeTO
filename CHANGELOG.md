# Changelog

All notable changes to VibeTO are documented here.

---

## [1.0.0] — 2026-04-15

### Added
- Initial release of VibeTO Installer built with Tauri v2 (Rust backend).
- Auto-detection of Tanki Online installation on Windows via registry and known default paths.
- Manual Browse dialog for custom installation paths.
- **Install** — patches `app.asar` and deploys the loader runtime to the VibeTO data directory.
- **Repair** — re-downloads the latest loader files and re-patches the game; safe to run after any game update.
- **Uninstall** — restores the original `app.asar` from backup with an option to keep or remove mods.
- Automatic backup of `app.asar` (and `app.asar.unpacked` if present) to the VibeTO data directory before patching.
- Live log output in the installer UI for all operations.
- Update banner shown when the installed loader version is behind the latest release.
- `mod-loader.js` and `preload.js` are automatically attached to every GitHub release via CI.
- `npm run build:asar` script for building a pre-patched `app.asar` from the original game source.

---

[1.0.0]: https://github.com/OrakomoRi/VibeTO/releases/tag/v1.0.0

