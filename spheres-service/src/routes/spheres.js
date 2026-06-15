import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ── Access-control helpers ──────────────────────────────────────────────────────
// Load a sphere row (incl. caller's membership) or send 404.
async function loadSphere(res, sphereId, userId) {
  const { rows } = await pool.query(
    `SELECT s.*,
       EXISTS(SELECT 1 FROM sphere_members WHERE sphere_id = s.id AND user_id = $2) AS is_member
     FROM spheres s WHERE s.id = $1`,
    [sphereId, userId],
  );
  if (!rows.length) { res.status(404).json({ error: "Sphere not found" }); return null; }
  return rows[0];
}

// Privacy gate: a private sphere is viewable only by members, its creator, or an admin.
// Returns true if granted; otherwise sends 404 (don't reveal that a private sphere exists).
function ensureCanView(res, sphere, req) {
  if (!sphere.is_private) return true;
  if (sphere.is_member || sphere.created_by === req.userId || req.isAdmin) return true;
  res.status(404).json({ error: "Sphere not found" });
  return false;
}

// Nested-authz: confirm a post actually belongs to the sphere in the URL. Returns the
// post row (id, user_id) or sends 404 — prevents cross-sphere vote/comment/delete via a mismatched URL.
async function loadPostInSphere(res, postId, sphereId) {
  const { rows } = await pool.query(
    "SELECT id, user_id FROM sphere_posts WHERE id = $1 AND sphere_id = $2",
    [postId, sphereId],
  );
  if (!rows.length) { res.status(404).json({ error: "Post not found" }); return null; }
  return rows[0];
}

// ── Sphere CRUD ───────────────────────────────────────────────────────────────

router.get("/", requireAuth, async (req, res) => {
  const { query, tags, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let sql = `
    SELECT
      s.*,
      COUNT(sm.user_id)::int AS member_count,
      EXISTS(
        SELECT 1 FROM sphere_members WHERE sphere_id = s.id AND user_id = $1
      ) AS is_member
    FROM spheres s
    LEFT JOIN sphere_members sm ON sm.sphere_id = s.id
  `;
  const params = [req.userId];
  const conditions = ["s.is_private = FALSE OR s.created_by = $1"];
  let paramIdx = 2;

  if (query?.trim()) {
    conditions.push(`s.search_vector @@ plainto_tsquery('english', $${paramIdx})`);
    params.push(query.trim());
    paramIdx++;
  }

  if (tags) {
    const tagArray = tags.split(",").map((t) => t.trim());
    conditions.push(`s.tags && $${paramIdx}`);
    params.push(tagArray);
    paramIdx++;
  }

  sql += ` WHERE ${conditions.join(" AND ")}`;
  sql += ` GROUP BY s.id ORDER BY member_count DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  params.push(Number(limit), offset);

  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

router.get("/my", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, sm.role, sm.joined_at,
      COUNT(m.user_id)::int AS member_count
     FROM spheres s
     JOIN sphere_members sm ON sm.sphere_id = s.id AND sm.user_id = $1
     LEFT JOIN sphere_members m ON m.sphere_id = s.id
     GROUP BY s.id, sm.role, sm.joined_at
     ORDER BY sm.joined_at DESC`,
    [req.userId],
  );
  res.json(rows);
});

router.get("/:id", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*,
      COUNT(sm.user_id)::int AS member_count,
      EXISTS(SELECT 1 FROM sphere_members WHERE sphere_id = s.id AND user_id = $2) AS is_member
     FROM spheres s
     LEFT JOIN sphere_members sm ON sm.sphere_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [req.params.id, req.userId],
  );
  if (!rows.length) return res.status(404).json({ error: "Sphere not found" });
  if (!ensureCanView(res, rows[0], req)) return; // privacy: private spheres need membership
  res.json(rows[0]);
});

router.post("/", requireAuth, async (req, res) => {
  const { name, description, tags = [], banner_color = "blue", is_private = false } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO spheres (name, description, created_by, tags, banner_color, is_private)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name.trim(), description?.trim(), req.userId, tags, banner_color, is_private],
    );
    const sphere = rows[0];
    await client.query(
      "INSERT INTO sphere_members (sphere_id, user_id, role) VALUES ($1, $2, 'owner')",
      [sphere.id, req.userId],
    );
    await client.query("COMMIT");
    res.status(201).json({ ...sphere, member_count: 1, is_member: true });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.post("/:id/join", requireAuth, async (req, res) => {
  const sphere = await pool.query("SELECT id, is_private FROM spheres WHERE id = $1", [req.params.id]);
  if (!sphere.rows.length) return res.status(404).json({ error: "Sphere not found" });
  await pool.query(
    "INSERT INTO sphere_members (sphere_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [req.params.id, req.userId],
  );
  res.json({ message: "Joined sphere" });
});

