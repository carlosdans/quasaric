import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// COOP/COEP make the page "cross-origin isolated", which unlocks
// multi-threaded WASM and SharedArrayBuffer. On GitHub Pages the service
// worker (public/sw.js) adds the same headers.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

// Tauri imports are external - they're only available in the desktop app
const tauriExternal = [
  '@tauri-apps/api',
  '@tauri-apps/api/core',
  '@tauri-apps/api/path',
  '@tauri-apps/api/event',
  '@tauri-apps/plugin-dialog',
  '@tauri-apps/plugin-fs',
  '@tauri-apps/plugin',
];

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  clearScreen: false,
  server: { headers: isolation, port: 5173, strictPort: true },
  preview: { headers: isolation },
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 30000,
    rollupOptions: {
      external: tauriExternal,
    },
  },
});
