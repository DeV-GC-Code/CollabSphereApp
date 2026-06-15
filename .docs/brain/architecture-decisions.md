# Architecture Decision Records (ADRs)

Lightweight log of significant decisions: context, decision, alternatives, consequences. Append new ADRs; never rewrite history.

> **Architecture-XML-update rule:** any ADR that introduces/changes a service, route, integration, datastore, or event **must** be accompanied by an update to `.docs/architecture/backend-architecture.drawio` and/or `frontend-architecture.drawio`, plus `.docs/architecture/hld.md`/`lld.md`. Stale diagrams are a defect.

---

## ADR-001 — Polyglot microservices (as-is, intentional)
**Context:** Learning/portfolio goal is to demonstrate polyglot persistence + service decomposition.
**Decision:** Six services across Java, Node, Go, Python with PostgreSQL, Neo4j, MongoDB, and Kafka.
**Alternatives:** Monolith (simpler, less to learn); single language (less polyglot story).
**Consequences:** Rich learning surface; higher operational complexity, no shared libraries, mixed conventions. Keep boundaries clean.

## ADR-002 — Single API gateway as the only public entry
**Decision:** Spring Cloud Gateway (:8007) owns routing, JWT validation, CORS.
**Consequences:** One choke point for auth/CORS. Risk: route config (StripPrefix/RewritePath) is fragile and per-route inconsistent (spheres=3, others=2, likes rewrite). Treat the gateway path contract as load-bearing.

## ADR-003 — JWT issued by user-service, validated at gateway and services
**Decision:** user-service signs JWTs (shared `${secret}`); gateway `AuthenticationFilter` validates protected routes as an edge pre-check and strips spoofed identity headers. Services validate the signed JWT before making authorization decisions.
**Consequences:** Direct-port access is no longer implicitly trusted for Java/Go/Python/Node protected routes. Residual: HS256 still shares one secret across languages until ADR-013's RS256/JWKS migration.

## ADR-004 — Per-service databases
**Decision:** Each service owns its datastore: Postgres (user/posts/spheres/notification), Neo4j (connections), Mongo (messages). `db-init` creates `collabsphere_*` Postgres DBs.
**Reality:** Java user/posts now point at `collabsphere_users` and `collabsphere_posts`; Node/Python use their dedicated DBs. Seed-only shortcuts should not become runtime coupling.

## ADR-005 — Event-driven via Kafka + Avro/Schema Registry
**Decision:** Cross-service reactions go through Kafka (Avro, Schema Registry :8081). e.g. `POST_CREATED` → notification.
**Consequences:** The decoupled, scalable path. Keep new cross-service reactions on Kafka rather than adding synchronous calls.

## ADR-006 — Synchronous posts → connections (accepted, with caveat)
**Decision:** posts-service calls connections-service over HTTP to scope feeds to a user's network.
**Consequences:** Simple, but introduces coupling + a failure dependency with no retry/circuit breaker. **Future:** consider caching the graph, an async projection, or resilience (timeouts/fallbacks).

## ADR-007 — Frontend: React + Vite, Context-only state, token-driven CSS
**Decision:** No Redux; Context for auth/theme; one `app.css` with CSS custom properties.
**Consequences:** Low ceremony. Risk: the single large stylesheet accumulated overriding token blocks + `!important` layers (and was once truncated by a formatter). **Future:** tokenization cleanup, possibly CSS split + TypeScript.

## ADR-008 — Rich text stored as sanitized HTML (with BBCode back-compat)
**Decision:** Composer produces HTML; `sanitizeHtml` allow-lists tags/styles; `renderPostHtml` renders new HTML and legacy BBCode/plain.
**Consequences:** WYSIWYG works; XSS controlled at render. Attachments are base64 in content — demo-grade; replace with uploads later.

## ADR-009 — Documentation lives only under `.docs/`
**Decision:** All architecture/knowledge docs under `.docs/` (this knowledge base). A minimal root `CLAUDE.md` may point here for tool compatibility but contains no real docs.
**Consequences:** Predictable, AI-agent-friendly. Enforced by guardrails.

---

### Open decisions needing the owner's input
1. Containerize (Dockerfiles + compose) — no infra-as-code today.
2. Observability stack choice (OpenTelemetry + Datadog/Dynatrace).
3. RS256/JWKS + refresh/revocation model — see ADR-013.

---

## ADR-010 — Lock down user-service reads at the gateway (SEC-1)
**Decision:** Split the `/api/v1/users/**` route: `auth/**` + `stats` stay public; all other reads require `AuthenticationFilter`. Removed `email` from `UserDto`.
**Alternatives:** in-service auth interceptor (more code); leave open (rejected — PII leak).
**Consequences:** No unauthenticated member/email scraping. Residual: authenticated `GET /users` still returns the full list — make admin-only/paginated later.

## ADR-011 — Gateway rate limiting (SEC-2)
**Decision:** In-memory per-IP fixed-window limiter on the auth route (dev-grade).
**Alternatives:** Redis `RequestRateLimiter` (needs Redis infra — deferred); none (rejected).
**Consequences:** Brute-force/spam throttled per instance. **Must** move to Redis-backed for multi-replica production.

## ADR-012 — Server-side HTML sanitization is authoritative (SEC-3)
**Decision:** posts-service sanitizes post HTML with jsoup on write; client sanitize is defense-in-depth.
**Consequences:** Stored XSS mitigated even for direct-to-API requests. Residual: `style` attr passes without CSS sanitization; token still in sessionStorage (consider httpOnly + CSP).

