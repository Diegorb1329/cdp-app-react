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
            // Only load when needed (lazy loaded in HumanityProofPage)
            if (id.includes('barretenberg') || id.includes('@aztec') || id.includes('@noir-lang')) {
              return 'barretenberg';
            }
            // Hypercerts SDK - only load when HypercertsPage is accessed
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
            // Mapbox - only load when map components are used
            if (id.includes('mapbox') || id.includes('@mapbox')) {
              return 'mapbox';
            }
            // React and React DOM
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Supabase client
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Other node_modules
            return 'vendor';
          }
          // Split large source files
          if (id.includes('src/components/FarmMap')) {
            return 'mapbox'; // FarmMap uses Mapbox, so bundle together
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500, // Increase warning limit to 1.5MB (chunks like barretenberg are inherently large)
    target: 'esnext', // Use modern JS for better tree-shaking
    minify: 'esbuild', // Use esbuild for faster builds (default, but explicit)
    // Optimize chunk loading
    cssCodeSplit: true, // Split CSS into separate files
    sourcemap: false, // Disable sourcemaps in production to reduce size
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'], // Pre-bundle these
    exclude: ['@hypercerts-org/sdk', 'mapbox-gl'], // Exclude large libs from pre-bundling (they'll be lazy loaded)
  },
});

