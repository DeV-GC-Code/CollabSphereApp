# TBD — Candidate future directions

Two tracks. Pick from either; each file is detailed enough to audit and decide.

## `devops/` — platform / infrastructure / operability
Infra-leaning initiatives that make CollabSphere reproducible, observable, and production-shaped (the core DevOps learning goals).

| File | Direction | Headline |
|---|---|---|
| `devops/01-observability.md` | Observability + "Live System" surface | OpenTelemetry traces/metrics/logs, in-product topology view |
| `devops/02-containerization-cicd.md` | Containerize + one-command env + CI/CD | Dockerfiles, docker-compose, Makefile, GitHub Actions |
| `devops/03-realtime-layer.md` | Real-time edge (WebSocket/SSE + presence) | Live notifications/messages on the Kafka backbone |
| `devops/04-media-object-storage.md` | Media service + object storage | Replace base64 with S3/MinIO uploads + URLs |

## `application/` — product features (UI-first)
Feature initiatives that add user-facing value. Each leads with **how the UI looks** (wireframes + components + states), then specifies the backend needed.

| File | Feature | Headline |
|---|---|---|
| `application/01-adaptive-home.md` | Adaptive Home / cold-start cockpit | Kill the empty-feed first impression with a guided start |
| `application/02-people-you-may-know.md` | Smart connection suggestions | Graph-powered "People you may know" |
| `application/03-sphere-digests.md` | Sphere digests — "what you missed" | Per-community catch-up cards |
| `application/04-rich-profiles.md` | Rich profiles — skills & endorsements | Profile depth + activity timeline |

## Rule
When an idea is approved and built, move/annotate it and follow the architecture-XML-update rule (`.docs/guardrails/`): update diagrams + HLD/LLD + add an ADR + a journal entry.
