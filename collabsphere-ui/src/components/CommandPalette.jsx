import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useTheme } from "../auth/ThemeContext.jsx";
import { searchPeople } from "../api/connections.js";
import { getSpheres } from "../api/spheres.js";
import { Icons } from "./Icons.jsx";
import { initials } from "../utils/format.js";

/**
 * CommandPalette — the navigation spine (⌘K / Ctrl+K).
 * Rich command center with recent items, actions, people, and spheres search.
 */

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

export function CommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const { toggle: toggleTheme, isDark } = useTheme();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [people, setPeople] = useState([]);
  const [spheres, setSpheres] = useState([]);
  const [searching, setSearching] = useState(false);
  const [recentItems, setRecentItems] = useState(() => {
    try {
      const saved = localStorage.getItem("cs:recent-items");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const restoreFocusRef = useRef(null);

  // Add to recent items
  const addToRecent = useCallback((item) => {
    setRecentItems(prev => {
      const filtered = prev.filter(i => i.id !== item.id);
      const next = [item, ...filtered].slice(0, 8);
      localStorage.setItem("cs:recent-items", JSON.stringify(next));
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setPeople([]);
    setSpheres([]);
    setActive(0);
    const el = restoreFocusRef.current;
    if (el && typeof el.focus === "function") el.focus();
  }, []);

  // Global open shortcut: ⌘K / Ctrl+K, and "/" when not typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key?.toLowerCase();
      const inField = /^(input|textarea|select)$/i.test(e.target?.tagName || "") || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        restoreFocusRef.current = document.activeElement;
        setOpen((o) => !o);
      } else if (k === "/" && !inField && !open) {
        e.preventDefault();
        restoreFocusRef.current = document.activeElement;
        setOpen(true);
      }
    };
    const onOpenEvent = () => {
      restoreFocusRef.current = document.activeElement;
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("cs:open-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cs:open-palette", onOpenEvent);
    };
  }, [open]);

  // Focus the input when opened.
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Debounced entity search (people + spheres) once query is meaningful.
  useEffect(() => {
    if (!open) return undefined;
    const q = query.trim();
    if (q.length < 2 || !token) {
      setPeople([]);
      setSpheres([]);
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const [ppl, sph] = await Promise.allSettled([
          searchPeople(q, token),
          getSpheres(q, token),
        ]);
        if (cancelled) return;
        setPeople(ppl.status === "fulfilled" && Array.isArray(ppl.value) ? ppl.value.slice(0, 5) : []);
        setSpheres(sph.status === "fulfilled" && Array.isArray(sph.value) ? sph.value.slice(0, 5) : []);
      } catch {
        if (!cancelled) { setPeople([]); setSpheres([]); }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, open, token]);

  // Static commands: navigation + actions.
  const baseCommands = useMemo(() => [
    { id: "nav-home", group: "Go to", label: "Home", icon: Icons.Home, shortcut: isMac ? "⌘1" : "Ctrl 1", keywords: "feed posts", run: () => { navigate("/feed"); addToRecent({ id: "nav-home", label: "Home", icon: Icons.Home, path: "/feed" }); } },
    { id: "nav-network", group: "Go to", label: "Network", icon: Icons.Users, shortcut: isMac ? "⌘2" : "Ctrl 2", keywords: "people connections graph requests", run: () => { navigate("/network"); addToRecent({ id: "nav-network", label: "Network", icon: Icons.Users, path: "/network" }); } },
    { id: "nav-messages", group: "Go to", label: "Messages", icon: Icons.MessageCircle, shortcut: isMac ? "⌘3" : "Ctrl 3", keywords: "dm chat inbox", run: () => { navigate("/messages"); addToRecent({ id: "nav-messages", label: "Messages", icon: Icons.MessageCircle, path: "/messages" }); } },
    { id: "nav-spheres", group: "Go to", label: "Spheres", icon: Icons.Globe, shortcut: isMac ? "⌘4" : "Ctrl 4", keywords: "communities rooms threads", run: () => { navigate("/spheres"); addToRecent({ id: "nav-spheres", label: "Spheres", icon: Icons.Globe, path: "/spheres" }); } },
    { id: "nav-notifs", group: "Go to", label: "Notifications", icon: Icons.Bell, keywords: "activity alerts", run: () => { navigate("/notifications"); addToRecent({ id: "nav-notifs", label: "Notifications", icon: Icons.Bell, path: "/notifications" }); } },
    { id: "nav-saved", group: "Go to", label: "Saved", icon: Icons.Bookmark, keywords: "bookmarks", run: () => { navigate("/saved"); addToRecent({ id: "nav-saved", label: "Saved", icon: Icons.Bookmark, path: "/saved" }); } },
    { id: "nav-profile", group: "Go to", label: "Profile", icon: Icons.User, shortcut: isMac ? "⌘," : "Ctrl ,", keywords: "me account you settings", run: () => { navigate("/profile"); addToRecent({ id: "nav-profile", label: "Profile", icon: Icons.User, path: "/profile" }); } },
    { id: "act-post", group: "Actions", label: "New Post", icon: Icons.Plus, shortcut: isMac ? "⌘N" : "Ctrl N", keywords: "compose write create", run: () => { navigate("/feed?create=true"); addToRecent({ id: "act-post", label: "New Post", icon: Icons.Plus, path: "/feed?create=true" }); } },
    { id: "act-find", group: "Actions", label: "Find People", icon: Icons.Network, shortcut: isMac ? "⌘F" : "Ctrl F", keywords: "search connect", run: () => { navigate("/network"); addToRecent({ id: "act-find", label: "Find People", icon: Icons.Network, path: "/network" }); } },
    { id: "act-theme", group: "Actions", label: isDark ? "Switch to Light Mode" : "Switch to Dark Mode", icon: isDark ? Icons.Sun : Icons.Moon, shortcut: isMac ? "⌘D" : "Ctrl D", keywords: "theme dark light", run: () => toggleTheme() },
    { id: "act-refresh", group: "Actions", label: "Refresh Page", icon: Icons.Refresh, shortcut: isMac ? "⌘R" : "Ctrl R", keywords: "reload update", run: () => window.location.reload() },
  ], [navigate, toggleTheme, isDark, addToRecent]);

  const q = query.trim().toLowerCase();
  const filteredCommands = useMemo(() => {
    if (!q) return baseCommands;
    return baseCommands.filter((c) => (`${c.label} ${c.keywords}`).toLowerCase().includes(q));
  }, [baseCommands, q]);

  // Build a flat, indexable result list so arrow keys traverse everything.
  const results = useMemo(() => {
    const items = [];
    let lastGroup = null;
    const push = (item) => {
      if (item.group !== lastGroup) { item.firstInGroup = true; lastGroup = item.group; }
      items.push(item);
    };

    // Recent items first (when query is empty)
    if (!q && recentItems.length > 0) {
      recentItems.forEach((item, idx) => {
        push({
          ...item,
          group: "Recent",
          firstInGroup: idx === 0,
          run: () => { navigate(item.path); addToRecent(item); },
        });
      });
    }

    filteredCommands.forEach(push);
    people.forEach((p) => push({
      id: `person-${p.userId}`,
      group: "People",
      label: p.name || p.email || "Unknown",
      sub: p.worksAt || p.email,
      person: p,
      run: () => { navigate(`/network?q=${encodeURIComponent(p.name || p.email || "")}`); addToRecent({ id: `person-${p.userId}`, label: p.name, icon: Icons.User, path: `/network?q=${encodeURIComponent(p.name || "")}` }); },
    }));
    spheres.forEach((s) => push({
      id: `sphere-${s.id || s._id}`,
      group: "Spheres",
      label: s.name || "Sphere",
      sub: Array.isArray(s.tags) && s.tags.length ? s.tags.map((t) => `#${t}`).join("  ") : undefined,
      icon: Icons.Globe,
      run: () => { navigate("/spheres"); addToRecent({ id: `sphere-${s.id || s._id}`, label: s.name, icon: Icons.Globe, path: "/spheres" }); },
    }));
    return items;
  }, [filteredCommands, people, spheres, navigate, recentItems, q, addToRecent]);

  // Keep the active index in range as results change.
  useEffect(() => { setActive((i) => Math.min(i, Math.max(0, results.length - 1))); }, [results.length]);

  // Scroll the active row into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const exec = (item) => { if (!item) return; close(); item.run(); };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); exec(results[active]); }
  };

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={close} role="presentation">
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmdk__search">
          <Icons.Search />
          <input
            ref={inputRef}
            className="cmdk__input"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search people, spheres, or jump to…"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={results[active] ? `cmdk-opt-${active}` : undefined}
            aria-autocomplete="list"
            spellCheck={false}
            autoComplete="off"
          />
          {searching && <span className="cmdk__hint cmdk__hint--mono">searching…</span>}
          {!searching && q && <span className="cmdk__hint cmdk__hint--mono">↵ to select</span>}
        </div>

        <ul className="cmdk__list" id="cmdk-list" role="listbox" ref={listRef} aria-label="Results">
          {results.length === 0 && q && (
            <li className="cmdk__empty" role="presentation">
              No matches for “{query.trim()}”. Try a name, a sphere, or a page.
            </li>
          )}
          {results.length === 0 && !q && recentItems.length === 0 && (
            <li className="cmdk__empty" role="presentation">
              Press <kbd>{isMac ? "⌘K" : "Ctrl K"}</kbd> to open, type to search.
            </li>
          )}
          {results.map((item, idx) => {
            const Icon = item.icon;
            return (
              <li key={item.id} role="presentation">
                {item.firstInGroup && <div className="cmdk__group" aria-hidden="true">{item.group}</div>}
                <div
                  id={`cmdk-opt-${idx}`}
                  data-idx={idx}
                  role="option"
                  aria-selected={idx === active}
                  className={`cmdk__item${idx === active ? " is-active" : ""}`}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => exec(item)}
                >
                  <span className="cmdk__icon">
                    {item.person
                      ? <span className="cmdk__avatar">{initials(item.label)}</span>
                      : Icon ? <Icon /> : <Icons.Hash />}
                  </span>
                  <span className="cmdk__label">
                    {item.label}
                    {item.sub && <span className="cmdk__sub">{item.sub}</span>}
                  </span>
                  {item.shortcut && <span className="cmdk__shortcut">{item.shortcut}</span>}
                  {idx === active && <span className="cmdk__enter cmdk__hint--mono" aria-hidden="true">↵</span>}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="cmdk__footer" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
          <span className="cmdk__footer-spacer" />
          <span className="cmdk__hint--mono">{isMac ? "⌘K" : "Ctrl K"}</span>
        </div>
      </div>
    </div>
  );
}