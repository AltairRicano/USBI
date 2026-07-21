import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"]
    },
    proxy: {
      "/api": {
        target: "http://192.168.1.210:8088",
        changeOrigin: true
      },
    },
    allowedHosts: ["project.heimdall-lab.com"],
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
  preview: {
    allowedHosts: ["project.heimdall-lab.com"],
  },
  build: {
    chunkSizeWarningLimit: 2000, // Phaser es > 1MB, evitamos el warning
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        }
      }
    }
  }
}));
