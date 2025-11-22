import { Link } from "react-router-dom";

/**
 * Landing Page Component
 * Introduces the coffee traceability platform and provides navigation to the app
 */
function LandingPage() {
  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="logo-icon">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
            <span className="landing-brand">Coffee Traceability</span>
          </div>
          <div className="landing-nav-links">
            <a href="#about" className="landing-nav-link">About</a>
            <a href="#how-it-works" className="landing-nav-link">How it works</a>
            <a href="#contact" className="landing-nav-link">Contact</a>
            <Link to="/app" className="landing-cta-button">
              Go to app
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="wave-pattern"></div>
        <div className="hero-content">
          <h1 className="hero-title">Verify and Reward Coffee Excellence</h1>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section" id="about">
        <div className="about-content">
          <div className="about-text">
            <h2 className="section-heading">For Coffee Producers</h2>
            <p className="section-description">
              Document every step of your production journey. Map your farm, track each tree,
              and capture monthly evidence with geotagged photos. Generate verifiable proof
              of your sustainable practices backed by rich data.
            </p>
          </div>
          <div className="about-text">
            <h2 className="section-heading">For Roasters</h2>
            <p className="section-description">
              Access complete traceability from tree to cup. View farm maps, processing methods,
              quality scores, and monthly photo documentation. Make informed purchasing decisions
              with unprecedented transparency.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section" id="how-it-works">
        <h2 className="section-title-large">How It Works</h2>
        <div className="steps-grid">
          <div className="step-item">
            <div className="step-number">01</div>
            <h3 className="step-title">Map Your Farm</h3>
            <p className="step-description">
              Geolocate each coffee tree and define your production areas with precision mapping.
            </p>
          </div>
          <div className="step-item">
            <div className="step-number">02</div>
            <h3 className="step-title">Document Monthly</h3>
            <p className="step-description">
              Upload photos and evidence throughout the growing season with timestamp verification.
            </p>
          </div>
          <div className="step-item">
            <div className="step-number">03</div>
            <h3 className="step-title">Record Metadata</h3>
            <p className="step-description">
              Log processing methods, quality scores, and farming practices for each batch.
            </p>
          </div>
          <div className="step-item">
            <div className="step-number">04</div>
            <h3 className="step-title">Issue Hypercerts</h3>
            <p className="step-description">
              Mint blockchain-backed certificates linking to your verifiable production data.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer" id="contact">
        <div className="footer-content">
          <p className="footer-tagline">
            Powered by <a href="https://hypercerts.org" target="_blank" rel="noopener noreferrer" className="footer-link-inline">Hypercerts</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

