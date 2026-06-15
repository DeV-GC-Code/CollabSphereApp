# CollabSphere — Design & Security Flaw Register

> **Brutally honest** senior-architect evaluation (2026-06-14). Evidence-based: every flaw cites real code. Severity: **Critical / High / Medium / Low**. This is a living document — update it as flaws are fixed or found. Companion to `.docs/brain/architecture-decisions.md` and `.docs/guardrails/`.

## TL;DR scorecard

> **Remediation update (2026-06-14):** ✅ FIXED — SEC-1, SEC-2, SEC-3, ARC-2, ARC-3, spheres **privacy + nested authorization**, **RBAC via signed `role` claim** (ADR-017), and `PostLikedEvent` **notification recipient** (ADR-018), plus posts seed gated off cross-DB read (ADR-019). 🟡 PARTIAL — SEC-4 (secret guard + TTL done; RS256/refresh deferred). ⛔ DEFERRED (NOT fixed) — **ARC-1 split-brain auth**, **ARC-6 Java migrations** (ddl-auto still present), and frontend fragility (no TS/tests, ~8.2k-line CSS). See `.docs/security/hardening.md` + ADR-016..019. Java/Avro changes need a local rebuild. Scores below revised post-hardening; baseline in parentheses.

| Dimension | Score | One-line verdict |
|---|---|---|
| Security | **7.5 / 10** (was 5) | Directory locked down, spheres authorization repaired, rate limiting + server-side sanitize added, JWT secret guarded. Residuals: RS256/refresh (SEC-4), Redis rate limit, httpOnly/CSP. |
| Architecture & design | **7.5 / 10** (was 6) | Added circuit-breaker/fallback, real per-service DBs, service-side JWT trust model, Flyway baselines, and corrected event semantics. Residuals: error contract, HS256 shared secret, synchronous feed coupling. |
| Frontend | **6.8 / 10** | Slightly better with signed-role admin UI + Vitest foothold, but still plain JS, fragile mega-stylesheet, local-only saved/profile state, base64 media. |
| DevOps / operational maturity | **3 / 10** | Unchanged — still no containers, no CI/CD, no observability (see `.docs/tbd/devops/`). |
| Documentation & AI-readiness | **8 / 10** (was 7.5) | `.docs` is now versionable, canonical, and updated with new ADRs; still unenforced and some design docs need continued pruning. |
| **Overall** | **≈ 7 / 10** (was 5.5) | The major app-layer security holes are closed; DevOps maturity and production auth/session design are now the dominant gaps. |

The good news up front (so the scores are fair):
- ✅ **No frontend → database access.** The UI only calls `/api/v1/*` through the gateway (`api/client.js`). The boundary you asked about is clean.
- ✅ **Passwords hashed with BCrypt** (`user-service/.../utils/PasswordUtil.java`), not plaintext.
- ✅ **JWT signature + expiry are verified** (`api-gateway/.../JwtService.java` uses `verifyWith(...).parseSignedClaims`).
- ✅ **Parameterized SQL** in spheres-service (`src/routes/spheres.js` → `pool.query(sql, params)` with `$n` placeholders). No injection in inspected routes.
- ✅ **Secrets are gitignored** (`.gitignore` excludes `.env*` except examples); configs use `${placeholders}`, not real values.
- ✅ **Gateway strips client-supplied `X-User-Id`** and services validate signed JWTs for authorization — anti-spoofing.
- ✅ **CORS is origin-restricted** and matches the Vite dev port (`vite.config.js` port 3000 == gateway allowed origin).

---

## SECURITY

### SEC-1 — Unauthenticated user directory + email enumeration · **HIGH**  ·  ✅ FIXED (hardening.md)
**Evidence:** `api-gateway/.../application.yml` routes `/api/v1/users/**` with **no `AuthenticationFilter`**. `user-service/.../controller/UserController.java` exposes `GET /` (`listAll`) and `GET /{id}` returning `UserDto` which includes **`email`** (`dto/UserDto.java`).
**Impact:** Anyone, with no token, can `GET /api/v1/users` and harvest **every member's name + email**, or enumerate by id. Classic broken access control / excessive data exposure (OWASP A01/A03).
**Why it happened:** signup/login must be public, so the whole `users` route was left unauthenticated — but the same service also serves profile/list reads.
**Fix:** Split public vs protected. Keep `/users/auth/**` (signup/login) and `/users/stats` public; require auth for `GET /users` and `GET /{id}` (either add a second gateway route with `AuthenticationFilter`, or add an in-service auth interceptor like posts/connections have). Drop `email` from public/列表 responses; return it only to the owner.
**Effort:** S.

