# Important Files — and why each matters

## Cross-cutting / control plane

| File | Why it matters |
|---|---|
| `api-gateway/src/main/resources/application.yml` | The whole routing + auth + CORS contract. Every external request passes here. |
| `.env.local` (gitignored; `.env.local.example`) | Shared secrets: JWT `${secret}`, DB creds, Neo4j creds. Source before running anything. |
| `scripts/db-init/01-create-databases.sh` | Defines the per-service Postgres DB names. |
| `scripts/seed-neo4j.sh` | Seeds the connections graph for local dev. |
| `.docs/guides/START.md` / `STOP.md` / `CMDS.md` / `PREREQUISITES.md` | The real local run/stop workflow (no compose exists). |

## Frontend

| File | Why it matters |
|---|---|
| `collabsphere-ui/src/App.jsx` | Route table + Protected/Guest guards. |
| `collabsphere-ui/src/api/client.js` | The single HTTP entry: base URL, Bearer token, timeout, error shape. |
| `collabsphere-ui/src/auth/AuthContext.jsx` | Session/JWT, signIn/signOut, decoded user. |
| `collabsphere-ui/src/components/AppShell.jsx` | Authenticated layout (rail, top bar, palette). |
| `collabsphere-ui/src/utils/format.js` | Post content: `sanitizeHtml`, `renderPostHtml`, `parsePostContent`. Security-sensitive (XSS allow-list). |
| `collabsphere-ui/src/styles/app.css` | ALL styling via tokens. The trailing override blocks win the cascade — read them before restyling. |
| `collabsphere-ui/vite.config.js` | Dev proxy / base config (how `/api/v1` reaches the gateway). |

## Backend (per service entry points)

| File | Why it matters |
|---|---|
| `user-service/.../application.properties` + Kafka `application.yml` | Port 9020, Postgres datasource, JWT secret, Avro/Schema Registry. Issues the JWT. |
| `posts-service/.../application.properties` | Port 9010, Postgres, **`connections-service.url`** (synchronous coupling), JWT. |
| `connections-service/.../application.properties` + `application.yml` | Port 9030, **Neo4j bolt**, Kafka consumer+producer. |
| `spheres-service/src/db/pool.js`, `src/db/migrate.js`, `src/db/seed.js`, `src/index.js` | Express app, **Postgres** pool, SQL migrations + seed. |
| `messages-service/main.go`, `handler.go`, `repository.go`, `config.go`, `middleware.go` | Gin routes (`/messages/core/*`), **MongoDB** access, in-service JWT middleware. |
| `notification-service/main.py`, `app/router.py`, `app/consumer.py`, `app/config.py`, `app/auth.py` | FastAPI routes (`/notifications/core/*`), **Kafka consumer**, Postgres, in-service JWT. |

## Existing design docs (read, don't duplicate)

- `.docs/design/DESIGN.md` — visual system (note: its DB table is stale; see `.docs/backend.md`).
- `.docs/design/REDESIGN.md` — product/IA redesign strategy.
- `.docs/product/PRODUCT.md` — product intent, audience, brand.
- `.docs/design/architecture.drawio` — existing diagram (supplement with `.docs/architecture/*.drawio`).
