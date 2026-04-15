#!/usr/bin/env node

/**
 * Build a patched app.asar from the original game source in original/<version>/.
 *
 * Steps:
 *   1. Copy original/<version>/ to a temp directory
 *   2. Install production dependencies (game's own package.json)
 *   3. Inject the VibeTO bootstrap into main.js
 *   4. Append loader/preload.js to content/scripts/preload.js
 *   5. Pack everything into release/app.asar
 *
 * Usage:
 *   node scripts/build-asar.js [version]
 *   npm run build:asar
 */

'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createPackage } = require('@electron/asar');

const ROOT = path.resolve(__dirname, '..');

// ── Resolve paths ─────────────────────────────────────────────────────────────

function findOriginalVersion() {
	const originalDir = path.join(ROOT, 'original');
	const entries = fs.readdirSync(originalDir).filter((e) => {
		return fs.statSync(path.join(originalDir, e)).isDirectory();
	});
	if (entries.length === 0) throw new Error('No version folder found in original/');
	entries.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
	return entries[0];
}

const version = process.argv[2] ?? findOriginalVersion();
const SOURCE_DIR = path.join(ROOT, 'original', version);
const PRELOAD_PATCH = path.join(ROOT, 'loader', 'preload.js');
const OUT_FILE = path.join(ROOT, 'release', 'app.asar');
const TMP_DIR = path.join(ROOT, 'tmp', 'asar-build');

// ── Patch markers (must match patcher.rs) ─────────────────────────────────────

const PATCH_MARKER = '// === VibeTO ModLoader Patch ===';
const PATCH_MARKER_END = '// === End VibeTO ModLoader Patch ===';

const BOOTSTRAP = [
	'// === VibeTO ModLoader Patch ===',
	'try {',
	"\tconst _mlPath = require('path').join(",
	"\t\trequire('electron').app.getPath('appData'),",
	"\t\t'VibeTO',",
	"\t\t'mod-loader.js'",
	'\t);',
	"\tif (require('fs').existsSync(_mlPath)) {",
	'\t\tconst { attachMods } = require(_mlPath);',
	"\t\trequire('electron').app.on('browser-window-created', (_event, win) => {",
	'\t\t\tattachMods(win);',
	'\t\t});',
	"\t\tconsole.log('[ModLoader] Bootstrap ready');",
	'\t} else {',
	"\t\tconsole.warn('[ModLoader] mod-loader.js not found in AppData \u2014 mods disabled');",
	'\t}',
	'} catch (e) {',
	"\tconsole.error('[ModLoader] Bootstrap error:', e.message);",
	'}',
	'// === End VibeTO ModLoader Patch ===',
].join('\n') + '\n';

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyDir(src, dst) {
	fs.mkdirSync(dst, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const s = path.join(src, entry.name);
		const d = path.join(dst, entry.name);
		entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
	}
}

function stripBootstrap(content) {
	const s = content.indexOf(PATCH_MARKER);
	const e = content.indexOf(PATCH_MARKER_END);
	if (s === -1 || e === -1) return content;
	const before = content.slice(0, s).trimEnd();
	const after = content.slice(e + PATCH_MARKER_END.length).trimStart();
	return before && after ? `${before}\n\n${after}` : `${before}${after}`;
}

function patchMainJs(content) {
	let src = content.includes(PATCH_MARKER) ? stripBootstrap(content) : content;
	if (src.startsWith('"use strict";')) {
		return src.replace('"use strict";', `"use strict";\n\n${BOOTSTRAP}`);
	}
	return `${BOOTSTRAP}\n${src}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
	console.log(`Building app.asar from original/${version}/...`);

	if (!fs.existsSync(SOURCE_DIR)) {
		throw new Error(`Source directory not found: ${SOURCE_DIR}`);
	}
	if (!fs.existsSync(PRELOAD_PATCH)) {
		throw new Error('loader/preload.js not found.');
	}

	// 1. Copy source to temp
	if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true });
	copyDir(SOURCE_DIR, TMP_DIR);
	console.log('Copied source files.');

	// 2. Install game dependencies
	console.log('Installing game dependencies...');
	execSync('npm install --production --ignore-scripts', {
		cwd: TMP_DIR,
		stdio: 'inherit',
	});

	// 3. Patch main.js
	const mainJsPath = path.join(TMP_DIR, 'main.js');
	if (!fs.existsSync(mainJsPath)) throw new Error('main.js not found in source');
	fs.writeFileSync(mainJsPath, patchMainJs(fs.readFileSync(mainJsPath, 'utf8')));
	console.log('Patched main.js.');

	// 4. Patch content/scripts/preload.js
	const preloadPath = path.join(TMP_DIR, 'content', 'scripts', 'preload.js');
	if (fs.existsSync(preloadPath)) {
		const orig = fs.readFileSync(preloadPath, 'utf8');
		if (!orig.includes('window.ModLoader')) {
			fs.writeFileSync(preloadPath, `${orig}\n\n${fs.readFileSync(PRELOAD_PATCH, 'utf8')}`);
			console.log('Patched content/scripts/preload.js.');
		} else {
			console.log('preload.js already patched — skipping.');
		}
	}

	// 5. Pack into app.asar
	fs.mkdirSync(path.join(ROOT, 'release'), { recursive: true });
	console.log(`Packing ${OUT_FILE}...`);
	await createPackage(TMP_DIR, OUT_FILE);

	// 6. Cleanup
	fs.rmSync(TMP_DIR, { recursive: true });

	console.log('Done! release/app.asar is ready.');
}

main().catch((err) => {
	console.error('Error:', err.message);
	process.exit(1);
});
