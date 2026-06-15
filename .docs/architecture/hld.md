# High-Level Design (HLD)

System-level view of CollabSphere. For implementation detail see `lld.md`; for diagrams see the `.drawio` files in this folder.

## 1. System purpose
A professional community platform (feed, connections graph, DMs, community Spheres, notifications, profiles) built as a **polyglot microservices DevOps/architecture learning platform** and portfolio piece.

## 2. Major modules
- **Client:** React + Vite single-page app (`collabsphere-ui`).
- **Edge:** API Gateway (Spring Cloud Gateway) — routing, JWT auth, CORS.
- **Services:** user, posts, connections, spheres, messages, notification.
- **Data stores:** PostgreSQL, Neo4j, MongoDB.
- **Messaging:** Kafka + Schema Registry (Avro).

## 3. Component view
```
            ┌────────────────────────── Browser (React/Vite) ──────────────────────────┐
            │  AuthContext (JWT)  ·  api/client (Bearer, /api/v1)  ·  pages/components   │
            └───────────────────────────────┬──────────────────────────────────────────┘
                                             │ HTTPS /api/v1/*
                                  ┌──────────▼───────────┐
                                  │  API Gateway :8007    │  routing · JWT · CORS
                                  └──┬───┬───┬───┬───┬───┬┘
        ┌──────────┬───────────┬─────┘   │   │   │   │   └─────────┬───────────────┐
        ▼          ▼           ▼         ▼   ▼   ▼   ▼              ▼               ▼
   user :9020  posts :9010  connections  spheres  messages   notification     (likes→posts)
   Postgres    Postgres     :9030/Neo4j  :8009/PG :8010/Mongo :9070/PG
        │          │             ▲                                   ▲
        │ Kafka    │ Kafka       │ Kafka(c/p)                        │ Kafka(consumer)
        └──────────┴─────────────┴───────── Kafka :9092 + Schema Registry :8081 ───────────┘
        posts ──HTTP──▶ connections (synchronous feed scoping)
```

## 4. Frontend (high level)
SPA with route guards; Context for auth/theme; a thin API layer to the gateway; token-driven design system. See `frontend-flow.md`.

## 5. API gateway
Single public entry. Owns path routing, JWT validation (`AuthenticationFilter`), CORS, and path rewriting (StripPrefix/RewritePath). `users` is public; everything else requires a valid JWT.

## 6. Backend services
Six independently deployable services, each owning a bounded context and its own datastore. Cross-service interaction via the gateway (client traffic), one sanctioned synchronous call (posts→connections), and Kafka events (decoupled reactions).

## 7. Data stores
- PostgreSQL — user, posts, spheres, notification.
- Neo4j — connections (graph).
- MongoDB — messages.
- (Kafka topics carry events between services.)

## 8. Authentication & authorization
JWT issued by user-service (shared secret), validated at the gateway for protected routes and again by services before authorization decisions. Admin is a signed `role=ADMIN` claim; the UI only reflects that claim and does not decide authorization.

## 9. Deployment view (current vs target)
- **Current:** run locally as separate processes (Maven/npm/go/uvicorn) against locally-run infra (Postgres/Neo4j/Mongo/Kafka/Schema Registry). No Dockerfiles/compose in repo.
- **Target:** containerize each service + infra via `docker-compose` (then optionally Kubernetes) — the headline DevOps learning milestone.

## 10. Observability view
- **Current:** per-service stdout logs; a couple of `/actuator/health` endpoints. No tracing, metrics, or aggregation.
- **Target:** OpenTelemetry tracing (correlation IDs from gateway down), metrics, structured logs, dashboards (Datadog/Dynatrace) — see `.docs/tbd/`.

## 11. Security view
- JWT auth at the edge and in services; secrets via env (gitignored `.env.local`); auth route rate limited; Java user/posts use Flyway baselines.
- Gaps: HS256 shared secret until RS256/JWKS, base64 media in payloads, no shared error contract, no TLS/mTLS for production. See guardrails + journal.

## 12. Scalability view
- Stateless services scale horizontally behind the gateway. Kafka decouples write spikes from downstream reactions.
- Bottlenecks/risks: synchronous posts→connections (now circuit-breaker protected but still coupled); shared Postgres instance; single gateway instance.

## 13. Reliability view
- Failure isolation is good for the async path (Kafka). The synchronous posts→connections call has a fallback but remains a coupling point. Health checks exist but aren't aggregated.

## 14. Future target architecture
Containerized + composed deployment, RS256/JWKS + refresh/revocation, shared error contract, async/cached graph projection, full observability, and uploads/object storage for media. Candidate directions detailed in `.docs/tbd/`.
