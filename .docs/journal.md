# Operational Journal

The project's operational memory. Any AI agent or developer should be able to continue from here **without prior chat history**. Append a new entry for every meaningful change. Newest at top.

> Note: an older narrative journal exists at `.docs/journal/Project-Journal.md`. **This file (`.docs/journal.md`) is the canonical operational journal going forward.**

### Entry template
```
Date/Time:
Area:
Action Taken:
Observation:
Issue Found:
Fix/Decision:
Impact:
Next Step:
```


## 📌 Standing practice — keep docs in sync (do this EVERY change)
After **any** meaningful change (code, design, security, infra, docs), before considering the task done:
1. Append a `docs` **journal entry** here (use the template above).
2. Update the **specific doc(s)** the change touches: design → `.docs/design/UI-ENRICHMENT.md` (+ `DESIGN.md` pointer); backend/stack → `.docs/backend.md` + `.docs/brain/*`; security/arch → `.docs/flaws.md` + `.docs/brain/architecture-decisions.md` (ADR) + `.docs/security/hardening.md`; new service/route/event/datastore → also the `.docs/architecture/*.drawio` + `hld.md`/`lld.md` (architecture-XML-update rule).
3. Re-verify (CSS brace balance + undefined vars + JSX parse for UI; `./mvnw compile` for Java).
**Canonical docs live under `.docs/` (hidden).** Do not write to a top-level `docs/`.

---

Date/Time: 2026-06-14 21:42 EDT
Area: RBAC hygiene — remove dead email-based admin config from messages-service (Go)
Action Taken: Removed the unused `AdminEmail` field from `messages-service/config.go` (struct field + `loadConfig` assignment) and the `ADMIN_EMAIL` line from `messages-service/.env` and `.env.example`. Rebuilt (`go build` OK), `go vet` clean except pre-existing `bson.E unkeyed fields` style nags in `repository.go`. Restarted the service on the rebuilt binary; `:8010/actuator/health` → 200.
Observation: `cfg.AdminEmail` was never referenced anywhere — the Go `JWTMiddleware` only extracts `sub`/`email` into `Caller` and messages-service has no admin gating. The field defaulted to `admin@example.com`, the exact email-equality pattern the Round-2 RBAC refactor removed from user-service/spheres-service/UI.
Issue Found: Dead config that would invite a future dev to re-introduce email-based admin (`email == cfg.AdminEmail`).
Fix/Decision: Delete it. If messages-service ever needs admin gating, read the signed `role` claim from the JWT (consistent with spheres-service `req.isAdmin = payload.role === "ADMIN"`), not an email compare. No new code added now (YAGNI).
Impact: No email-based admin notion remains anywhere in the codebase; RBAC is uniformly claim-driven.
Next Step: None required; messages-service admin logic remains unneeded.

---

Date/Time: 2026-06-14 21:28 EDT
Area: Validation — full-stack runtime test of the bug-fix session
Action Taken: Brought the whole stack up (Postgres/Mongo/Neo4j already running; started Kafka KRaft + Schema Registry; rebuilt user-service & posts-service; launched all 7 services + Vite UI) and exercised the four fixes on `feature/cgc_develop` via the gateway (`:8007`).
Observation: All 7 service health endpoints + UI returned 200. Validated each fix end-to-end:
  1. RBAC `role` claim — admin JWT carries `role:"ADMIN"`, a fresh signup carries `role:"USER"`; spheres-service & UI now key off the signed claim, not an email compare.
  2. Spheres privacy gate — a private sphere returns 404 (not 403) to a non-member for GET sphere/posts/members; creator and admin still get 200.
  3. Spheres nested-authz — voting/commenting on a post via a mismatched sphere URL returns 404; correct sphere+post returns 200.
  4. Post-like notification recipient — admin liking A's post produced `POST_LIKED owner=11 liker=1`; the notification landed on the OWNER (A), the liker got nothing. Avro `post-liked-topic-value` registered v2 with the new `likedbyuserid` field (backward-compatible).
  Also confirmed DataInitializer logs "post seeding disabled (seed.posts.enabled=false)" — no cross-DB user lookup on a normal boot.
