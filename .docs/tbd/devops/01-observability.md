# Idea 01 — Observability & the "Live System" surface

> Candidate direction. For audit, not yet approved.

## Title
End-to-end observability (tracing + metrics + structured logs) surfaced as a live, in-product **System** view.

## Business / product purpose
Turn the project's biggest differentiator — a real polyglot distributed system — into something **visible and demoable**. Recruiters/engineers see live topology, request traces, and health. Operationally, it gives the developer real debugging power across 6 services.

## Why it fits
The repo currently has zero tracing/metrics and only ad-hoc logs (`.docs/backend.md` §9). Observability is the canonical DevOps learning milestone and directly serves the audience (`.docs/product/PRODUCT.md`). It also realizes the "System surface" pitched in `.docs/design/REDESIGN.md`.

## Frontend UX
- New top-level **System** page: live service topology graph (nodes = 6 services + gateway + datastores + Kafka), health badges, p50/p95 latency, error rate.
- "Trace an action": trigger a sample action (e.g. create post) and watch the span fan out across services.
- A live event tape (recent Kafka events) and a per-service inspector panel.

## Frontend design / components
- `pages/SystemPage.jsx`; components `TopologyGraph`, `ServiceNode`, `LatencySparkline`, `EventTape`, `TraceTimeline`. Reuse tokens; color nodes by language. Reduced-motion + screen-reader table fallback.
- Data via a read-only `api/system.js` hitting a new aggregation endpoint (never scrape Prometheus from the browser directly).

## Backend service design
- Instrument all services with **OpenTelemetry** SDKs (Java agent, `@opentelemetry` for Node, otel-go, opentelemetry-python). Export OTLP → **Collector** → Tempo/Jaeger (traces) + Prometheus (metrics) + Loki (logs). Optionally Datadog/Dynatrace exporters (matches the owner's stack interest).
- Gateway injects a `traceparent`/correlation ID propagated downstream (also fixes the "no correlation IDs" gap).
- A small **telemetry-api** (or extend the gateway) exposes a sanitized aggregation for the UI (`/api/v1/system/topology`, `/system/health`, `/system/traces/recent`).

## Required APIs
- `GET /api/v1/system/health` — per-service health + version.
- `GET /api/v1/system/topology` — nodes/edges + live metrics.
- `GET /api/v1/system/traces/recent` — recent traces (ids, spans, durations).
- `POST /api/v1/system/demo-trace` — trigger a sample cross-service action (auth-gated, rate-limited).

## DB / persistence changes
None to business DBs. Telemetry stored in the observability backends (Tempo/Prometheus/Loki) or vendor.

## Service-to-service communication
All services → OTLP → Collector (push). UI → telemetry-api (pull). No new business coupling.

## Security
- System endpoints behind auth; consider an `admin`/owner-only scope. Never expose raw infra (Prometheus/Tempo) to the browser. Strip PII from spans/logs (no tokens, no post bodies).

## Observability (of the feature itself)
The feature *is* observability; add a synthetic check that the Collector is receiving spans from all 6 services.

## Failure scenarios
- Collector down → services must not block (async, bounded queues, drop on backpressure).
- telemetry-api down → System page shows "degraded", app unaffected.
- High-cardinality labels → metric blowup (guard label sets).

## DevOps impact
High (positive): introduces the observability stack, correlation IDs, and dashboards — core learning. Adds Collector + storage to the compose/k8s footprint (pairs with Idea 02).

## Testing impact
- Contract tests for system endpoints; assert trace propagation (a span graph spans ≥3 services for "create post"). Load test to validate metrics.

## Suggested phases
1. Structured logging + correlation ID through the gateway.
2. OTel traces on Java services → Collector → Jaeger; "Trace an action" demo.
3. Metrics + health aggregation API + System page v1 (topology + health).
4. Logs (Loki) + latency/error panels + (optional) Datadog/Dynatrace export.

## Risks
- Instrumentation effort across 4 languages.
- Performance overhead if sampling is wrong (use tail/ratio sampling).
- Scope creep (keep the UI read-only).

## Open questions for audit
- Self-hosted (Tempo/Prometheus/Loki) vs vendor (Datadog/Dynatrace) for the learning goal?
- Is the System page owner-only or part of the public portfolio demo?
- Sampling strategy and retention?
