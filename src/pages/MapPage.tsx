import { PublicHypercertMap } from "../components/PublicHypercertMap";
import { Link } from "react-router-dom";

/**
 * Public Map Page
 * Displays a full-screen map with hypercert locations
 */
function MapPage() {
  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      {/* Navigation Header */}
      <nav className="landing-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1001, backgroundColor: 'rgba(250, 250, 249, 0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <img 
              src="/photo_2025-11-22_17-29-28.jpg" 
              alt="Cortado" 
              className="brand-logo-image"
            />
          </div>
          <div className="landing-nav-links">
            <Link to="/" className="landing-nav-link">Home</Link>
            <a href="/#how-it-works" className="landing-nav-link">How it works</a>
            <a href="/#contact" className="landing-nav-link">Contact</a>
            <Link to="/app" className="landing-cta-button">
              Go to app
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            </Link>
          </div>
        </div>
      </nav>
      <div style={{ paddingTop: '80px', height: '100vh' }}>
        <PublicHypercertMap />
      </div>
    </div>
  );
}

export default MapPage;

