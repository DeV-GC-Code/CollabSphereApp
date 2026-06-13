import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { getSpheres } from "../api/spheres.js";
import { initials } from "../utils/format.js";
import { BrandMark } from "./BrandMark.jsx";
import { Icons } from "./Icons.jsx";

const NAV = [
  { to: "/feed",     label: "Home",     icon: Icons.Home },
  { to: "/network",  label: "Network",  icon: Icons.Users },
  { to: "/messages", label: "Messages", icon: Icons.MessageCircle },
  { to: "/spheres",  label: "Spheres",  icon: Icons.Globe },
  { to: "/saved",    label: "Saved",    icon: Icons.Bookmark },
];

function isJoined(s) {
  return Boolean(s?.joined ?? s?.isMember ?? s?.member ?? s?.isJoined);
}

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { token } = useAuth();
  const [mySpheres, setMySpheres] = useState([]);

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

  return (
    <>
      {/* ── Desktop left rail ─────────────────────────────── */}
      <aside className="rail" aria-label="Primary">
        <NavLink to="/feed" className="rail__brand">
          <BrandMark />
        </NavLink>

        <nav className="rail__nav" aria-label="Primary navigation">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `rail__link${isActive ? " is-active" : ""}`}
            >
              <span className="rail__icon"><Icon /></span>
              <span className="rail__label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {mySpheres.length > 0 && (
          <div className="rail__section">
            <p className="rail__heading">Your spheres</p>
            <div className="rail__spheres">
              {mySpheres.map((s) => (
                <NavLink key={s.id || s._id || s.name} to="/spheres" className="rail__sphere" title={s.name}>
                  <span className="rail__sphere-dot" aria-hidden="true">{(s.name || "?").charAt(0).toUpperCase()}</span>
                  <span className="rail__sphere-name">{s.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        <div className="rail__footer">
          <NavLink to="/profile" className="rail__me">
            <span className="avatar avatar--sm">{initials(user?.name || user?.email)}</span>
            <span className="rail__me-text">
              <strong>{user?.name || "You"}</strong>
              <span>{user?.worksAt || user?.email}</span>
            </span>
          </NavLink>
          <button className="rail__signout" type="button" onClick={signOut} aria-label="Sign out" title="Sign out">
            <Icons.LogOut />
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-nav__item${isActive ? " is-active" : ""}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
