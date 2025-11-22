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
      LOG_LEVEL: process.env.VITE_LOG_LEVEL || 'info',
      NODE_ENV: process.env.NODE_ENV || process.env.MODE || 'development',
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
