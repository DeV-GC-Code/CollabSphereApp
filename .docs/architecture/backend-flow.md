# Backend Flow

End-to-end request + event flow across the gateway and services. Pair with `.docs/brain/backend-map.md` and `.docs/architecture/backend-architecture.drawio`.

## 1. Request entry (synchronous path)
```
Client → API Gateway (:8007)
   1. CORS check (allowed origins)
   2. Route match by Path predicate (/api/v1/<area>/**)
   3. AuthenticationFilter validates Bearer JWT (skipped only for /users/auth/** and /users/stats)
   4. StripPrefix / RewritePath rewrites the path
   5. Proxy to the target service URL
Target service → controller/handler → service/business logic → repository → datastore
   ← response JSON back through the gateway to the client
```

## 2. Auth flow (detail)
1. `POST /api/v1/users/login` → gateway (public) → user-service verifies credentials → returns JWT signed with `${secret}`.
2. Client sends `Authorization: Bearer <jwt>` on subsequent calls.
3. Gateway `AuthenticationFilter` validates the JWT for protected routes and strips spoofed `X-User-Id`.
4. Services validate the signed JWT independently before using identity or role claims.

## 3. Per-service request processing

- **user-service (Java/JPA/Postgres):** controller → service → JPA repository → Postgres. Login issues JWT; signup persists user; emits user events to Kafka (Avro).
- **posts-service (Java/JPA/Postgres):** controller → service → repository → Postgres. For network-scoped feeds, calls **connections-service over HTTP** (`connections-service.url=:9030`). Emits `POST_CREATED` to Kafka.
- **connections-service (Java/Neo4j):** controller → service → Spring Data Neo4j repository → Neo4j (graph traversals for connections/people). Consumes + produces Kafka events.
- **spheres-service (Node/Express/Postgres):** route handler → auth/access helper → `pg` pool query → Postgres (`collabsphere_spheres`). Schema via `src/db/migrate.js`.
- **messages-service (Go/Gin/Mongo):** `JWTMiddleware` → handler → repository → MongoDB. Routes under `/messages/core/*`.
- **notification-service (Python/FastAPI/Postgres):** `HTTPBearer` → router → DB. Plus a background Kafka consumer.

## 4. Event flow (asynchronous path)
```
producer (user | posts | connections)
   → Kafka topic (Avro, Schema Registry :8081)
      → consumer (connections | notification)
         → side effect (e.g. notification row written)
Example: user creates a post
  posts-service persists post + emits POST_CREATED
     → notification-service consumes → writes a notification
     → client later GETs /api/v1/notifications/core
```

## 5. Persistence flow
- Java (user/posts): Flyway baseline + JPA/Hibernate (`ddl-auto=validate`) → per-service Postgres DBs (`collabsphere_users`, `collabsphere_posts`).
- connections: Spring Data Neo4j → Neo4j (bolt :7687).
- spheres: `pg` Pool + SQL migrations → Postgres (`collabsphere_spheres`).
- messages: Go Mongo driver → MongoDB collections.
- notification: Postgres (`collabsphere_notifications`).

## 6. Error handling flow
- Gateway: 401 on invalid/missing JWT for protected routes.
- Java: Spring exception handling → JSON error.
- Go: typed `appError{code,msg}` → `c.JSON(code,{error})`.
- Python: `HTTPException` → FastAPI JSON.
- ⚠️ No shared error contract — clients see per-service shapes.

## 7. Health-check flow
- `GET /actuator/health` on messages + notification (and Spring actuator on Java services). No aggregation/uptime dashboard yet.

## 8. Inter-service communication summary
- Synchronous: posts → connections (HTTP with circuit-breaker fallback).
- Asynchronous: Kafka events (user/posts/connections → connections/notification).
- All client traffic: via the gateway only.

## 9. Current gaps
- HS256 shared secret remains until RS256/JWKS.
- No tracing/correlation IDs across services; logs are isolated per service.
- No containerization/compose; manual multi-process startup.

## 10. Recommended future flow
- Replace synchronous feed-scoping with an async/cached graph projection if it becomes a scaling bottleneck.
- Add RS256/JWKS + refresh/revocation and a shared error contract.
- Add OpenTelemetry tracing (correlation IDs from the gateway down) + metrics + structured logs.
- Containerize all services + infra with `docker-compose`.
