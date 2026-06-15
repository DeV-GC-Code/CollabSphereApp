# Backend Guardrails

Rules for the services + gateway. **Security baseline + residuals: read `.docs/security/hardening.md` (SEC/ARC fixes + ADR-010–018) before touching auth, JWT, the gateway, post content, or cross-service calls.** Tailored to this codebase. Read with `.docs/backend.md` + `.docs/brain/backend-map.md`.

## Files to check before any backend change
`api-gateway/.../application.yml` (route + auth) · the target service's config (`application.properties`/`application.yml`, or `.env`/`config.go`/`app/config.py`) · controller/handler → service → repository · Kafka producer/consumer if events are involved · `scripts/db-init/*` for DB names.

## Microservice boundary rules
- A service may only touch **its own** datastore. Need another service's data? Call its API or consume its Kafka event — never reach into its DB.
- Keep one owner per concept (user/post/connection/sphere/message/notification).
- **Prefer Kafka events** for new cross-service reactions. Do **not** add new synchronous HTTP calls without an ADR (see ADR-006; posts→connections is the only sanctioned one).

## Gateway rules (load-bearing, fragile)
- The path contract is authoritative: `/api/v1/{users,posts,connections,likes,spheres,messages,notifications}/**`.
- StripPrefix counts differ per route (spheres=3, others=2) and `likes` uses RewritePath. If you change a service's internal path prefix (`/spheres/core`, `/messages/core`, `/notifications/core`), update the gateway in the same change.
- Only `users/auth/**` and `users/stats` are public. Keep new public routes to an absolute minimum and document them.

## Auth rules
- JWT is issued by **user-service** and signed with the shared `${secret}`. Keep the secret identical across gateway + all services until RS256/JWKS replaces it.
- Gateway validates protected routes as an edge pre-check and strips spoofed `X-User-Id`; services must validate the signed JWT before using identity or role claims.
- Admin authorization comes from a signed `role=ADMIN` claim, not email equality or client state.

## API design
- Keep REST resource-oriented and consistent with existing routes (`/<area>/core/...`).
- Separate **DTOs/request-response models from entities** (Java: dto vs model; Go: request structs vs Mongo models; Python: Pydantic schemas vs DB rows). Don't leak persistence models over the wire.
- Validate input at the edge (Spring validation / Gin binding / Pydantic). Return consistent error JSON.

## Persistence
- Postgres: use **real migrations**. Node (spheres) has `src/db/migrate.js`; Java user/posts have Flyway baselines and `ddl-auto=validate`. New schema changes require a migration.
- Keep Java datasources on the **per-service `collabsphere_*` DB**, not the shared `postgres` DB.
- Neo4j (connections) and Mongo (messages) changes must keep their seed/migration paths working (`scripts/seed-neo4j.sh`, spheres seed).

## Events (Kafka)
- Use Avro + Schema Registry (:8081). Evolve schemas compatibly (don't break existing consumers).
- New event type → document it in `.docs/architecture/backend-flow.md` and update the diagram.

## Config & secrets
- All secrets via env (`${secret}`, `${dbuserId}`, `${neoUserId}`, `JWT_SECRET`, `*_URI`). Never hard-code or commit credentials. `.env.local` is gitignored.

## Logging & observability
- Log to stdout; don't log secrets, tokens, or full message/post bodies.
- When adding observability, do it consistently (structured logs + trace IDs) — this is a known gap and a learning goal.

## What NOT to do
- Don't share a database between services.
- Don't add synchronous coupling casually.
- Don't change gateway prefixes/auth without updating all affected pieces.
- Don't bypass the gateway for client traffic.

## Architecture-XML-update rule
New service / route / event / datastore / integration → update `.docs/architecture/backend-architecture.drawio`, `.docs/architecture/backend-flow.md`, `hld.md`/`lld.md`, and add an ADR in `.docs/brain/architecture-decisions.md`. Add a `.docs/journal.md` entry for every meaningful change.