router.delete("/:id/leave", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT role FROM sphere_members WHERE sphere_id = $1 AND user_id = $2",
    [req.params.id, req.userId],
  );
  if (rows[0]?.role === "owner") {
    return res.status(400).json({ error: "Owner cannot leave. Transfer ownership first." });
  }
  await pool.query(
    "DELETE FROM sphere_members WHERE sphere_id = $1 AND user_id = $2",
    [req.params.id, req.userId],
  );
  res.json({ message: "Left sphere" });
});

router.get("/:id/members", requireAuth, async (req, res) => {
  const sphere = await loadSphere(res, req.params.id, req.userId);
  if (!sphere) return;
  if (!ensureCanView(res, sphere, req)) return; // privacy gate
  const { rows } = await pool.query(
    `SELECT user_id, role, joined_at
     FROM sphere_members WHERE sphere_id = $1
     ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END, joined_at`,
    [req.params.id],
  );
  res.json(rows);
});

router.delete("/:id", requireAuth, async (req, res) => {
  if (!req.isAdmin) {
    const { rows } = await pool.query(
      "SELECT role FROM sphere_members WHERE sphere_id = $1 AND user_id = $2",
      [req.params.id, req.userId],
    );
    if (rows[0]?.role !== "owner") return res.status(403).json({ error: "Only the owner can delete a sphere" });
  }
  await pool.query("DELETE FROM spheres WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

// ── Sphere Posts ──────────────────────────────────────────────────────────────

router.get("/:id/posts", requireAuth, async (req, res) => {
  const sphere = await loadSphere(res, req.params.id, req.userId);
  if (!sphere) return;
  if (!ensureCanView(res, sphere, req)) return; // privacy: can't read a private sphere's posts
  const { page = 1, limit = 30 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const { rows } = await pool.query(
    `SELECT sp.*,
      COALESCE((SELECT vote FROM sphere_post_votes WHERE post_id = sp.id AND user_id = $2), 0) AS user_vote
     FROM sphere_posts sp
     WHERE sp.sphere_id = $1
     ORDER BY sp.score DESC, sp.created_at DESC
     LIMIT $3 OFFSET $4`,
    [req.params.id, req.userId, Number(limit), offset],
  );
  res.json(rows);
});

router.post("/:id/posts", requireAuth, async (req, res) => {
  const { rows: [member] } = await pool.query(
    "SELECT role FROM sphere_members WHERE sphere_id = $1 AND user_id = $2",
    [req.params.id, req.userId],
  );
  if (!member && !req.isAdmin) {
    return res.status(403).json({ error: "You must join this sphere to post" });
  }

  const { title, content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "content is required" });

  const { rows } = await pool.query(
    `INSERT INTO sphere_posts (sphere_id, user_id, author_name, title, content)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.id, req.userId, req.userName, title?.trim() || null, content.trim()],
  );
  res.status(201).json({ ...rows[0], user_vote: 0 });
});

router.get("/:id/posts/:postId", requireAuth, async (req, res) => {
  const sphere = await loadSphere(res, req.params.id, req.userId);
  if (!sphere) return;
  if (!ensureCanView(res, sphere, req)) return; // privacy gate
  const [postRes, commentsRes] = await Promise.all([
    pool.query(
      `SELECT sp.*,
        COALESCE((SELECT vote FROM sphere_post_votes WHERE post_id = sp.id AND user_id = $2), 0) AS user_vote
       FROM sphere_posts sp WHERE sp.id = $1 AND sp.sphere_id = $3`,
      [req.params.postId, req.userId, req.params.id],
    ),
    pool.query(
      "SELECT * FROM sphere_post_comments WHERE post_id = $1 ORDER BY created_at ASC",
      [req.params.postId],
    ),
  ]);
  if (!postRes.rows.length) return res.status(404).json({ error: "Post not found" });
  res.json({ ...postRes.rows[0], comments: commentsRes.rows });
});

router.delete("/:id/posts/:postId", requireAuth, async (req, res) => {
  const { rows: [post] } = await pool.query(
    "SELECT user_id FROM sphere_posts WHERE id = $1 AND sphere_id = $2",
    [req.params.postId, req.params.id],
  );
  if (!post) return res.status(404).json({ error: "Post not found" });

  const isAuthor = post.user_id === req.userId;
  if (!isAuthor && !req.isAdmin) {
    const { rows: [member] } = await pool.query(
      "SELECT role FROM sphere_members WHERE sphere_id = $1 AND user_id = $2",
      [req.params.id, req.userId],
    );
    if (!["owner", "moderator"].includes(member?.role)) {
      return res.status(403).json({ error: "Permission denied" });
    }
  }

  await pool.query("DELETE FROM sphere_posts WHERE id = $1", [req.params.postId]);
  res.status(204).end();
});

// ── Post Votes ────────────────────────────────────────────────────────────────

router.post("/:id/posts/:postId/vote", requireAuth, async (req, res) => {
  const voteValue = Number(req.body.vote);
  if (![1, -1, 0].includes(voteValue)) {
    return res.status(400).json({ error: "vote must be 1, -1, or 0" });
  }

  const sphere = await loadSphere(res, req.params.id, req.userId);
  if (!sphere) return;
  if (!ensureCanView(res, sphere, req)) return;                       // privacy gate
  if (!(await loadPostInSphere(res, req.params.postId, req.params.id))) return; // post must belong to this sphere

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [existing] } = await client.query(
      "SELECT vote FROM sphere_post_votes WHERE post_id = $1 AND user_id = $2",
      [req.params.postId, req.userId],
    );
    const oldVote = existing?.vote || 0;
    const delta = voteValue - oldVote;

    if (voteValue === 0) {
      await client.query(
        "DELETE FROM sphere_post_votes WHERE post_id = $1 AND user_id = $2",
        [req.params.postId, req.userId],
      );
    } else {
      await client.query(
        `INSERT INTO sphere_post_votes (post_id, user_id, vote) VALUES ($1, $2, $3)
         ON CONFLICT (post_id, user_id) DO UPDATE SET vote = $3`,
        [req.params.postId, req.userId, voteValue],
      );
    }

    const { rows } = await client.query(
      "UPDATE sphere_posts SET score = score + $1 WHERE id = $2 RETURNING score",
      [delta, req.params.postId],
    );
    await client.query("COMMIT");
    res.json({ score: rows[0]?.score ?? 0, user_vote: voteValue });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ── Post Comments ─────────────────────────────────────────────────────────────

router.post("/:id/posts/:postId/comments", requireAuth, async (req, res) => {
  const { rows: [member] } = await pool.query(
    "SELECT role FROM sphere_members WHERE sphere_id = $1 AND user_id = $2",
    [req.params.id, req.userId],
  );
  if (!member && !req.isAdmin) {
    return res.status(403).json({ error: "You must join this sphere to comment" });
  }
  // Nested-authz: the post must belong to this sphere (prevents cross-sphere comment injection).
  if (!(await loadPostInSphere(res, req.params.postId, req.params.id))) return;

  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "content is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO sphere_post_comments (post_id, sphere_id, user_id, author_name, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.postId, req.params.id, req.userId, req.userName, content.trim()],
    );
    await client.query(
      "UPDATE sphere_posts SET comment_count = comment_count + 1 WHERE id = $1",
      [req.params.postId],
    );
    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.delete("/:id/posts/:postId/comments/:commentId", requireAuth, async (req, res) => {
  // Nested-authz: the post must belong to this sphere…
  if (!(await loadPostInSphere(res, req.params.postId, req.params.id))) return;
  // …and the comment must belong to that post (URL parts must all line up).
  const { rows: [comment] } = await pool.query(
    "SELECT user_id, post_id FROM sphere_post_comments WHERE id = $1",
    [req.params.commentId],
  );
  if (!comment || Number(comment.post_id) !== Number(req.params.postId)) {
    return res.status(404).json({ error: "Comment not found" });
  }

  const isAuthor = comment.user_id === req.userId;
  if (!isAuthor && !req.isAdmin) {
    const { rows: [member] } = await pool.query(
      "SELECT role FROM sphere_members WHERE sphere_id = $1 AND user_id = $2",
      [req.params.id, req.userId],
    );
    if (!["owner", "moderator"].includes(member?.role)) {
      return res.status(403).json({ error: "Permission denied" });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM sphere_post_comments WHERE id = $1", [req.params.commentId]);
    await client.query(
      "UPDATE sphere_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = $1",
      [req.params.postId],
    );
    await client.query("COMMIT");
    res.status(204).end();
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export default router;
