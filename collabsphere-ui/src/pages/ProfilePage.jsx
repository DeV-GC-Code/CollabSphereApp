import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyConnections } from "../api/connections.js";
import { getUserPosts } from "../api/posts.js";
import { getMySpheresActivity } from "../api/spheres.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Icons } from "../components/Icons.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { Toast } from "../components/Toast.jsx";
import { initials } from "../utils/format.js";

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

  const showToast = (message) => {
    setToast(message);
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
      if (conns.status === "fulfilled") {
        setConnectionCount(Array.isArray(conns.value) ? conns.value.length : 0);
      }
      if (posts.status === "fulfilled") {
        setPostCount(Array.isArray(posts.value) ? posts.value.length : 0);
      }
      if (spheres.status === "fulfilled") {
        setJoinedSpheres(Array.isArray(spheres.value) ? spheres.value : []);
      }
    } catch (err) {
      if (err?.status === 401) signOut();
    } finally {
      setLoading(false);
    }
  }, [token, user?.id, signOut]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Load persistent skills from localStorage
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`collabsphere.skills_${user.id}`);
      if (saved) {
        try {
          setSkills(JSON.parse(saved));
        } catch {
          setSkills([]);
        }
      }
    }
  }, [user?.id]);

  const saveSkills = (nextSkills) => {
    setSkills(nextSkills);
    if (user?.id) {
      localStorage.setItem(`collabsphere.skills_${user.id}`, JSON.stringify(nextSkills));
    }
  };

  const installUIUXSkills = () => {
    const bundle = [
      "Figma",
      "UI/UX Design",
      "Wireframing",
      "User Research",
      "Information Architecture",
      "Prototyping",
      "Design Systems",
      "Interaction Design",
      "Usability Testing"
    ];
    // Merge without duplicates
    const merged = Array.from(new Set([...skills, ...bundle]));
    saveSkills(merged);
    showToast("UI/UX Designer Skill Pack installed!");
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const clean = newSkill.trim();
    if (!clean) return;
    if (skills.some(s => s.toLowerCase() === clean.toLowerCase())) {
      showToast("Skill already exists!");
      return;
    }
    const next = [...skills, clean];
    saveSkills(next);
    setNewSkill("");
    showToast(`Added skill: ${clean}`);
  };

  const handleDeleteSkill = (skillToDelete) => {
    const next = skills.filter(s => s !== skillToDelete);
    saveSkills(next);
    showToast(`Removed skill: ${skillToDelete}`);
  };

  // Profile strength meter math
  const checklist = [
    { id: "name", label: "Display Name Set", completed: Boolean(user?.name) },
    { id: "worksAt", label: "Workplace / School Linked", completed: Boolean(user?.worksAt) },
    { id: "skills_min", label: "Add 3+ Core Skills", completed: skills.length >= 3 },
    { id: "skills_adv", label: "Add 5+ Core Skills", completed: skills.length >= 5 },
    { id: "posts", label: "Publish a Community Post", completed: Boolean(postCount && postCount > 0) },
    { id: "connections", label: "Build 1+ Connection", completed: Boolean(connectionCount && connectionCount > 0) },
  ];

  const completedCount = checklist.filter(c => c.completed).length;
  const totalCount = checklist.length;
  const strengthPercent = Math.round((completedCount / totalCount) * 100);

  let levelName = "Beginner";
  let badgeClass = "strength-badge--beginner";
  if (strengthPercent >= 80) {
    levelName = "Elite Specialist";
    badgeClass = "strength-badge--advanced";
  } else if (strengthPercent >= 40) {
    levelName = "Rising Star";
    badgeClass = "strength-badge--intermediate";
  }

  return (
    <div className="page page--wide">
      <section className="profile-hero">
        <div className="profile-hero__banner" />
        <div className="profile-hero__content">
          <div className="profile-hero__avatar">{initials(user?.name || user?.email)}</div>
          <h1>{user?.name || "CollabSphere Member"}</h1>
          {user?.worksAt && (
            <p style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 4 }}>
              <Icons.Briefcase />
              {user.worksAt}
            </p>
          )}
          <p>{user?.email}</p>
          <div className="profile-hero__actions">
            <button
              className="button button--primary"
              type="button"
              onClick={() => showToast("Profile editing coming soon.")}
            >
              <Icons.Edit /> Edit profile
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => navigate("/messages")}
            >
              <Icons.Message /> Message
            </button>
          </div>
        </div>
      </section>

      <section className="profile-grid">
        <article className="glass-card profile-grid__wide">
          <h2>About</h2>
          <p style={{ marginTop: 8, lineHeight: 1.7 }}>
            {user?.name
              ? `${user.name}${user.worksAt ? ` works at ${user.worksAt}` : ""} and is a verified CollabSphere member. Connect to see their posts and activity.`
              : "Update your profile to let your network know more about you."}
          </p>
        </article>

        {/* ── Dynamic Skills Manager ──────────────────────── */}
        <article className="glass-card profile-grid__wide skills-card">
          <div className="skills-card__header">
            <h2>Skills &amp; Expertise</h2>
            {skills.length > 0 && (
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
                {skills.length} skills added
              </span>
            )}
          </div>

          {skills.length === 0 ? (
            <div className="skills-installer-banner">
              <p>
                <strong>Install UI/UX Designer Core Skills!</strong>
                <br />
                Seed your profile immediately with a professional set of design skills including Figma, Wireframing, and Design Systems.
              </p>
              <button
                className="button button--primary button--sm"
                type="button"
                onClick={installUIUXSkills}
              >
                <Icons.Spark style={{ marginRight: 6 }} /> Install UI/UX Designer Pack
              </button>
            </div>
          ) : (
            <div className="skills-grid">
              {skills.map((skill) => (
                <span className="skill-pill" key={skill}>
                  {skill}
                  <button
                    className="skill-pill__delete"
                    type="button"
                    onClick={() => handleDeleteSkill(skill)}
                    aria-label={`Delete skill ${skill}`}
                  >
                    <Icons.X />
                  </button>
                </span>
              ))}
            </div>
          )}

          {skills.length > 0 && skills.length < 5 && (
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-start" }}>
              <button
                className="button button--secondary button--sm"
                type="button"
                style={{ background: "rgba(13, 148, 136, 0.05)", color: "var(--accent)" }}
                onClick={installUIUXSkills}
              >
                <Icons.Spark style={{ marginRight: 6 }} /> Merge UI/UX Designer Pack
              </button>
            </div>
          )}

          <form className="skills-add-form" onSubmit={handleAddSkill}>
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add skill (e.g. React, Kubernetes...)"
              maxLength={30}
            />
            <button className="button button--primary" type="submit">
              <Icons.Plus /> Add
            </button>
          </form>
        </article>

        {/* ── Gamified Profile Strength Card ──────────────── */}
        <article className="glass-card profile-strength-card">
          <div className="profile-strength-header">
            <h3>Profile Strength</h3>
            <span className={`strength-badge ${badgeClass}`}>{levelName}</span>
          </div>

          <div className="strength-progress">
            <div className="strength-progress__meta">
              <span>{strengthPercent}% Complete</span>
              <span>{completedCount}/{totalCount} Items</span>
            </div>
            <div className="strength-progress__track">
              <div
                className="strength-progress__fill"
                style={{ width: `${strengthPercent}%` }}
              />
            </div>
          </div>

          <div className="strength-checklist">
            {checklist.map((item) => (
              <div
                key={item.id}
                className={`strength-checklist__item${item.completed ? " completed" : ""}`}
              >
                {item.completed ? (
                  <Icons.Check style={{ color: "var(--success)" }} />
                ) : (
                  <Icons.Plus style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                )}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card">
          <h2>Network Stats</h2>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
              <Spinner label="Loading stats" />
            </div>
          ) : (
            <div className="metric-strip" style={{ marginTop: 8, gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div>
                <strong>{connectionCount ?? "—"}</strong>
                <span>Connections</span>
              </div>
              <div>
                <strong>{postCount ?? "—"}</strong>
                <span>Posts</span>
              </div>
              <div>
                <strong>{joinedSpheres.length}</strong>
                <span>Spheres</span>
              </div>
            </div>
          )}
        </article>

        <article className="glass-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Spheres</h2>
            {joinedSpheres.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{joinedSpheres.length} joined</span>
            )}
          </div>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
              <Spinner label="Loading spheres" />
            </div>
          ) : joinedSpheres.length === 0 ? (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-muted)" }}>
              You haven't joined any spheres yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {joinedSpheres.slice(0, 6).map((s) => (
                <a
                  key={s.id}
                  href="/spheres"
                  className="chip"
                  style={{ textDecoration: "none", fontSize: 12 }}
                >
                  <Icons.Hub style={{ marginRight: 4 }} />{s.name}
                </a>
              ))}
              {joinedSpheres.length > 6 && (
                <span className="chip" style={{ fontSize: 12, opacity: 0.7 }}>+{joinedSpheres.length - 6} more</span>
              )}
            </div>
          )}
          <a href="/spheres" className="button button--secondary button--sm" style={{ textDecoration: "none" }}>
            <Icons.Globe /> Browse Spheres
          </a>
        </article>
      </section>

      <Toast message={toast} />
    </div>
  );
}
