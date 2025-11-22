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
