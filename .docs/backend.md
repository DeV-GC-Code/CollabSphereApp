# Backend Architecture — CollabSphere Services

> Source of truth for the polyglot backend. Derived from inspecting configs and code (June 2026). **Where this disagrees with `.docs/design/DESIGN.md`, this file is correct** — DESIGN.md's service→DB table is out of date (see §13).

## 1. Topology at a glance

```
React UI ──HTTP /api/v1/*──▶  API Gateway (Spring Cloud Gateway :8007)
                               │  routes + JWT AuthenticationFilter + CORS
        ┌──────────────┬───────┼───────────┬──────────────┬───────────────┐
        ▼              ▼       ▼           ▼              ▼               ▼
  user-service   posts-service connections  spheres      messages       notification
  Java :9020     Java :9010    Java :9030   Node :8009   Go :8010       Python :9070
  PostgreSQL     PostgreSQL    Neo4j 7687   PostgreSQL   MongoDB 27017  PostgreSQL
  Kafka(prod)    Kafka(prod)   Kafka(c+p)   —            —              Kafka(consumer)
                     │ HTTP
                     └────────▶ connections-service   (synchronous coupling)

Shared infra: PostgreSQL :5432 · Neo4j :7687 · MongoDB :27017 · Kafka :9092 · Schema Registry :8081
```

## 2. Technology stack per service

| Service | Language / framework | Port | Datastore | Messaging |
|---|---|---|---|---|
| **api-gateway** | Java / Spring Cloud Gateway | 8007 | — | — |
| **user-service** | Java / Spring Boot (JPA) | 9020 | PostgreSQL | Kafka producer (Avro) |
| **posts-service** | Java / Spring Boot (JPA) | 9010 | PostgreSQL | Kafka producer (Avro) |
| **connections-service** | Java / Spring Boot (Spring Data Neo4j) | 9030 | **Neo4j** (bolt) | Kafka consumer + producer (Avro) |
| **spheres-service** | Node.js / Express | 8009 | **PostgreSQL** (`pg` Pool) | — |
| **messages-service** | Go / Gin | 8010 | **MongoDB** | — |
| **notification-service** | Python / FastAPI | 9070 | PostgreSQL | Kafka consumer (`aiokafka`) |

## 3. API Gateway (the single entry point)

`api-gateway/src/main/resources/application.yml`. Spring Cloud Gateway on **:8007**.

Routes (path → target, prefix handling, auth):

| Route id | Path predicate | Target | Filters |
|---|---|---|---|
| user-auth | `/api/v1/users/auth/**` | `:9020` | `StripPrefix=2` + `RateLimit` — public signup/login |
| user-stats | `/api/v1/users/stats` | `:9020` | `StripPrefix=2` — public member count |
| user-service | `/api/v1/users/**` | `:9020` | `StripPrefix=2` + `AuthenticationFilter` |
| posts-service | `/api/v1/posts/**` | `:9010` | `StripPrefix=2` + `AuthenticationFilter` |
| connections-service | `/api/v1/connections/**` | `:9030` | `StripPrefix=2` + `AuthenticationFilter` |
| likes-service | `/api/v1/likes/**` | `:9010` | `RewritePath → /posts/likes/...` + `AuthenticationFilter` |
| spheres-service | `/api/v1/spheres/**` | `:8009` | `StripPrefix=3` + `AuthenticationFilter` |
| messages-service | `/api/v1/messages/**` | `:8010` | `StripPrefix=2` + `AuthenticationFilter` |
| notification-service | `/api/v1/notifications/**` | `:9070` | `StripPrefix=2` + `AuthenticationFilter` |

- **CORS:** allows `http://localhost:3000` (+ `CORS_ALLOWED_ORIGIN` env). ✅ This matches the Vite dev server, which is configured to run on port **3000** (`collabsphere-ui/vite.config.js`). `allowedHeaders: "*"` is permissive (see `.docs/flaws.md` SEC-5).
- **JWT:** `jwt.secretKey: ${secret}` shared with services. `AuthenticationFilter` validates Bearer tokens for protected routes and strips any client-supplied `X-User-Id`; downstream services validate the signed token themselves where authorization decisions are made.
- ⚠️ **StripPrefix is inconsistent** (spheres=3, others=2) and `likes` uses `RewritePath`. This is fragile — changing a service's internal path prefix can silently break routing. Documented as a risk.

