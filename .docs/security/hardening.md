# Security & Resilience Hardening — change log + verification runbook

> What was changed on 2026-06-14/15 to address the high/medium findings in `.docs/flaws.md`, **why**, **how to verify locally**, and **what remains**. Companion to `.docs/flaws.md` (register) and `.docs/brain/architecture-decisions.md` (ADR-010…018).

## Summary

| ID | Status | What changed |
|---|---|---|
| SEC-1 | ✅ Fixed | `/api/v1/users/**` now requires auth except `auth/**` + `stats`; `UserDto` no longer exposes email |
| SEC-2 | ✅ Fixed (dev-grade) | In-memory per-IP rate limiter on the auth route (10 req / 60s) |
| SEC-3 | ✅ Fixed | Server-side HTML sanitization of post content (jsoup) in posts-service |
| SEC-4 | 🟡 Partial | Config-driven token TTL + min-secret-length guard; **RS256 + refresh/revocation still TODO** |
| ARC-2 | ✅ Fixed | Circuit breaker + 3s time limit + empty-list fallback on posts→connections |
| ARC-3 | ✅ Fixed | user/posts now use `collabsphere_users` / `collabsphere_posts` (not shared `postgres`); spheres seed updated |
| ARC-1 | ✅ Fixed | Gateway is edge pre-check; services validate signed JWTs; spoofed `X-User-Id` is stripped |
| ARC-6 | ✅ Fixed for user/posts | Flyway baselines + `ddl-auto=validate` |
| SPHERES-AUTH | ✅ Fixed | Admin uses signed role; private/nested sphere routes enforce membership and sphere ownership |
| EVENTS-1 | ✅ Fixed | `PostLikedEvent` carries post owner and liker separately |

---

## SEC-1 — Lock down the user directory (HIGH)
**Changed**
- `api-gateway/.../application.yml`: split the single `/api/v1/users/**` route into three (order matters — first match wins):
  - `user-auth` → `/api/v1/users/auth/**` (public, + `RateLimit` filter)
  - `user-stats` → `/api/v1/users/stats` (public; just a count)
  - `user-service` → `/api/v1/users/**` (now has `AuthenticationFilter`) — covers `GET /users` (list) and `GET /{id}`
- `user-service/.../dto/UserDto.java`: removed `email`. The owner reads their email from JWT claims, never from this DTO.

**Why** Anyone could `GET /api/v1/users` unauthenticated and harvest every member's email (OWASP A01/A03).

**Verify**
1. `cd api-gateway && ./mvnw -q compile` and `cd user-service && ./mvnw -q compile`.
2. With the stack up: `curl -i localhost:8007/api/v1/users` → **401** (no token). With a valid `Authorization: Bearer …` → 200, and the JSON has **no `email`** field.
3. `curl -i localhost:8007/api/v1/users/auth/login -d ...` → still works (public). `…/users/stats` → still public.
4. UI smoke test: login + profile still work (profile email comes from the JWT, not this endpoint).

**Residual** Even authenticated, `GET /users` returns the whole member list — consider making it admin-only or paginated/search-only. Tracked in `flaws.md` SEC-1 residual.

---

## SEC-2 — Rate limit the auth route (MEDIUM)
**Changed**
- New `api-gateway/.../filters/RateLimitGatewayFilterFactory.java` — in-memory fixed-window limiter (10 requests / 60s per client IP) returning **429**.
- Applied as the `RateLimit` filter on the `user-auth` route.

**Why** Login/signup were unthrottled → brute-force + signup spam.

**Verify** `for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code}\n" localhost:8007/api/v1/users/auth/login -X POST -d '{}' -H 'Content-Type: application/json'; done` → first 10 pass through, then **429**.

**Residual (important)** This is **dev-grade**: per-gateway-instance memory, no eviction tuning. **Production must use a Redis-backed `RequestRateLimiter`** (shared across replicas). Plan: add `spring-boot-starter-data-redis-reactive`, define a `RedisRateLimiter` + `KeyResolver` (by IP/user), run Redis (pairs with `.docs/tbd/devops/02`). Until then, do not rely on this across multiple gateway replicas.

---

## SEC-3 — Server-side sanitization of post HTML (MEDIUM)
**Changed**
- Added `org.jsoup:jsoup` to `posts-service/pom.xml`.
- New `posts-service/.../util/HtmlSanitizer.java` — jsoup `Safelist` mirroring the composer (b/strong/i/em/u/span/br/p/div + `style` on span/p/div).
- `PostService.createPost` now calls `HtmlSanitizer.clean(post.getContent())` before persisting.

**Why** XSS defense was client-only; a request crafted directly against the API could store malicious HTML. The server is now the authoritative sanitizer (client sanitize remains defense-in-depth).

**Verify** `./mvnw -q compile` posts-service. Then POST a post containing `<script>alert(1)</script><b>hi</b>` via the API → fetch it back → stored content is `<b>hi</b>` (script stripped).

**Residual** jsoup passes the `style` attribute through without CSS-level sanitization (allowed to preserve colour/font). Modern browsers block `javascript:` in CSS; to tighten, drop `style` or add a CSS allow-list. Token is still in `sessionStorage` (JS-readable) — consider httpOnly-cookie auth + CSP (see SEC-4 / flaws.md SEC-3).

---

## SEC-4 — JWT hardening (MEDIUM, partial)
**Changed**
- `user-service/.../service/JwtService.java`: token lifetime is now `${jwt.accessTokenExpirationMs}` (default 24h), and `getSecretKey()` **throws at startup if the secret is < 32 bytes** (HS256 needs ≥256-bit) — fail fast instead of minting forgeable tokens.
- `application.properties`: `jwt.accessTokenExpirationMs = ${JWT_ACCESS_TTL_MS:86400000}`.

