import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { getSpheres } from "../api/spheres.js";
import { initials } from "../utils/format.js";
import { BrandMark } from "./BrandMark.jsx";
import { Icons } from "./Icons.jsx";
import { useViewTransition } from "./ViewTransition.jsx";

const NAV = [
  { to: "/feed",     label: "Home",     icon: Icons.Home, shortcut: "⌘1" },
  { to: "/network",  label: "Network",  icon: Icons.Users, shortcut: "⌘2" },
  { to: "/messages", label: "Messages", icon: Icons.MessageCircle, shortcut: "⌘3" },
  { to: "/spheres",  label: "Spheres",  icon: Icons.Globe, shortcut: "⌘4" },
  { to: "/saved",    label: "Saved",    icon: Icons.Bookmark, shortcut: "⌘5" },
];

function isJoined(s) {
  return Boolean(s?.joined ?? s?.isMember ?? s?.member ?? s?.isJoined);
}

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { token } = useAuth();
  const location = useLocation();
  const { startTransition } = useViewTransition();
  const [mySpheres, setMySpheres] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    navigation: true,
    spheres: true,
  });
  const sidebarRef = useRef(null);

  // Load spheres
  useEffect(() => {
    let ignore = false;
    getSpheres("", token)
      .then((list) => {
        if (ignore || !Array.isArray(list)) return;
        const joined = list.filter(isJoined);
        setMySpheres((joined.length ? joined : list).slice(0, 5));
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [token]);

  // Toggle sidebar collapse
  const toggleCollapse = () => {
    startTransition(() => {
      setIsCollapsed(prev => !prev);
    });
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    startTransition(() => {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    });
  };

  // Keyboard shortcut: Cmd/Ctrl + B
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapse]);

  // Auto-expand on hover when collapsed
  const handleMouseEnter = () => {
    if (isCollapsed) setIsCollapsed(false);
  };

  const handleMouseLeave = () => {
    // Don't auto-collapse on leave - let user control it
  };

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

  return (
    <>
      {/* ── Desktop left rail ─────────────────────────────── */}
      <aside 
        ref={sidebarRef}
        className={`rail ${isCollapsed ? "rail--collapsed" : ""} ${expandedSections.navigation ? "" : "rail--nav-collapsed"} ${expandedSections.spheres ? "" : "rail--spheres-collapsed"}`}
        aria-label="Primary navigation"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <NavLink to="/feed" className="rail__brand" aria-label="CollabSphere Home">
          <BrandMark 
            withName={!isCollapsed} 
            size={isCollapsed ? 28 : 32}
            transitionName="brand-mark"
          />
        </NavLink>

        {/* Navigation Section */}
        <div className="rail__section rail__section--navigation">
          <div className="rail__section-header" onClick={() => toggleSection("navigation")}>
            {expandedSections.navigation && !isCollapsed && (
              <p className="rail__heading">Navigation</p>
            )}
            <button 
              className="rail__section-toggle" 
              aria-label={expandedSections.navigation ? "Collapse navigation" : "Expand navigation"}
              aria-expanded={expandedSections.navigation}
            >
              <Icons.ChevronRight className={expandedSections.navigation ? "expanded" : ""} />
            </button>
          </div>
          
          <nav 
            className="rail__nav" 
            aria-label="Primary navigation"
            style={{ 
              maxHeight: expandedSections.navigation ? "500px" : "0",
              opacity: expandedSections.navigation ? 1 : 0,
              overflow: "hidden",
              transition: "max-height var(--t-slow) var(--ease-out), opacity var(--t-fast) var(--ease-out)"
            }}
          >
            {NAV.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`rail__link ${isActive ? "is-active" : ""}`}
                  style={{ viewTransitionName: isActive ? "nav-active" : undefined }}
                >
                  <span className="rail__icon"><Icon /></span>
                  <span className="rail__label">{label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Your Spheres Section */}
        {mySpheres.length > 0 && (
          <div className="rail__section rail__section--spheres">
            <div className="rail__section-header" onClick={() => toggleSection("spheres")}>
              {expandedSections.spheres && !isCollapsed && (
                <p className="rail__heading">Your spheres</p>
              )}
              <button 
                className="rail__section-toggle" 
                aria-label={expandedSections.spheres ? "Collapse spheres" : "Expand spheres"}
                aria-expanded={expandedSections.spheres}
              >
                <Icons.ChevronRight className={expandedSections.spheres ? "expanded" : ""} />
              </button>
            </div>
            
            <div 
              className="rail__spheres"
              style={{ 
                maxHeight: expandedSections.spheres ? "300px" : "0",
                opacity: expandedSections.spheres ? 1 : 0,
                overflow: "hidden",
                transition: "max-height var(--t-slow) var(--ease-out), opacity var(--t-fast) var(--ease-out)"
              }}
            >
              {mySpheres.map((s) => (
                <NavLink 
                  key={s.id || s._id || s.name} 
                  to="/spheres" 
                  className="rail__sphere" 
                  title={s.name}
                >
                  <span className="rail__sphere-dot" aria-hidden="true">
                    {(s.name || "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="rail__sphere-name">{s.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        <div className="rail__footer">
          <NavLink to="/profile" className="rail__me">
            <span className="avatar avatar--sm">{initials(user?.name || user?.email)}</span>
            {!isCollapsed && expandedSections.navigation && (
              <span className="rail__me-text">
                <strong>{user?.name || "You"}</strong>
                <span>{user?.worksAt || user?.email}</span>
              </span>
            )}
          </NavLink>
          <button 
            className="rail__signout" 
            type="button" 
            onClick={signOut} 
            aria-label="Sign out" 
            title="Sign out"
          >
            <Icons.LogOut />
          </button>
        </div>

        {/* Collapse toggle button */}
        <button 
          className="rail__collapse-toggle" 
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
        >
          <Icons.ChevronLeft className={isCollapsed ? "collapsed" : ""} />
        </button>
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`mobile-nav__item ${isActive ? "is-active" : ""}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}