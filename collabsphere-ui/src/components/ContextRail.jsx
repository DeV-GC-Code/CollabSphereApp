import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSpheres } from "../api/spheres.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Icons } from "./Icons.jsx";
import { useCountUp } from "../utils/useCountUp.js";

export function ContextRail({ connectionsCount = 0, postsCount = 0 }) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const postsDisplay = useCountUp(postsCount);
  const connectionsDisplay = useCountUp(connectionsCount);
  const [trendingTags, setTrendingTags] = useState([]);

  useEffect(() => {
    if (!token) return;
    getSpheres("", token)
      .then((spheres) => {
        if (!Array.isArray(spheres)) return;
        const freq = {};
        spheres.forEach((s) => {
          (s.tags || []).forEach((t) => { freq[t] = (freq[t] || 0) + 1; });
        });
        const sorted = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([tag]) => tag);
        setTrendingTags(sorted);
      })
      .catch(() => {});
  }, [token]);

  return (
    <aside className="context-rail">
      <section className="rail-card">
        <div className="rail-card__header">
          <h2>Network Pulse</h2>
          <button
            className="icon-button"
            type="button"
            onClick={() => navigate("/network")}
            aria-label="View network"
            title="View network"
            style={{ width: 28, height: 28 }}
          >
            <Icons.ArrowRight />
          </button>
        </div>
        <div className="metric-grid">
          <div>
            <strong>{postsDisplay}</strong>
            <span>Feed posts</span>
          </div>
          <div>
            <strong>{connectionsDisplay}</strong>
            <span>Connections</span>
          </div>
        </div>
      </section>

      <section className="rail-card">
        <div className="rail-card__header">
          <h2>Trending Spheres</h2>
          <button
            className="button button--secondary button--sm"
            type="button"
            onClick={() => navigate("/spheres")}
            style={{ minHeight: 30, fontSize: 12 }}
          >
            <Icons.ArrowRight />
            Explore
          </button>
        </div>
        <div className="sphere-list">
          {trendingTags.length === 0 ? (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading topics…</span>
          ) : (
            trendingTags.map((tag) => (
              <button
                key={tag}
                className="chip"
                type="button"
                onClick={() => navigate("/spheres")}
                style={{ cursor: "pointer", border: "none" }}
              >
                #{tag}
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rail-card rail-card--accent">
        <div className="rail-card__icon">
          <Icons.Users />
        </div>
        <h2>Grow Your Network</h2>
        <p style={{ marginBottom: 14 }}>Discover people at your company and in your industry.</p>
        <button
          className="button button--primary button--block"
          type="button"
          onClick={() => navigate("/network")}
        >
          <Icons.Network />
          Find People
        </button>
      </section>
    </aside>
  );
}