Issue Found: None in the fixes. Operational notes: `kafka-topics` is shell-aliased to a non-running Docker container — use `/opt/homebrew/bin/kafka-topics`. The login endpoint returns the raw JWT string (not JSON-wrapped); signup is `POST /auth/signup`; spheres routes mount under `/core` (gateway `/api/v1/spheres/core/...`).
Fix/Decision: No code changes — validation only. Fixes are sound and live.
Impact: `feature/cgc_develop` bug-fix session verified at runtime against a live polyglot stack.
Next Step: Optional UI-level smoke of the same flows in the browser; otherwise the branch is ready to proceed.

---

Date/Time: 2026-06-14 14:46 EDT
Area: UI enrichment — Profile identity surface + rail collapse cleanup
Action Taken: Implemented the next DESIGN v3 roadmap surface: rewrote `collabsphere-ui/src/pages/ProfilePage.jsx` into a LinkedIn-style identity page with hero/headline, verified metadata, editable local skill chips with endorsement-style counts, activity timeline composed from existing posts/spheres/connections reads, and right-side identity/action panels. Simplified `components/Sidebar.jsx` by removing section-level collapse controls, keeping only whole-rail collapse, changing the Profile footer affordance from a `NavLink` to a button-driven navigation action, and avoiding email fallback in the rail footer. Added the final `DESIGN v3 — PROFILE` CSS block in `styles/app.css`, including the collapsed-rail grid fix.
Observation: The previous Profile pass emphasized profile strength/bento widgets more than the roadmap's identity surface. The previous rail could collapse sections into empty space, and whole-rail collapse narrowed the rail without shrinking the app grid column.
Issue Found: Initial browser verification on `127.0.0.1:3000` hit gateway CORS (`localhost:3000` is the allowed origin), and the in-app browser correctly blocked a local session-seeding shortcut. Retried through the already-running `http://localhost:3000` app and verified the real login flow plus Profile rendering.
Fix/Decision: Kept the implementation frontend-only and contract-neutral. Profile skills remain browser-local for v1; endorsement counts are presentational; backend profile/endorsement APIs remain tracked in `tbd/application/04-rich-profiles.md`.
Impact: Profile now matches the roadmap's hero/headline/skills/activity direction. Hovering the rail Profile affordance no longer exposes a link target/status address because it is a button, collapsed rail mode keeps visible icon affordances while shrinking the layout column, and the mobile shell no longer inherits the desktop two-column grid.
Next Step: Continue DESIGN v3 surface passes with Messages, Network, Notifications, or Auth; backend-rich profile APIs can start from `tbd/application/04-rich-profiles.md`.

---

