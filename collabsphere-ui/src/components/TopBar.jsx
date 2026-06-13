import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { BrandMark } from "./BrandMark.jsx";
import { Icons } from "./Icons.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";

export function TopBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const runSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/network?q=${encodeURIComponent(q)}` : "/network");
  };

  return (
    <header className="appbar">
      <NavLink className="appbar__brand" to="/feed" aria-label="CollabSphere home">
        <BrandMark withName={false} size={30} />
      </NavLink>

      <form className="appbar__search" onSubmit={runSearch} role="search">
        <Icons.Search />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, spheres, companies…"
          aria-label="Search"
        />
      </form>

      <div className="appbar__actions">
        <ThemeToggle />
        <NavLink className="icon-button" to="/notifications" aria-label="Notifications" title="Notifications">
          <Icons.Bell />
        </NavLink>
      </div>
    </header>
  );
}
