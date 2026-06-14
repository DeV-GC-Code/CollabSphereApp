import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { Icons } from "../components/Icons.jsx";
import { Toast } from "../components/Toast.jsx";
import { initials, timeAgo, parsePostContent, renderPostHtml } from "../utils/format.js";
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
            const { text, media } = parsePostContent(post.content);
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
                  {text && (
                    <p
                      style={{ fontSize: 14.5, lineHeight: 1.7, marginBottom: 8 }}
                      dangerouslySetInnerHTML={{ __html: renderPostHtml(text) }}
                    />
                  )}
                  {media && media.type === "image" && (
                    <div className="post-card__media-container">
                      <img src={media.data} alt="Saved attachment" className="post-card__media-image" />
                    </div>
                  )}
                  {media && media.type === "video" && (
                    <div className="post-card__media-container">
                      <video src={media.data} controls className="post-card__media-video" style={{ width: "100%", maxHeight: 280, borderRadius: 8, background: "#000" }} />
                    </div>
                  )}
                  {media && media.type === "file" && (
                    <a href={media.data} download={media.name} className="post-card__media-file">
                      <Icons.Briefcase style={{ color: "var(--accent-ink)", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{media.name}</span>
                    </a>
                  )}
                  {!text && !media && (
                    <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>No preview available.</p>
                  )}
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
