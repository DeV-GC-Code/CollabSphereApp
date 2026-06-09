import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSphere,
  createSphereComment,
  createSpherePost,
  deleteSphereComment,
  deleteSpherePost,
  getMySpheresActivity,
  getSpherePost,
  getSpherePosts,
  getSpheres,
  joinSphere,
  leaveSphere,
  voteSpherePost,
} from "../api/spheres.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Icons } from "../components/Icons.jsx";
import { BrandOrb } from "../components/BrandOrb.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { Toast } from "../components/Toast.jsx";
import { initials, timeAgo } from "../utils/format.js";

const palette = ["blue", "purple", "teal", "rose", "amber", "emerald"];

const ADMIN_EMAIL = "admin@example.com";

export function SpheresPage() {
  const { token, user, signOut } = useAuth();

  // Sphere list state
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("All");
  const [spheres, setSpheres] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [workingId, setWorkingId] = useState(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", tags: "" });
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Sphere hub state
  const [activeSphere, setActiveSphere] = useState(null);
  const [hubView, setHubView] = useState("posts"); // "posts" | "post-detail" | "create-post"
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [activePost, setActivePost] = useState(null); // { ...post, comments: [] }
  const [postLoading, setPostLoading] = useState(false);
  const [postForm, setPostForm] = useState({ title: "", content: "" });
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const withAuth = useCallback(async (op) => {
    try {
      return await op();
    } catch (err) {
      if (err.status === 401) { signOut(); return null; }
      throw err;
    }
  }, [signOut]);

  const loadSpheres = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await withAuth(async () => {
        const [all, joined] = await Promise.all([
          getSpheres(searchTerm, token),
          getMySpheresActivity(token),
        ]);
        return { all, joined };
      });
      if (!data) return;
      setSpheres(Array.isArray(data.all) ? data.all : []);
      setMine(Array.isArray(data.joined) ? data.joined : []);
    } catch (err) {
      setError(err.message || "Unable to load spheres");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, token, withAuth]);

  useEffect(() => { loadSpheres(); }, [loadSpheres]);

  const joinedIds = useMemo(() => new Set(mine.map((s) => s.id)), [mine]);
  const visible = filter === "Joined" ? mine : spheres;

  const runSearch = (e) => {
    e.preventDefault();
    setSearchTerm(query.trim());
  };

  const submitSphere = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await withAuth(() =>
        createSphere({
          name: form.name.trim(),
          description: form.description.trim(),
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          banner_color: palette[Math.floor(Math.random() * palette.length)],
        }, token),
      );
      setForm({ name: "", description: "", tags: "" });
      setShowCreateForm(false);
      showToast("Sphere created!");
      await loadSpheres();
    } catch (err) {
      showToast(err.message || "Unable to create sphere");
    } finally {
      setCreating(false);
    }
  };

  const toggleJoin = async (sphere) => {
    setWorkingId(sphere.id);
    try {
      if (joinedIds.has(sphere.id)) {
        await withAuth(() => leaveSphere(sphere.id, token));
        showToast(`Left ${sphere.name}`);
        if (activeSphere?.id === sphere.id) setActiveSphere(null);
      } else {
        await withAuth(() => joinSphere(sphere.id, token));
        showToast(`Joined ${sphere.name}`);
      }
      await loadSpheres();
    } catch (err) {
      showToast(err.message || "Unable to update membership");
    } finally {
      setWorkingId(null);
    }
  };

  // ── Hub ───────────────────────────────────────────────────────────────────

  const openHub = async (sphere) => {
    setActiveSphere(sphere);
    setHubView("posts");
    setActivePost(null);
    setPostForm({ title: "", content: "" });
    setCommentText("");
    setPostsLoading(true);
    try {
      const data = await withAuth(() => getSpherePosts(sphere.id, token));
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message || "Unable to load posts");
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const closeHub = () => {
    setActiveSphere(null);
    setActivePost(null);
    setHubView("posts");
    setPosts([]);
  };

  const openPostDetail = async (post) => {
    setHubView("post-detail");
    setPostLoading(true);
    setCommentText("");
    try {
      const data = await withAuth(() => getSpherePost(activeSphere.id, post.id, token));
      setActivePost(data);
    } catch {
      setActivePost({ ...post, comments: [] });
    } finally {
      setPostLoading(false);
    }
  };

  const submitPost = async (e) => {
    e.preventDefault();
    if (!postForm.content.trim() || !activeSphere) return;
    setPostSubmitting(true);
    try {
      const newPost = await withAuth(() =>
        createSpherePost(activeSphere.id, {
          title: postForm.title.trim() || null,
          content: postForm.content.trim(),
        }, token),
      );
      setPosts((prev) => [newPost, ...prev]);
      setPostForm({ title: "", content: "" });
      setHubView("posts");
      showToast("Post published!");
    } catch (err) {
      showToast(err.message || "Unable to post");
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleVote = async (post, voteValue) => {
    const newVote = post.user_vote === voteValue ? 0 : voteValue;
    try {
      const result = await withAuth(() => voteSpherePost(activeSphere.id, post.id, newVote, token));
      if (!result) return;
      const updater = (p) => p.id === post.id ? { ...p, score: result.score, user_vote: result.user_vote } : p;
      setPosts((prev) => prev.map(updater));
      if (activePost?.id === post.id) setActivePost((prev) => ({ ...prev, score: result.score, user_vote: result.user_vote }));
    } catch (err) {
      showToast(err.message || "Unable to vote");
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activePost) return;
    setCommentSubmitting(true);
    try {
      const newComment = await withAuth(() =>
        createSphereComment(activeSphere.id, activePost.id, commentText.trim(), token),
      );
      setActivePost((prev) => ({ ...prev, comments: [...(prev.comments || []), newComment], comment_count: (prev.comment_count || 0) + 1 }));
      setPosts((prev) => prev.map((p) => p.id === activePost.id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
      setCommentText("");
      showToast("Comment added!");
    } catch (err) {
      showToast(err.message || "Unable to add comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeletePost = async (post) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await withAuth(() => deleteSpherePost(activeSphere.id, post.id, token));
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      if (activePost?.id === post.id) setHubView("posts");
      showToast("Post deleted");
    } catch (err) {
      showToast(err.message || "Unable to delete post");
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await withAuth(() => deleteSphereComment(activeSphere.id, activePost.id, comment.id, token));
      setActivePost((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c.id !== comment.id),
        comment_count: Math.max(0, (prev.comment_count || 0) - 1),
      }));
      setPosts((prev) => prev.map((p) => p.id === activePost.id ? { ...p, comment_count: Math.max(0, (p.comment_count || 0) - 1) } : p));
      showToast("Comment deleted");
    } catch (err) {
      showToast(err.message || "Unable to delete comment");
    }
  };

  const canPost = (sphere) => joinedIds.has(sphere?.id) || isAdmin;
  const canModerate = (sphere) => {
    const membership = mine.find((m) => m.id === sphere?.id);
    return isAdmin || membership?.role === "owner" || membership?.role === "moderator";
  };

  // ── Category helpers ────────────────────────────────────────────────────────
  const ENG_TAGS = new Set(["backend","frontend","devops","kubernetes","microservices","cloud","docker","aws","api","java","python","node","go","react"]);
  const DESIGN_TAGS = new Set(["design","ux","ui","figma","css","wireframe","prototype"]);
  const PRODUCT_TAGS = new Set(["product","growth","analytics","data","agile","strategy"]);

  const categorize = (sphere) => {
    const tags = Array.isArray(sphere.tags) ? sphere.tags.map((t) => t.toLowerCase()) : [];
    if (tags.some((t) => ENG_TAGS.has(t))) return "Engineering";
    if (tags.some((t) => DESIGN_TAGS.has(t))) return "Design";
    if (tags.some((t) => PRODUCT_TAGS.has(t))) return "Product";
    return "All Topics";
  };

  const featuredSpheres = visible.slice(0, 3);
  const remainingSpheres = visible.slice(3);

  const FEAT_GRADIENTS = [
    "linear-gradient(135deg, #064E3B 0%, #0D9488 100%)",
    "linear-gradient(135deg, #1E3A8A 0%, #7C3AED 100%)",
    "linear-gradient(135deg, #134E4A 0%, #15803D 100%)",
  ];

  const categoryGroups = remainingSpheres.reduce((acc, sphere) => {
    const cat = categorize(sphere);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sphere);
    return acc;
  }, {});
  const CAT_ORDER = ["Engineering", "Design", "Product", "All Topics"];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page page--wide">
      {/* ── Interactive Sphere Hero ──────────────────────────────── */}
      <div className="spheres-hero">
        <div className="spheres-hero__content">
          <h1 className="spheres-hero__title">Spheres</h1>
          <p className="spheres-hero__sub">
            {mine.length
              ? `You're part of ${mine.length} sphere${mine.length > 1 ? "s" : ""} · Join more communities below`
              : "Discover communities, join conversations, and build your professional tribe"}
          </p>
          <div className="spheres-hero__stats">
            <div>
              <strong>{spheres.length || "—"}</strong>
              <span>Communities</span>
            </div>
            <div>
              <strong>{mine.length || 0}</strong>
              <span>Joined</span>
            </div>
          </div>
          <div className="spheres-hero__actions">
            <button
              className="button button--primary button--sm"
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              <Icons.Plus /> New Sphere
            </button>
            <button className="icon-button" type="button" onClick={loadSpheres} aria-label="Refresh">
              <Icons.Refresh />
            </button>
          </div>
        </div>
        <div className="spheres-hero__viz" aria-hidden="true">
          <BrandOrb size={220} />
        </div>
      </div>

      {showCreateForm && (
        <form className="sphere-create-form" onSubmit={submitSphere}>
          <input
            value={form.name}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            placeholder="Sphere name *"
          />
          <input
            value={form.description}
            onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
            placeholder="Description"
          />
          <input
            value={form.tags}
            onChange={(e) => setForm((c) => ({ ...c, tags: e.target.value }))}
            placeholder="Tags, comma separated"
          />
          <button className="button button--primary" type="submit" disabled={creating || !form.name.trim()}>
            {creating ? <Spinner label="Creating" /> : <><Icons.Plus /> Create</>}
          </button>
        </form>
      )}

      <form className="sphere-search" onSubmit={runSearch} role="search">
        <Icons.Search />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search spheres by name, topic, or tag"
          aria-label="Search spheres"
        />
        <button className="button button--secondary button--sm" type="submit">Search</button>
      </form>

      <div className="segmented-control">
        {["All", "Joined"].map((item) => (
          <button
            key={item}
            className={filter === item ? "is-active" : ""}
            type="button"
            onClick={() => setFilter(item)}
          >
            {item}{item === "Joined" && mine.length > 0 && ` (${mine.length})`}
          </button>
        ))}
      </div>

      {error && <div className="notice notice--error">{error}</div>}

      {loading ? (
        <div className="loading-panel"><Spinner label="Loading spheres" /></div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Icons.Globe}
          title={filter === "Joined" ? "No spheres joined yet" : "No spheres found"}
          detail={filter === "Joined" ? "Join a sphere from the full list." : "Create a sphere or try a different search."}
        />
      ) : (
        <>
          {/* ── Featured Spheres ────────────────────────────────── */}
          {featuredSpheres.length > 0 && (
            <section aria-label="Featured Spheres">
              <h2 className="spheres-section-title">
                <Icons.Spark /> Featured Spheres
              </h2>
              <div className="featured-spheres-row">
                {featuredSpheres.map((sphere, idx) => {
                  const isJoined = joinedIds.has(sphere.id);
                  const busy = workingId === sphere.id;
                  return (
                    <article
                      key={sphere.id}
                      className="featured-sphere-card"
                      style={{ background: FEAT_GRADIENTS[idx % FEAT_GRADIENTS.length], cursor: "pointer" }}
                      onClick={() => openHub(sphere)}
                    >
                      <div className="featured-sphere-card__top">
                        <div className="featured-sphere-card__icon"><Icons.Hub /></div>
                        <span className="featured-sphere-card__members">
                          <Icons.Users /> {Number(sphere.member_count || 0).toLocaleString()} members
                        </span>
                      </div>
                      <h3 className="featured-sphere-card__name">{sphere.name}</h3>
                      <p className="featured-sphere-card__desc">{sphere.description || "A great community to join."}</p>
                      <button
                        className={`button button--sm featured-sphere-card__btn${isJoined ? "" : " button--primary"}`}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleJoin(sphere); }}
                        disabled={busy}
                      >
                        {busy ? <Spinner label="Updating" /> : isJoined ? <><Icons.Check /> Joined</> : <><Icons.Plus /> Join</>}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Categorized remaining spheres ────────────────── */}
          {remainingSpheres.length > 0 && (
            <>
              {CAT_ORDER.filter((cat) => categoryGroups[cat]?.length > 0).map((cat) => (
                <section key={cat} aria-label={cat}>
                  <h2 className="spheres-section-title">
                    {cat === "Engineering" && <Icons.Code />}
                    {cat === "Design" && <Icons.Layers />}
                    {cat === "Product" && <Icons.TrendingUp />}
                    {cat === "All Topics" && <Icons.Globe />}
                    {cat}
                  </h2>
                  <div className="sphere-discover-grid">
                    {categoryGroups[cat].map((sphere, index) => {
                      const isJoined = joinedIds.has(sphere.id);
                      const busy = workingId === sphere.id;
                      const tags = Array.isArray(sphere.tags) ? sphere.tags : [];
                      return (
                        <article
                          key={sphere.id}
                          className={`sphere-card sphere-card--${sphere.banner_color || palette[index % palette.length]}`}
                          onClick={() => openHub(sphere)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="sphere-card__icon-row">
                            <div className="rail-card__icon"><Icons.Hub /></div>
                            <span className="sphere-card__members">
                              <Icons.Users /> {Number(sphere.member_count || 0).toLocaleString()} members
                            </span>
                          </div>
                          <div>
                            <h2 style={{ marginBottom: 6 }}>{sphere.name}</h2>
                            <p style={{ fontSize: 13 }}>{sphere.description || "No description provided."}</p>
                          </div>
                          <div className="person-card__tags" style={{ gap: 6 }}>
                            {tags.map((tag) => <span key={tag} className="chip" style={{ fontSize: 11 }}>#{tag}</span>)}
                          </div>
                          <button
                            className={`button${isJoined ? " button--secondary" : " button--primary"}`}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleJoin(sphere); }}
                            disabled={busy}
                          >
                            {busy ? <Spinner label="Updating" /> : isJoined ? <><Icons.Check /> Joined</> : <><Icons.Plus /> Join</>}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </>
          )}

          {/* Fallback: if no remaining spheres (all 3 or fewer total), show standard grid */}
          {remainingSpheres.length === 0 && featuredSpheres.length === 0 && (
            <section className="sphere-discover-grid" aria-label="Spheres">
              {visible.map((sphere, index) => {
                const isJoined = joinedIds.has(sphere.id);
                const busy = workingId === sphere.id;
                const tags = Array.isArray(sphere.tags) ? sphere.tags : [];
                return (
                  <article
                    key={sphere.id}
                    className={`sphere-card sphere-card--${sphere.banner_color || palette[index % palette.length]}`}
                    onClick={() => openHub(sphere)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="sphere-card__icon-row">
                      <div className="rail-card__icon"><Icons.Hub /></div>
                      <span className="sphere-card__members">
                        <Icons.Users /> {Number(sphere.member_count || 0).toLocaleString()} members
                      </span>
                    </div>
                    <div>
                      <h2 style={{ marginBottom: 6 }}>{sphere.name}</h2>
                      <p style={{ fontSize: 13 }}>{sphere.description || "No description provided."}</p>
                    </div>
                    <div className="person-card__tags" style={{ gap: 6 }}>
                      {tags.map((tag) => <span key={tag} className="chip" style={{ fontSize: 11 }}>#{tag}</span>)}
                    </div>
                    <button
                      className={`button${isJoined ? " button--secondary" : " button--primary"}`}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleJoin(sphere); }}
                      disabled={busy}
                    >
                      {busy ? <Spinner label="Updating" /> : isJoined ? <><Icons.Check /> Joined</> : <><Icons.Plus /> Join</>}
                    </button>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      {/* ── Sphere Hub Overlay ────────────────────────────────── */}
      {activeSphere && (
        <div className="sphere-hub-overlay" role="dialog" aria-modal="true" onClick={closeHub}>
          <div className="sphere-hub-drawer" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <header className={`sphere-hub-header sphere-card--${activeSphere.banner_color || "teal"}`}>
              <div className="sphere-hub-header__top">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {hubView !== "posts" && (
                    <button
                      type="button"
                      className="sphere-hub-close"
                      onClick={() => { setHubView("posts"); setActivePost(null); }}
                      aria-label="Back"
                    >
                      <Icons.ChevronLeft />
                    </button>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {hubView === "post-detail" ? "Post" : hubView === "create-post" ? "New Post" : "Community"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="sphere-hub-members">
                    <Icons.Users /> {Number(activeSphere.member_count || 0).toLocaleString()}
                  </span>
                  <button type="button" className="sphere-hub-close" onClick={closeHub} aria-label="Close Hub">
                    <Icons.X />
                  </button>
                </div>
              </div>
              <div className="sphere-hub-header__body">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h1>{activeSphere.name}</h1>
                  {(isAdmin || mine.find((m) => m.id === activeSphere.id)?.role === "owner") && (
                    <span title="Admin / Owner" style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", background: "rgba(255,255,255,0.18)", borderRadius: 999, fontSize: 11, fontWeight: 800, color: "#fff", gap: 4 }}>
                      <Icons.Admin /> {isAdmin ? "Admin" : "Owner"}
                    </span>
                  )}
                </div>
                <p>{activeSphere.description || "Welcome to our community!"}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {(activeSphere.tags || []).map((tag) => (
                    <span key={tag} className="chip" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: 11 }}>#{tag}</span>
                  ))}
                </div>
                {!joinedIds.has(activeSphere.id) && !isAdmin && (
                  <button
                    className="button button--sm"
                    type="button"
                    style={{ marginTop: 14, background: "rgba(255,255,255,0.2)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.35)" }}
                    onClick={() => toggleJoin(activeSphere)}
                    disabled={workingId === activeSphere.id}
                  >
                    {workingId === activeSphere.id ? <Spinner label="Joining" /> : <><Icons.Plus /> Join Sphere</>}
                  </button>
                )}
              </div>
            </header>

            {/* Posts View */}
            {hubView === "posts" && (
              <div className="sphere-hub-discussion">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 12px" }}>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" }}>
                    Posts
                  </h2>
                  {canPost(activeSphere) && (
                    <button
                      className="button button--primary button--sm"
                      type="button"
                      onClick={() => setHubView("create-post")}
                    >
                      <Icons.Plus /> New Post
                    </button>
                  )}
                </div>

                {postsLoading ? (
                  <div className="loading-panel" style={{ minHeight: 120 }}><Spinner label="Loading posts" /></div>
                ) : (
                  <div className="sphere-hub-posts">
                    {posts.length === 0 ? (
                      <EmptyState
                        icon={Icons.MessageCircle}
                        title="No posts yet"
                        detail={canPost(activeSphere) ? "Be the first to post in this sphere!" : "Join this sphere to start posting."}
                      />
                    ) : (
                      posts.map((post) => (
                        <PostRow
                          key={post.id}
                          post={post}
                          userId={user?.id}
                          isAdmin={isAdmin}
                          isModerator={canModerate(activeSphere)}
                          onOpen={() => openPostDetail(post)}
                          onVote={(v) => handleVote(post, v)}
                          onDelete={() => handleDeletePost(post)}
                        />
                      ))
                    )}
                  </div>
                )}

                {!canPost(activeSphere) && (
                  <div className="sphere-hub-composer-lock">
                    <Icons.Lock style={{ marginRight: 6 }} />
                    Join this sphere to post and comment.
                  </div>
                )}
              </div>
            )}

            {/* Create Post View */}
            {hubView === "create-post" && (
              <div className="sphere-hub-discussion" style={{ padding: "20px 24px 24px" }}>
                <h2 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 800, color: "var(--text)" }}>Create Post</h2>
                <form onSubmit={submitPost} style={{ display: "grid", gap: 12 }}>
                  <input
                    value={postForm.title}
                    onChange={(e) => setPostForm((c) => ({ ...c, title: e.target.value }))}
                    placeholder="Title (optional)"
                    style={{ height: 42, border: "1.5px solid var(--border-input)", borderRadius: 10, padding: "0 13px", background: "var(--surface-2)", color: "var(--text)", outline: "none", fontSize: 14 }}
                  />
                  <textarea
                    value={postForm.content}
                    onChange={(e) => setPostForm((c) => ({ ...c, content: e.target.value }))}
                    placeholder={`What's on your mind in ${activeSphere.name}?`}
                    required
                    rows={6}
                    style={{ border: "1.5px solid var(--border-input)", borderRadius: 10, padding: "12px 13px", background: "var(--surface-2)", color: "var(--text)", outline: "none", fontSize: 14, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }}
                  />
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button type="button" className="button button--secondary" onClick={() => setHubView("posts")}>Cancel</button>
                    <button
                      type="submit"
                      className="button button--primary"
                      disabled={postSubmitting || !postForm.content.trim()}
                    >
                      {postSubmitting ? <Spinner label="Posting" /> : <><Icons.Send /> Post</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Post Detail View */}
            {hubView === "post-detail" && (
              <div className="sphere-hub-discussion" style={{ padding: "0 0 0" }}>
                {postLoading ? (
                  <div className="loading-panel" style={{ minHeight: 120 }}><Spinner label="Loading post" /></div>
                ) : activePost ? (
                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
                    {/* Post content */}
                    <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--outline)" }}>
                      <div style={{ display: "flex", gap: 14 }}>
                        {/* Vote column */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <button
                            type="button"
                            className={`vote-btn${activePost.user_vote === 1 ? " vote-btn--up" : ""}`}
                            onClick={() => handleVote(activePost, 1)}
                          >
                            <Icons.ChevronUp />
                          </button>
                          <span className="vote-score" style={{ color: activePost.user_vote === 1 ? "var(--primary)" : activePost.user_vote === -1 ? "var(--danger)" : "var(--text-muted)" }}>
                            {activePost.score ?? 0}
                          </span>
                          <button
                            type="button"
                            className={`vote-btn${activePost.user_vote === -1 ? " vote-btn--down" : ""}`}
                            onClick={() => handleVote(activePost, -1)}
                          >
                            <Icons.ChevronDown />
                          </button>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <div className="avatar avatar--sm">{initials(activePost.author_name)}</div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{activePost.author_name}</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(activePost.created_at)}</span>
                            {(isAdmin || activePost.user_id === user?.id) && (
                              <button
                                type="button"
                                onClick={() => handleDeletePost(activePost)}
                                style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--danger)", fontSize: 12, cursor: "pointer", fontWeight: 700, padding: "2px 6px" }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          {activePost.title && (
                            <h3 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "var(--text)", lineHeight: 1.3 }}>
                              {activePost.title}
                            </h3>
                          )}
                          <p style={{ margin: 0, color: "var(--text-soft)", lineHeight: 1.7, fontSize: 14, whiteSpace: "pre-wrap" }}>
                            {activePost.content}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Comments */}
                    <div style={{ padding: "16px 24px 0", flex: 1, overflowY: "auto" }}>
                      <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
                        {(activePost.comments?.length || 0)} Comment{activePost.comments?.length !== 1 ? "s" : ""}
                      </h3>

                      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                        {(activePost.comments || []).length === 0 ? (
                          <p style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 600, margin: 0, textAlign: "center", padding: "16px 0" }}>
                            No comments yet. Be the first!
                          </p>
                        ) : (
                          (activePost.comments || []).map((comment) => (
                            <div key={comment.id} className="comment-card" style={{ padding: "10px 14px" }}>
                              <div className="avatar avatar--sm" style={{ marginTop: 2 }}>{initials(comment.author_name)}</div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                  <strong style={{ fontSize: 13 }}>{comment.author_name}</strong>
                                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{timeAgo(comment.created_at)}</span>
                                  {(isAdmin || comment.user_id === user?.id) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(comment)}
                                      style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", padding: 0 }}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                                <p style={{ margin: 0, lineHeight: 1.55, fontSize: 13.5, whiteSpace: "pre-wrap" }}>{comment.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment form */}
                      {canPost(activeSphere) ? (
                        <form className="sphere-hub-composer" onSubmit={submitComment} style={{ position: "sticky", bottom: 0, background: "var(--bg)", paddingBottom: 20 }}>
                          <input
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment…"
                            maxLength={500}
                            required
                          />
                          <button
                            className="button button--primary button--sm"
                            type="submit"
                            disabled={commentSubmitting || !commentText.trim()}
                          >
                            {commentSubmitting ? <Spinner label="" /> : <Icons.Send />}
                          </button>
                        </form>
                      ) : (
                        <div className="sphere-hub-composer-lock">
                          <Icons.Lock style={{ marginRight: 6 }} /> Join this sphere to comment.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={Icons.Alert} title="Post not found" detail="This post may have been deleted." />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}

function PostRow({ post, userId, isAdmin, isModerator, onOpen, onVote, onDelete }) {
  const canDelete = isAdmin || isModerator || post.user_id === userId;
  return (
    <div className="sphere-post-row" onClick={onOpen}>
      {/* Vote controls */}
      <div className="sphere-post-row__votes" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`vote-btn${post.user_vote === 1 ? " vote-btn--up" : ""}`}
          onClick={() => onVote(1)}
          aria-label="Upvote"
        >
          <Icons.ChevronUp />
        </button>
        <span className="vote-score" style={{ color: post.user_vote === 1 ? "var(--primary)" : post.user_vote === -1 ? "var(--danger)" : "var(--text-muted)" }}>
          {post.score ?? 0}
        </span>
        <button
          type="button"
          className={`vote-btn${post.user_vote === -1 ? " vote-btn--down" : ""}`}
          onClick={() => onVote(-1)}
          aria-label="Downvote"
        >
          <Icons.ChevronDown />
        </button>
      </div>

      {/* Post info */}
      <div className="sphere-post-row__body">
        {post.title && (
          <p className="sphere-post-row__title">{post.title}</p>
        )}
        <p className="sphere-post-row__content">{post.content}</p>
        <div className="sphere-post-row__meta">
          <div className="avatar avatar--sm" style={{ marginRight: 4 }}>{initials(post.author_name)}</div>
          <span style={{ fontWeight: 700 }}>{post.author_name}</span>
          <span style={{ margin: "0 4px", opacity: 0.4 }}>·</span>
          <span>{timeAgo(post.created_at)}</span>
          <span style={{ margin: "0 4px", opacity: 0.4 }}>·</span>
          <Icons.MessageCircle />
          <span>{post.comment_count || 0} comment{post.comment_count !== 1 ? "s" : ""}</span>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", padding: "2px 6px", fontFamily: "inherit", fontWeight: 700 }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <Icons.ChevronRight style={{ flexShrink: 0, color: "var(--text-muted)", opacity: 0.5 }} />
    </div>
  );
}
