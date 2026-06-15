# App Feature 02 — "People You May Know" (smart connection suggestions)

> Candidate **application** feature. UI-first. For audit, not yet approved.

## Title
Graph-powered connection suggestions surfaced across Network, the right rail, and Adaptive Home.

## Business / product purpose
Growth loop: the more relevant connections a user makes, the richer their feed (posts are network-scoped). Today there's no discovery beyond manual search. Suggestions seed the graph and directly improve retention.

## Why it fits
The social graph already lives in **Neo4j** (connections-service) — perfect for "friends-of-friends", shared-Sphere, and same-employer recommendations. This is the highest-leverage use of the graph DB the project already runs.

## How the UI looks (lead)

**On the Network page (primary):**
```
┌─ People you may know ───────────────────────────────────────┐
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐       │
│ │   ◯  Priya N.  │ │   ◯  Sam O.    │ │   ◯  Lin W.    │  →    │
│ │  Staff Eng·Acme│ │  PM · Globex   │ │  Designer·Hsh  │       │
│ │  ↳ 3 mutual    │ │  ↳ #golang     │ │  ↳ same company│       │
│ │ [Connect] [✕]  │ │ [Connect] [✕]  │ │ [Connect] [✕]  │       │
│ └───────────────┘ └───────────────┘ └───────────────┘       │
└──────────────────────────────────────────────────────────────┘
```
- Each card shows the **reason** ("3 mutual connections", "both in #golang", "same company") — trust + transparency.
- `Connect` sends a request (optimistic → "Requested"); `✕` dismisses (won't show again).

**Right rail (compact):** a 2–3 item "Grow your network" list reusing the same cards, replacing the current generic CTA.

**Adaptive Home (State A/B):** the "Suggested people" row pulls from this same endpoint.

### Components (frontend)
- `SuggestionCard` (avatar, name, role, **reason chip**, Connect/Dismiss), `SuggestionList` (horizontal scroll on Network, vertical compact in rail). Reuses the Person atom.
- States: loading (skeleton cards), empty ("no suggestions yet — search people"), post-action (Requested / removed). `api/connections.js#getSuggestions()`.

## Backend design
- Add to **connections-service** (owns the graph):
  - `GET /connections/core/suggestions?limit=` → ranked people the user isn't connected to.
  - Ranking signals (Neo4j Cypher): mutual connections (2nd-degree), shared Spheres (needs sphere membership — via spheres-service or a projected signal), same `worksAt` (user-service profile). Exclude already-connected + pending + dismissed.
  - Dismissals stored as a `DISMISSED` edge or a small table.
- Cross-data: "shared Sphere" requires sphere membership. v1 can use mutual-connections + same-employer only (pure Neo4j + user profile) and add Sphere signals later via a Kafka projection.

## Required APIs
- `GET /connections/core/suggestions?limit=10` → `[{ userId, name, role, worksAt, reason, score }]` (no email — respect SEC-1).
- `POST /connections/core/suggestions/{userId}/dismiss`.
- Reuse existing `sendConnectionRequest`.

## DB / persistence changes
- Neo4j: optional `(:User)-[:DISMISSED]->(:User)` edges. Optional cached `score`. No relational change.

## Service-to-service communication
- v1: connections-service reads user profiles (already related) — pure graph. v2: consume a `SPHERE_JOINED` Kafka event to add shared-Sphere signals (keeps it async/decoupled, per guardrails — no new synchronous call).

## Security
- Auth required. **Never include email** in suggestions (this is exactly the SEC-1 leak class). Only show info the requester is allowed to see. Rate-limit to prevent scraping the graph.

## Observability
- Metrics: suggestions served, connect-through rate, dismiss rate, suggestion latency (Neo4j query cost). Trace the suggestion query (pairs with `devops/01`).

## Failure scenarios
- Neo4j slow/down → return empty list gracefully (Network/Home still work).
- New user with no graph → fall back to "popular/active members" or Sphere-based suggestions.
- Stale suggestions after connecting → exclude pending/connected at query time.

## DevOps / testing impact
- Cypher query performance (index on user keys; cap traversal depth). Tests: ranking unit tests (mutual > shared-sphere > same-company), exclusion of connected/dismissed, no-email assertion.

## Suggested phases
1. `GET /suggestions` using mutual-connections + same-employer; Network page row.
2. Dismiss + right-rail compact list + Home integration.
3. Add shared-Sphere signal via Kafka projection.
4. Tune ranking with connect-through feedback.

## Risks
- Graph query cost at scale (cap depth, paginate, cache).
- Suggestion quality with a sparse early graph (cold-start → popular fallback).
- Privacy optics — show *why*, never expose contact info.

## Open questions for audit
- Include Sphere signals in v1 (needs cross-service data) or defer to v2?
- Cache suggestions (TTL) or compute on demand?
- Fallback strategy for empty graphs — popular members vs Sphere-based?