## 4. Service responsibilities

- **user-service (:9020, PostgreSQL, Kafka producer)** — identity: signup, login (issues JWT with signed `role`), profile, platform stats. Auth/stats are public; directory/profile reads require JWT. Emits user events (Avro) to Kafka.
- **posts-service (:9010, PostgreSQL, Kafka producer)** — the public feed: posts, comments, likes (likes routed via gateway rewrite to `/posts/likes/*`). **Calls connections-service over HTTP** (`connections-service.url=http://localhost:9030`) to scope the feed to a user's network → synchronous coupling. Emits `POST_CREATED` etc.
- **connections-service (:9030, Neo4j, Kafka consumer+producer)** — the social graph (who knows whom), people search, connection requests. Neo4j over `bolt://localhost:7687`. Consumes + produces Avro events.
- **spheres-service (:8009, PostgreSQL via `pg`)** — communities ("Spheres"), membership, threads, votes, comments. Has its own SQL migrations (`src/db/migrate.js`) and seeding (`src/db/seed.js`). Private sphere access, post routes, votes, comments, and deletes all enforce membership/ownership against the sphere in the URL. Routes under `/spheres/core/*` (gateway strips 3 segments).
- **messages-service (:8010, MongoDB, Gin)** — direct messages. Routes: `GET/POST /messages/core/conversations[/:partnerId]`, `PUT …/read`, `DELETE /:messageId`, `GET /unread-count`. Validates JWT itself via `JWTMiddleware`.
- **notification-service (:9070, PostgreSQL, FastAPI)** — cross-service activity feed. Kafka **consumer** (`aiokafka`) ingests events (e.g. `POST_CREATED`) and writes notifications. REST: `GET /notifications/core`, `/unread-count`, `PUT /{id}/read`, `/read-all`, `DELETE /{id}`. Validates JWT itself (`HTTPBearer`).

## 5. Authentication & authorization flow

1. UI posts credentials to `/api/v1/users/auth/login` (public) → user-service verifies and returns a **JWT** signed with the shared `${secret}`.
2. UI stores the token and sends `Authorization: Bearer <jwt>` on every call.
3. Gateway `AuthenticationFilter` validates the token for all protected routes and removes any inbound `X-User-Id` header.
4. Services validate the signed token themselves before using identity or role claims. This is the current trust model: gateway as edge pre-check; services as authorization source of truth. Residual: HS256 still means the secret is shared across languages until the RS256/JWKS migration.

## 6. Inter-service communication

- **Synchronous HTTP:** posts-service → connections-service (network-scoped feed). Direct URL, no service discovery, no retry/circuit breaker.
- **Asynchronous Kafka (Avro + Schema Registry @ :8081):** producers (user, posts, connections) emit domain events; consumers (connections, notification) react. This is the decoupled path and the project's "event-driven" learning surface.

## 7. Persistence

- **PostgreSQL :5432** — used by user, posts, spheres, notification. `scripts/db-init/01-create-databases.sh` creates `collabsphere_users/_posts/_notifications/_spheres`. ✅ **As of the 2026-06-14 hardening (ARC-3 / ADR-015), each Java service uses its own DB** (`user-service`→`collabsphere_users`, `posts-service`→`collabsphere_posts`). See `.docs/security/hardening.md`.
- **Neo4j :7687** — connections graph (Spring Data Neo4j).
- **MongoDB :27017** — messages (collections via Go driver).
- Java user/posts now use Flyway baselines with `spring.jpa.hibernate.ddl-auto=validate`; future schema changes should be explicit migrations.

## 8. Configuration strategy

