import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMyConnections } from "../api/connections.js";
import { createPost, createPostComment, getFeed, getPostComments, likePost, unlikePost } from "../api/posts.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { ContextRail } from "../components/ContextRail.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Icons } from "../components/Icons.jsx";
import { OnboardingModal } from "../components/OnboardingModal.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { SkeletonPosts } from "../components/Skeleton.jsx";
import { Toast } from "../components/Toast.jsx";
import { initials, timeAgo } from "../utils/format.js";
import { loadSavedIds, toggleSaved } from "../utils/saved.js";

export function FeedPage() {
  const { token, user, signOut } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("cs_onboarding_done"));
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [likedPostIds, setLikedPostIds] = useState(() => new Set());
  const [savedPostIds, setSavedPostIds] = useState(() => loadSavedIds());
  const [connections, setConnections] = useState([]);
  const [commentsByPostId, setCommentsByPostId] = useState(() => new Map());
  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState(() => new Set());
  const [commentingId, setCommentingId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedVideo, setAttachedVideo] = useState(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const textareaRef = useRef(null);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [posts],
  );

  const peopleByUserId = useMemo(() => {
    const people = new Map();
    if (user?.id) {
      people.set(String(user.id), {
        name: user.name || user.email || "You",
        email: user.email,
        worksAt: user.worksAt,
      });
    }
    connections.forEach((person) => people.set(String(person.userId), person));
    return people;
  }, [connections, user]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const loadPosts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const data = await getFeed(token);
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) { signOut(); return; }
      setPosts([]);
      if (err.status !== 404) setError(err.message || "Unable to load posts");
    } finally {
      setLoading(false);
    }
  }, [signOut, token, user?.id]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  useEffect(() => {
    const refresh = () => loadPosts();
    window.addEventListener("cs:feed-refresh", refresh);
    return () => window.removeEventListener("cs:feed-refresh", refresh);
  }, [loadPosts]);

  // Handle Create Post focus trigger from Sidebar
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      textareaRef.current?.focus();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let ignore = false;
    getMyConnections(token)
      .then((data) => { if (!ignore) setConnections(Array.isArray(data) ? data : []); })
      .catch(() => { if (!ignore) setConnections([]); });
    return () => { ignore = true; };
  }, [token]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage(event.target.result);
      setAttachedFile(null);
      setAttachedVideo(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedFile({
        name: file.name,
        size: file.size,
        data: event.target.result,
      });
      setAttachedImage(null);
      setAttachedVideo(null);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      showToast("Please select a video file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedVideo(event.target.result);
      setAttachedImage(null);
      setAttachedFile(null);
    };
    reader.readAsDataURL(file);
  };

  const insertFormat = (tag, option = null) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    let openTag = option ? `[${tag}=${option}]` : `[${tag}]`;
    let closeTag = `[/${tag}]`;

    const replacement = `${openTag}${selectedText}${closeTag}`;
    const newContent = text.substring(0, start) + replacement + text.substring(end);

    setContent(newContent);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const selectionStart = start + openTag.length;
      const selectionEnd = selectionStart + selectedText.length;
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }, 0);
  };

  const renderFormattedText = (rawText) => {
    if (!rawText) return "";
    
    // Escape HTML to prevent XSS
    let escaped = rawText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Replace newlines with <br />
    escaped = escaped.replace(/\n/g, "<br />");

    // BBCode bold -> strong
    escaped = escaped.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>");
    
    // BBCode italic -> em
    escaped = escaped.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>");

    // BBCode underline -> u
    escaped = escaped.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>");

    // BBCode color
    const colorMap = {
      green: "#10b981",
      teal: "#14b8a6",
      amber: "#f59e0b",
      red: "#ef4444"
    };
    escaped = escaped.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, (match, colorVal, textVal) => {
      const color = colorMap[colorVal.toLowerCase()] || colorVal;
      return `<span style="color: ${color}">${textVal}</span>`;
    });

    // BBCode font
    const fontMap = {
      monospace: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
      geist: "Outfit, Inter, system-ui, -apple-system, sans-serif"
    };
    escaped = escaped.replace(/\[font=([^\]]+)\]([\s\S]*?)\[\/font\]/gi, (match, fontVal, textVal) => {
      const font = fontMap[fontVal.toLowerCase()] || fontVal;
      return `<span style="font-family: ${font}">${textVal}</span>`;
    });

    return escaped;
  };

  const parsePostContent = (rawContent) => {
    if (!rawContent) return { text: "", media: null };
    const mediaRegex = /\n\n\[media:(\{.*\})\]$/s;
    const match = rawContent.match(mediaRegex);
    if (match) {
      try {
        const media = JSON.parse(match[1]);
        const text = rawContent.replace(mediaRegex, "");
        return { text, media };
      } catch {
        return { text: rawContent, media: null };
      }
    }
    return { text: rawContent, media: null };
  };

  const publishPost = async () => {
    const nextContent = content.trim();
    if (!nextContent && !attachedImage && !attachedFile && !attachedVideo) return;
    setPosting(true);
    setError("");
    try {
      let finalContent = nextContent;
      if (attachedImage) {
        finalContent += `\n\n[media:{"type":"image","data":${JSON.stringify(attachedImage)}}]`;
      } else if (attachedFile) {
        finalContent += `\n\n[media:{"type":"file","name":${JSON.stringify(attachedFile.name)},"size":${attachedFile.size},"data":${JSON.stringify(attachedFile.data)}}]`;
      } else if (attachedVideo) {
        finalContent += `\n\n[media:{"type":"video","data":${JSON.stringify(attachedVideo)}}]`;
      }

      const post = await createPost(finalContent, token);
      setPosts((current) => [post, ...current]);
      setContent("");
      setAttachedImage(null);
      setAttachedFile(null);
      setAttachedVideo(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      showToast("Post published");
    } catch (err) {
      if (err.status === 401) { signOut(); return; }
      setError(err.message || "Unable to publish post");
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (postId) => {
    const alreadyLiked = likedPostIds.has(postId);
    try {
      if (alreadyLiked) {
        await unlikePost(postId, token);
        setLikedPostIds((current) => { const n = new Set(current); n.delete(postId); return n; });
      } else {
        await likePost(postId, token);
        setLikedPostIds((current) => new Set(current).add(postId));
      }
    } catch (err) {
      if (err.status === 401) { signOut(); return; }
      showToast(err.message || "Unable to update like");
    }
  };

  const loadComments = async (postId) => {
    try {
      const data = await getPostComments(postId, token);
      setCommentsByPostId((current) => {
        const next = new Map(current);
        next.set(postId, Array.isArray(data) ? data : []);
        return next;
      });
    } catch (err) {
      if (err.status === 401) { signOut(); return; }
      showToast(err.message || "Unable to load comments");
    }
  };

  const toggleComments = async (postId) => {
    const willOpen = !openComments.has(postId);
    setOpenComments((current) => {
      const next = new Set(current);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
    if (willOpen && !commentsByPostId.has(postId)) await loadComments(postId);
  };

  const publishComment = async (postId) => {
    const nextContent = (commentDrafts[postId] || "").trim();
    if (!nextContent) return;
    setCommentingId(postId);
    try {
      const comment = await createPostComment(postId, nextContent, token);
      setCommentsByPostId((current) => {
        const next = new Map(current);
        next.set(postId, [...(next.get(postId) || []), comment]);
        return next;
      });
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      setOpenComments((current) => new Set(current).add(postId));
    } catch (err) {
      if (err.status === 401) { signOut(); return; }
      showToast(err.message || "Unable to post comment");
    } finally {
      setCommentingId(null);
    }
  };

  const authorFor = (userId) => {
    const person = peopleByUserId.get(String(userId));
    if (!person) return { name: `User ${userId}`, meta: "CollabSphere member" };
    return {
      name: person.name || person.email || `User ${userId}`,
      meta: person.worksAt || person.email || "CollabSphere member",
    };
  };

  const handleToggleSave = (post) => {
    const author = authorFor(post.userId);
    const enriched = { ...post, _authorName: author.name, _authorMeta: author.meta };
    const nowSaved = toggleSaved(enriched);
    setSavedPostIds((current) => {
      const next = new Set(current);
      if (nowSaved) next.add(post.id);
      else next.delete(post.id);
      return next;
    });
    showToast(nowSaved ? "Saved for later" : "Removed from saved items");
  };

  return (
    <>
    {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
    <div className="flow-layout">
      <div className="flow-main">
        <header className="page-header">
          <div>
            <h1>Feed</h1>
          </div>
          <button
            className="icon-button"
            onClick={loadPosts}
            type="button"
            aria-label="Refresh feed"
            title="Refresh feed"
          >
            <Icons.Refresh />
          </button>
        </header>

        <section className="composer" aria-label="Create post">
          <div className="composer__avatar">{initials(user?.name || user?.email)}</div>
          <div className="composer__body">
            <div className="composer__format-bar">
              <button type="button" className="format-btn" onClick={() => insertFormat("b")} title="Bold">
                <strong>B</strong>
              </button>
              <button type="button" className="format-btn" onClick={() => insertFormat("i")} title="Italic">
                <em>I</em>
              </button>
              <button type="button" className="format-btn" onClick={() => insertFormat("u")} title="Underline">
                <u>U</u>
              </button>
              
              <div className="format-separator" />

              <select
                className="format-select"
                onChange={(e) => {
                  if (e.target.value) {
                    insertFormat("color", e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Color</option>
                <option value="green">Green</option>
                <option value="teal">Teal</option>
                <option value="amber">Amber</option>
                <option value="red">Red</option>
              </select>

              <select
                className="format-select"
                onChange={(e) => {
                  if (e.target.value) {
                    insertFormat("font", e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Font</option>
                <option value="geist">Geist</option>
                <option value="monospace">Monospace</option>
                <option value="serif">Serif</option>
              </select>
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                const el = event.target;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 280) + "px";
              }}
              maxLength={500}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") publishPost();
              }}
              placeholder={`What's on your mind, ${user?.name?.split(" ")[0] || "there"}? Share an insight with your network…`}
              rows={3}
            />

            {attachedImage && (
              <div className="composer__preview-container">
                <img src={attachedImage} alt="Attachment preview" className="composer__preview-image" />
                <button type="button" className="composer__preview-remove" onClick={() => setAttachedImage(null)} aria-label="Remove image">
                  <Icons.X />
                </button>
              </div>
            )}

            {attachedVideo && (
              <div className="composer__preview-container">
                <video src={attachedVideo} controls className="composer__preview-video" style={{ width: "100%", maxHeight: "220px", borderRadius: "6px", background: "#000" }} />
                <button type="button" className="composer__preview-remove" onClick={() => setAttachedVideo(null)} aria-label="Remove video">
                  <Icons.X />
                </button>
              </div>
            )}

            {attachedFile && (
              <div className="composer__preview-container composer__preview-file">
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <Icons.Briefcase style={{ color: "var(--primary)", flexShrink: 0 }} />
                  <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                    <strong style={{ fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "var(--text)" }}>{attachedFile.name}</strong>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{(attachedFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <button type="button" className="composer__preview-remove" onClick={() => setAttachedFile(null)} aria-label="Remove file">
                  <Icons.X />
                </button>
              </div>
            )}

            <input type="file" ref={imageInputRef} style={{ display: "none" }} accept="image/*" onChange={handleImageChange} />
            <input type="file" ref={videoInputRef} style={{ display: "none" }} accept="video/*" onChange={handleVideoChange} />
            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={handleFileChange} />

            <div className="composer__toolbar">
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="composer__attach-btn" onClick={() => imageInputRef.current?.click()} title="Add Photo">
                  <Icons.Layers /> <span>Photo</span>
                </button>
                <button type="button" className="composer__attach-btn" onClick={() => videoInputRef.current?.click()} title="Add Video">
                  <Icons.Play /> <span>Video</span>
                </button>
                <button type="button" className="composer__attach-btn" onClick={() => fileInputRef.current?.click()} title="Add Document">
                  <Icons.Briefcase /> <span>Document</span>
                </button>
              </div>

              <span className="composer__count" style={{ color: content.length > 450 ? "var(--danger)" : undefined }}>
                {content.trim().length}/500
              </span>
              <button
                className="button button--primary"
                onClick={publishPost}
                type="button"
                disabled={posting || (!content.trim() && !attachedImage && !attachedFile && !attachedVideo)}
              >
                {posting ? <Spinner label="Publishing" /> : <><Icons.Send /> Publish</>}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="notice notice--error">{error}</div>}

        {loading ? (
          <SkeletonPosts count={3} />
        ) : sortedPosts.length === 0 ? (
          <EmptyState
            icon={Icons.Inbox}
            title="Fresh off the press — nothing printed yet"
            detail="Publish your first update or connect with other members to see their posts here."
          />
        ) : (
          <section className="post-list thread-track" aria-label="Posts">
            {sortedPosts.map((post) => {
              const liked = likedPostIds.has(post.id);
              const saved = savedPostIds.has(post.id);
              const author = authorFor(post.userId);
              const comments = commentsByPostId.get(post.id) || [];
              return (
                <article className="post-card post-card--accented" key={post.id}>
                  <header className="post-card__header">
                    <div className="avatar">{initials(author.name)}</div>
                    <div>
                      <strong className="post-card__author">{author.name}</strong>
                      <span>{author.meta} · {timeAgo(post.createdAt)}</span>
                    </div>
                  </header>

                  {(() => {
                    const { text, media } = parsePostContent(post.content);
                    return (
                      <>
                        {text && (
                          <p
                            style={{ fontSize: 14.5, lineHeight: 1.7 }}
                            dangerouslySetInnerHTML={{ __html: renderFormattedText(text) }}
                          />
                        )}

                        {media && media.type === "image" && (
                          <div className="post-card__media-container">
                            <img src={media.data} alt="Post attachment" className="post-card__media-image" />
                          </div>
                        )}

                        {media && media.type === "video" && (
                          <div className="post-card__media-container">
                            <video src={media.data} controls className="post-card__media-video" style={{ width: "100%", maxHeight: "360px", borderRadius: "8px", background: "#000" }} />
                          </div>
                        )}

                        {media && media.type === "file" && (
                          <div className="post-card__media-container">
                            <a href={media.data} download={media.name} className="post-card__media-file">
                              <Icons.Briefcase style={{ color: "var(--primary)", flexShrink: 0 }} />
                              <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                                <strong style={{ fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "var(--text)" }}>{media.name}</strong>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Click to download ({(media.size / 1024).toFixed(1)} KB)</span>
                              </div>
                            </a>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <footer className="post-card__footer post-card__footer--polished">
                    <button
                      className={`action-button action-button--lg${liked ? " is-liked" : ""}`}
                      onClick={() => toggleLike(post.id)}
                      type="button"
                      aria-pressed={liked}
                    >
                      <Icons.Heart filled={liked} />
                      <span>{liked ? "Liked" : "Like"}</span>
                    </button>
                    <button
                      className="action-button action-button--lg"
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      aria-expanded={openComments.has(post.id)}
                    >
                      <Icons.Message />
                      <span>{openComments.has(post.id) ? "Hide" : "Comment"}</span>
                    </button>
                    <button
                      className={`action-button action-button--lg${saved ? " is-saved" : ""}`}
                      type="button"
                      onClick={() => handleToggleSave(post)}
                      aria-pressed={saved}
                    >
                      <Icons.Bookmark filled={saved} />
                      <span>{saved ? "Saved" : "Save"}</span>
                    </button>
                  </footer>

                  {openComments.has(post.id) && (
                    <section className="comments-panel" aria-label="Post comments">
                      <div className="comments-list">
                        {comments.length === 0 ? (
                          <span className="comments-empty">No comments yet — be the first</span>
                        ) : (
                          comments.map((comment) => {
                            const commentAuthor = authorFor(comment.userId);
                            return (
                              <article className="comment-card" key={comment.id}>
                                <div className="avatar avatar--sm">{initials(commentAuthor.name)}</div>
                                <div>
                                  <strong>{commentAuthor.name}</strong>
                                  <span>{timeAgo(comment.createdAt)}</span>
                                  <p>{comment.content}</p>
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                      <div className="comment-form">
                        <input
                          value={commentDrafts[post.id] || ""}
                          onChange={(event) =>
                            setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))
                          }
                          onKeyDown={(event) => {
                            if ((event.metaKey || event.ctrlKey) && event.key === "Enter")
                              publishComment(post.id);
                          }}
                          maxLength={500}
                          placeholder="Add a comment…"
                        />
                        <button
                          className="button button--secondary button--sm"
                          type="button"
                          disabled={commentingId === post.id || !(commentDrafts[post.id] || "").trim()}
                          onClick={() => publishComment(post.id)}
                        >
                          {commentingId === post.id ? <Spinner label="Posting" /> : "Post"}
                        </button>
                      </div>
                    </section>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>

      <ContextRail connectionsCount={connections.length} postsCount={posts.length} />

      <Toast
        message={toast}
        tone={toast.toLowerCase().includes("unable") ? "error" : "neutral"}
      />
    </div>
    </>
  );
}
