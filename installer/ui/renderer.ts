import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open as openFolderDialog } from '@tauri-apps/plugin-dialog';

// Nuntaria is loaded as an inline script via vite's ?raw + dynamic eval trick.
// We inject it once into <head> so window.Nuntaria is always available.
import nuntariaSource from '../assets/libs/nuntaria.js?raw';
(function ensureNuntaria() {
	if ((window as any).Nuntaria) return;
	const s = document.createElement('script');
	s.textContent = nuntariaSource;
	document.head.appendChild(s);
})();

const Nuntaria = (window as any).Nuntaria as { fire: (opts: Record<string, unknown>) => Promise<unknown> };

interface GameLocation {
	gameDir: string;
	asarPath: string;
	exePath: string;
}

interface StatusResult {
	valid: boolean;
	patched: boolean;
	deployed: boolean;
}

interface UpdateInfo {
	latestTag: string;
	installedTag: string | null;
}

let gameLocation: GameLocation | null = null;
let busy = false;

const elPath = document.querySelector<HTMLElement>('[data-ref="game-path"]')!;
const elLoaderPath = document.querySelector<HTMLElement>('[data-ref="loader-path"]')!;
const elLog = document.querySelector<HTMLElement>('[data-ref="log"]')!;
const elInstall = document.querySelector<HTMLButtonElement>('[data-action="install"]')!;
const elRepair = document.querySelector<HTMLButtonElement>('[data-action="repair"]')!;
const elUninstall = document.querySelector<HTMLButtonElement>('[data-action="uninstall"]')!;
const elBrowse = document.querySelector<HTMLButtonElement>('[data-action="browse"]')!;
const elOpenLoader = document.querySelector<HTMLButtonElement>('[data-action="browse-loader"]')!;
const dotPatch = document.querySelector<HTMLElement>('[data-dot="patch"]')!;
const dotLoader = document.querySelector<HTMLElement>('[data-dot="loader"]')!;
const elUpdateBanner = document.getElementById('update-banner')!;
const elUpdateTag = document.getElementById('update-tag')!;

const appWindow = getCurrentWindow();

document.querySelector('[data-action="minimize"]')!.addEventListener('click', () => appWindow.minimize());
document.querySelector('[data-action="close"]')!.addEventListener('click', () => appWindow.close());

invoke<string>('get_version').then((v: string) => {
	const badge = document.querySelector<HTMLElement>('.version-badge');
	if (badge) badge.textContent = `v${v}`;
});

invoke<UpdateInfo | null>('check_update').catch(() => null).then((update) => {
	if (update && update.latestTag !== update.installedTag) {
		elUpdateTag.textContent = update.latestTag;
		elUpdateBanner.style.display = '';
	}
});

listen<string>('log', (event) => {
	const msg = event.payload;
	const type = msg.startsWith('Error') ? 'error'
		: msg.includes('complete') || msg.includes('Done') ? 'success'
			: '';
	appendLog(msg, type);
});

function clearLog(): void {
	elLog.innerHTML = '';
}

function appendLog(msg: string, type = ''): void {
	const wasAtBottom = elLog.scrollHeight - elLog.clientHeight <= elLog.scrollTop + 4;
	const line = document.createElement('span');
	line.className = 'log-line' + (type ? ` ${type}` : '');
	line.textContent = msg;
	elLog.appendChild(line);
	elLog.appendChild(document.createTextNode('\n'));
	if (wasAtBottom) elLog.scrollTop = elLog.scrollHeight;
}



function setDot(el: HTMLElement, state: string): void {
	el.className = 'status-dot' + (state ? ` ${state}` : '');
}

async function refreshStatus(): Promise<void> {
	if (!gameLocation) {
		setDot(dotPatch, '');
		setDot(dotLoader, '');
		return;
	}
	const s = await invoke<StatusResult>('get_status', { gameDir: gameLocation.gameDir }).catch(() => null);
	if (!s || !s.valid) return;
	setDot(dotPatch, s.patched ? 'ok' : 'err');
	setDot(dotLoader, s.deployed ? 'ok' : 'err');
}

function setBusy(value: boolean): void {
	busy = value;
	elInstall.disabled = value || !gameLocation;
	elRepair.disabled = value || !gameLocation;
	elUninstall.disabled = value || !gameLocation;
	elBrowse.disabled = value;
}

