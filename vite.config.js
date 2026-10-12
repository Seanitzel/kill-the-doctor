import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { cameraDiagnostics } from './scripts/dev-camera-diagnostics.mjs';
export default defineConfig(({ mode }) => ({ base: mode === 'github-pages' ? '/kill-the-doctor/' : '/', plugins: [vue(),cameraDiagnostics()], build: { target: 'es2022', chunkSizeWarningLimit: 900, rollupOptions: { output: { manualChunks: { three: ['three'], vue: ['vue'] } } } } }));
