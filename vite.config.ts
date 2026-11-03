import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages serves this project from /FILM-BAZ-NEW/; desktop builds keep relative asset paths.
  base: process.env.GITHUB_PAGES === 'true' ? '/FILM-BAZ-NEW/' : './',
  plugins: [react()],
  clearScreen: false,
  server: {
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
