# AI Navigation Guide — read this first

> You are an AI agent or new engineer about to work on CollabSphere. This file tells you how to approach the repo **without guessing**. Do not start editing until you've done the reading for your change type.

## What this project is

A polyglot microservices social platform (React UI + Spring Cloud Gateway + 6 services in Java/Node/Go/Python + PostgreSQL/Neo4j/MongoDB/Kafka), built as a **DevOps + architecture learning vehicle and portfolio piece**. Correctness, clarity, and maintainability matter more than feature velocity.

## First files to read (always)

1. `.docs/brain/project-map.md` — repo layout.
2. `.docs/frontend.md` and/or `.docs/backend.md` — depending on your change.
3. `.docs/brain/service-map.md` — what each service owns + ports + DBs.
4. `.docs/brain/architecture-decisions.md` — why things are the way they are.
5. The relevant `.docs/guardrails/*.md` — hard rules for your change type.
6. `.docs/journal.md` — recent history, known issues, what failed.

## Order of investigation by change type

**Frontend / UI change**
`App.jsx` (routes) → `auth/AuthContext.jsx` → `api/client.js` + relevant `api/*.js` → `components/AppShell.jsx` → target `pages/*.jsx` → `utils/format.js` (if post content) → `styles/app.css` token blocks. Then read `.docs/guardrails/frontend-guardrails.md`.

**Backend / service change**
`api-gateway/.../application.yml` (route + auth) → target service config → controller/handler → service/business layer → repository/data layer → events (Kafka) if any. Then read `.docs/guardrails/backend-guardrails.md`.

**Architecture / new service / new route**
`.docs/architecture/hld.md` + `lld.md` → `.docs/brain/architecture-decisions.md` → update `.docs/architecture/*.drawio`. Then read `.docs/guardrails/application-guardrails.md`.

**DevOps / deployment change**
`.docs/guides/PREREQUISITES.md`, `START.md`, `STOP.md`, `CMDS.md` → `scripts/db-init/*`, `scripts/seed-neo4j.sh` → per-service `.env(.example)` and Java `application.properties`.

## Validation commands (cheap, run before claiming done)

- Frontend build/lint: `cd collabsphere-ui && npm run build` (or `npm run dev`). CSS sanity: brace balance + grep for undefined `var(--…)`.
- Java service: `cd <service> && ./mvnw -q compile`.
- Node (spheres): `cd spheres-service && npm run lint || node --check src/...`.
- Go (messages): `cd messages-service && go build ./...`.
- Python (notification): `cd notification-service && python -m py_compile app/*.py main.py`.

## Common traps (do not get caught)

- **DESIGN.md DB mapping is wrong** — spheres = PostgreSQL (not Mongo), notification = PostgreSQL + Kafka. Trust `.docs/backend.md`.
- **`styles/app.css` has multiple token blocks + trailing `!important` override layers** ("LATEST OVERRIDES", "AVATAR FIX"). The *last* matching rule wins. A change "not taking effect" usually means a later override. Don't add a 4th conflicting layer — edit the authoritative one.
- **An auto-formatter previously truncated `app.css`.** Commit before/after large CSS edits; keep a backup.
- **Gateway `StripPrefix` differs per route** (spheres=3, others=2; likes uses RewritePath). Changing a service's path prefix can break routing.
- **Java user/posts use Flyway + per-service DBs** (`collabsphere_users`, `collabsphere_posts`). If schema validation fails at boot, add/fix a migration instead of turning `ddl-auto` back to `update`.
- **JWT validation model:** gateway validates protected routes as an edge check and strips spoofed identity headers; services validate the signed JWT before using identity/role claims. Keep the shared HS256 secret consistent until RS256/JWKS replaces it.
- **Base64 media** lives inside post content — don't log/print full post bodies.

## Known incomplete areas

No containerization/compose; no tracing/metrics/structured logs; sparse automated tests. (Hardened 2026-06-14: per-service DBs, auth-locked user routes, rate limiting, server-side sanitize, circuit breaker, service-side JWT authorization, Flyway baselines — see `.docs/flaws.md` + `.docs/security/hardening.md`.) Still open: RS256/refresh tokens, distributed rate limiting, observability, containers, broader automated tests. See `.docs/journal.md` and `.docs/tbd/` for planned work.

**Security work:** before changing auth, the gateway, posts content handling, JWT, or service-to-service calls, read `.docs/security/hardening.md` (what's already hardened + residuals) and the relevant ADRs (010–018).

## Documentation discipline (mandatory)

- After **any** meaningful change, add a `.docs/journal.md` entry (use the template there).
- After a **new service / route / integration / major change**, update `.docs/architecture/*.drawio` and `.docs/brain/architecture-decisions.md` (the "architecture-XML-update rule" — see guardrails).
- Keep all docs under `.docs/`. Never scatter `.md` files at the repo root.