Date/Time: 2026-06-14
Area: Documentation / Architecture onboarding
Action Taken: Performed a full architectural assessment (frontend + gateway + 6 services + datastores + Kafka) and created the `.docs/` knowledge base: `frontend.md`, `backend.md`, `journal.md`, `brain/*` (ai-navigation, project-map, important-files, service-map, frontend-map, backend-map, architecture-decisions), `guardrails/*` (application/frontend/backend), `architecture/*` (frontend-flow, backend-flow, hld, lld, frontend-architecture.drawio, backend-architecture.drawio), plus `tbd/devops/01..04` (platform) and `tbd/application/01..04` (UI-first features).
Observation: `.docs/` already had `design/`, `product/`, `guides/`, `journal/` subfolders + an existing `design/architecture.drawio`. Reused the folder; added the requested structure alongside.
Issue Found: **DESIGN.md service→DB table is stale** — it lists spheres=MongoDB and notification=Kafka-only. Code/config shows **spheres=PostgreSQL** (`pg` pool, `collabsphere_spheres`) and **notification=PostgreSQL + Kafka consumer**. messages=MongoDB is correct.
Fix/Decision: Documented the correct mapping in `backend.md` (§13) and `brain/*`. Did NOT edit DESIGN.md (it's a design doc; flagged for a future fix). Treat `backend.md` as authoritative for stack/DB facts.
Impact: Future agents now have accurate ports/DBs/routes and won't "shoot blanks".
Next Step: Optionally correct DESIGN.md §1 table; decide on a `.docs/tbd` direction to implement.

Date/Time: 2026-06-14
Area: Backend assessment — verified facts
Action Taken: Inspected gateway `application.yml`, all service configs, `scripts/db-init`, UI `api/client.js`.
Observation/Findings:
- Ports: gateway 8007; user 9020; posts 9010; connections 9030; spheres 8009; messages 8010; notification 9070.
- Gateway: `/users` is PUBLIC (no auth filter); all others use `AuthenticationFilter`. StripPrefix differs (spheres=3, others=2); `likes` uses RewritePath→posts. CORS origin = `http://localhost:3000` (⚠️ may not match the Vite dev port).
- Datastores: PostgreSQL 5432 (user/posts/spheres/notification), Neo4j 7687 (connections), MongoDB 27017 (messages), Kafka 9092 + Schema Registry 8081.
- ⚠️ Java services point at the default `postgres` DB, not the `collabsphere_*` DBs created by `db-init` → partial DB isolation (ADR-004).
- ⚠️ Mixed JWT validation: gateway validates; messages (Go) + notification (Python) also self-validate (ADR-003).
- ⚠️ posts→connections is a synchronous HTTP dependency with no resilience (ADR-006).
- ⚠️ No Dockerfiles/compose; no tracing/metrics/structured logs; no automated tests.
Issue Found: As above (recorded as risks in guardrails + ADRs).
Fix/Decision: Captured in `backend.md`, `brain/architecture-decisions.md`, guardrails. No code changed.
Impact: Clear risk register + correct mental model for future work.
Next Step: Idea 02 (containerize) is the natural first build; Idea 01 (observability) the natural second.

Date/Time: 2026-06-14
Area: Tooling limitation — Draw.io MCP
Action Taken: Attempted to generate architecture diagrams.
Observation: No Draw.io MCP is available in this environment.
Issue Found: Cannot auto-generate `.drawio` via MCP.
Fix/Decision: Authored valid draw.io XML manually for `architecture/frontend-architecture.drawio` and `backend-architecture.drawio` (openable in diagrams.net), following the repo's diagram style guidance.
Impact: Diagrams exist and are editable; just not MCP-generated.
Next Step: If a Draw.io MCP becomes available, regenerate/refine from these.

---

## Carry-forward context for the next agent
- **Authoritative facts:** `.docs/backend.md`, `.docs/brain/service-map.md`, `.docs/brain/backend-map.md`. DESIGN.md DB table is stale.
- **Landmines:** `styles/app.css` has stacked override layers (last wins) and was once truncated by an auto-formatter — commit around CSS edits. Gateway StripPrefix is per-route. Java user/posts use Flyway + `ddl-auto=validate`, so schema drift breaks startup until a migration is added. HS256 shared secret remains until RS256/JWKS.
- **Open decisions:** see `.docs/brain/architecture-decisions.md` → "Open decisions" + each file under `.docs/tbd/devops/` and `.docs/tbd/application/` ("Open questions").
- **Rule:** any service/route/event/datastore change → update `.docs/architecture/*.drawio` + `hld.md`/`lld.md` + add an ADR + a journal entry (the architecture-XML-update rule).

Date/Time: 2026-06-14
Area: Security & design evaluation
Action Taken: Senior-architect flaw audit across gateway/services/UI (auth, secrets, SQL, CORS, XSS, token storage, error handling, ops maturity). Created `.docs/flaws.md` (evidence-based flaw register with severities + fixes + scorecard).
Observation: Confirmed NO frontend→DB access (clean gateway boundary); BCrypt passwords; JWT signature+expiry verified; parameterized SQL; secrets gitignored; gateway strips client X-User-Id; CORS matches Vite:3000.
Issue Found: HIGH — `/api/v1/users` & `/{id}` are unauthenticated and return emails (user/email enumeration, SEC-1). MEDIUM — no rate limiting (SEC-2), client-only XSS sanitize + JS-readable token (SEC-3), shared symmetric JWT secret w/o rotation (SEC-4). ARCH — sync posts→connections w/o resilience (ARC-2), Java services share `postgres` DB not per-service DBs (ARC-3), ddl-auto=update (ARC-6), two auth mechanisms (ARC-1). OPS — no containers/CI (OPS-1), no observability (OPS-2). Plus corrected two of my own earlier doc errors: session token is in sessionStorage (not localStorage); CORS DOES match Vite (port 3000).
Fix/Decision: Documented all in `.docs/flaws.md` with a priority fix order; corrected `frontend.md`/`backend.md`. No code changed (assessment only).
Impact: Honest baseline. Overall maturity ≈ 5.5/10 (security 5, architecture 6, frontend 6.5, devops 3, .docs/AI 7.5).
Next Step: SEC-1 first (cheap, high impact), then SEC-2/3, then OPS-1 (containerize) to make the microservices/DevOps claims real.

Date/Time: 2026-06-14
Area: Docs organization — tbd split
Action Taken: Split `.docs/tbd/` into two tracks: `tbd/devops/` (moved the 4 original infra-leaning ideas → 01-observability, 02-containerization-cicd, 03-realtime-layer, 04-media-object-storage) and `tbd/application/` (4 NEW UI-first feature specs → 01-adaptive-home, 02-people-you-may-know, 03-sphere-digests, 04-rich-profiles). Added `tbd/README.md` index. Updated references in flaws.md, journal.md, project-map.md.
Observation: Original ideas were devops-focused; application track now leads with UI wireframes/components then backend.
Issue Found: None.
Fix/Decision: Reference paths updated (no broken links to old `tbd/idea-0X.md`).
Impact: Clear separation of platform vs product roadmap; easier to audit each track.
Next Step: Pick one item per track to implement (recommended: devops/02 containerize + application/01 adaptive-home).

Date/Time: 2026-06-14
Area: Security & resilience hardening (code)
Action Taken: Implemented fixes for SEC-1, SEC-2, SEC-3, SEC-4 (partial), ARC-2, ARC-3. Created `.docs/security/hardening.md` (change log + local verification + residuals). Added ADR-010..015; updated flaws.md statuses + scores; this entry.
Observation: Changes span gateway (route split + RateLimit filter), user-service (UserDto email removed, JWT secret guard + config TTL, DB→collabsphere_users), posts-service (jsoup sanitize on write, Feign circuit-breaker+fallback, DB→collabsphere_posts), spheres seed (user lookup → collabsphere_users).
Issue Found: ARC-3 surfaced a hidden cross-DB coupling — spheres seed read users from the shared `postgres` DB; updated it to `collabsphere_users` (documented as a DB-per-service learning point). Could NOT build Java/Go in this environment.
Fix/Decision: ARC-6 (Flyway) intentionally deferred — flipping ddl-auto=validate without authored migrations would break startup; full plan in hardening.md. SEC-2 is dev-grade (in-memory) — Redis-backed for prod. SEC-4 secret-guard+TTL done; RS256+refresh deferred (ADR-013).
Impact: Post-hardening scores (pending build verify): Security 5→7, Architecture 6→7, Overall 5.5→6.5. DevOps maturity (3/10) is now the dominant gap.
Next Step: Run `./mvnw compile` on gateway/user/posts + smoke test (hardening.md checklist). Set a ≥32-byte ${secret} (user-service now fails fast otherwise). Then pursue devops/02 (containerize) — the biggest remaining lever.

Date/Time: 2026-06-14
Area: Hardening verification — found/fixed two regressions (post seed + feed)
Action Taken: Ran the full hardening.md cross-cutting checklist on a live stack (rebuilt user/posts/gateway since uncommitted fixes had stale jars; created collabsphere_users/collabsphere_posts which did NOT exist yet). All security checks PASS: SEC-1 (`/users` 401 unauth, authed list exposes only id+name), SEC-2 (429 after 10 logins), SEC-3 (`<script>`/`onerror` stripped, `<b>` kept), ARC-2 fallback fires when connections down, ARC-3 DBs/schema created.
Observation: Two functional regressions introduced by the hardening work, both invisible to the checklist:
  1. ARC-3 broke the posts DataInitializer — it resolved seed authors via `SELECT id FROM users` on the posts datasource, but `users` now lives only in collabsphere_users → "Could not resolve user IDs — skipping post seed". Feed was empty because no posts existed.
  2. ARC-2 broke the connection-scoped feed for ALL requests — resilience4j TimeLimiter runs the connections Feign call on a worker thread; UserContextHolder is a ThreadLocal, so the auth header was lost → connections-service 401 → fallback fired on every call (not just when connections is down). Feed silently degraded to own-posts-only even when connections-service was healthy.
Issue Found: SEC-4 doc claim "user-service refuses to start with a short secret" is INACCURATE — the guard is in JwtService.getSecretKey() (lazy), so it boots fine and instead returns 500 on first login. (Verified with an isolated short-secret instance.)
Fix/Decision: (1) DataInitializer + posts application.properties now resolve users against collabsphere_users via a dedicated read-only JdbcTemplate (`users.datasource.url`) — same DB-per-service pattern already applied to the spheres seed. (2) Added `ContextAwareExecutorService` + `CircuitBreakerExecutorConfig` (Customizer<Resilience4JCircuitBreakerFactory>) so the circuit-breaker executor propagates UserContextHolder to the worker thread — keeps ARC-2's CB + 3s limit AND fixes auth. Rebuilt posts-service. Seeded 9 posts + 28 comments (authors mapped to clean ids 1-10). Connected admin to all 9 seed authors in Neo4j so the demo feed is populated.
Impact: Feed works with CB enabled (admin sees all 9 posts) AND still degrades gracefully when connections-service is down (verified both directions, circuit recovers). Posts data loaded.
Next Step: Consider moving the SEC-4 secret-length guard to a @PostConstruct/startup validator so it truly fails fast (and correct the "refuses to start" wording in hardening.md). The ARC-2 ThreadLocal/worker-thread coupling will recur for any future cross-service Feign call behind the circuit breaker — ContextAwareExecutorService now covers it.

Date/Time: 2026-06-14
Area: Verification + UI enrichment (DESIGN v3 — foundation + Feed)
Action Taken: Verified post-hardening state (CSS balanced, 0 undefined vars, 0 neon, all 28 pages/components parse; SEC-1..4/ARC-2,3 present, no regressions). Shipped DESIGN v3 "Notion × LinkedIn × Reddit" foundation + Feed flagship as an appended authoritative CSS layer in `collabsphere-ui/src/styles/app.css`; created `.docs/design/UI-ENRICHMENT.md`.
Observation: App is a hardened, healthy baseline → ready to start DevOps learning (remaining OPS gaps = the curriculum). Cannot run Maven/Vite here (verify locally).
Issue Found: None new.
Fix/Decision: Foundation (canvas depth + card system) transforms all surfaces at once; Feed deeply reimagined (engagement bar, composer). CSS-only, additive.
Impact: Visible depth/hierarchy/engagement; calm Notion base preserved.
Next Step: Continue surface passes (Spheres next).

Date/Time: 2026-06-14
Area: UI enrichment — Spheres (Reddit pass)
Action Taken: Added Hot/New/Top sort tabs (client-side memo) + Reddit-style vote rail (up/score/down, ember-up / blue-down) + compact thread rows with hover lift + refined discover cards. Small JSX in `pages/SpheresPage.jsx` (sort state + `sortedHubPosts` memo + sort-tab UI, use sorted list); CSS in the "SPHERES (Reddit pass)" block of app.css.
Observation: Votes/score/user_vote/created_at/comment_count already existed; only sort + visual polish were missing.
Issue Found: None. SpheresPage parses; CSS balanced (1609); 0 undefined vars; 0 neon.
Fix/Decision: Visual-only + client-side sort (no backend change).
Impact: Spheres now reads like a polished Reddit community inside the Notion shell.
Next Step: Profile (LinkedIn identity surface) next.

Date/Time: 2026-06-14
Area: Docs housekeeping — docs/ → .docs/ consolidation
Action Taken: Detected the knowledge base was renamed `.docs/` → `.docs/` (hidden). This turn's stray writes to a new `.docs/` (UI-ENRICHMENT.md + a partial journal) were moved/merged into canonical `.docs/`; updated CLAUDE.md pointer to `.docs/`. Added the Standing Practice block above.
Observation: An empty top-level `docs/` remains (FS-locked from deletion in this env) — harmless; canonical docs are `.docs/`.
Issue Found: Split-brain docs risk (two doc roots). Resolved by consolidating into `.docs/`.
Fix/Decision: `.docs/` is the single source of truth. Never write to top-level `docs/`.
Impact: One canonical, current knowledge base.
Next Step: If possible, delete the empty `.docs/` manually (env blocked it here).

Date/Time: 2026-06-15
Area: Security architecture remediation — spheres/auth/events/migrations/docs
Action Taken: Replaced Spheres email-equality admin with signed `role=ADMIN`; enforced private sphere access on detail/members/posts; scoped post/comment/vote/delete routes to the sphere URL; settled auth on service-side JWT validation with gateway as edge pre-check; fixed `PostLikedEvent` owner/actor semantics; removed posts-service user-DB seed reads; added Flyway baselines for user/posts; added Vitest tests for frontend sanitizer/JWT utilities; made `.docs/` versionable and cleaned active docs/startup guides.
Observation: The app-layer architecture is materially healthier. Remaining major gaps are now production auth/session design (RS256/JWKS, refresh/revocation, httpOnly/CSP), shared error contract, observability, containers/CI, and broader tests.
Issue Found: The first Vitest sanitizer test assumed mixed BBCode+raw HTML would still convert BBCode; actual renderer correctly routes raw HTML through the sanitizer. Split the test into separate legacy-BBCode and malicious-HTML cases.
Fix/Decision: `.docs` remains the canonical documentation root and is no longer ignored by git. Startup docs now use `.env.local` placeholders instead of local/demo secrets. Posts seed now requires optional `POST_SEED_USER_IDS` and otherwise skips.
Impact: Security score moves to roughly 7.5/10 and architecture to roughly 7.5/10 in `.docs/flaws.md`; frontend moves only slightly because TypeScript/e2e/state/CSS debt remain.
Next Step: Complete live stack smoke test from `.docs/guides/START.md`; then prioritize DevOps track when requested.

Date/Time: 2026-06-14
Area: App-level correctness/security batch (Round 2) + docs governance
Action Taken: Fixed spheres broken-access-control (private-sphere enforcement on detail/members/posts/post-detail via ensureCanView; nested authz on vote/comment/delete via loadPostInSphere). Replaced email-equality admin with a signed `role` claim (user-service JwtService → spheres auth.js + frontend AuthContext/SpheresPage). Fixed like-notification wrong-user (PostLikedEvent now owner+liker; posts producer + avsc updated; consumer already correct). Gated posts DataInitializer cross-DB seed behind seed.posts.enabled=false. Redacted the seed password from .docs/guides/test-data.md and un-ignored `.docs/` in .gitignore (now versioned team docs). Added ADR-016..019.
Observation: START.md is a macOS/Homebrew polyglot flow — cannot run the full stack in this Linux sandbox. Verified statically: node --check (spheres routes+auth), esbuild JSX parse (SpheresPage, AuthContext), avsc JSON valid, Java brace-balanced, CSS balanced. Vite build still blocked by rollup platform binary (node_modules has macOS binaries) — did NOT mutate node_modules.
Issue Found: spheres privacy/nested-authz were genuinely exploitable; like notifications hit the wrong user; posts seed re-coupled DBs. All addressed. ARC-1 (split-brain auth), ARC-6 (migrations), and frontend fragility (TS/tests/CSS size) remain DEFERRED with intent (documented).
Fix/Decision: Java/Avro changes need a rebuild — `cd <svc> && ./mvnw -q compile` + Avro regen for posts-service. Set a ≥32-byte ${secret} and `app.admin-emails`.
Impact: Closes the reported access-control + correctness bugs without backend contract breakage (additive). Security posture materially stronger.
Next Step: Local verify per START.md (you run the stack): login (token now carries role) → private sphere access → like notifies owner → admin actions gated by role. Then resume DevOps track when ready.