**Why** A weak shared secret made tokens forgeable; expiry was hard-coded.

**Verify** Start user-service with a short `${secret}` → it **refuses to start** with a clear message. With a strong secret → boots; issued tokens carry the configured TTL.

**Residual (still TODO — the bigger half)**
- **Symmetric shared secret** across all services: any one leak mints platform-wide tokens. Move to **RS256/ES256** — user-service signs with a private key; gateway + services verify with the public key (JWKS). No shared secret to leak.
- **No refresh/revocation.** Add short-lived access tokens + refresh tokens + a denylist (Redis). 
- This is an ADR-level change touching all 4 languages — see ADR-013 and `.docs/tbd/devops` for sequencing.

---

## ARC-1 — Coherent JWT trust model
**Changed**
- Gateway still validates protected routes early, but no longer injects `X-User-Id`; it strips any client-supplied header with that name.
- user-service now has an interceptor for protected direct-port reads, matching posts/connections/messages/notification/spheres self-validation.
- Spheres admin checks read `role=ADMIN` from the signed JWT.

**Why** The old model mixed gateway-injected identity with downstream self-validation, which made the source of truth ambiguous.

**Verify** Protected direct service calls without `Authorization` return 401 where auth is required. Gateway calls with a valid JWT still succeed.

---

## ARC-2 — Resilience on posts→connections (MEDIUM)
**Changed**
- `posts-service/pom.xml`: added `spring-cloud-starter-circuitbreaker-resilience4j`.
- `ConnectionsClient` `@FeignClient` now has `fallback = ConnectionsClientFallback.class`.
- New `ConnectionsClientFallback` → returns an empty connection list (degraded/empty feed) instead of cascading a 500.
- `application.properties`: `spring.cloud.openfeign.circuitbreaker.enabled=true` + resilience4j time-limiter (3s) + circuit-breaker window/threshold for instance `connections-service`.

**Why** connections-service down/slow previously failed or hung the feed (the primary surface).

**Verify** `./mvnw -q compile` posts-service. Stop connections-service, then load the feed → it returns (degraded, empty connections) instead of erroring; logs show the `[ARC-2]` fallback warning. Bring connections-service back → feed recovers; circuit closes after the wait window.

---

## ARC-3 — Real per-service databases (MEDIUM)
**Changed**
- `user-service` datasource → `jdbc:postgresql://localhost:5432/collabsphere_users`.
- `posts-service` datasource → `…/collabsphere_posts`.
- `spheres-service/src/db/seed.js`: the cross-service user lookup now points at `collabsphere_users` (was `postgres`) — **this coupling would have broken the seed otherwise** (documented learning: "DB-per-service" surfaces hidden cross-DB reads).
- These DBs are already created by `scripts/db-init/01-create-databases.sh`.

**Why** Java services shared the default `postgres` DB → the "database per service" claim was only half-true.

**Verify** `psql` confirms `collabsphere_users` / `collabsphere_posts` exist (db-init). Start user + posts → Flyway applies baseline migrations and Hibernate `validate` passes. ⚠️ Existing data in the old `postgres` DB will **not** migrate automatically (dev reset acceptable; for real data, dump/restore).

---

## ARC-6 — Migrations instead of ddl-auto=update
**Changed**
- Added Flyway to user-service and posts-service.
- Added baseline migrations under each service's `src/main/resources/db/migration/`.
- Set `spring.jpa.hibernate.ddl-auto=validate`.

**Why** Hibernate auto-DDL was non-reviewable and inconsistent with the Node migration path.

**Verify:** `./mvnw -q compile`; service boots; Flyway logs applied migrations; `ddl-auto=validate` passes.

---

## Spheres authorization hardening
**Changed**
- Removed email-equality admin checks.
- Private sphere detail/posts/members routes now check viewer access.
- Sphere post vote/comment/delete routes load the post/comment scoped to both `sphereId` and `postId`.

**Verify:** create a private sphere with user A. User B should not be able to GET its details/posts by direct URL, join it without invite, or vote/comment on its posts.

---

## EVENTS-1 — PostLikedEvent owner/actor fix
**Changed**
- posts-service emits `postOwnerId` and `likedByUserId`.
- notification-service sends the notification to `postOwnerId` and skips legacy events that cannot identify the owner.

**Verify:** like another user's post and confirm the notification row belongs to the post owner, not the liker.

---

## Cross-cutting verification checklist (run locally)
- [ ] `cd api-gateway && ./mvnw -q compile` · `cd user-service && ./mvnw -q compile` · `cd posts-service && ./mvnw -q compile`
- [ ] Bring up infra (Postgres/Neo4j/Mongo/Kafka) per `.docs/guides/START.md`; ensure `collabsphere_users` + `collabsphere_posts` exist.
- [ ] Set a **strong** `${secret}` (≥32 bytes) or user-service won't boot (by design).
- [ ] Smoke: signup → login → load feed → create a post with `<script>` (verify stripped) → `GET /users` without token = 401.
- [ ] Rate limit: hammer `/users/auth/login` → 429 after 10.
- [ ] Resilience: stop connections-service → feed still loads (empty).

## What's still open (tracked in flaws.md)
- SEC-3 residual (CSS in style; token in sessionStorage → consider httpOnly + CSP).
- SEC-4 RS256 + refresh/revocation (ADR-013).
- SEC-2 Redis-backed distributed rate limiting.
- ARC-5 (shared error contract), SEC-5 (TLS/mTLS), SEC-6 (generic client errors), OPS-1/2 (containers, observability).
