import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import App from "./App";

/**
 * AppRouter Component
 * Defines the routing structure for the application
 * - "/" - Landing page (public)
 * - "/app/*" - Authenticated application with nested routes
 */
function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/*" element={<App />} />
    </Routes>
  );
}

export default AppRouter;