### SEC-2 — No rate limiting anywhere · **MEDIUM**  ·  ✅ FIXED dev-grade (hardening.md)
**Evidence:** Gateway has routing + auth + CORS filters only; no `RequestRateLimiter`. Login/signup unthrottled.
**Impact:** Credential brute-force, signup spam, and scraping (worsens SEC-1) are unmitigated.
**Fix:** Add Spring Cloud Gateway `RequestRateLimiter` (Redis) on auth + read routes; add per-IP and per-account login throttling/lockout.
**Effort:** M.

### SEC-3 — XSS defense is client-only; token is JS-readable · **MEDIUM**  ·  ✅ FIXED (hardening.md)
**Evidence:** Post content is rendered with `dangerouslySetInnerHTML` and sanitized **only in the browser** (`utils/format.js#sanitizeHtml`/`renderPostHtml`). posts-service does no server-side sanitization/output encoding. The session token is stored in **`sessionStorage`** (`utils/session.js`) → readable by any script.
**Impact:** Stored content is trusted to be sanitized by *every* future render path. If any render path forgets to sanitize (or the allow-list is widened), it's stored XSS → and because the token is JS-readable, XSS = account takeover. Single layer of defense.
**Fix:** Sanitize/encode **server-side on write** (posts-service) as the authoritative layer; keep client sanitize as defense-in-depth. Consider httpOnly cookie auth (removes token from JS) or at least a strict CSP. Don't widen the sanitizer allow-list without review.
**Effort:** M.

### SEC-4 — Symmetric shared JWT secret, no rotation/revocation · **MEDIUM**  ·  🟡 PARTIAL (hardening.md)
**Evidence:** HS256 with a single `${secret}` shared by the gateway **and every service** (`JwtService`, plus messages/notification self-validate with the same secret). No refresh/rotation/revocation documented; expiry strategy unclear.
**Impact:** Any single compromised service (or a leaked secret) can **mint valid tokens for the whole platform**. No way to revoke a stolen token before expiry. Secret strength is operator-dependent (HS256 needs ≥256-bit; a weak `${secret}` makes tokens forgeable).
**Fix:** Move to asymmetric (RS256/ES256): user-service signs with a private key, services verify with the public key (no shared secret to leak). Add short access-token TTL + refresh tokens + a revocation/denylist. Enforce a minimum secret length in config.
**Effort:** M–L.

### SEC-5 — No TLS internally; permissive headers · **LOW (dev) / HIGH (prod)**
**Evidence:** All inter-service URLs are `http://` (gateway + service configs). CORS `allowedHeaders: "*"`.
**Impact:** Fine for local; in any shared/prod environment, tokens and PII travel in cleartext between hops.
**Fix:** TLS termination + mTLS (or a service mesh) for prod; tighten allowed headers to the set actually used.
**Effort:** M (prod-time).

### SEC-6 — Backend error messages surfaced to the client · **LOW**
**Evidence:** UI shows `err.message` from responses (e.g. `FeedPage`, `AuthPage`); services return raw error strings (Go `gin.H{"error": err.Error()}`).
**Impact:** Can leak internal details (stack/driver messages) and aids attackers.
**Fix:** Return generic client messages + an error code; log details server-side only. Establish a shared error contract (see ARC-5).
**Effort:** S–M.

### SEC-7 — Spheres admin/privacy/nested authorization · **HIGH** · ✅ FIXED
**Evidence:** Admin was email equality (`admin@example.com`) in backend and UI; private sphere listing was filtered, but detail/posts/members routes did not consistently enforce membership; vote/comment/delete routes did not consistently prove the post/comment belonged to the sphere in the URL.
**Impact:** Broken access control: forged/unverified admin identity, private sphere data exposure by direct URL, and cross-sphere nested object actions.
**Fix:** Admin comes from signed `role=ADMIN`; private sphere routes load access before returning data; write routes require membership/admin; post/comment mutations query by both `sphere_id` and nested object id.
**Effort:** M.

---

## ARCHITECTURE & CONSISTENCY

### ARC-1 — Two competing auth mechanisms (redundant + inconsistent) · **MEDIUM** · ✅ FIXED
**Evidence:** Gateway validates the JWT and injects a trusted `X-User-Id` (`AuthenticationFilter`). But posts/connections **re-parse the `Authorization` header themselves** (`auth/UserInterceptor.java`), and messages (Go) + notification (Python) also self-validate. The injected `X-User-Id` is largely unused.
**Impact:** Unclear source of truth; double work; easy to implement one path and forget the other. It's accidental defense-in-depth, not a designed model.
**Fix:** Pick ONE: (a) gateway-only validation + services trust `X-User-Id` (simpler, but services must be unreachable except via the gateway), or (b) in-service validation everywhere + drop the `X-User-Id` injection. **Done:** chose service-side validation everywhere, kept gateway as edge pre-check, stripped `X-User-Id`.
**Effort:** M.

