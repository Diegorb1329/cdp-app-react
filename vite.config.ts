import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  define: {
    // Polyfill for process.env that Hypercerts SDK needs
    'process.env': JSON.stringify({
      LOG_LEVEL: (import.meta as any).env?.VITE_LOG_LEVEL || 'info',
      NODE_ENV: (import.meta as any).env?.MODE || 'development',
    }),
    // Define process as a global object
    global: 'globalThis',
  },
  resolve: {
    alias: {
      process: 'process/browser',
    },
  },
});
