import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { initials } from "../utils/format.js";
import { CreatePostModal } from "./CreatePostModal.jsx";
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
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <>
      <nav className="dock" aria-label="Primary navigation">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            data-tip={label}
            aria-label={label}
            className={({ isActive }) => `dock__item${isActive ? " is-active" : ""}`}
          >
            <Icon />
          </NavLink>
        ))}

        <span className="dock__sep" aria-hidden="true" />

        <button
          className="dock__item dock__item--cta"
          type="button"
          onClick={() => setComposeOpen(true)}
          data-tip="Create Post"
          aria-label="Create Post"
        >
          <Icons.Plus />
        </button>

        <NavLink
          to="/profile"
          className="dock__item dock__item--avatar"
          data-tip={user?.name || "Profile"}
          aria-label="My profile"
        >
          <span className="avatar avatar--dock">{initials(user?.name || user?.email)}</span>
        </NavLink>

        <button
          className="dock__item dock__item--danger"
          onClick={signOut}
          type="button"
          data-tip="Sign out"
          aria-label="Sign out"
        >
          <Icons.LogOut />
        </button>
      </nav>

      {composeOpen && <CreatePostModal onClose={() => setComposeOpen(false)} />}

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
