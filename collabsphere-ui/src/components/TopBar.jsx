import { NavLink } from "react-router-dom";
import { BrandMark } from "./BrandMark.jsx";
import { Icons } from "./Icons.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

export function TopBar() {
  const openPalette = () => window.dispatchEvent(new CustomEvent("cs:open-palette"));

  return (
    <header className="appbar">
      <NavLink className="appbar__brand" to="/feed" aria-label="CollabSphere home">
        <BrandMark withName={false} size={30} />
      </NavLink>

      {/* Search is now the command-palette trigger, not a dead-end to /network. */}
      <button
        type="button"
        className="appbar__search appbar__search--button"
        onClick={openPalette}
        aria-label="Open command palette to search people, spheres, or jump to a page"
      >
        <Icons.Search />
        <span className="appbar__search-placeholder">Search or jump to…</span>
        <kbd className="appbar__search-kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
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
