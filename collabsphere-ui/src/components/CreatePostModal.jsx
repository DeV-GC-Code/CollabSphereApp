import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPost } from "../api/posts.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Icons } from "./Icons.jsx";
import { Spinner } from "./Spinner.jsx";

const MAX_LEN = 500;

export function CreatePostModal({ onClose }) {
  const { token, user } = useAuth();
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const publish = async () => {
    const trimmed = content.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    setError("");
    try {
      await createPost(trimmed, token);
      onClose();
      if (location.pathname === "/feed") {
        window.dispatchEvent(new CustomEvent("cs:feed-refresh"));
      } else {
        navigate("/feed");
      }
    } catch (err) {
      setError(err.message || "Unable to publish post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="compose-overlay" onClick={onClose} role="presentation">
      <div
        className="compose-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create post"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="compose-modal__header">
          <h2>Create post</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <Icons.X />
          </button>
        </div>

        {error && <div className="notice notice--error" role="alert">{error}</div>}

        <textarea
          ref={textareaRef}
          value={content}
          maxLength={MAX_LEN}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") publish();
          }}
          placeholder={`What's on your mind, ${user?.name?.split(" ")[0] || "there"}?`}
          rows={5}
        />

        <div className="compose-modal__footer">
          <span className="compose-modal__count">{content.length}/{MAX_LEN}</span>
          <button
            className="button button--gradient"
            type="button"
            disabled={!content.trim() || posting}
            onClick={publish}
          >
            {posting ? <Spinner label="Publishing" /> : <><Icons.Send /> Publish</>}
          </button>
        </div>
      </div>
    </div>
  );
}
