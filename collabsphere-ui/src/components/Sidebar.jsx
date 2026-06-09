import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { initials } from "../utils/format.js";
import { Icons } from "./Icons.jsx";

const NAV = [
  { to: "/feed",     label: "Home",       icon: Icons.Home },
  { to: "/network",  label: "My Network", icon: Icons.Users },
  { to: "/messages", label: "Messages",   icon: Icons.MessageCircle },
  { to: "/spheres",  label: "Spheres",    icon: Icons.Globe },
  { to: "/saved",    label: "Saved",      icon: Icons.Bookmark },
];

export function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <>
      <aside className="sidebar sidebar--rail">
        <nav className="nav-list" aria-label="Primary navigation">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-tip={label}
              aria-label={label}
              className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}
            >
              <Icon />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <NavLink
            className="nav-item nav-item--cta"
            to="/feed?create=true"
            data-tip="Create Post"
            aria-label="Create Post"
          >
            <Icons.Plus />
          </NavLink>

          <NavLink
            to="/profile"
            className="rail-identity"
            data-tip={user?.name || "Profile"}
            aria-label="My profile"
          >
            <div className="avatar avatar--rail">{initials(user?.name || user?.email)}</div>
          </NavLink>

          <button
            className="nav-item nav-item--danger"
            onClick={signOut}
            type="button"
            data-tip="Sign out"
            aria-label="Sign out"
          >
            <Icons.LogOut />
          </button>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-nav__item${isActive ? " is-active" : ""}`}
          >
            <Icon />
            <span>{label.replace("My ", "")}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
