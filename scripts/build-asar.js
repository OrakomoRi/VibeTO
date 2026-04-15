#!/usr/bin/env node

/**
 * Produce a patched app.asar by reading the original binary and modifying
 * only the two files VibeTO needs to touch (main.js and content/scripts/preload.js).
 *
 * The approach mirrors patcher.rs exactly:
 *   1. Parse the asar header (JSON embedded in a 16-byte pickle envelope)
 *   2. Rewrite main.js and preload.js content in the data section
 *   3. Update all offsets / sizes in the header
 *   4. Write the new asar next to the original
 *
 * No npm install, no full extract/repack — output size ≈ original ± a few KB.
 *
 * Usage:
 *   node scripts/build-asar.js <path/to/original/app.asar>
 *   npm run build:asar -- <path>
 *
 * Output: release/app.asar
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_INPUT = path.join(ROOT, 'original', 'app.asar');
const PRELOAD_PATCH = path.join(ROOT, 'loader', 'preload.js');
const OUT_FILE = path.join(ROOT, 'release', 'app.asar');

// ── Patch markers (must match patcher.rs) ─────────────────────────────────────

const PATCH_MARKER = '// === VibeTO ModLoader Patch ===';
const PATCH_MARKER_END = '// === End VibeTO ModLoader Patch ===';

const BOOTSTRAP =
	[
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

// ── asar binary helpers (mirrors patcher.rs) ──────────────────────────────────

function parseAsar(buf) {
	if (buf.length < 16) throw new Error('asar file too small');
	const headerPickleSize = buf.readUInt32LE(4);
	const dataStart = 8 + headerPickleSize;
	const strLen = buf.readUInt32LE(12);
	if (buf.length < 16 + strLen) throw new Error('asar header truncated');
	const json = buf.slice(16, 16 + strLen).toString('utf8');
	return { header: JSON.parse(json), dataStart };
}

function serializeAsarHeader(header) {
	const json = JSON.stringify(header);
	const jsonBytes = Buffer.from(json, 'utf8');
	const paddedLen = Math.ceil(jsonBytes.length / 4) * 4;
	const out = Buffer.alloc(16 + paddedLen, 0);
	out.writeUInt32LE(4, 0);
	out.writeUInt32LE(paddedLen + 8, 4);
	out.writeUInt32LE(paddedLen + 4, 8);
	out.writeUInt32LE(jsonBytes.length, 12);
	jsonBytes.copy(out, 16);
	return out;
}

function collectFiles(node, prefix) {
	const results = [];
	const files = node.files;
	if (!files) return results;
	for (const [name, child] of Object.entries(files)) {
		const p = prefix ? `${prefix}/${name}` : name;
		if (child.files) {
			results.push(...collectFiles(child, p));
		} else {
			results.push({
				path: p,
				offset: parseInt(child.offset ?? '0', 10),
				size: child.size ?? 0,
				unpacked: child.unpacked ?? false,
			});
		}
	}
	return results;
}

function getFileEntry(header, filePath) {
	const parts = filePath.split('/');
	let node = header.files;
	for (const part of parts.slice(0, -1)) {
		node = node?.[part]?.files;
	}
	return node?.[parts.at(-1)];
}

// ── Patch helpers ─────────────────────────────────────────────────────────────

function stripBootstrap(content) {
	const s = content.indexOf(PATCH_MARKER);
	const e = content.indexOf(PATCH_MARKER_END);
	if (s === -1 || e === -1) return content;
	const before = content.slice(0, s).trimEnd();
	const after = content.slice(e + PATCH_MARKER_END.length).trimStart();
	return before && after ? `${before}\n\n${after}` : `${before}${after}`;
}

function patchMainJs(content) {
	const src = content.includes(PATCH_MARKER) ? stripBootstrap(content) : content;
	if (src.startsWith('"use strict";')) {
		return src.replace('"use strict";', `"use strict";\n\n${BOOTSTRAP}`);
	}
	return `${BOOTSTRAP}\n${src}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
	const inputAsar = process.argv[2] ?? DEFAULT_INPUT;
	if (!fs.existsSync(inputAsar)) {
		throw new Error(`Input not found: ${inputAsar}`);
	}
	if (!fs.existsSync(PRELOAD_PATCH)) {
		throw new Error('loader/preload.js not found.');
	}

	console.log(`Patching ${inputAsar}...`);
	const buf = fs.readFileSync(inputAsar);
	const { header, dataStart } = parseAsar(buf);
	const preloadPatch = fs.readFileSync(PRELOAD_PATCH, 'utf8');

	// Collect packed files sorted by offset (same as patcher.rs)
	const allFiles = collectFiles(header, '')
		.filter((f) => !f.unpacked)
		.sort((a, b) => a.offset - b.offset);

	// Rebuild data section, patching the two target files
	const segments = [];
	const newMeta = [];
	let newOffset = 0;

	for (const file of allFiles) {
		const orig = buf.slice(dataStart + file.offset, dataStart + file.offset + file.size);
		let data;

		if (file.path === 'main.js') {
			data = Buffer.from(patchMainJs(orig.toString('utf8')));
			console.log('Patched main.js.');
		} else if (file.path === 'content/scripts/preload.js') {
			const content = orig.toString('utf8');
			if (!content.includes('window.ModLoader')) {
				data = Buffer.from(`${content}\n\n${preloadPatch}`);
				console.log('Patched content/scripts/preload.js.');
			} else {
				data = orig;
				console.log('preload.js already patched — skipping.');
			}
		} else {
			data = orig;
		}

		newMeta.push({ path: file.path, offset: newOffset, size: data.length });
		newOffset += data.length;
		segments.push(data);
	}

	// Update header offsets / sizes, strip integrity hashes
	for (const { path: filePath, offset, size } of newMeta) {
		const entry = getFileEntry(header, filePath);
		if (entry) {
			entry.offset = String(offset);
			entry.size = size;
			delete entry.integrity;
		}
	}

	fs.mkdirSync(path.join(ROOT, 'release'), { recursive: true });
	const headerBuf = serializeAsarHeader(header);
	const out = Buffer.concat([headerBuf, ...segments]);
	fs.writeFileSync(OUT_FILE, out);

	const origMB = (buf.length / 1024 / 1024).toFixed(1);
	const outMB = (out.length / 1024 / 1024).toFixed(1);
	console.log(`Done! ${origMB} MB → ${outMB} MB  →  release/app.asar`);
}

main();
