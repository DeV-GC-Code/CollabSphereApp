# Service Map

Each backend service, what it owns, how to reach it, and its dependencies. Ports/DBs verified from config (June 2026).

## api-gateway — Java / Spring Cloud Gateway · :8007
- **Owns:** the only public entry point. Path routing, JWT `AuthenticationFilter`, auth-route rate limiting, CORS.
- **Routes:** `/api/v1/users|posts|connections|likes|spheres|messages|notifications/**` (see `.docs/backend.md` §3 for the table).
- **Depends on:** every service (by URL), shared JWT secret.
- **Auth:** validates Bearer JWT for all protected routes; only `users/auth/**` and `users/stats` are public.

## user-service — Java / Spring Boot · :9020 · PostgreSQL
- **Owns:** identity — signup, login (**issues the JWT with signed role**), profile, platform stats.
- **Public endpoints:** auth + stats only. Directory/profile reads validate JWT.
- **Emits:** user events to Kafka (Avro).
- **Frontend:** `api/auth.js` (`signup`, `login`, `getStats`).

## posts-service — Java / Spring Boot · :9010 · PostgreSQL
- **Owns:** public feed, posts, comments, likes (`/posts/likes/*`, reached via gateway `likes` rewrite).
- **Depends on:** **connections-service over HTTP** (`connections-service.url=:9030`) to scope feeds to a user's network — synchronous coupling with circuit-breaker fallback.
- **Emits:** `POST_CREATED`, `PostLikedEvent`, etc. to Kafka.
- **Frontend:** `api/posts.js`.

## connections-service — Java / Spring Data Neo4j · :9030 · Neo4j (bolt :7687)
- **Owns:** the social graph (connections), people search, connection requests.
- **Messaging:** Kafka consumer **and** producer (Avro).
- **Seed:** `scripts/seed-neo4j.sh`.
- **Frontend:** `api/connections.js`.

## spheres-service — Node.js / Express · :8009 · PostgreSQL (`pg`)
- **Owns:** communities ("Spheres"), membership, threads, votes, comments.
- **DB:** PostgreSQL (`collabsphere_spheres`) with real SQL migrations (`src/db/migrate.js`) + seed (`src/db/seed.js`).
- **Auth:** validates JWT itself; admin from signed `role=ADMIN`; private/nested routes enforce membership and sphere ownership.
- **Gateway:** `StripPrefix=3` (routes under `/spheres/core/*`).
- **Frontend:** `api/spheres.js`.

## messages-service — Go / Gin · :8010 · MongoDB (:27017)
- **Owns:** direct messages / conversations / read state.
- **Routes:** `GET/POST /messages/core/conversations[/:partnerId]`, `PUT …/read`, `DELETE /:messageId`, `GET /unread-count`, `GET /actuator/health`.
- **Auth:** validates JWT itself (`JWTMiddleware`, shared secret).
- **Frontend:** `api/messages.js`.

## notification-service — Python / FastAPI · :9070 · PostgreSQL
- **Owns:** cross-service activity feed (notifications).
- **Messaging:** Kafka **consumer** (`aiokafka`) — ingests events (e.g. `POST_CREATED`) → writes notifications.
- **Routes:** `GET /notifications/core`, `/unread-count`, `PUT /{id}/read`, `/read-all`, `DELETE /{id}`, `GET /actuator/health`.
- **Auth:** validates JWT itself (`HTTPBearer`).
- **Frontend:** notifications page (calls `/notifications/...`).

## Dependency edges

```
UI → gateway → {user, posts, connections, spheres, messages, notification}
posts ──HTTP──▶ connections
user, posts, connections ──Kafka(produce)──▶ [broker] ──consume──▶ connections, notification
```

## Boundary rule

A change that crosses a service boundary (new cross-service call, new event, new shared field) **must** be reflected in `.docs/architecture/backend-flow.md`, `.docs/architecture/*.drawio`, and `.docs/brain/architecture-decisions.md`.
