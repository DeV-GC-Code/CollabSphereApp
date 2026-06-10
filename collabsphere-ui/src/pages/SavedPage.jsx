import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { Icons } from "../components/Icons.jsx";
import { Toast } from "../components/Toast.jsx";
import { initials, timeAgo } from "../utils/format.js";
import { loadSavedPosts, toggleSaved } from "../utils/saved.js";

export function SavedPage() {
  const navigate = useNavigate();
  const [savedPosts, setSavedPosts] = useState(() => loadSavedPosts());
  const [toast, setToast] = useState("");

  useEffect(() => {
    setSavedPosts(loadSavedPosts());
  }, []);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const handleRemove = (post) => {
    toggleSaved(post);
    setSavedPosts(loadSavedPosts());
    showToast("Removed from saved items");
  };

  return (
    <div className="page page--wide">
      <header className="page-header">
        <div>
          <h1>Saved Items</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
            {savedPosts.length > 0
              ? `${savedPosts.length} saved post${savedPosts.length > 1 ? "s" : ""}`
              : "Posts you save from your feed"}
          </p>
        </div>
      </header>

      {savedPosts.length === 0 ? (
        <EmptyState
          icon={Icons.Bookmark}
          title="Nothing saved yet"
          detail="Save posts from your feed to revisit them here. Look for the Bookmark icon on any post."
          action={
            <button
              className="button button--primary"
              type="button"
              onClick={() => navigate("/feed")}
            >
              <Icons.Home />
              Go to Feed
            </button>
          }
        />
      ) : (
        <section className="saved-grid" aria-label="Saved posts">
          {savedPosts.map((post, index) => {
            const authorName = post._authorName || `User ${post.userId}`;
            const authorMeta = post._authorMeta || "CollabSphere member";
            return (
              <article
                className={`saved-card${index === 0 ? " saved-card--wide" : ""}`}
                key={post.id}
              >
                <div className="post-card__chips">
                  <span className="chip chip--blue">Saved</span>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Remove from saved"
                    title="Remove from saved"
                    onClick={() => handleRemove(post)}
                    style={{ marginLeft: "auto" }}
                  >
                    <Icons.Bookmark filled />
                  </button>
                </div>
                <div>
                  <p style={{ fontSize: 14.5, lineHeight: 1.7, marginBottom: 8 }}>
                    {post.content}
                  </p>
                </div>
                <footer>
                  <div className="avatar avatar--sm">{initials(authorName)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text)" }}>
                      {authorName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {authorMeta} · Saved {timeAgo(post._savedAt)}
                    </div>
                  </div>
                </footer>
              </article>
            );
          })}
        </section>
      )}

      <Toast message={toast} />
    </div>
  );
}
