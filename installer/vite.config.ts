import { defineConfig } from 'vite';

export default defineConfig({
	clearScreen: false,
	server: {
		port: 1420,
		strictPort: true,
		watch: {
			ignored: ['**/target/**'],
		},
	},
	envPrefix: ['VITE_', 'TAURI_'],
	build: {
		target: ['es2022', 'chrome120'],
		minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
		sourcemap: !!process.env.TAURI_DEBUG,
	},
});
