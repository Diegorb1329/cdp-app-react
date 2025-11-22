import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * Landing Page Component
 * Introduces the coffee traceability platform and provides navigation to the app
 */
function LandingPage() {
  const [activeVersion, setActiveVersion] = useState<"producers" | "roasters">("producers");
  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <img 
              src="/photo_2025-11-22_17-29-28.jpg" 
              alt="Cortado" 
              className="brand-logo-image"
            />
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
          <div className="hero-left">
            <h1 className="hero-title">Verify and Reward Coffee Excellence</h1>
          </div>
          <div className="hero-right">
            <img 
              src="/photo_2025-11-22_17-29-20.jpg" 
              alt="Coffee Excellence" 
              className="hero-image"
            />
          </div>
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
        <div className="how-it-works-container">
          {/* Tab Buttons */}
          <div className="version-tabs">
            <button
              className={`version-tab ${activeVersion === "producers" ? "active" : ""}`}
              onClick={() => setActiveVersion("producers")}
            >
              For Producers
            </button>
            <button
              className={`version-tab ${activeVersion === "roasters" ? "active" : ""}`}
              onClick={() => setActiveVersion("roasters")}
            >
              For Supporters
            </button>
          </div>

          {/* Steps Content */}
          <div className="how-it-works-content">
            {activeVersion === "producers" ? (
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
                  <h3 className="step-title">Get Funded for Your Data</h3>
                  <p className="step-description">
                    Receive funding from roasters and buyers who value your transparent and verifiable production data.
                  </p>
                </div>
              </div>
            ) : (
              <div className="steps-grid">
                <div className="step-item">
                  <div className="step-number">01</div>
                  <h3 className="step-title">Fund Traceability</h3>
                  <p className="step-description">
                    Invest in coffee producers by funding their traceability data collection and verification processes.
                  </p>
                </div>
                <div className="step-item">
                  <div className="step-number">02</div>
                  <h3 className="step-title">Access Complete Data</h3>
                  <p className="step-description">
                    View farm maps, processing methods, quality scores, and monthly photo documentation from funded producers.
                  </p>
                </div>
                <div className="step-item">
                  <div className="step-number">03</div>
                  <h3 className="step-title">Verify Quality</h3>
                  <p className="step-description">
                    Review verifiable proof of sustainable practices and production metadata for informed purchasing decisions.
                  </p>
                </div>
                <div className="step-item">
                  <div className="step-number">04</div>
                  <h3 className="step-title">Purchase with Confidence</h3>
                  <p className="step-description">
                    Make transparent purchasing decisions backed by blockchain-verified certificates and complete traceability.
                  </p>
                </div>
              </div>
            )}
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

