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
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split large dependencies into separate chunks
          if (id.includes('node_modules')) {
            // Barretenberg (ZK proof library) - very large, split into separate chunk
            if (id.includes('barretenberg') || id.includes('@aztec')) {
              return 'barretenberg';
            }
            // Hypercerts SDK
            if (id.includes('@hypercerts-org') || id.includes('hypercerts')) {
              return 'hypercerts';
            }
            // Viem and related blockchain libraries
            if (id.includes('viem') || id.includes('@wagmi') || id.includes('@tanstack')) {
              return 'blockchain';
            }
            // Coinbase CDP
            if (id.includes('@coinbase/cdp')) {
              return 'coinbase-cdp';
            }
            // Mapbox
            if (id.includes('mapbox') || id.includes('@mapbox')) {
              return 'mapbox';
            }
            // React and React DOM
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Other node_modules
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB (chunks like barretenberg are inherently large)
  },
});
