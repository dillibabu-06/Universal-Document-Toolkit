import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Prevent Vite from obscuring Rust errors
  clearScreen: false,
  // Tauri expects a fixed port, fail if it is already in use
  server: {
    port: 5173,
    strictPort: true,
  },
  // Define environment variables targeting Tauri builds
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // Tauri supports es2021
    target: ["es2021", "chrome100", "safari13"],
    // Don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    outDir: 'dist',
  },
});
