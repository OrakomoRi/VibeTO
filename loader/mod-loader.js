'use strict';

const { app, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const os = require('os');

/** Root directory for all modloader data. Never touched by the game installer. */
const MODLOADER_DIR = path.join(app.getPath('appData'), 'VibeTO');

/** Directory where user mod files (.client.js) are stored. */
const MODS_DIR = path.join(MODLOADER_DIR, 'mods');

/** Directory for per-mod persistent key-value storage. */
const CACHE_DIR = path.join(MODS_DIR, '.cache');

const USER_AGENT = `TankiOnline-ModLoader/1.0 (${os.platform()}; ${os.release()}; ${os.arch()}) Electron/${process.versions.electron}`;

/**
 * Creates a directory if it does not already exist.
 * @param {string} dir
 */
function ensureDir(dir) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Performs an HTTP/HTTPS GET request, following redirects.
 * @param {string} url
 * @returns {Promise<{ buf: Buffer, status: number, headers: import('http').IncomingHttpHeaders }>}
 */
function fetchRaw(url) {
	return new Promise((resolve, reject) => {
		const lib = url.startsWith('https') ? https : http;
		lib.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
			if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
				return fetchRaw(res.headers.location).then(resolve).catch(reject);
			}
			const chunks = [];
			res.on('data', chunk => chunks.push(chunk));
			res.on('end', () => {
				resolve({
					buf: Buffer.concat(chunks),
					status: res.statusCode,
					headers: res.headers,
				});
			});
			res.on('error', reject);
		}).on('error', reject);
	});
}

/**
 * Fetches a URL and returns the response body as a UTF-8 string.
 * Throws on non-200 status codes.
 * @param {string} url
 * @returns {Promise<string>}
 */
function fetchURL(url) {
	return fetchRaw(url).then(({ buf, status }) => {
		if (status !== 200) throw new Error(`HTTP ${status} — ${url}`);
		return buf.toString('utf8');
	});
}

/**
 * Splits a namespaced storage key of the form "modId:key" into its parts.
 * Keys without a colon are assigned to the "default" namespace.
 * @param {string} rawKey
 * @returns {[string, string]} [modId, key]
 */
function splitKey(rawKey) {
	const idx = rawKey.indexOf(':');
	return idx === -1 ? ['default', rawKey] : [rawKey.slice(0, idx), rawKey.slice(idx + 1)];
}

/**
 * Reads the persistent key-value store for a given mod from disk.
 * Returns an empty object if the store file does not exist or is malformed.
 * @param {string} modId
 * @returns {Record<string, unknown>}
 */
function readStore(modId) {
	try {
		return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, modId, 'store.json'), 'utf8'));
	} catch {
		return {};
	}
}

/**
 * Writes the persistent key-value store for a given mod to disk.
 * @param {string} modId
 * @param {Record<string, unknown>} store
 */
function writeStore(modId, store) {
	ensureDir(path.join(CACHE_DIR, modId));
	fs.writeFileSync(path.join(CACHE_DIR, modId, 'store.json'), JSON.stringify(store, null, 2));
}

/**
 * Registers all IPC handlers that renderer-side mod code can invoke via
 * window.electronAPI / window.ModLoader.createAPI().
 *
 * Channels:
 *   mod:fetch        — proxied HTTP GET, bypasses renderer-side CORS restrictions
 *   mod:store:get    — read a value from mod's persistent storage
 *   mod:store:set    — write a value to mod's persistent storage
 *   mod:open-external — open a URL in the system browser
 *   mod:update-mod   — download and overwrite a .client.js file in MODS_DIR
 */
function setupIPC() {
	ipcMain.handle('mod:fetch', async (_event, url) => {
		try {
			const { buf, status, headers } = await fetchRaw(url);
			const contentType = headers['content-type'] || '';
			const isBinary = /^image\//.test(contentType);
			return {
				data: isBinary ? buf.toString('base64') : buf.toString('utf8'),
				status,
				headers: {
					'content-type': headers['content-type'],
					'content-length': headers['content-length'],
					'last-modified': headers['last-modified'],
					'etag': headers['etag'],
				},
				binary: isBinary,
			};
		} catch (e) {
			return { error: e.message };
		}
	});

	ipcMain.handle('mod:store:get', (_event, rawKey, defaultValue) => {
		const [modId, key] = splitKey(rawKey);
		const store = readStore(modId);
		return key in store ? store[key] : defaultValue;
	});

	ipcMain.handle('mod:store:set', (_event, rawKey, value) => {
		const [modId, key] = splitKey(rawKey);
		const store = readStore(modId);
		store[key] = value;
		writeStore(modId, store);
	});

	ipcMain.handle('mod:open-external', (_event, url) => {
		shell.openExternal(url);
	});

	ipcMain.handle('mod:update-mod', async (_event, url, filename) => {
		try {
			const content = await fetchURL(url);
			ensureDir(MODS_DIR);
			fs.writeFileSync(path.join(MODS_DIR, filename), content, 'utf8');
			return { success: true };
		} catch (e) {
			return { error: e.message };
		}
	});
}

/**
 * Attaches all mods to a BrowserWindow.
 *
 * Scans MODS_DIR for *.client.js files (sorted alphabetically, so load order
 * can be controlled via filename prefixes like "00_base.client.js").
 * Each mod is wrapped in an IIFE that receives a scoped modAPI object, then
 * injected into the window's renderer process after the page finishes loading.
 *
 * Called from the bootstrap in app.asar via app.on('browser-window-created').
 *
 * @param {import('electron').BrowserWindow} win
 */
function attachMods(win) {
	ensureDir(MODS_DIR);
	ensureDir(CACHE_DIR);

	const files = fs.readdirSync(MODS_DIR).filter(f => f.endsWith('.client.js'));

	if (files.length === 0) {
		console.log('[ModLoader] No mods found in', MODS_DIR);
		return;
	}

	console.log(`[ModLoader] Found ${files.length} mod(s):`, files);

	win.webContents.on('did-finish-load', () => {
		for (const file of files) {
			try {
				const modId = file.replace('.client.js', '');
				const source = fs.readFileSync(path.join(MODS_DIR, file), 'utf8');
				const wrapped = `;(function(modAPI){\n${source}\n})(window.ModLoader.createAPI(${JSON.stringify(modId)}));`;
				win.webContents.executeJavaScript(wrapped)
					.then(() => console.log(`[ModLoader] ✓ ${file}`))
					.catch(e => console.error(`[ModLoader] ✗ ${file}:`, e.message));
			} catch (e) {
				console.error(`[ModLoader] ✗ Cannot read ${file}:`, e.message);
			}
		}
	});
}

setupIPC();

module.exports = { attachMods };
