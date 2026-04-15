"use strict";

// Appended to the end of the game's content/scripts/preload.js.
// At this point their window.electronAPI and window.greenworksBridge are already set.
// ipcRenderer is available from their top-level require('electron') call.

process.once('loaded', () => {
	const { ipcRenderer } = require('electron');

	/**
	 * Converts a raw IPC response from the main process into a fetch-like object.
	 * Binary responses (images) are base64-encoded by the main process and decoded here.
	 *
	 * @param {{ data: string, status: number, headers: object, binary: boolean, error?: string }} raw
	 * @returns {{ ok: boolean, status: number, headers: object, text: () => Promise<string>, json: () => Promise<unknown>, blob: () => Promise<Blob> }}
	 */
	function makeResponse({ data, status, headers, binary, error }) {
		if (error) throw new Error(error);
		return {
			ok: status >= 200 && status < 300,
			status,
			headers: headers ?? {},
			text: () => Promise.resolve(data),
			json: () => Promise.resolve(JSON.parse(data)),
			blob: () => Promise.resolve(new Blob([
				binary
					? Uint8Array.from(atob(data), c => c.charCodeAt(0))
					: new TextEncoder().encode(data)
			])),
		};
	}

	/**
	 * Extends the game's existing window.electronAPI with modloader-specific methods.
	 * The original API (config, restart, setVsync) is preserved via Object.assign.
	 *
	 * Added methods:
	 *   fetch(url)                    — CORS-bypassing HTTP GET (proxied through main process)
	 *   getValue(key, defaultValue)   — read from mod persistent storage (unnamespaced)
	 *   setValue(key, value)          — write to mod persistent storage (unnamespaced)
	 *   openExternal(url)             — open URL in system browser
	 *   updateMod(url, filename)      — download and overwrite a .client.js file
	 */
	Object.assign(window.electronAPI, {
		fetch: (url) => ipcRenderer.invoke('mod:fetch', url).then(makeResponse),
		getValue: (key, defaultValue) => ipcRenderer.invoke('mod:store:get', key, defaultValue),
		setValue: (key, value) => ipcRenderer.invoke('mod:store:set', key, value),
		openExternal: (url) => ipcRenderer.invoke('mod:open-external', url),
		updateMod: (url, filename) => ipcRenderer.invoke('mod:update-mod', url, filename),
	});

	/**
	 * Simple in-process event bus shared across all loaded mods.
	 * Allows mods to communicate with each other without direct references.
	 *
	 * @type {{ on(event: string, handler: Function): void, off(event: string, handler: Function): void, emit(event: string, data: unknown): void }}
	 */
	const eventBus = (() => {
		const listeners = new Map();
		return {
			on(event, handler) {
				if (!listeners.has(event)) listeners.set(event, new Set());
				listeners.get(event).add(handler);
			},
			off(event, handler) {
				listeners.get(event)?.delete(handler);
			},
			emit(event, data) {
				listeners.get(event)?.forEach(h => {
					try { h(data); } catch (e) { console.error(`[ModLoader] Event error (${event}):`, e); }
				});
			},
		};
	})();

	/** Registry for inter-mod API sharing. Maps modId => public API object. */
	const modRegistry = new Map();

	/**
	 * Global modloader interface exposed to the renderer.
	 *
	 * window.ModLoader.createAPI(modId) is called by mod-loader.js (main process)
	 * when injecting each mod, giving every mod its own scoped API instance.
	 */
	window.ModLoader = {
		events: eventBus,

		/**
		 * Creates a scoped API object for a mod. All storage keys are automatically
		 * namespaced with the mod's ID to prevent collisions between mods.
		 *
		 * @param {string} modId - Filename without .client.js extension
		 * @returns {{
		 *   modId: string,
		 *   fetch(url: string): Promise<object>,
		 *   getValue(key: string, defaultValue: unknown): Promise<unknown>,
		 *   setValue(key: string, value: unknown): Promise<void>,
		 *   openExternal(url: string): Promise<void>,
		 *   updateSelf(url: string): Promise<{ success?: boolean, error?: string }>,
		 *   restart(): void,
		 *   events: typeof eventBus,
		 *   registerAPI(api: object): void,
		 *   getModAPI(targetId: string): object | null,
		 * }}
		 */
		createAPI(modId) {
			return {
				modId,
				fetch: (url) => ipcRenderer.invoke('mod:fetch', url).then(makeResponse),
				getValue: (key, defaultValue) => ipcRenderer.invoke('mod:store:get', `${modId}:${key}`, defaultValue),
				setValue: (key, value) => ipcRenderer.invoke('mod:store:set', `${modId}:${key}`, value),
				openExternal: (url) => ipcRenderer.invoke('mod:open-external', url),
				/** Downloads a new version of this mod and overwrites the local .client.js file. */
				updateSelf: (url) => ipcRenderer.invoke('mod:update-mod', url, `${modId}.client.js`),
				restart: () => ipcRenderer.send('restart'),
				events: eventBus,
				/** Registers a public API object that other mods can retrieve via getModAPI. */
				registerAPI(api) { modRegistry.set(modId, api); },
				/** Returns the public API registered by another mod, or null if not found. */
				getModAPI(targetId) { return modRegistry.get(targetId) ?? null; },
			};
		},
	};
});
