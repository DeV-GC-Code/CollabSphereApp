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
      <aside className="sidebar">
        <nav className="nav-list" aria-label="Primary navigation">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <NavLink to="/profile" className="identity">
            <div className="avatar">{initials(user?.name || user?.email)}</div>
            <div className="identity__text">
              <strong>{user?.name || "Member"}</strong>
              <span>{user?.email}</span>
            </div>
          </NavLink>

          <NavLink
            className="button button--gradient button--block"
            to="/feed?create=true"
            style={{ marginTop: 10 }}
          >
            <Icons.Plus />
            Create Post
          </NavLink>

          <button
            className="nav-item nav-item--danger"
            style={{ marginTop: 4 }}
            onClick={signOut}
            type="button"
          >
            <Icons.LogOut />
            <span>Sign out</span>
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
