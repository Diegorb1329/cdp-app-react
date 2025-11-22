// Polyfill for process in browser environment (required by Hypercerts SDK)
if (typeof window !== 'undefined') {
  // Make process available globally
  if (typeof (globalThis as any).process === 'undefined') {
    (globalThis as any).process = {
      env: {
        LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
        NODE_ENV: import.meta.env.MODE || 'development',
      },
      version: '',
      versions: {},
      browser: true,
    };
  }
  // Also add to window for compatibility
  if (typeof (window as any).process === 'undefined') {
    (window as any).process = (globalThis as any).process;
  }
}

import { CDPReactProvider } from "@coinbase/cdp-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppRouter from "./AppRouter.tsx";
import { CDP_CONFIG } from "./config.ts";
import { theme } from "./theme.ts";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <CDPReactProvider config={CDP_CONFIG} theme={theme}>
        <AppRouter />
      </CDPReactProvider>
    </BrowserRouter>
  </StrictMode>,
);
