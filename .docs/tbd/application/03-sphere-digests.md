# App Feature 03 — Sphere Digests ("what you missed")

> Candidate **application** feature. UI-first. For audit, not yet approved.

## Title
Per-Sphere catch-up cards summarizing new activity since the user's last visit.

## Business / product purpose
Spheres (communities) accumulate threads between visits; users have no way to "catch up" and quietly disengage. A digest ("3 new threads, 12 replies since Tuesday") pulls people back into their communities — a retention loop.

## Why it fits
spheres-service already stores threads/posts/votes/comments with timestamps. A digest is mostly a time-windowed query + a clean UI. Optional AI summarization is a natural enhancement (ties to the AI roadmap in `.docs/design/REDESIGN.md`).

## How the UI looks (lead)

**Top of the Spheres page (and optionally Home State C):**
```
┌─ Catch up ─────────────────────────────────────────────────┐
│ ┌──────────────────────────┐ ┌──────────────────────────┐  │
│ │ ◼ #golang                 │ │ ◼ #design-systems         │ │
│ │ 4 new threads · 18 replies│ │ 2 new threads · 9 replies │ │
│ │ ─────────────────────────│ │ ──────────────────────────│ │
│ │ • "Generics in 1.23?" 12▲ │ │ • "Token naming" 7▲        │ │
│ │ • "pprof tips" 6▲         │ │ • "Figma → code" 5▲        │ │
│ │ [ Open Sphere → ]         │ │ [ Open Sphere → ]          │ │
│ └──────────────────────────┘ └──────────────────────────┘  │
│  (only Spheres you've joined · since your last visit)        │
└──────────────────────────────────────────────────────────────┘
```
- One card per joined Sphere with new activity. Shows counts + top 2–3 threads by votes. "Open Sphere" deep-links.
- Optional **AI one-liner**: "Mostly about Go 1.23 generics and profiling." (phase 3)
- Dismiss / "mark caught up" clears the card.

### Components (frontend)
- `DigestStrip` (horizontal cards), `DigestCard` (sphere monogram + counts + top threads + CTA), reusing `SphereMonogram` + thread row styling.
- States: loading (skeleton cards), empty ("you're all caught up ✅"), error (hide strip silently).
- `api/spheres.js#getDigests()`. "Last visit" tracked per user+sphere.

## Backend design
- Add to **spheres-service** (Node/PostgreSQL):
  - Track `last_seen_at` per (user, sphere) — updated when a user opens a Sphere.
  - `GET /spheres/core/digests` → for each joined Sphere, counts of threads/replies since `last_seen_at` + top N threads by votes.
  - Phase 3: an optional summarization call (LLM) to produce the one-liner; cache it per window.

## Required APIs
- `GET /spheres/core/digests?limit=` → `[{ sphereId, name, newThreads, newReplies, topThreads:[{id,title,votes}], summary? }]`.
- `POST /spheres/core/{sphereId}/seen` (or update on Sphere open) → sets `last_seen_at`.

## DB / persistence changes
- New table `sphere_user_state(user_id, sphere_id, last_seen_at)` (composite PK). Indexes on `(sphere_id, created_at)` for thread/reply counting. Real migration via `src/db/migrate.js` (follow existing pattern).

## Service-to-service communication
- None required for counts (all within spheres-service). Phase 3 summarization → a separate AI/LLM call (keep it isolated + cached; don't block the digest).

## Security
- Auth required; digests are per-user and only for **joined** Spheres. No cross-user data leakage. Rate-limit the endpoint.

## Observability
- Metrics: digest open rate, click-through to Sphere, summarization latency/cost. Trace the digest query.

## Failure scenarios
- No `last_seen_at` yet (first visit) → treat as "all caught up" or window = account age, capped.
- Summarizer down/slow → omit the one-liner, still show counts (graceful).
- Expensive counts on large Spheres → precompute/cron or cap the window.

## DevOps / testing impact
- New migration; counting query performance. Tests: window math (since last_seen), joined-only filter, empty/caught-up state, summarizer-absent fallback.

## Suggested phases
1. `last_seen_at` tracking + counts endpoint + `DigestStrip` (counts + top threads).
2. "Mark caught up" + Home State C integration.
3. Optional AI one-liner (cached, non-blocking).
4. Email/notification digest (ties to notification-service) — stretch.

## Risks
- Counting cost on big Spheres (precompute if needed).
- AI cost/latency — keep optional + cached.
- "Last visit" semantics (per-tab vs per-account) — define clearly.

## Open questions for audit
- Include the AI summary in v1 or defer to phase 3?
- Define "last visit" precisely (open Sphere vs view digest)?
- Also deliver digests via notifications/email, or in-app only?
