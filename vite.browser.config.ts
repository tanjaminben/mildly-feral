import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  build: { outDir: 'dist/browser', sourcemap: false, modulePreload: { polyfill: false } },
  server: { host: '127.0.0.1', port: 8878, strictPort: true },
});
