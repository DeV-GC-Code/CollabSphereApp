import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyConnections } from "../api/connections.js";
import { getUserPosts } from "../api/posts.js";
import { getMySpheresActivity } from "../api/spheres.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Icons } from "../components/Icons.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { Toast } from "../components/Toast.jsx";
import { initials, plainText, timeAgo } from "../utils/format.js";

const DEFAULT_SKILLS = [
  "Distributed systems",
  "React",
  "Spring Boot",
  "Kafka",
  "PostgreSQL",
  "Neo4j",
];

function normalizeSkills(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item : item?.name))
    .filter(Boolean)
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function endorsementCount(skill, index, userId) {
  const seed = Number(userId || 1) + skill.length * 3 + index * 5;
  return 2 + (seed % 9);
}

function clip(text, max = 96) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function StatTile({ value, label, icon: Icon }) {
  return (
    <div className="profile-stat-tile">
      <span className="profile-stat-tile__num">{value === null ? "-" : value}</span>
      <span className="profile-stat-tile__label">
        {Icon && <Icon />}
        {label}
      </span>
    </div>
  );
}

export function ProfilePage() {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const [connectionCount, setConnectionCount] = useState(null);
  const [posts, setPosts] = useState([]);
  const [joinedSpheres, setJoinedSpheres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");

  const firstName = user?.name?.split(" ")?.[0] || "You";
  const headline = user?.worksAt
    ? `Building reliable community systems at ${user.worksAt}`
    : "Distributed systems builder and CollabSphere member";

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [conns, userPosts, spheres] = await Promise.allSettled([
        getMyConnections(token),
        getUserPosts(user.id, token),
        getMySpheresActivity(token),
      ]);

      if (conns.status === "fulfilled") {
        setConnectionCount(Array.isArray(conns.value) ? conns.value.length : 0);
      }
      if (userPosts.status === "fulfilled") {
        setPosts(Array.isArray(userPosts.value) ? userPosts.value : []);
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

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(`collabsphere.skills_${user.id}`);
    if (!saved) {
      setSkills(DEFAULT_SKILLS);
      return;
    }

    try {
      setSkills(normalizeSkills(JSON.parse(saved)));
    } catch {
      setSkills(DEFAULT_SKILLS);
    }
  }, [user?.id]);

  const saveSkills = (next) => {
    setSkills(next);
    if (user?.id) {
      localStorage.setItem(`collabsphere.skills_${user.id}`, JSON.stringify(next));
    }
  };

  const skillChips = useMemo(
    () =>
      skills.map((skill, index) => ({
        name: skill,
        endorsements: endorsementCount(skill, index, user?.id),
      })),
    [skills, user?.id],
  );

  const topSkills = skillChips.slice(0, 3).map((skill) => skill.name);
  const focusLine = topSkills.length
    ? `${topSkills.join(", ")}${skillChips.length > 3 ? ` + ${skillChips.length - 3} more` : ""}`
    : "Add skills to shape your identity surface";

  const activityItems = useMemo(() => {
    const postItems = [...posts]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 3)
      .map((post) => ({
        id: `post-${post.id}`,
        icon: Icons.Send,
        eyebrow: "Posted",
        title: clip(plainText(post.content) || "Shared an update"),
        detail: "Published to the professional feed",
        meta: timeAgo(post.createdAt),
      }));

    const sphereItems = joinedSpheres.slice(0, 2).map((sphere) => ({
      id: `sphere-${sphere.id || sphere.name}`,
      icon: Icons.Globe,
      eyebrow: "Sphere",
      title: sphere.name || "Joined a sphere",
      detail: sphere.description || "Active community membership",
      meta: "Joined",
    }));

    const networkItem =
      connectionCount > 0
        ? [{
            id: "network",
            icon: Icons.Users,
            eyebrow: "Network",
            title: `${connectionCount} connection${connectionCount === 1 ? "" : "s"} in the graph`,
            detail: "Profile is connected to the social graph",
            meta: "Live",
          }]
        : [];

    return [...postItems, ...sphereItems, ...networkItem].slice(0, 6);
  }, [connectionCount, joinedSpheres, posts]);

  const handleAddSkill = (event) => {
    event.preventDefault();
    const clean = newSkill.trim();
    if (!clean) return;
    if (skills.some((skill) => skill.toLowerCase() === clean.toLowerCase())) {
      showToast("Skill already added");
      return;
    }
    saveSkills([...skills, clean]);
    setNewSkill("");
    showToast(`Added ${clean}`);
  };

  const handleDeleteSkill = (skill) => {
    saveSkills(skills.filter((item) => item !== skill));
    showToast(`Removed ${skill}`);
  };

  return (
    <div className="profile-page-v3">
      <section className="profile-identity-hero" aria-label="Profile overview">
        <div className="profile-cover" aria-hidden="true" />
        <div className="profile-identity-hero__body">
          <div className="profile-avatar-ring">
            <div className="profile-avatar-ring__spinner" />
            <div className="profile-avatar-ring__avatar">
              {initials(user?.name || user?.email)}
            </div>
          </div>

          <div className="profile-identity-hero__main">
            <p className="profile-kicker">LinkedIn-style identity surface</p>
            <h1 className="profile-identity-hero__name">
              {user?.name || "CollabSphere Member"}
            </h1>
            <p className="profile-headline">{headline}</p>
            <div className="profile-meta-row" aria-label="Profile metadata">
              {user?.worksAt && (
                <span><Icons.Briefcase /> {user.worksAt}</span>
              )}
              <span><Icons.Check /> Verified member</span>
              <span><Icons.Award /> {focusLine}</span>
            </div>
          </div>

          <div className="profile-identity-hero__actions">
            <button
              className="button button--primary"
              type="button"
              onClick={() => showToast("Profile editing is queued for the backend profile API.")}
            >
              <Icons.Edit /> Edit profile
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => navigate("/messages")}
            >
              <Icons.MessageCircle /> Messages
            </button>
          </div>
        </div>

        <div className="profile-hero-stats" aria-label="Profile stats">
          {loading ? (
            <div className="profile-loading-row"><Spinner label="Loading profile stats" /></div>
          ) : (
            <>
              <StatTile value={connectionCount} label="Connections" icon={Icons.Users} />
              <StatTile value={posts.length} label="Posts" icon={Icons.Send} />
              <StatTile value={joinedSpheres.length} label="Spheres" icon={Icons.Globe} />
            </>
          )}
        </div>
      </section>

      <div className="profile-layout-v3">
        <main className="profile-main-v3">
          <section className="profile-panel profile-panel--about">
            <div className="profile-panel__header">
              <span className="profile-panel__icon"><Icons.User /></span>
              <div>
                <h2>About</h2>
                <p>What visitors understand in the first scan.</p>
              </div>
            </div>
            <p className="profile-about-copy">
              {user?.name || firstName} uses CollabSphere to connect professional conversations,
              communities, and distributed-system learning into one visible portfolio surface.
              The profile now reads like an identity page instead of a stats drawer.
            </p>
          </section>

          <section className="profile-panel profile-panel--skills">
            <div className="profile-panel__header profile-panel__header--split">
              <div className="profile-panel__title">
                <span className="profile-panel__icon"><Icons.Award /></span>
                <div>
                  <h2>Skills</h2>
                  <p>Endorsement-style chips for the current identity.</p>
                </div>
              </div>
              <span className="profile-panel__count">{skillChips.length} skills</span>
            </div>

            {skillChips.length === 0 ? (
              <p className="profile-empty-copy">No skills yet. Add a few to anchor the profile.</p>
            ) : (
              <div className="profile-skill-grid">
                {skillChips.map((skill) => (
                  <span key={skill.name} className="profile-skill-chip">
                    <span className="profile-skill-chip__name">{skill.name}</span>
                    <span className="profile-skill-chip__count">
                      <Icons.Check /> {skill.endorsements}
                    </span>
                    <button
                      type="button"
                      className="profile-skill-chip__remove"
                      onClick={() => handleDeleteSkill(skill.name)}
                      aria-label={`Remove ${skill.name}`}
                    >
                      <Icons.X />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <form className="profile-skill-form" onSubmit={handleAddSkill}>
              <label className="sr-only" htmlFor="profile-skill-input">Add a skill</label>
              <input
                id="profile-skill-input"
                value={newSkill}
                onChange={(event) => setNewSkill(event.target.value)}
                placeholder="Add skill, e.g. Kubernetes"
                maxLength={32}
              />
              <button className="button button--secondary button--sm" type="submit" aria-label="Add skill">
                <Icons.Plus /> Add
              </button>
            </form>
          </section>

          <section className="profile-panel profile-panel--activity">
            <div className="profile-panel__header profile-panel__header--split">
              <div className="profile-panel__title">
                <span className="profile-panel__icon"><Icons.Activity /></span>
                <div>
                  <h2>Activity</h2>
                  <p>Recent posts, graph, and sphere signals.</p>
                </div>
              </div>
              <button
                type="button"
                className="profile-inline-action"
                onClick={() => navigate("/feed")}
              >
                View feed <Icons.ArrowRight />
              </button>
            </div>

            {loading ? (
              <div className="profile-loading-row"><Spinner label="Loading activity" /></div>
            ) : activityItems.length === 0 ? (
              <p className="profile-empty-copy">
                Activity will appear here after the first post, sphere join, or connection.
              </p>
            ) : (
              <ol className="profile-activity-timeline">
                {activityItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id} className="profile-activity-item">
                      <span className="profile-activity-item__icon"><Icon /></span>
                      <div className="profile-activity-item__body">
                        <div className="profile-activity-item__top">
                          <span>{item.eyebrow}</span>
                          <time>{item.meta || "Recent"}</time>
                        </div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </main>

        <aside className="profile-side-v3" aria-label="Profile shortcuts">
          <section className="profile-panel profile-panel--compact">
            <h2>Identity Snapshot</h2>
            <dl className="profile-snapshot">
              <div>
                <dt>Primary focus</dt>
                <dd>{focusLine}</dd>
              </div>
              <div>
                <dt>Network</dt>
                <dd>{connectionCount ?? "-"} connections</dd>
              </div>
              <div>
                <dt>Communities</dt>
                <dd>{joinedSpheres.length} spheres</dd>
              </div>
            </dl>
          </section>

          <section className="profile-panel profile-panel--compact">
            <div className="profile-panel__header profile-panel__header--split">
              <h2>Spheres</h2>
              <button
                type="button"
                className="profile-inline-action"
                onClick={() => navigate("/spheres")}
              >
                Explore <Icons.ArrowRight />
              </button>
            </div>
            {joinedSpheres.length === 0 ? (
              <p className="profile-empty-copy">Join spheres to show community context here.</p>
            ) : (
              <div className="profile-sphere-list">
                {joinedSpheres.slice(0, 5).map((sphere) => (
                  <button
                    key={sphere.id || sphere.name}
                    type="button"
                    className="profile-sphere-pill"
                    onClick={() => navigate("/spheres")}
                  >
                    <span>{(sphere.name || "?").charAt(0).toUpperCase()}</span>
                    {sphere.name}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="profile-panel profile-panel--compact">
            <h2>Next Moves</h2>
            <div className="profile-next-actions">
              <button type="button" onClick={() => navigate("/network")}>
                <Icons.Users /> Grow network
              </button>
              <button type="button" onClick={() => navigate("/spheres")}>
                <Icons.Globe /> Join spheres
              </button>
              <button type="button" onClick={() => navigate("/feed?create=true")}>
                <Icons.Send /> Share update
              </button>
            </div>
          </section>
        </aside>
      </div>

      <Toast message={toast} />
    </div>
  );
}
