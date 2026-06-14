import { NavLink } from "react-router-dom";
import { BrandMark } from "./BrandMark.jsx";
import { Icons } from "./Icons.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";

export function TopBar() {
  const openPalette = () => window.dispatchEvent(new CustomEvent("cs:open-palette"));

  return (
    <header className="appbar">
      <NavLink className="appbar__brand" to="/feed" aria-label="CollabSphere home">
        <BrandMark withName={false} size={30} />
      </NavLink>

      {/* Clean Notion-style search trigger (opens the search/jump palette). */}
      <button
        type="button"
        className="appbar__search appbar__search--button"
        onClick={openPalette}
        aria-label="Search people, spheres, or jump to a page"
      >
        <Icons.Search />
        <span className="appbar__search-placeholder">Search…</span>
      </button>

      <div className="appbar__actions">
        <ThemeToggle />
        <NavLink className="icon-button" to="/notifications" aria-label="Notifications" title="Notifications">
          <Icons.Bell />
        </NavLink>
      </div>
    </header>
  );
}
