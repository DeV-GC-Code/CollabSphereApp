import { animate } from "motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyConnections } from "../api/connections.js";
import { getUserPosts } from "../api/posts.js";
import { getMySpheresActivity } from "../api/spheres.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Icons } from "../components/Icons.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { Toast } from "../components/Toast.jsx";
import { initials } from "../utils/format.js";

/* ─────────────────────────────────────────────────────────
   Animated counter hook — counts from 0 to value on mount
───────────────────────────────────────────────────────── */
function useAnimatedCounter(value, duration = 900) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (value === null || value === undefined) return;
    const end = Number(value) || 0;
    const start = 0;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // quartic ease-out
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return display;
}

/* ─────────────────────────────────────────────────────────
   Circular SVG progress ring
───────────────────────────────────────────────────────── */
function StrengthRing({ percent }) {
  const size = 96;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const ringRef = useRef(null);

  useEffect(() => {
    if (!ringRef.current) return;
    animate(
      ringRef.current,
      { strokeDashoffset: [circ, offset] },
      { duration: 1.1, easing: [0.34, 1.56, 0.64, 1] }
    );
  }, [offset, circ]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="var(--outline)"
        strokeWidth={stroke}
      />
      <circle
        ref={ringRef}
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--primary-light)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
   Stat tile component
───────────────────────────────────────────────────────── */
function StatTile({ value, label, icon: Icon, delay = 0 }) {
  const count = useAnimatedCounter(value, 900 + delay);
  return (
    <div className="profile-stat-tile">
      <span className="profile-stat-tile__num">{value === null ? "—" : count}</span>
      <span className="profile-stat-tile__label">
        {Icon && <Icon />}
        {label}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Main ProfilePage
───────────────────────────────────────────────────────── */
export function ProfilePage() {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const [connectionCount, setConnectionCount] = useState(null);
  const [postCount, setPostCount] = useState(null);
  const [joinedSpheres, setJoinedSpheres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  };

  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [conns, posts, spheres] = await Promise.allSettled([
        getMyConnections(token),
        getUserPosts(user.id, token),
        getMySpheresActivity(token),
      ]);
      if (conns.status === "fulfilled") setConnectionCount(Array.isArray(conns.value) ? conns.value.length : 0);
      if (posts.status === "fulfilled") setPostCount(Array.isArray(posts.value) ? posts.value.length : 0);
      if (spheres.status === "fulfilled") setJoinedSpheres(Array.isArray(spheres.value) ? spheres.value : []);
    } catch (err) {
      if (err?.status === 401) signOut();
    } finally {
      setLoading(false);
    }
  }, [token, user?.id, signOut]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(`collabsphere.skills_${user.id}`);
    if (saved) {
      try { setSkills(JSON.parse(saved)); } catch { setSkills([]); }
    }
  }, [user?.id]);

  const saveSkills = (next) => {
    setSkills(next);
    if (user?.id) localStorage.setItem(`collabsphere.skills_${user.id}`, JSON.stringify(next));
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const clean = newSkill.trim();
    if (!clean) return;
    if (skills.some(s => s.toLowerCase() === clean.toLowerCase())) {
      showToast("Skill already added");
      return;
    }
    saveSkills([...skills, clean]);
    setNewSkill("");
    showToast(`Added: ${clean}`);
  };

  const handleDeleteSkill = (s) => {
    saveSkills(skills.filter(x => x !== s));
    showToast(`Removed: ${s}`);
  };

  /* Profile strength */
  const checklist = [
    { id: "name",        label: "Display name set",       done: Boolean(user?.name) },
    { id: "workplace",   label: "Workplace linked",        done: Boolean(user?.worksAt) },
    { id: "skills3",     label: "3+ skills added",         done: skills.length >= 3 },
    { id: "skills5",     label: "5+ skills added",         done: skills.length >= 5 },
    { id: "posts",       label: "Post published",          done: Boolean(postCount && postCount > 0) },
    { id: "connections", label: "1+ connection made",      done: Boolean(connectionCount && connectionCount > 0) },
  ];
  const doneCount = checklist.filter(c => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);
  const levelName = pct >= 80 ? "Elite" : pct >= 40 ? "Rising" : "Starter";

  return (
    <div className="profile-page-v2">

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="profile-hero-v2">
        <div className="profile-hero-v2__mesh" />

        <div className="profile-hero-v2__inner">
          <div className="profile-hero-v2__identity">
            <div className="profile-avatar-ring">
              <div className="profile-avatar-ring__spinner" />
              <div className="profile-avatar-ring__avatar">
                {initials(user?.name || user?.email)}
              </div>
            </div>
            <div className="profile-hero-v2__info">
              <h1 className="profile-hero-v2__name">
                {user?.name || "CollabSphere Member"}
              </h1>
              {user?.worksAt && (
                <p className="profile-hero-v2__meta">
                  <Icons.Briefcase />
                  {user.worksAt}
                </p>
              )}
              <p className="profile-hero-v2__meta">{user?.email}</p>
              <div className="profile-hero-v2__actions">
                <button
                  className="btn-hero btn-hero--primary"
                  type="button"
                  onClick={() => showToast("Profile editing coming soon.")}
                >
                  <Icons.Edit />
                  Edit profile
                </button>
                <button
                  className="btn-hero btn-hero--ghost"
                  type="button"
                  onClick={() => navigate("/messages")}
                >
                  <Icons.Message />
                  Message
                </button>
              </div>
            </div>
          </div>

          {!loading && (
            <div className="profile-hero-v2__stats">
              <StatTile value={connectionCount} label="Connections" icon={Icons.Network} delay={0} />
              <StatTile value={postCount} label="Posts" icon={Icons.Send} delay={100} />
              <StatTile value={joinedSpheres.length} label="Spheres" icon={Icons.Hub} delay={200} />
            </div>
          )}
        </div>
      </section>

      {/* ── BENTO GRID ──────────────────────────────────────── */}
      <div className="profile-bento">

        {/* About */}
        <article className="bento-card bento-about">
          <div className="bento-card__header">
            <span className="bento-card__icon"><Icons.User /></span>
            <h2>About</h2>
          </div>
          <p className="bento-card__body">
            {user?.name
              ? `${user.name}${user.worksAt ? ` works at ${user.worksAt}` : ""} and is a verified CollabSphere member. Connect to see their posts and activity.`
              : "Update your profile to let your network know more about you."}
          </p>
        </article>

        {/* Profile Strength */}
        <article className="bento-card bento-strength">
          <div className="bento-card__header">
            <span className="bento-card__icon"><Icons.Star /></span>
            <h2>Profile<br/>Strength</h2>
          </div>
          <div className="strength-ring-wrap">
            <div className="strength-ring-center">
              <StrengthRing percent={pct} />
              <div className="strength-ring-label">
                <span className="strength-ring-pct">{pct}%</span>
                <span className="strength-ring-level">{levelName}</span>
              </div>
            </div>
            <ul className="strength-list">
              {checklist.map(item => (
                <li key={item.id} className={`strength-list__item${item.done ? " done" : ""}`}>
                  {item.done
                    ? <Icons.Check />
                    : <span className="strength-list__dot" />}
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </article>

        {/* Skills */}
        <article className="bento-card bento-skills">
          <div className="bento-card__header">
            <span className="bento-card__icon"><Icons.Hub /></span>
            <h2>Skills &amp; Expertise</h2>
            {skills.length > 0 && (
              <span className="bento-card__count">{skills.length} skills</span>
            )}
          </div>

          {skills.length === 0 ? (
            <p className="bento-card__empty">
              No skills yet — add your tools, domains, and strengths.
            </p>
          ) : (
            <div className="skills-bubble-grid">
              {skills.map((skill) => (
                <span key={skill} className="skill-bubble">
                  {skill}
                  <button
                    type="button"
                    className="skill-bubble__del"
                    onClick={() => handleDeleteSkill(skill)}
                    aria-label={`Remove ${skill}`}
                  >
                    <Icons.X />
                  </button>
                </span>
              ))}
            </div>
          )}

          <form className="skills-add-row" onSubmit={handleAddSkill}>
            <input
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              placeholder="Add skill  e.g. React, Kubernetes…"
              maxLength={30}
            />
            <button className="btn-add" type="submit">
              <Icons.Plus />
            </button>
          </form>
        </article>

        {/* Spheres */}
        <article className="bento-card bento-spheres">
          <div className="bento-card__header">
            <span className="bento-card__icon"><Icons.Globe /></span>
            <h2>Spheres</h2>
            {joinedSpheres.length > 0 && (
              <span className="bento-card__count">{joinedSpheres.length} joined</span>
            )}
          </div>

          {loading ? (
            <div className="bento-spinner"><Spinner label="Loading" /></div>
          ) : joinedSpheres.length === 0 ? (
            <p className="bento-card__empty">You haven't joined any spheres yet.</p>
          ) : (
            <div className="spheres-chip-grid">
              {joinedSpheres.slice(0, 8).map(s => (
                <a key={s.id} href="/spheres" className="sphere-chip">
                  <Icons.Hub />
                  {s.name}
                </a>
              ))}
              {joinedSpheres.length > 8 && (
                <span className="sphere-chip sphere-chip--more">+{joinedSpheres.length - 8}</span>
              )}
            </div>
          )}

          <a href="/spheres" className="bento-link-btn">
            Explore Spheres <Icons.ChevronRight />
          </a>
        </article>

        {/* Network */}
        <article className="bento-card bento-network">
          <div className="bento-card__header">
            <span className="bento-card__icon"><Icons.Network /></span>
            <h2>Network</h2>
          </div>

          {loading ? (
            <div className="bento-spinner"><Spinner label="Loading" /></div>
          ) : (
            <div className="network-stat-grid">
              <div className="network-stat">
                <span className="network-stat__num">{connectionCount ?? "—"}</span>
                <span className="network-stat__label">Connections</span>
              </div>
              <div className="network-stat">
                <span className="network-stat__num">{postCount ?? "—"}</span>
                <span className="network-stat__label">Posts</span>
              </div>
            </div>
          )}

          <a href="/network" className="bento-link-btn">
            Grow network <Icons.ChevronRight />
          </a>
        </article>

      </div>

      <Toast message={toast} />
    </div>
  );
}
