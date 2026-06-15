# Low-Level Design (LLD)

Implementation-level view. Pair with `hld.md` and `.docs/brain/{frontend,backend}-map.md`.

## 1. API Gateway (Spring Cloud Gateway)
- Config: `api-gateway/src/main/resources/application.yml`.
- Route table: `/api/v1/{users,posts,connections,likes,spheres,messages,notifications}/**` → service URLs.
- Filters: `StripPrefix` (2 for most, 3 for spheres), `RewritePath` (likes → `/posts/likes/...`), `AuthenticationFilter` (custom; all except public user auth/stats).
- CORS: allowed origins `http://localhost:3000` + `${CORS_ALLOWED_ORIGIN}`.
- Port: `server.port=8007`; JWT via `jwt.secretKey=${secret}`.

## 2. user-service (Java/Spring Boot)
- Config: `application.properties` (`server.port=9020`, `jdbc:postgresql://localhost:5432/collabsphere_users`, `jwt.secretKey=${secret}`, Flyway enabled, `ddl-auto=validate`) + `application.yml` (Kafka producer, Avro, Schema Registry :8081).
- Layers: controller → service → JPA repository → Postgres. Auth endpoints issue JWT with signed role; stats endpoint feeds the UI member count; protected reads validate JWT in-service.
- Frontend binding: `api/auth.js` (`signup`, `login`, `getStats`).

## 3. posts-service (Java/Spring Boot)
- Config: `application.properties` (`:9010`, `collabsphere_posts`, JWT, Flyway enabled, `ddl-auto=validate`, **`connections-service.url=http://localhost:9030`**) + Kafka producer.
- Layers: controller → service → repository → Postgres; feed scoping calls connections-service over HTTP through a circuit-breaker fallback; emits `POST_CREATED` and `PostLikedEvent`.
- Endpoints (via gateway): `/posts/core` (feed/posts/comments), `/posts/likes` (likes, reached via `likes` rewrite).
- Frontend binding: `api/posts.js`.

## 4. connections-service (Java/Spring Data Neo4j)
- Config: `application.properties` (`:9030`, `spring.neo4j.uri=bolt://localhost:7687`, JWT) + Kafka consumer+producer (Avro).
- Layers: controller → service → Neo4j repository (graph queries) → Neo4j.
- Endpoints: `/connections/core/people` (search), connection requests (send/accept/reject), my connections.
- Seed: `scripts/seed-neo4j.sh`.
- Frontend binding: `api/connections.js`.

## 5. spheres-service (Node/Express)
- Entry: `src/index.js`. DB: `src/db/pool.js` (`pg` Pool, `DATABASE_URL` → `collabsphere_spheres`). Migrations: `src/db/migrate.js`. Seed: `src/db/seed.js`.
- Routes under `/spheres/core/*` (gateway StripPrefix=3): browse spheres, sphere detail, members, join/leave, sphere posts/threads, votes, comments. Admin uses signed JWT role; private sphere and nested post/comment routes enforce membership and sphere ownership.
- Frontend binding: `api/spheres.js`.

## 6. messages-service (Go/Gin)
- Files: `main.go` (router/server), `handler.go`, `repository.go` (Mongo), `model.go`, `middleware.go` (`JWTMiddleware`), `config.go` (`MONGODB_URI`, `JWT_SECRET`).
- Routes: `GET /actuator/health`; group `/messages/core` (JWT): `GET /conversations`, `GET /conversations/:partnerId`, `POST /conversations/:partnerId`, `PUT /conversations/:partnerId/read`, `DELETE /:messageId`, `GET /unread-count`.
- Frontend binding: `api/messages.js`.

## 7. notification-service (Python/FastAPI)
- Files: `main.py` (app + lifespan + `/actuator/health`), `app/router.py` (REST), `app/consumer.py` (`aiokafka` consumer), `app/config.py` (settings: `DATABASE_URL`, `KAFKA_BOOTSTRAP_SERVERS`, `SCHEMA_REGISTRY_URL`), `app/auth.py` (`HTTPBearer`).
- Routes (`/notifications/core`): `GET ""`, `GET /unread-count`, `PUT /{id}/read`, `PUT /read-all`, `DELETE /{id}`.
- Consumer: ingests events (e.g. `POST_CREATED`) → writes notification rows.

## 8. Frontend key components
- `App.jsx` (routes/guards), `AppShell.jsx` (chrome), `api/client.js` (`request()`), `auth/AuthContext.jsx` (session), `RichTextEditor.jsx` (WYSIWYG → HTML), `utils/format.js` (`sanitizeHtml`/`renderPostHtml`/`parsePostContent`), `CommandPalette.jsx` (⌘K), `styles/app.css` (tokens + override layers).

## 9. Cross-cutting models
- **JWT:** issued by user-service; `{sub,email,name,role,...}` decoded client-side (`utils/jwt.js`) and validated server-side by the gateway plus services.
- **Post content:** `text` (HTML or legacy BBCode) + optional trailing `\n\n[media:{type,data,...}]` (base64). Split by `parsePostContent`.
- **Events:** Avro records on Kafka (e.g. `POST_CREATED{userId,postId,...}`).

## 10. Sequence — "create a post"
```
UI(RichTextEditor) → sanitizeHtml → createPost(html+media)
 → POST /api/v1/posts/core  → gateway(JWT, StripPrefix) → posts-service
   → persist (Postgres) → emit POST_CREATED (Kafka)
 ← post JSON → UI prepends to feed
[async] notification-service consumes POST_CREATED → writes notification
later: UI GET /api/v1/notifications/core → notification-service → list
```

## 11. Sequence — "login"
```
UI(AuthPage) → POST /api/v1/users/login (public) → user-service
  → verify → sign JWT(${secret}) → return token
UI → AuthContext.signIn(token) → store + decode → redirect /feed
subsequent calls carry Authorization: Bearer <token> (validated at gateway)
```

## 12. Known implementation gaps
- HS256 shared secret remains until RS256/JWKS.
- No shared error contract.
- No tracing/metrics/structured logging; no tests; no containers.

## 13. Refactoring recommendations
1. Move HS256 to RS256/JWKS plus refresh/revocation.
2. Define a shared error contract.
3. Add OpenTelemetry + correlation IDs from the gateway.
4. Containerize + `docker-compose` for one-command local bring-up.
5. Move base64 media to upload/object storage.