## ADR-013 — JWT: guard secret + config TTL now; RS256 + refresh later (SEC-4)
**Decision:** Enforce ≥256-bit secret (fail-fast) and config-driven TTL now. **Deferred:** move HS256→RS256/ES256 (JWKS verify, no shared secret) + refresh tokens + revocation denylist.
**Consequences:** Removes weak-secret forgery + hard-coded expiry. Shared-secret blast radius + no revocation remain until the deferred work lands (touches all 4 languages).

## ADR-014 — Resilience on posts→connections (ARC-2, supersedes part of ADR-006)
**Decision:** Feign + Spring Cloud CircuitBreaker (resilience4j): 3s time limit, circuit breaker, empty-list fallback.
**Consequences:** connections-service outage degrades the feed gracefully instead of cascading. Synchronous coupling still exists (async projection remains a future option).

## ADR-015 — Real per-service databases for Java (ARC-3, supersedes ADR-004)
**Decision:** user-service → `collabsphere_users`, posts-service → `collabsphere_posts` (created by db-init). Updated spheres seed's cross-service user lookup accordingly.
**Alternatives:** keep shared `postgres` (rejected — violates DB-per-service).
**Consequences:** Real data isolation. **Learning note:** exposed a hidden cross-DB read (spheres seed → users) — DB-per-service surfaces such couplings; route cross-service data via API/events, not shared DBs. Existing `postgres` data won't auto-migrate (dev reset / manual dump-restore).

## ADR-016 — Spheres authorization uses signed roles and membership
**Decision:** Spheres admin checks use the signed JWT role claim (`role=ADMIN`), not `admin@example.com`. Private sphere read/write paths load sphere access before returning details, posts, members, votes, comments, or deletes. Nested post/comment routes prove the post/comment belongs to the `:id` sphere in the URL.
**Alternatives:** Keep email equality (rejected — not RBAC); gateway-injected identity only (rejected — direct service access would bypass authorization).
**Consequences:** Admin is now a real signed claim, private sphere URLs are not public by direct access, and cross-sphere post/comment operations are blocked. Full role management UI/API is still future work.

## ADR-017 — Java services use Flyway baselines
**Decision:** user-service and posts-service use Flyway migrations with `ddl-auto=validate`. Initial migrations create/validate the baseline schema and future schema changes must be explicit SQL migrations.
**Alternatives:** Keep `ddl-auto=update` (rejected — non-reviewable schema drift); defer migrations (rejected for user/posts after the latest hardening).
**Consequences:** Startup fails on schema drift instead of mutating production-like data implicitly. Local DBs may need a baseline/reset if old dev schemas differ materially.

## ADR-018 — PostLikedEvent separates actor from recipient
**Decision:** `PostLikedEvent` now carries `postOwnerId` and `likedByUserId` while retaining legacy `userid` for compatibility. notification-service notifies `postOwnerId` and uses `likedByUserId` as actor.
**Alternatives:** Treat `userid` as owner (rejected — it was the liker in producer code); look up post ownership in notification-service (rejected — cross-service DB/API dependency).
**Consequences:** Like notifications go to the post owner, not the liker. Older events without `postOwnerId` are skipped rather than misdelivered.

### Open decisions — UPDATED
- ✅ ADR-004 superseded by ADR-015 (per-service DBs done).
- ✅ ADR-003 settled on service-side validation plus gateway edge pre-check.
- ⛔ Containerize (devops/02) — still open.
- ⛔ Observability (devops/01) — still open.
- ✅ ARC-6 Flyway migrations for user/posts done (ADR-017).
- 🟡 RS256/refresh/revocation still open (ADR-013).

## ADR-016 — Spheres: enforce privacy + nested authorization (SEC)
**Decision:** Added `ensureCanView` (private spheres need membership/creator/admin → else 404) on sphere detail/members/posts/post-detail, and `loadPostInSphere` so vote/comment/delete prove the post (and comment) belong to the sphere in the URL.
**Consequences:** Closes broken-access-control (private leakage + cross-sphere mutation). Pure spheres-service (Node) change.

## ADR-017 — RBAC via signed `role` claim (supersedes email-equality admin)
**Decision:** user-service emits a signed `role` claim (admin determined centrally from `app.admin-emails`/`ADMIN_EMAIL`). spheres-service + frontend read `role === "ADMIN"`; the old `email === ADMIN_EMAIL` comparison is removed.
**Consequences:** Admin is a verified signed claim, not a client/email compare. Residual: email *verification* + a data-driven role column/admin UI remain future work. Pre-existing tokens (no role) get no admin rights (safe).

## ADR-018 — Like notification targets the post owner (event fix)
**Decision:** `PostLikedEvent` now carries `userid` = post OWNER (recipient) + `likedbyuserid` = liker (actor); posts-service fetches the post to populate the owner; notification-service consumer already reads these.
**Consequences:** Likes notify the right user. Requires Avro regen on build (avsc changed).

## ADR-019 — Posts seed is opt-in (no cross-DB read by default)
**Decision:** `DataInitializer` is gated behind `seed.posts.enabled` (default false); normal runs no longer read `collabsphere_users` directly.
**Consequences:** Database-per-service boundary respected by default. Local seeding stays available via the flag; long-term seed via API/events.

### Still open / deferred (acknowledged, not silently dropped)
- **ARC-1 split-brain auth** — gateway validates + injects `X-User-Id`, yet services also self-validate JWTs differently. Coherent fix = pick one model (gateway-only-trust vs in-service-everywhere) across Java/Go/Python; large, deferred with intent.
- **ARC-6 migrations** — `ddl-auto=update` remains on user/posts; Flyway plan in `security/hardening.md` (you're handling DevOps later).
- **Frontend fragility** — no TypeScript, no test runner, local-only saved/profile state, ~8.2k-line `app.css`. Documented; refactors are large, not "fixes".
