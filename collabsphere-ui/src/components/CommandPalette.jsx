import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useTheme } from "../auth/ThemeContext.jsx";
import { searchPeople } from "../api/connections.js";
import { getSpheres } from "../api/spheres.js";
import { Icons } from "./Icons.jsx";
import { initials } from "../utils/format.js";

/**
 * CommandPalette — the navigation spine (⌘K / Ctrl+K).
 *
 * First-principles redesign (see /REDESIGN.md §4, §14 P0): for a keyboard-native
 * audience (recruiters/engineers who live in Linear, GitHub, Vercel) the fastest
 * navigation is no navigation. This demotes the rail to a glanceable map and gives
 * search a real home — replacing the old top-bar box that dead-ended at /network.
 *
 * Additive and non-breaking: mounted once in AppShell, owns its own open state via
 * a global keydown listener. Accessible: role=dialog + aria-modal, ↑/↓/Enter/Esc,
 * aria-activedescendant, focus restored to the previously-focused element on close.
 */

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

export function CommandPalette() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toggle: toggleTheme, isDark } = useTheme();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [people, setPeople] = useState([]);
  const [spheres, setSpheres] = useState([]);
  const [searching, setSearching] = useState(false);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setPeople([]);
    setSpheres([]);
    setActive(0);
    // Restore focus to whatever triggered the palette (a11y).
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
    { id: "nav-home", group: "Go to", label: "Home", icon: Icons.Home, keywords: "feed posts", run: () => navigate("/feed") },
    { id: "nav-network", group: "Go to", label: "Network", icon: Icons.Users, keywords: "people connections graph requests", run: () => navigate("/network") },
    { id: "nav-messages", group: "Go to", label: "Messages", icon: Icons.MessageCircle, keywords: "dm chat inbox", run: () => navigate("/messages") },
    { id: "nav-spheres", group: "Go to", label: "Spheres", icon: Icons.Globe, keywords: "communities rooms threads", run: () => navigate("/spheres") },
    { id: "nav-notifs", group: "Go to", label: "Notifications", icon: Icons.Bell, keywords: "activity alerts", run: () => navigate("/notifications") },
    { id: "nav-saved", group: "Go to", label: "Saved", icon: Icons.Bookmark, keywords: "bookmarks", run: () => navigate("/saved") },
    { id: "nav-profile", group: "Go to", label: "Profile", icon: Icons.User, keywords: "me account you", run: () => navigate("/profile") },
    { id: "act-post", group: "Actions", label: "New post", icon: Icons.Plus, keywords: "compose write create", run: () => navigate("/feed") },
    { id: "act-find", group: "Actions", label: "Find people", icon: Icons.Network, keywords: "search connect", run: () => navigate("/network") },
    { id: "act-theme", group: "Actions", label: isDark ? "Switch to light mode" : "Switch to dark mode", icon: isDark ? Icons.Sun : Icons.Moon, keywords: "theme dark light", run: () => toggleTheme() },
  ], [navigate, toggleTheme, isDark]);

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
    filteredCommands.forEach(push);
    people.forEach((p) => push({
      id: `person-${p.userId}`,
      group: "People",
      label: p.name || p.email || "Unknown",
      sub: p.worksAt || p.email,
      person: p,
      run: () => navigate(`/network?q=${encodeURIComponent(p.name || p.email || "")}`),
    }));
    spheres.forEach((s) => push({
      id: `sphere-${s.id || s._id}`,
      group: "Spheres",
      label: s.name || "Sphere",
      sub: Array.isArray(s.tags) && s.tags.length ? s.tags.map((t) => `#${t}`).join("  ") : undefined,
      icon: Icons.Globe,
      run: () => navigate("/spheres"),
    }));
    return items;
  }, [filteredCommands, people, spheres, navigate]);

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
        </div>

        <ul className="cmdk__list" id="cmdk-list" role="listbox" ref={listRef} aria-label="Results">
          {results.length === 0 && (
            <li className="cmdk__empty" role="presentation">
              No matches for “{query.trim()}”. Try a name, a sphere, or a page.
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