function setGameLocation(loc: typeof gameLocation): void {
	gameLocation = loc;
	if (loc) {
		elPath.textContent = loc.gameDir;
		elPath.className = 'path-text found';
	} else {
		elPath.textContent = 'Game not found';
		elPath.className = 'path-text error';
	}
	setBusy(false);
	refreshStatus();
}

(async () => {
	elPath.textContent = 'Searching...';
	elPath.className = 'path-text';
	setBusy(true);

	const [loc] = await Promise.all([
		invoke<GameLocation | null>('find_game').catch(() => null),
		invoke<string>('get_modloader_dir').then((dir: string) => {
			elLoaderPath.textContent = dir;
			elLoaderPath.className = 'path-text found';
		}).catch(() => null),
	]);

	setGameLocation(loc);

	if (!loc) {
		appendLog('Game not found in default locations. Use Browse to select manually.', 'error');
	} else {
		appendLog(`Game found: ${loc.gameDir}`);
	}
})();

elBrowse.addEventListener('click', async () => {
	if (busy) return;
	// Start from current game dir if known, otherwise platform default
	const defaultPath = gameLocation?.gameDir
		?? await invoke<string>('get_default_browse_path').catch(() => undefined);
	const selected = await openFolderDialog({
		directory: true,
		title: 'Select Tanki Online folder',
		defaultPath: defaultPath ?? undefined,
	});
	if (!selected || Array.isArray(selected)) return;
	const loc = await invoke<GameLocation | null>('validate_game_path', { gameDir: selected }).catch(() => null);
	if (loc) {
		setGameLocation(loc);
		clearLog();
		appendLog(`Selected: ${loc.gameDir}`);
	} else {
		appendLog(`Selected folder does not contain a valid Tanki Online installation.`, 'error');
	}
});

elInstall.addEventListener('click', async () => {
	if (busy || !gameLocation) return;
	clearLog();
	setBusy(true);
	appendLog('Installing...');

	try {
		await invoke('install', { gameDir: gameLocation.gameDir });
	} catch (e) {
		appendLog(`Failed: ${e}`, 'error');
	} finally {
		await refreshStatus();
		setBusy(false);
	}
});

elRepair.addEventListener('click', async () => {
	if (busy || !gameLocation) return;
	clearLog();
	setBusy(true);
	appendLog('Repairing...');

	try {
		await invoke('repair', { gameDir: gameLocation.gameDir });
	} catch (e) {
		appendLog(`Failed: ${e}`, 'error');
	} finally {
		await refreshStatus();
		setBusy(false);
	}
});

elUninstall.addEventListener('click', async () => {
	if (busy || !gameLocation) return;

	const confirmed = await Nuntaria.fire({
		type: 'warning',
		title: 'Uninstall VibeTO',
		text: 'The original game files will be restored and the mod loader removed.',
		buttons: [
			{ label: 'Cancel', value: null, variant: 'cancel' },
			{ label: 'Uninstall', value: true, variant: 'danger' },
		],
	}).catch(() => null);

	if (!confirmed) return;

	const keepMods = await Nuntaria.fire({
		type: 'confirm',
		title: 'Keep Your Mods?',
		text: 'Your mod files can be kept in AppData for future use.',
		buttons: [
			{ label: 'Cancel', value: null, variant: 'cancel' },
			{ label: 'Remove Mods', value: false, variant: 'danger' },
			{ label: 'Keep Mods', value: true, variant: 'primary' },
		],
	}).catch(() => null);

	if (keepMods === null) return;

	clearLog();
	setBusy(true);
	try {
		await invoke('uninstall', { gameDir: gameLocation.gameDir, keepMods: keepMods as boolean });
	} catch (e) {
		appendLog(`Failed: ${e}`, 'error');
	} finally {
		await refreshStatus();
		setBusy(false);
	}
});

elOpenLoader.addEventListener('click', async () => {
	try {
		const dir = await invoke<string>('get_modloader_dir');
		await invoke('open_dir', { path: dir });
	} catch (e) {
		appendLog(`Failed to open folder: ${e}`, 'error');
	}
});