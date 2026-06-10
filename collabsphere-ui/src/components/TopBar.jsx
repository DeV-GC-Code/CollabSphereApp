import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { initials } from "../utils/format.js";
import { Icons } from "./Icons.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";

export function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const runSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/network?q=${encodeURIComponent(q)}` : "/network");
  };

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <NavLink className="topbar__brand" to="/feed">
          <div className="brand__sphere">
            <img src="/icon.png" alt="CollabSphere" />
          </div>
          <span>CollabSphere</span>
        </NavLink>

        <form className="topbar__search" onSubmit={runSearch} role="search">
          <Icons.Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, companies…"
            aria-label="Search"
          />
        </form>

        <div className="topbar__actions">
          <ThemeToggle />
          <NavLink className="topbar__icon" to="/notifications" aria-label="Notifications" title="Notifications">
            <Icons.Bell />
          </NavLink>
          <NavLink className="topbar__avatar" to="/profile" aria-label="My profile" title="My profile">
            {initials(user?.name || user?.email)}
          </NavLink>
        </div>
      </div>
    </header>
  );
}
