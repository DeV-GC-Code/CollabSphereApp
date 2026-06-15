# Backend Map

Navigation map for the services. See `.docs/backend.md` for the deep narrative and `.docs/brain/service-map.md` for responsibilities.

## Ports & datastores (verified)

| Service | Port | Datastore | Messaging |
|---|---|---|---|
| api-gateway | 8007 | — | — |
| user-service | 9020 | PostgreSQL | Kafka producer |
| posts-service | 9010 | PostgreSQL | Kafka producer (+HTTP→connections) |
| connections-service | 9030 | Neo4j (7687) | Kafka consumer+producer |
| spheres-service | 8009 | PostgreSQL | — |
| messages-service | 8010 | MongoDB (27017) | — |
| notification-service | 9070 | PostgreSQL | Kafka consumer |

## Where APIs live (per service)

- **Java (gateway/user/posts/connections):** Spring controllers under `src/main/java/.../controller` (or `web`), services under `.../service`, JPA/Neo4j repositories under `.../repository`, entities/DTOs under `.../model`/`.../dto`. Config in `src/main/resources/application.properties` + `application.yml`.
- **spheres-service (Node):** `src/index.js` (Express app + routes), `src/db/pool.js` (pg), `src/db/migrate.js`, `src/db/seed.js`; route/handler modules under `src/`.
- **messages-service (Go):** `main.go` (router + server), `handler.go` (HTTP handlers), `repository.go` (Mongo), `model.go`, `middleware.go` (JWT), `config.go` (env).
- **notification-service (Python):** `main.py` (FastAPI app + lifespan + health), `app/router.py` (REST), `app/consumer.py` (Kafka), `app/config.py` (settings), `app/auth.py` (JWT).

## Gateway path contract (what the UI calls → what the service sees)

| UI path (`/api/v1/...`) | Gateway action | Service receives |
|---|---|---|
| `users/**` | StripPrefix 2, **public** | `/...` on :9020 |
| `posts/**` | StripPrefix 2, auth | `/posts/...`? (StripPrefix removes `api/v1`) on :9010 |
| `connections/**` | StripPrefix 2, auth | on :9030 |
| `likes/**` | RewritePath → `/posts/likes/...`, auth | on :9010 |
| `spheres/**` | StripPrefix 3, auth | `/spheres/core/...` on :8009 |
| `messages/**` | StripPrefix 2, auth | `/messages/core/...` on :8010 |
| `notifications/**` | StripPrefix 2, auth | `/notifications/core/...` on :9070 |

> ⚠️ StripPrefix counts differ per route; the internal path prefixes (`/spheres/core`, `/messages/core`, `/notifications/core`) are load-bearing. Don't rename them without updating the gateway.

## Events (Kafka, Avro via Schema Registry :8081)

- Producers: user-service, posts-service, connections-service.
- Consumers: connections-service, notification-service.
- Example: `POST_CREATED` (posts → notification → user notification row).

## Auth

- JWT issued by **user-service**, signed with shared `${secret}`.
- Validated at the **gateway** (`AuthenticationFilter`) for all protected routes; **also** re-validated inside messages (Go) and notification (Python). Keep the secret identical everywhere.

## Before changing the backend

Read: gateway `application.yml` (route+auth) → target service config → controller/handler → service → repository → events. For posts changes, check the connections-service URL. For DB names, check `scripts/db-init`. Then `.docs/guardrails/backend-guardrails.md`.