- Secrets/credentials via env placeholders resolved at runtime: `${secret}` (JWT), `${dbuserId}/${dbuserpwd}` (Postgres), `${neoUserId}/${neoPwd}` (Neo4j). Sourced from a gitignored `.env.local` (`set -a && source .env.local && set +a`) per `.docs/guides/`.
- Node/Go/Python services use `.env` files (`PORT`, `DATABASE_URL`/`MONGODB_URI`, `JWT_SECRET`, `KAFKA_BOOTSTRAP_SERVERS`, `SCHEMA_REGISTRY_URL`).

## 9. Health checks & observability

- Health endpoints exist (e.g. messages `GET /actuator/health`, notification `GET /actuator/health`; Spring services expose actuator). No centralized aggregation.
- Logging is per-service stdout (Spring logging, Gin recovery, Python logging). **No structured logging, no tracing, no metrics aggregation** — biggest observability gap for a DevOps learning platform (good candidate for OpenTelemetry/Datadog/Dynatrace — see `.docs/tbd/`).

## 10. Error handling & validation

- Java: standard Spring exception handling + DTO validation (where present).
- Go: explicit JSON error responses, typed `appError` with status codes.
- Python: FastAPI `HTTPException` + Pydantic models.
- No shared error contract across services — clients see different error shapes per service.

## 11. Local dev & deployment readiness

- Start/stop and prerequisites documented in `.docs/guides/START.md`, `STOP.md`, `PREREQUISITES.md`, `CMDS.md`, `Impeccable-setup.md`.
- Java services run via Maven wrapper (`./mvnw spring-boot:run`); Node via `npm`, Go via `go run`, Python via `uvicorn`.
- ⚠️ **No `docker-compose` / Dockerfiles in the repo** — infra (Postgres/Neo4j/Mongo/Kafka/Schema Registry) is started manually per the guides. This is the #1 deployment-readiness gap and an obvious DevOps learning target (containerize → compose → k8s).

## 12. Known risks (summary)

> Several items below were addressed in the 2026-06-14 hardening pass — see `.docs/flaws.md` (statuses) and `.docs/security/hardening.md` (how + verify).

1. ~~Mixed JWT trust model (gateway vs in-service validation).~~ — **✅ fixed**: services validate tokens for authorization; gateway remains edge pre-check and strips spoofed identity headers. Residual: RS256/JWKS still open (ADR-013).
2. ~~Synchronous posts→connections coupling (no resilience).~~ — **✅ fixed** (circuit breaker + fallback, ARC-2/ADR-014); coupling still exists.
3. Gateway `StripPrefix`/`RewritePath` fragility. — **open** (ARC-4).
4. ~~Java services share the `postgres` DB.~~ — **✅ fixed** (per-service DBs, ARC-3/ADR-015).
5. ~~`ddl-auto=update` (no Java migrations).~~ — **✅ fixed for user/posts** with Flyway baselines + `ddl-auto=validate`.
6. No containerization / compose; manual multi-process startup. — **open** (OPS-1; `.docs/tbd/devops/02`).
7. No tracing/metrics/structured logs. — **open** (OPS-2; `.docs/tbd/devops/01`).
8. ~~CORS origin may not match the Vite port.~~ — **non-issue** (Vite runs on :3000, matches).
9. Unauthenticated user directory + email. — **✅ fixed** (SEC-1/ADR-010). Rate limiting added (SEC-2), server-side sanitize added (SEC-3), JWT secret guarded (SEC-4 partial).

## 13. Correction vs DESIGN.md (important)

`DESIGN.md` §1 claims **spheres = Node/MongoDB** and **notification = Python/Kafka (only)**. Reality: **spheres = Node/PostgreSQL** and **notification = Python/PostgreSQL + Kafka consumer**. `messages = Go/MongoDB` is correct. Treat `backend.md` (this file) as authoritative for stack/DB facts and fix DESIGN.md when convenient.

## 14. Files an AI agent must read before changing the backend

`api-gateway/src/main/resources/application.yml` (routing/auth) · the target service's config (`application.properties`/`application.yml` for Java, `.env`/`config.go`/`app/config.py` for others) · the gateway `AuthenticationFilter` · for posts changes, the connections-service client URL · `scripts/db-init/*` for DB names. See `.docs/guardrails/backend-guardrails.md`.
