# Idea 02 — Containerization & one-command environment + CI/CD

> Candidate direction. For audit, not yet approved.

## Title
Dockerize all services + infra with `docker-compose`, add a Makefile, health-gated startup, and a CI pipeline.

## Business / product purpose
Make the platform reproducible and shippable. Today startup is a manual multi-process dance (`.docs/guides/START.md`). One-command bring-up + CI is the foundational DevOps skill and removes the #1 onboarding friction.

## Why it fits
`.docs/backend.md` §11 flags **no Dockerfiles/compose** as the top deployment-readiness gap. This unlocks every other idea (observability, real-time, storage) by giving them a place to run.

## Frontend UX
- Minimal: a `/healthz`-style **Service Status** page (or reuse Idea 01's System page) reflecting compose health. Mostly an infra change.

## Frontend design / components
- Optional `StatusBadge` row in the footer/settings showing gateway + service health from `GET /api/v1/system/health`.

## Backend / infra design
- **Dockerfile per service** (multi-stage): Java (Temurin + Maven build), Node (slim), Go (distroless static), Python (slim + uvicorn). Non-root users; minimal images.
- **`docker-compose.yml`** for the full stack: gateway + 6 services + Postgres + Neo4j + Mongo + Kafka + Schema Registry, with `depends_on` + healthchecks so services wait for infra. Wire `scripts/db-init` and `seed-neo4j.sh` as init steps.
- **`.env`-driven** config; one `.env.example` at root; compose passes secrets via env.
- **Makefile**: `make up`, `make down`, `make logs`, `make seed`, `make test`, `make build`.

## Required APIs
- Standardize `/actuator/health` (or `/healthz`) across ALL services for compose healthchecks (messages + notification already have it; add to the rest).

## DB / persistence changes
- Reconcile Java datasource URLs to the per-service `collabsphere_*` DBs (fixes ADR-004) as part of compose wiring. Named volumes for data persistence.

## Service-to-service communication
- Replace hard-coded `localhost:<port>` URLs with **service names** (compose DNS), via env (`CONNECTIONS_SERVICE_URL`, etc.). Removes localhost coupling.

## Security
- Non-root containers, read-only FS where possible, no secrets baked into images, `.dockerignore`, pinned base image digests. CORS origin set per environment.

## Observability
- Compose healthchecks + `make logs`. Pairs naturally with Idea 01's Collector as another compose service.

## Failure scenarios
- Infra not ready → healthchecks + `depends_on: condition: service_healthy` prevent boot races.
- Port conflicts → centralize port mapping in compose/env.
- Kafka/Schema Registry slow start → retry/backoff in producers/consumers.

## DevOps impact
Very high (the point). Adds CI (GitHub Actions): lint + build + unit tests per language on PR; build images on main. Later: push to a registry; optional Kubernetes manifests/Helm as a stretch.

## Testing impact
- CI runs each stack's build/tests. Add a smoke test: `make up` → hit gateway health for all services → tear down.

## Suggested phases
1. Dockerfiles per service; verify each runs standalone.
2. `docker-compose` for infra only (Postgres/Neo4j/Mongo/Kafka/SR) + db-init/seed.
3. Add all services to compose with healthchecks + service-name URLs; `make up` works end to end.
4. CI pipeline (lint/build/test) + image build on main.
5. (Stretch) Kubernetes/Helm + the observability stack (Idea 01).

## Risks
- Service-name URL migration can break the gateway routes if not done carefully (update both sides).
- Kafka in compose is fiddly (listeners/advertised hosts).
- Build times for the Java images (cache layers).

## Open questions for audit
- Compose only, or also Kubernetes/Helm for the learning goal?
- Which CI (GitHub Actions assumed)? Registry target?
- Do we reconcile the Java Postgres DBs now (recommended) or defer?