### ARC-2 — Synchronous posts→connections with no resilience · **MEDIUM**  ·  ✅ FIXED (hardening.md)
**Evidence:** `posts-service` config `connections-service.url=http://localhost:9030`; Feign/HTTP call to scope feeds. No timeout/retry/circuit-breaker/fallback found.
**Impact:** connections-service down or slow → posts feed fails or hangs → cascading failure on the app's primary surface.
**Fix:** Wrap with Resilience4j (timeout, retry, circuit breaker) + a fallback (e.g. global feed). Better: precompute/cache the network or move to an async graph projection.
**Effort:** M.

### ARC-3 — "Database per service" only half-true · **MEDIUM**  ·  ✅ FIXED (hardening.md)
**Evidence:** `scripts/db-init` creates `collabsphere_users/_posts/_spheres/_notifications`, but Java services point at the **default `postgres` DB** (`jdbc:postgresql://localhost:5432/postgres` in user/posts `application.properties`). Node/Python use the dedicated DBs.
**Impact:** Java services share one schema/namespace → the isolation the architecture claims is not real; cross-service coupling at the data layer; harder to scale/migrate independently.
**Fix:** Point each Java service at its `collabsphere_*` DB; add Flyway/Liquibase migrations. (See ARC-6.)
**Effort:** S–M.

### ARC-4 — Fragile gateway path contract · **LOW**
**Evidence:** `StripPrefix` differs per route (spheres=3, others=2); `likes` uses `RewritePath`. Internal prefixes (`/spheres/core`, `/messages/core`, `/notifications/core`) are load-bearing.
**Impact:** Renaming a service's internal path or copy-pasting a route silently breaks routing; no tests guard it.
**Fix:** Normalize prefixes; add a gateway smoke test that hits one endpoint per service.
**Effort:** S.

### ARC-5 — No shared error contract · **MEDIUM**
**Evidence:** Java (Spring), Go (`{"error": ...}`), Python (FastAPI) all return different error shapes.
**Impact:** The frontend can't handle errors uniformly; every integration is bespoke; SEC-6 leakage varies per service.
**Fix:** Define a standard error envelope (`{code, message, traceId}`) and adopt it everywhere.
**Effort:** M.

