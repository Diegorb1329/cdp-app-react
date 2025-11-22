import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * Sidebar navigation component
 */
function Sidebar() {
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="sidebar-logo-icon">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
        </svg>
        {!isCollapsed && <h2 className="sidebar-title">Coffee Traceability</h2>}
        <button
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isCollapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        {/* Profile Section */}
        <div className="sidebar-section">
          <button
            className="sidebar-item sidebar-item--parent"
            onClick={() => !isCollapsed && setIsProfileOpen(!isProfileOpen)}
            title={isCollapsed ? "Profile" : ""}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {!isCollapsed && (
              <>
                <span>Profile</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`sidebar-chevron ${isProfileOpen ? 'sidebar-chevron--open' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </>
            )}
          </button>

          {!isCollapsed && isProfileOpen && (
            <div className="sidebar-submenu">
              <Link
                to="/app/wallet"
                className={`sidebar-item sidebar-item--child ${isActive('/app/wallet') ? 'sidebar-item--active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span>Wallet</span>
              </Link>
              <Link
                to="/app/humanity-proof"
                className={`sidebar-item sidebar-item--child ${isActive('/app/humanity-proof') ? 'sidebar-item--active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                  <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                  <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                </svg>
                <span>Humanity Proof</span>
              </Link>
            </div>
          )}

          {/* Collapsed: Show Wallet directly */}
          {isCollapsed && (
            <Link
              to="/app/wallet"
              className={`sidebar-item sidebar-item--collapsed ${isActive('/app/wallet') ? 'sidebar-item--active' : ''}`}
              title="Wallet"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </Link>
          )}
        </div>

        {/* Farms Section */}
        <Link
          to="/app/farms"
          className={`sidebar-item ${isActive('/app/farms') ? 'sidebar-item--active' : ''}`}
          title={isCollapsed ? "Farms" : ""}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          {!isCollapsed && <span>Farms</span>}
        </Link>

        {/* Hypercerts Section */}
        <Link
          to="/app/hypercerts"
          className={`sidebar-item ${isActive('/app/hypercerts') ? 'sidebar-item--active' : ''}`}
          title={isCollapsed ? "Hypercerts" : ""}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          {!isCollapsed && <span>Hypercerts</span>}
        </Link>
      </nav>
    </aside>
  );
}

export default Sidebar;