### ARC-6 — `ddl-auto=update` instead of migrations (Java) · **MEDIUM**  ·  ✅ FIXED for user/posts
**Evidence:** user/posts `application.properties`: `spring.jpa.hibernate.ddl-auto=update`. Node has real migrations (`spheres-service/src/db/migrate.js`); Java does not.
**Impact:** Hibernate auto-DDL is non-deterministic and **unsafe for production** (can't review/rollback schema changes); inconsistent with the Node approach.
**Fix:** Flyway/Liquibase for Java services; set `ddl-auto=validate`. **Done:** Flyway baselines added to user/posts and `ddl-auto=validate` is set.
**Effort:** M.

### ARC-7 — Hardcoded localhost URLs, no discovery/config service · **LOW**
**Evidence:** Service URLs hardcoded in gateway + posts config.
**Impact:** Won't work in containers/k8s without edits; no central config.
**Fix:** Externalize via env (service names under compose); optionally a config service. (Resolved naturally by `.docs/tbd/devops/02-containerization-cicd.md`.)
**Effort:** S (with containerization).

### ARC-8 — Notification event semantics wrong for post likes · **MEDIUM** · ✅ FIXED
**Evidence:** `PostLikedEvent.userid` was the liker, but notification-service treated it as the recipient/post owner.
**Impact:** Likes notified the wrong user; in self-contained tests it looked like notifications existed but were semantically corrupt.
**Fix:** Event now carries `postOwnerId` and `likedByUserId`; notification-service writes the notification to the owner and uses the liker as actor.
**Effort:** S.

### ARC-9 — Posts seed crossed into the user database · **LOW/MEDIUM** · ✅ FIXED
**Evidence:** posts-service `DataInitializer` directly queried the user database for demo author IDs.
**Impact:** Violated database-per-service boundaries and made posts startup depend on another service's schema.
**Fix:** Seed user IDs are supplied via optional `POST_SEED_USER_IDS`; if absent, posts seed is skipped rather than crossing service DBs.
**Effort:** S.

---

## FRONTEND

### FE-1 — Client-only features & untyped contracts · **MEDIUM**
**Evidence:** "Saved posts" live only in `localStorage` (`utils/saved.js`) — no backend, lost across devices. API responses are untyped (no TS/schema); the UI assumes shapes.
**Impact:** Data loss surprise for users; silent breakage when a backend field changes.
**Fix:** Back saved-posts with a service (or accept it as device-local and label it). Add TypeScript or runtime validation (zod) at the API boundary.
**Effort:** M.

### FE-2 — Mega-stylesheet fragility · **LOW (but recurring)**
**Evidence:** `styles/app.css` (~7.3k lines) with multiple `:root` token blocks + trailing `!important` override layers; a formatter previously **truncated** it (recovered from backup).
**Impact:** Cascade conflicts cause "fix doesn't apply" regressions; high blast radius; formatter risk.
**Fix:** Consolidate token blocks, remove legacy override layers, consider CSS split; pin/disable the CSS formatter; commit around edits.
**Effort:** M.

### FE-3 — Base64 media in payloads · **LOW**
**Evidence:** Attachments embedded as base64 inside post content (`FeedPage.publishPost`).
**Impact:** Bloated DB/state/localStorage; won't scale.
**Fix:** `.docs/tbd/devops/04-media-object-storage.md` (media service + object storage).
**Effort:** M.

---

## DEVOPS / OPERATIONS  (lowest-scoring, most ironic for the stated goal)

### OPS-1 — No containerization / IaC / CI-CD · **HIGH (for a DevOps platform)**
**Evidence:** No Dockerfiles, no `docker-compose`, no pipeline files. Startup is a manual multi-process sequence (`.docs/guides/START.md`).
**Impact:** Not reproducible; "works on my machine"; no automated build/test/deploy. For a project whose stated purpose is **learning DevOps**, this is the central gap.
**Fix:** `.docs/tbd/devops/02-containerization-cicd.md` (Dockerfiles + compose + Makefile + GitHub Actions).
**Effort:** M–L.

### OPS-2 — No observability · **HIGH**
**Evidence:** Per-service stdout logs only; a couple of `/actuator/health`; no tracing, metrics, correlation IDs, or aggregation.
**Impact:** Debugging a cross-service issue means grepping 6 terminals. No SLOs, no insight.
**Fix:** `.docs/tbd/devops/01-observability.md` (OpenTelemetry + dashboards + correlation IDs from the gateway).
**Effort:** M–L.

### OPS-3 — Sparse automated tests · **MEDIUM** · 🟡 PARTIAL
**Evidence:** Some unit tests exist (e.g. `posts-service/.../auth/UserInterceptorTest.java`, connections equivalent), and Vitest now covers frontend sanitizer/JWT utilities. No integration/e2e or coverage gate.
**Impact:** Refactors are risky; regressions slip (the CSS truncation went unnoticed until visual inspection).
**Fix:** Add Vitest+RTL (frontend, start with the sanitizer + auth guards), service integration tests (Testcontainers), and a gateway smoke test. Gate in CI.
**Effort:** M.

### OPS-4 — No readiness/liveness separation or health aggregation · **LOW**
**Evidence:** Health endpoints exist but aren't standardized or aggregated; no readiness vs liveness.
**Impact:** Orchestrators can't make good restart/route decisions; no single status view.
**Fix:** Standardize `/health/live` + `/health/ready`; aggregate (ties to OPS-2 / devops/01-observability).
**Effort:** S–M.

---

## DOCUMENTATION & AI-READINESS

### DOC-1 — `DESIGN.md` still carries stale facts · **MEDIUM**
**Evidence:** `.docs/design/DESIGN.md` §1 lists spheres=MongoDB and notification=Kafka-only; reality is PostgreSQL (see `.docs/backend.md` §13). Not yet corrected.
**Impact:** An AI agent or dev trusting DESIGN.md gets the data layer wrong.
**Fix:** Correct the DESIGN.md service→DB table (or add a prominent "superseded by backend.md" banner).
**Effort:** S.

### DOC-2 — Docs are new and unenforced · **LOW**
**Evidence:** The `.docs/` knowledge base + guardrails + architecture-XML-update rule exist and `.docs/` is now allowed by git, but nothing enforces updates (no doc-lint, no CI check, no PR template).
**Impact:** Docs will drift again without discipline (this register itself proves drift happens).
**Fix:** Add a lightweight CI check (e.g. fail if a new service dir has no service-map entry), a PR checklist referencing guardrails, and keep `.docs/journal.md` current.
**Effort:** S.

---

## Priority fix order (my recommendation)
1. **SEC-1** (auth the user directory, drop public emails) — fastest high-impact win.
2. **SEC-2** (rate limit auth) + **SEC-3** (server-side sanitize) — close the obvious abuse paths.
3. **OPS-1** (containerize + CI) — unlocks everything else and is the core learning goal.
4. **OPS-2** (observability) + **ARC-5** (one error contract).
6. **DOC-1** (fix DESIGN.md) — trivial, do it now.
